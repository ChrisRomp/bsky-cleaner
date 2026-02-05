import { AtpAgent, AppBskyFeedDefs } from '@atproto/api';
import type { AtpSessionEvent, AtpSessionData } from '@atproto/api';
import type { PostItem, LikeItem, RepostItem, FollowItem } from '../types';

const SESSION_KEY = 'bsky-cleaner-session';

let agent: AtpAgent | null = null;

interface StoredSession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}

function saveSession(session: StoredSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// Callback for when session expires
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredCallback(callback: () => void): void {
  onSessionExpired = callback;
}

// Session persistence handler - only handles expiry, no refresh
function handleSessionPersist(evt: AtpSessionEvent, _session?: AtpSessionData): void {
  if (evt === 'expired' || evt === 'create-failed') {
    clearSession();
    onSessionExpired?.();
  }
  // We don't save refreshed tokens - let the session expire after ~2 hours
}

export async function login(handle: string, appPassword: string): Promise<{ did: string; handle: string }> {
  agent = new AtpAgent({ 
    service: 'https://bsky.social',
    persistSession: handleSessionPersist,
  });
  
  const response = await agent.login({
    identifier: handle,
    password: appPassword,
  });
  
  // Only save the short-lived access token (not the refresh token)
  if (agent.session) {
    saveSession({
      did: response.data.did,
      handle: response.data.handle,
      accessJwt: agent.session.accessJwt,
      refreshJwt: agent.session.refreshJwt,
    });
  }
  
  return {
    did: response.data.did,
    handle: response.data.handle,
  };
}

// Try to restore session from sessionStorage
export async function restoreSession(): Promise<{ did: string; handle: string } | null> {
  const stored = loadSession();
  if (!stored) return null;
  
  try {
    agent = new AtpAgent({ 
      service: 'https://bsky.social',
      persistSession: handleSessionPersist,
    });
    
    // Resume with stored tokens
    await agent.resumeSession({
      did: stored.did,
      handle: stored.handle,
      accessJwt: stored.accessJwt,
      refreshJwt: stored.refreshJwt,
      active: true,
    });
    
    return {
      did: stored.did,
      handle: stored.handle,
    };
  } catch (error) {
    // Session expired or invalid, clear it
    console.error('Failed to restore session:', error);
    clearSession();
    agent = null;
    return null;
  }
}

export function logout(): void {
  agent = null;
  clearSession();
}

export function getAgent(): AtpAgent {
  if (!agent) {
    throw new Error('Not authenticated');
  }
  return agent;
}

export async function fetchPosts(
  did: string,
  cursor?: string
): Promise<{ posts: PostItem[]; cursor?: string }> {
  const agent = getAgent();
  
  // Fetch posts with replies included so we can show reply context
  const response = await agent.getAuthorFeed({
    actor: did,
    limit: 50,
    cursor,
    filter: 'posts_with_replies',
  });
  
  const posts: PostItem[] = response.data.feed
    .filter(item => item.post && item.post.author?.did === did && !item.reason) // Only own posts, no reposts
    .map(item => {
      const post = item.post;
      const record = (post.record || {}) as Record<string, unknown> & { 
        text?: string; 
        createdAt?: string;
        reply?: { parent: { uri: string }; root: { uri: string } };
      };
      
      // Check if this is a reply
      const isReply = !!record.reply;
      let replyTo: PostItem['replyTo'] = undefined;
      
      if (item.reply?.parent) {
        const parentPost = item.reply.parent as AppBskyFeedDefs.PostView;
        const parentRecord = (parentPost?.record || {}) as { text?: string };
        replyTo = {
          parentUri: parentPost?.uri || '',
          parentAuthor: parentPost?.author?.handle || 'unknown',
          parentText: parentRecord?.text || '',
          rootAuthor: (item.reply.root as AppBskyFeedDefs.PostView)?.author?.handle || '',
        };
      }
      
      // Check for quote posts (embeds with record type)
      let quote: PostItem['quote'] = undefined;
      const embed = post.embed as { 
        $type?: string; 
        record?: { 
          uri?: string;
          author?: { handle?: string }; 
          value?: { text?: string };
        } 
      } | undefined;
      
      if (embed?.$type === 'app.bsky.embed.record#view' && embed.record) {
        const quotedRecord = embed.record;
        quote = {
          quotedUri: quotedRecord.uri || '',
          quotedAuthor: quotedRecord.author?.handle || 'unknown',
          quotedText: (quotedRecord.value as { text?: string })?.text || '',
        };
      }
      
      return {
        uri: post.uri,
        cid: post.cid,
        type: 'post' as const,
        text: record.text || '',
        createdAt: new Date(record.createdAt || post.indexedAt),
        likeCount: post.likeCount || 0,
        repostCount: post.repostCount || 0,
        replyCount: post.replyCount || 0,
        isReply,
        replyTo,
        quote,
      };
    });
  
  return {
    posts,
    cursor: response.data.cursor,
  };
}

export async function fetchLikes(
  did: string,
  cursor?: string
): Promise<{ likes: LikeItem[]; cursor?: string }> {
  const agent = getAgent();
  
  // Use listRecords to get actual like records with their URIs
  const likesResponse = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: 'app.bsky.feed.like',
    limit: 50,
    cursor,
  });
  
  // Build a map of liked post URIs to like record info
  const likeRecords = likesResponse.data.records;
  const likedPostUris = likeRecords
    .map(record => (record.value as { subject?: { uri?: string } })?.subject?.uri)
    .filter((uri): uri is string => !!uri);
  
  // Fetch the actual posts to get their content (getPosts max 25 at a time)
  const postsMap = new Map<string, AppBskyFeedDefs.PostView>();
  
  // Batch fetch posts in chunks of 25
  for (let i = 0; i < likedPostUris.length; i += 25) {
    const batch = likedPostUris.slice(i, i + 25);
    try {
      const postsResponse = await agent.getPosts({ uris: batch });
      for (const post of postsResponse.data.posts) {
        postsMap.set(post.uri, post);
      }
    } catch {
      // Some posts may have been deleted, that's ok
    }
  }
  
  const likes: LikeItem[] = likeRecords
    .map(record => {
      const likeValue = record.value as { subject?: { uri?: string }; createdAt?: string };
      const likedUri = likeValue?.subject?.uri;
      if (!likedUri) return null;
      
      const post = postsMap.get(likedUri);
      
      return {
        uri: record.uri,
        cid: record.cid,
        type: 'like' as const,
        likedUri,
        likedPost: post ?? null,
        createdAt: new Date(likeValue.createdAt || record.uri),
      };
    })
    .filter((like): like is LikeItem => like !== null);
  
  return {
    likes,
    cursor: likesResponse.data.cursor,
  };
}

