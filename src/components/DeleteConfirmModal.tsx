import type { DryRunSummary } from '../types';

interface ExtendedSummary extends DryRunSummary {
  followCount?: number;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  summary: ExtendedSummary;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  deleteProgress: { completed: number; total: number; failed: number } | null;
}

export function DeleteConfirmModal({
  isOpen,
  summary,
  onConfirm,
  onCancel,
  isDeleting,
  deleteProgress,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const progressPercent = deleteProgress
    ? Math.round((deleteProgress.completed / deleteProgress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={!isDeleting ? onCancel : undefined}
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 shadow-xl">
          {!isDeleting ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ⚠️ Confirm Deletion
              </h3>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Summary of items to be deleted:
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Total items:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {summary.totalCount}
                    </span>
                  </div>

                  <div className="flex gap-4 text-xs flex-wrap">
                    <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      {summary.postCount} posts
                    </span>
                    <span className="bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 px-2 py-1 rounded">
                      {summary.likeCount} likes
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                      {summary.repostCount} reposts
                    </span>
                    {summary.followCount !== undefined && summary.followCount > 0 && (
                      <span className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                        {summary.followCount} follows
                      </span>
                    )}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Date range:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(summary.oldestDate)} – {formatDate(summary.newestDate)}
                      </span>
                    </div>
                  </div>

                  {summary.postCount > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        Engagement on posts being deleted:
                      </p>
                      <div className="flex gap-3 text-xs">
                        <span>❤️ {summary.totalEngagement.likes} likes</span>
                        <span>🔁 {summary.totalEngagement.reposts} reposts</span>
                        <span>💬 {summary.totalEngagement.replies} replies</span>
                      </div>
                    </div>
                  )}

                  {summary.topKeywords.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        Common topics detected:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {summary.topKeywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                This action cannot be undone. Are you sure you want to delete these items?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete {summary.totalCount} items
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🗑️ Deleting...
              </h3>

              <div className="mb-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {deleteProgress?.completed} / {deleteProgress?.total} completed
                  {deleteProgress?.failed ? (
                    <span className="text-red-500 ml-2">
                      ({deleteProgress.failed} failed)
                    </span>
                  ) : null}
                </p>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Please wait, this may take a while...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
