import { useState, useCallback } from 'react';
import type { PostItem, LikeItem, RepostItem, FollowItem, FilterState, ContentItem } from '../types';
import * as bluesky from '../services/bluesky';

function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('auth') || msg.includes('token') || msg.includes('session') || msg.includes('401') || msg.includes('expired');
  }
  return false;
}

export function useContent(did: string | null, onError?: (message: string, isAuthError: boolean) => void) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [likes, setLikes] = useState<LikeItem[]>([]);
  const [reposts, setReposts] = useState<RepostItem[]>([]);
  const [follows, setFollows] = useState<FollowItem[]>([]);
  
  const [postsLoading, setPostsLoading] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [repostsLoading, setRepostsLoading] = useState(false);
  const [followsLoading, setFollowsLoading] = useState(false);
  
  const [postsCursor, setPostsCursor] = useState<string | undefined>();
  const [likesCursor, setLikesCursor] = useState<string | undefined>();
  const [repostsCursor, setRepostsCursor] = useState<string | undefined>();
  const [followsCursor, setFollowsCursor] = useState<string | undefined>();
  
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (loadMore = false) => {
    if (!did) return;
    // Allow fresh reload even if loading, but prevent duplicate load-more
    if (loadMore && postsLoading) return;
    
    setPostsLoading(true);
    setError(null);
    
    try {
      const result = await bluesky.fetchPosts(did, loadMore ? postsCursor : undefined);
      setPosts(prev => loadMore ? [...prev, ...result.posts] : result.posts);
      setPostsCursor(result.cursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setError(message);
      onError?.(message, isAuthError(err));
    } finally {
      setPostsLoading(false);
    }
  }, [did, postsCursor, postsLoading, onError]);

  const loadLikes = useCallback(async (loadMore = false) => {
    if (!did) return;
    if (loadMore && likesLoading) return;
    
    setLikesLoading(true);
    setError(null);
    
    try {
      const result = await bluesky.fetchLikes(did, loadMore ? likesCursor : undefined);
      setLikes(prev => loadMore ? [...prev, ...result.likes] : result.likes);
      setLikesCursor(result.cursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load likes';
      setError(message);
      onError?.(message, isAuthError(err));
    } finally {
      setLikesLoading(false);
    }
  }, [did, likesCursor, likesLoading, onError]);

  const loadReposts = useCallback(async (loadMore = false) => {
    if (!did) return;
    if (loadMore && repostsLoading) return;
    
    setRepostsLoading(true);
    setError(null);
    
    try {
      const result = await bluesky.fetchReposts(did, loadMore ? repostsCursor : undefined);
      setReposts(prev => loadMore ? [...prev, ...result.reposts] : result.reposts);
      setRepostsCursor(result.cursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reposts';
      setError(message);
      onError?.(message, isAuthError(err));
    } finally {
      setRepostsLoading(false);
    }
  }, [did, repostsCursor, repostsLoading, onError]);

  const loadFollows = useCallback(async (loadMore = false) => {
    if (!did) return;
    if (loadMore && followsLoading) return;
    
    setFollowsLoading(true);
    setError(null);
    
    try {
      const result = await bluesky.fetchFollows(did, loadMore ? followsCursor : undefined);
      setFollows(prev => loadMore ? [...prev, ...result.follows] : result.follows);
      setFollowsCursor(result.cursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load follows';
      setError(message);
      onError?.(message, isAuthError(err));
    } finally {
      setFollowsLoading(false);
    }
  }, [did, followsCursor, followsLoading, onError]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadPosts(), loadLikes(), loadReposts(), loadFollows()]);
  }, [loadPosts, loadLikes, loadReposts, loadFollows]);

  const removeItems = useCallback((uris: Set<string>) => {
    setPosts(prev => prev.filter(p => !uris.has(p.uri)));
    setLikes(prev => prev.filter(l => !uris.has(l.uri)));
    setReposts(prev => prev.filter(r => !uris.has(r.uri)));
    setFollows(prev => prev.filter(f => !uris.has(f.uri)));
  }, []);

  return {
    posts,
    likes,
    reposts,
    follows,
    postsLoading,
    likesLoading,
    repostsLoading,
    followsLoading,
    postsCursor,
    likesCursor,
    repostsCursor,
    followsCursor,
    error,
    loadPosts,
    loadLikes,
    loadReposts,
    loadFollows,
    loadAll,
    removeItems,
  };
}

export function filterContent<T extends ContentItem>(
  items: T[],
  filters: FilterState
): T[] {
  return items.filter(item => {
    // Date filter
    if (filters.dateFrom && item.createdAt < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && item.createdAt > filters.dateTo) {
      return false;
    }
    
    // Keyword filter
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      let text = '';
      
      if (item.type === 'post') {
        text = item.text;
      } else if (item.type === 'like' && item.likedPost) {
        const record = item.likedPost.record as { text?: string };
        text = record.text || '';
      } else if (item.type === 'repost' && item.repostedPost) {
        const record = item.repostedPost.record as { text?: string };
        text = record.text || '';
      }
      
      if (!text.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    
    return true;
  });
}
