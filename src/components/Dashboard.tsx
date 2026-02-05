import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ContentItem, FilterState, ContentType, DryRunSummary, PostItem, FollowItem } from '../types';
import { ContentCard } from './ContentCard';
import { FollowCard } from './FollowCard';
import { FilterBar } from './FilterBar';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { filterContent } from '../hooks/useContent';
import * as bluesky from '../services/bluesky';

interface DashboardProps {
  handle: string;
  did: string;
  posts: PostItem[];
  likes: ContentItem[];
  reposts: ContentItem[];
  follows: FollowItem[];
  postsLoading: boolean;
  likesLoading: boolean;
  repostsLoading: boolean;
  followsLoading: boolean;
  postsCursor?: string;
  likesCursor?: string;
  repostsCursor?: string;
  followsCursor?: string;
  onLoadMorePosts: () => void;
  onLoadMoreLikes: () => void;
  onLoadMoreReposts: () => void;
  onLoadMoreFollows: () => void;
  onRemoveItems: (uris: Set<string>) => void;
  onReload: () => void;
  onSessionError: () => void;
  onLogout: () => void;
  onDeleteError: (message: string) => void;
  onDeleteSuccess: (count: number) => void;
  hasLogEntries: boolean;
}

export function Dashboard({
  handle,
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
  onLoadMorePosts,
  onLoadMoreLikes,
  onLoadMoreReposts,
  onLoadMoreFollows,
  onRemoveItems,
  onReload,
  onSessionError,
  onLogout,
  onDeleteError,
  onDeleteSuccess,
  hasLogEntries,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('posts');
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: null,
    dateTo: null,
    keyword: '',
  });
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{
    completed: number;
    total: number;
    failed: number;
  } | null>(null);
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState<FilterState>(filters);
  const prevTabRef = useRef(activeTab);

  // Debounce filter changes (especially for keyword typing)
  useEffect(() => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    filterTimeoutRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
      setAutoLoadCount(0); // Reset counter on filter change
    }, 500);
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [filters]);
  
  // Reset auto-load counter when tab changes
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoLoadCount(0);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const filteredPosts = useMemo(() => filterContent(posts, filters), [posts, filters]);
  const filteredLikes = useMemo(() => filterContent(likes, filters), [likes, filters]);
  const filteredReposts = useMemo(() => filterContent(reposts, filters), [reposts, filters]);
  
  // Filter follows by keyword (searches handle, displayName, description)
  const filteredFollows = useMemo(() => {
    if (!filters.keyword) return follows;
    const keyword = filters.keyword.toLowerCase();
    return follows.filter(f => 
      f.handle.toLowerCase().includes(keyword) ||
      f.displayName?.toLowerCase().includes(keyword) ||
      f.description?.toLowerCase().includes(keyword)
    );
  }, [follows, filters.keyword]);

  const currentItems = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        return filteredPosts;
      case 'likes':
        return filteredLikes;
      case 'reposts':
        return filteredReposts;
      case 'follows':
        return filteredFollows;
    }
  }, [activeTab, filteredPosts, filteredLikes, filteredReposts, filteredFollows]);

  const isLoading = activeTab === 'posts' ? postsLoading : activeTab === 'likes' ? likesLoading : activeTab === 'reposts' ? repostsLoading : followsLoading;
  const cursor = activeTab === 'posts' ? postsCursor : activeTab === 'likes' ? likesCursor : activeTab === 'reposts' ? repostsCursor : followsCursor;
  const loadMore = activeTab === 'posts' ? onLoadMorePosts : activeTab === 'likes' ? onLoadMoreLikes : activeTab === 'reposts' ? onLoadMoreReposts : onLoadMoreFollows;

  // Check if filters are active
  const hasActiveFilters = debouncedFilters.dateFrom || debouncedFilters.dateTo || (debouncedFilters.keyword && debouncedFilters.keyword.length >= 3);
  
  const MIN_RESULTS = 10;
  const MAX_AUTO_LOADS = 10;
  
  // Derive if we're auto-loading (filters active, few results, more to fetch, under limit)
  const isAutoLoading = hasActiveFilters && 
    currentItems.length < MIN_RESULTS && 
    cursor && 
    autoLoadCount < MAX_AUTO_LOADS;
  
  // Auto-load more content when filters result in few matches
  useEffect(() => {
    if (!hasActiveFilters) {
      return;
    }
    
    // Don't auto-load if already loading, no cursor, or hit limit
    if (isLoading || !cursor || autoLoadCount >= MAX_AUTO_LOADS) {
      return;
    }
    
    // Auto-load if we have few filtered results
    if (currentItems.length < MIN_RESULTS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoLoadCount(c => c + 1);
      loadMore();
    }
  }, [hasActiveFilters, currentItems.length, isLoading, cursor, loadMore, autoLoadCount]);

  const handleToggleSelect = useCallback((uri: string) => {
    setSelectedUris(prev => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allUris = currentItems.map(item => item.uri);
    setSelectedUris(prev => {
      const allSelected = allUris.every(uri => prev.has(uri));
      if (allSelected) {
        const next = new Set(prev);
        allUris.forEach(uri => next.delete(uri));
        return next;
      } else {
        return new Set([...prev, ...allUris]);
      }
    });
  }, [currentItems]);

  // Get all selected content items (posts, likes, reposts)
  const selectedContentItems = useMemo(() => {
    const allItems = [...posts, ...likes, ...reposts];
    return allItems.filter(item => selectedUris.has(item.uri));
  }, [posts, likes, reposts, selectedUris]);

  // Get selected follows separately
  const selectedFollowItems = useMemo(() => {
    return follows.filter(f => selectedUris.has(f.uri));
  }, [follows, selectedUris]);

  const dryRunSummary = useMemo((): DryRunSummary & { followCount: number } => {
    const items = selectedContentItems;
    const postItems = items.filter(i => i.type === 'post') as PostItem[];
    const likeItems = items.filter(i => i.type === 'like');
    const repostItems = items.filter(i => i.type === 'repost');
    const followCount = selectedFollowItems.length;

    const allDates = [
      ...items.map(i => i.createdAt),
      ...selectedFollowItems.map(f => f.followedAt)
    ].sort((a, b) => a.getTime() - b.getTime());

    // Extract keywords from text content
    const allText = items.map(item => {
      if (item.type === 'post') return item.text;
      if (item.type === 'like' && item.likedPost) {
        const record = item.likedPost.record as { text?: string };
        return record.text || '';
      }
      if (item.type === 'repost' && item.repostedPost) {
        const record = item.repostedPost.record as { text?: string };
        return record.text || '';
      }
      return '';
    }).join(' ');

    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4);

    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stopWords = new Set(['about', 'would', 'could', 'should', 'there', 'their', 'these', 'those', 'thing', 'things', 'being', 'really', 'going', 'think', 'thought', 'https']);
    const topKeywords = Object.entries(wordCounts)
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return {
      totalCount: items.length + followCount,
      postCount: postItems.length,
      likeCount: likeItems.length,
      repostCount: repostItems.length,
      followCount,
      oldestDate: allDates[0] || null,
      newestDate: allDates[allDates.length - 1] || null,
      topKeywords,
      totalEngagement: {
        likes: postItems.reduce((sum, p) => sum + p.likeCount, 0),
        reposts: postItems.reduce((sum, p) => sum + p.repostCount, 0),
        replies: postItems.reduce((sum, p) => sum + p.replyCount, 0),
      },
    };
  }, [selectedContentItems, selectedFollowItems]);

  const handleDelete = async () => {
    const totalItems = selectedContentItems.length + selectedFollowItems.length;
    setIsDeleting(true);
    setDeleteProgress({ completed: 0, total: totalItems, failed: 0 });
    setDeleteError(null);

    const itemsToDelete = [
      ...selectedContentItems.map(item => ({
        uri: item.uri,
        type: item.type,
      })),
      ...selectedFollowItems.map(item => ({
        uri: item.uri,
        type: 'follow' as const,
        did: item.did,
      })),
    ];

    try {
      const result = await bluesky.deleteItems(itemsToDelete, (completed, total, failed) => {
        setDeleteProgress({ completed, total, failed });
      });

      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteProgress(null);

      if (result.failed > 0 && result.success === 0) {
        // All failed - likely session expired
        const msg = 'All deletions failed. Your session may have expired.';
        setDeleteError(msg);
        onDeleteError(msg);
        onSessionError();
      } else if (result.failed > 0) {
        // Partial failure
        const msg = `${result.failed} item(s) failed to delete.`;
        setDeleteError(msg);
        onDeleteError(msg);
        if (result.success > 0) {
          onDeleteSuccess(result.success);
        }
        // Reload to get accurate state
        setTimeout(() => {
          onReload();
          setSelectedUris(new Set());
          setDeleteError(null);
        }, 2000);
      } else if (result.success > 0) {
        // All succeeded - remove from local state immediately (optimistic update)
        onRemoveItems(selectedUris);
        setSelectedUris(new Set());
        onDeleteSuccess(result.success);
        // Don't reload immediately - API propagation can be slow and would show stale data
        // User can manually reload if needed via filter reset or tab switch
      }
    } catch (error) {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteProgress(null);
      
      const message = error instanceof Error ? error.message : 'Deletion failed';
      onDeleteError(message);
      if (message.includes('auth') || message.includes('session') || message.includes('401')) {
        setDeleteError('Session expired. Please log in again.');
        onSessionError();
      } else {
        setDeleteError(message);
      }
    }
  };

  const allSelected = currentItems.length > 0 && currentItems.every(item => selectedUris.has(item.uri));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-56">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              🦋 Bluesky Cleaner
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{handle}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Error banner */}
        {deleteError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-red-700 dark:text-red-300">{deleteError}</span>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <FilterBar filters={filters} onFilterChange={setFilters} />

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
          {(['posts', 'likes', 'reposts', 'follows'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-2 text-xs opacity-75">
                ({tab === 'posts' ? filteredPosts.length : tab === 'likes' ? filteredLikes.length : tab === 'reposts' ? filteredReposts.length : filteredFollows.length})
              </span>
            </button>
          ))}
        </div>

        {/* Selection bar */}
        {selectedUris.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedUris.size} item{selectedUris.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedUris(new Set())}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
              >
                Delete selected
              </button>
            </div>
          </div>
        )}

        {/* Select all */}
        {currentItems.length > 0 && (
          <div className="mb-3">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allSelected ? 'Deselect all' : `Select all ${currentItems.length} visible items`}
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="space-y-3">
          {activeTab === 'follows' ? (
            // Render follows with FollowCard
            filteredFollows.map(item => (
              <FollowCard
                key={item.uri}
                item={item}
                isSelected={selectedUris.has(item.uri)}
                onToggle={handleToggleSelect}
              />
            ))
          ) : (
            // Render other content types with ContentCard
            (currentItems as ContentItem[]).map(item => (
              <ContentCard
                key={item.uri}
                item={item}
                isSelected={selectedUris.has(item.uri)}
                onToggle={handleToggleSelect}
              />
            ))
          )}

          {isLoading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {isAutoLoading ? 'Searching for matching content...' : 'Loading...'}
            </div>
          )}

          {!isLoading && currentItems.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {hasActiveFilters && !cursor 
                ? 'No matching items found' 
                : 'No items found'}
            </div>
          )}

          {!isLoading && cursor && (
            <button
              onClick={() => loadMore()}
              className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Load more...
            </button>
          )}

          {/* Bottom selection bar - fixed above activity log */}
          {selectedUris.size > 0 && currentItems.length > 5 && (
            <div className="fixed left-0 right-0 bottom-0 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-200 dark:border-blue-800 p-3 flex items-center justify-between z-[60] shadow-lg">
              <span className="text-sm text-blue-700 dark:text-blue-300 ml-4">
                {selectedUris.size} item{selectedUris.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 mr-4">
                <button
                  onClick={() => setSelectedUris(new Set())}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear selection
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Delete selected
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        summary={dryRunSummary}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
        deleteProgress={deleteProgress}
      />
    </div>
  );
}
