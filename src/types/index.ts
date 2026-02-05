import type { AppBskyFeedDefs } from '@atproto/api';

export interface AuthState {
  isAuthenticated: boolean;
  handle: string | null;
  did: string | null;
}

export interface ReplyRef {
  parentUri: string;
  parentAuthor: string;
  parentText: string;
  rootAuthor: string;
}

export interface QuoteRef {
  quotedUri: string;
  quotedAuthor: string;
  quotedText: string;
}

export interface PostItem {
  uri: string;
  cid: string;
  type: 'post';
  text: string;
  createdAt: Date;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  isReply: boolean;
  replyTo?: ReplyRef;
  quote?: QuoteRef;
}

export interface LikeItem {
  uri: string;
  cid: string;
  type: 'like';
  likedUri: string;
  likedPost: AppBskyFeedDefs.PostView | null;
  createdAt: Date;
}

export interface RepostItem {
  uri: string;
  cid: string;
  type: 'repost';
  repostedUri: string;
  repostedPost: AppBskyFeedDefs.PostView | null;
  createdAt: Date;
}

export type ContentItem = PostItem | LikeItem | RepostItem;

export type ContentType = 'posts' | 'likes' | 'reposts' | 'follows';

export interface FollowItem {
  uri: string;  // The follow record URI
  did: string;  // The followed user's DID
  handle: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  followedAt: Date;
  followersCount: number;
  followsCount: number;
  postsCount: number;
}

export interface FilterState {
  dateFrom: Date | null;
  dateTo: Date | null;
  keyword: string;
}

export interface DryRunSummary {
  totalCount: number;
  postCount: number;
  likeCount: number;
  repostCount: number;
  oldestDate: Date | null;
  newestDate: Date | null;
  topKeywords: string[];
  totalEngagement: {
    likes: number;
    reposts: number;
    replies: number;
  };
}
