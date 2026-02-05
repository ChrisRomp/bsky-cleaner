import type { ContentItem, FilterState, PostItem, LikeItem, RepostItem, FollowItem, DryRunSummary } from '../types';

/**
 * Filter content items by date range and keyword
 */
export function filterContent<T extends ContentItem | FollowItem>(
  items: T[],
  filters: FilterState
): T[] {
  return items.filter(item => {
    const itemDate = 'createdAt' in item ? item.createdAt : (item as FollowItem).followedAt;
    
    // Date filter
    if (filters.dateFrom && itemDate < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && itemDate > filters.dateTo) {
      return false;
    }
    
    // Keyword filter
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      const text = getItemText(item);
      
      if (!text.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Extract searchable text from a content item
 */
export function getItemText(item: ContentItem | FollowItem): string {
  if ('type' in item) {
    if (item.type === 'post') {
      return item.text;
    } else if (item.type === 'like' && item.likedPost) {
      const record = item.likedPost.record as { text?: string };
      return record.text || '';
    } else if (item.type === 'repost' && item.repostedPost) {
      const record = item.repostedPost.record as { text?: string };
      return record.text || '';
    }
  }
  // FollowItem
  if ('handle' in item) {
    return `${item.handle} ${item.displayName || ''} ${item.description || ''}`;
  }
  return '';
}

/**
 * Check if an error is authentication-related
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('auth') || msg.includes('token') || msg.includes('session') || msg.includes('401') || msg.includes('expired');
  }
  return false;
}

/**
 * Extract common keywords from text content
 */
export function extractKeywords(texts: string[], minLength = 4, maxKeywords = 5): string[] {
  const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what', 'when', 'where', 'which', 'there', 'would', 'could', 'should', 'about', 'just', 'like', 'more', 'some', 'than', 'them', 'then', 'these', 'into', 'very', 'will', 'your', 'also', 'here', 'https', 'http', 'www']);
  
  const wordCounts = new Map<string, number>();
  
  for (const text of texts) {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    for (const word of words) {
      if (word.length >= minLength && !stopWords.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }
  
  return [...wordCounts.entries()]
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Generate a dry-run summary from selected items
 */
export function generateDryRunSummary(
  items: (PostItem | LikeItem | RepostItem)[]
): DryRunSummary {
  const posts = items.filter((i): i is PostItem => i.type === 'post');
  const likes = items.filter((i): i is LikeItem => i.type === 'like');
  const reposts = items.filter((i): i is RepostItem => i.type === 'repost');
  
  const dates = items.map(i => i.createdAt).sort((a, b) => a.getTime() - b.getTime());
  
  // Collect text for keyword extraction
  const texts = items.map(getItemText).filter(t => t.length > 0);
  
  return {
    totalCount: items.length,
    postCount: posts.length,
    likeCount: likes.length,
    repostCount: reposts.length,
    oldestDate: dates[0] || null,
    newestDate: dates[dates.length - 1] || null,
    topKeywords: extractKeywords(texts),
    totalEngagement: {
      likes: posts.reduce((sum, p) => sum + p.likeCount, 0),
      reposts: posts.reduce((sum, p) => sum + p.repostCount, 0),
      replies: posts.reduce((sum, p) => sum + p.replyCount, 0),
    },
  };
}
