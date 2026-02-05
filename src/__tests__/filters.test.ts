import { describe, it, expect } from 'vitest';
import { filterContent, getItemText, isAuthError, extractKeywords, generateDryRunSummary } from '../utils/filters';
import type { PostItem, LikeItem, FilterState } from '../types';

// Test fixtures
const makePost = (text: string, date: Date, overrides?: Partial<PostItem>): PostItem => ({
  uri: `at://did:plc:test/app.bsky.feed.post/${Math.random().toString(36)}`,
  cid: 'test-cid',
  type: 'post',
  text,
  createdAt: date,
  likeCount: 0,
  repostCount: 0,
  replyCount: 0,
  isReply: false,
  ...overrides,
});

const makeLike = (text: string, date: Date): LikeItem => ({
  uri: `at://did:plc:test/app.bsky.feed.like/${Math.random().toString(36)}`,
  cid: 'test-cid',
  type: 'like',
  likedUri: 'at://did:plc:other/app.bsky.feed.post/123',
  likedPost: {
    uri: 'at://did:plc:other/app.bsky.feed.post/123',
    cid: 'post-cid',
    author: { did: 'did:plc:other', handle: 'other.bsky.social' },
    record: { text, createdAt: date.toISOString() },
    indexedAt: date.toISOString(),
  } as LikeItem['likedPost'],
  createdAt: date,
});

describe('filterContent', () => {
  const posts = [
    makePost('Hello world', new Date('2024-01-15')),
    makePost('Testing Bluesky', new Date('2024-02-01')),
    makePost('Another post about testing', new Date('2024-02-15')),
  ];

  it('returns all items when no filters applied', () => {
    const filters: FilterState = { dateFrom: null, dateTo: null, keyword: '' };
    expect(filterContent(posts, filters)).toHaveLength(3);
  });

  it('filters by dateFrom', () => {
    const filters: FilterState = { dateFrom: new Date('2024-02-01'), dateTo: null, keyword: '' };
    const result = filterContent(posts, filters);
    expect(result).toHaveLength(2);
    expect(result.every(p => p.createdAt >= filters.dateFrom!)).toBe(true);
  });

  it('filters by dateTo', () => {
    const filters: FilterState = { dateFrom: null, dateTo: new Date('2024-01-31'), keyword: '' };
    const result = filterContent(posts, filters);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello world');
  });

  it('filters by date range', () => {
    const filters: FilterState = { 
      dateFrom: new Date('2024-01-20'), 
      dateTo: new Date('2024-02-10'), 
      keyword: '' 
    };
    const result = filterContent(posts, filters);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Testing Bluesky');
  });

  it('filters by keyword (case insensitive)', () => {
    const filters: FilterState = { dateFrom: null, dateTo: null, keyword: 'TESTING' };
    const result = filterContent(posts, filters);
    expect(result).toHaveLength(2);
    expect(result.every(p => p.text.toLowerCase().includes('testing'))).toBe(true);
  });

  it('combines date and keyword filters', () => {
    const filters: FilterState = { 
      dateFrom: new Date('2024-02-01'), 
      dateTo: null, 
      keyword: 'testing' 
    };
    const result = filterContent(posts, filters);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when nothing matches', () => {
    const filters: FilterState = { dateFrom: null, dateTo: null, keyword: 'nonexistent' };
    expect(filterContent(posts, filters)).toHaveLength(0);
  });
});

describe('getItemText', () => {
  it('extracts text from post', () => {
    const post = makePost('Hello world', new Date());
    expect(getItemText(post)).toBe('Hello world');
  });

  it('extracts text from like with post content', () => {
    const like = makeLike('Liked post content', new Date());
    expect(getItemText(like)).toBe('Liked post content');
  });

  it('returns empty string for like without post', () => {
    const like: LikeItem = {
      uri: 'at://test',
      cid: 'cid',
      type: 'like',
      likedUri: 'at://other',
      likedPost: null,
      createdAt: new Date(),
    };
    expect(getItemText(like)).toBe('');
  });
});

describe('isAuthError', () => {
  it('detects auth-related errors', () => {
    expect(isAuthError(new Error('Authentication failed'))).toBe(true);
    expect(isAuthError(new Error('Token expired'))).toBe(true);
    expect(isAuthError(new Error('Session invalid'))).toBe(true);
    expect(isAuthError(new Error('401 Unauthorized'))).toBe(true);
    expect(isAuthError(new Error('Your session has expired'))).toBe(true);
  });

  it('returns false for non-auth errors', () => {
    expect(isAuthError(new Error('Network error'))).toBe(false);
    expect(isAuthError(new Error('Not found'))).toBe(false);
    expect(isAuthError(new Error('Server error'))).toBe(false);
  });

  it('handles non-Error values', () => {
    expect(isAuthError('string error')).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError({ message: 'auth' })).toBe(false);
  });
});

describe('extractKeywords', () => {
  it('extracts common keywords from texts', () => {
    const texts = [
      'This is about testing and development',
      'More testing of the application',
      'Development is fun when testing works',
    ];
    const keywords = extractKeywords(texts);
    expect(keywords).toContain('testing');
    expect(keywords).toContain('development');
  });

  it('filters out stop words', () => {
    const texts = ['this that with from have', 'this that with from have'];
    const keywords = extractKeywords(texts);
    expect(keywords).toHaveLength(0);
  });

  it('filters out short words', () => {
    const texts = ['the cat sat mat', 'the cat sat mat'];
    const keywords = extractKeywords(texts, 4);
    expect(keywords).toHaveLength(0);
  });

  it('only includes words appearing more than once', () => {
    const texts = ['unique word here', 'different words there'];
    const keywords = extractKeywords(texts);
    expect(keywords).toHaveLength(0);
  });

  it('respects maxKeywords limit', () => {
    const texts = Array(10).fill('alpha beta gamma delta epsilon zeta theta');
    const keywords = extractKeywords(texts, 4, 3);
    expect(keywords).toHaveLength(3);
  });
});

describe('generateDryRunSummary', () => {
  it('generates correct summary for posts', () => {
    const items = [
      makePost('First post', new Date('2024-01-01'), { likeCount: 5, repostCount: 2, replyCount: 1 }),
      makePost('Second post', new Date('2024-01-15'), { likeCount: 10, repostCount: 3, replyCount: 2 }),
    ];
    
    const summary = generateDryRunSummary(items);
    
    expect(summary.totalCount).toBe(2);
    expect(summary.postCount).toBe(2);
    expect(summary.likeCount).toBe(0);
    expect(summary.repostCount).toBe(0);
    expect(summary.oldestDate).toEqual(new Date('2024-01-01'));
    expect(summary.newestDate).toEqual(new Date('2024-01-15'));
    expect(summary.totalEngagement.likes).toBe(15);
    expect(summary.totalEngagement.reposts).toBe(5);
    expect(summary.totalEngagement.replies).toBe(3);
  });

  it('handles mixed content types', () => {
    const items = [
      makePost('Post content', new Date('2024-01-01')),
      makeLike('Liked content', new Date('2024-01-02')),
    ];
    
    const summary = generateDryRunSummary(items);
    
    expect(summary.totalCount).toBe(2);
    expect(summary.postCount).toBe(1);
    expect(summary.likeCount).toBe(1);
  });

  it('handles empty array', () => {
    const summary = generateDryRunSummary([]);
    
    expect(summary.totalCount).toBe(0);
    expect(summary.oldestDate).toBeNull();
    expect(summary.newestDate).toBeNull();
    expect(summary.topKeywords).toHaveLength(0);
  });
});