export async function fetchReposts(
  did: string,
  cursor?: string
): Promise<{ reposts: RepostItem[]; cursor?: string }> {
  const agent = getAgent();
  
  const response = await agent.getAuthorFeed({
    actor: did,
    limit: 50,
    cursor,
    filter: 'posts_with_replies',
  });
  
  const reposts: RepostItem[] = response.data.feed
    .filter(item => item.reason?.$type === 'app.bsky.feed.defs#reasonRepost')
    .map(item => {
      const post = item.post;
      const reason = item.reason as { indexedAt?: string };
      
      return {
        uri: `at://${did}/app.bsky.feed.repost/${post.cid}`,
        cid: post.cid,
        type: 'repost' as const,
        repostedUri: post.uri,
        repostedPost: post,
        createdAt: new Date(reason.indexedAt || post.indexedAt),
      };
    });
  
  return {
    reposts,
    cursor: response.data.cursor,
  };
}

export async function fetchFollows(
  did: string,
  cursor?: string
): Promise<{ follows: FollowItem[]; cursor?: string }> {
  const agent = getAgent();
  
  const response = await agent.getFollows({
    actor: did,
    limit: 50,
    cursor,
  });
  
  const follows: FollowItem[] = response.data.follows.map(follow => {
    return {
      uri: `at://${did}/app.bsky.graph.follow/${follow.did}`,
      did: follow.did,
      handle: follow.handle,
      displayName: follow.displayName || null,
      avatar: follow.avatar || null,
      description: follow.description || null,
      followedAt: new Date(follow.indexedAt || Date.now()),
      followersCount: follow.viewer?.followedBy ? 1 : 0, // Limited info available
      followsCount: 0,
      postsCount: 0,
    };
  });
  
  return {
    follows,
    cursor: response.data.cursor,
  };
}

export async function deletePost(uri: string): Promise<void> {
  const agent = getAgent();
  await agent.deletePost(uri);
}

export async function deleteLike(uri: string): Promise<void> {
  const agent = getAgent();
  
  await agent.deleteLike(uri);
}

export async function deleteRepost(uri: string): Promise<void> {
  const agent = getAgent();
  
  await agent.deleteRepost(uri);
}

export async function deleteFollow(did: string): Promise<void> {
  const agent = getAgent();
  
  await agent.deleteFollow(did);
}

export async function deleteItems(
  items: { uri: string; type: 'post' | 'like' | 'repost' | 'follow'; did?: string }[],
  onProgress: (completed: number, total: number, failed: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      switch (item.type) {
        case 'post':
          await deletePost(item.uri);
          break;
        case 'like':
          await deleteLike(item.uri);
          break;
        case 'repost':
          await deleteRepost(item.uri);
          break;
        case 'follow':
          if (item.did) {
            await deleteFollow(item.did);
          }
          break;
      }
      success++;
    } catch (error) {
      console.error(`Failed to delete ${item.type}:`, error);
      failed++;
    }
    
    onProgress(success + failed, items.length, failed);
    
    // Rate limiting: wait 100ms between deletions
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { success, failed };
}
