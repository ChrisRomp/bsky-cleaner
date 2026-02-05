import type { FollowItem } from '../types';

interface FollowCardProps {
  item: FollowItem;
  isSelected: boolean;
  onToggle: (uri: string) => void;
}

export function FollowCard({ item, isSelected, onToggle }: FollowCardProps) {
  const profileUrl = `https://bsky.app/profile/${item.handle}`;

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={() => onToggle(item.uri)}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(item.uri)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.handle}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {item.handle.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {item.displayName || item.handle}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  follow
                </span>
              </div>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:underline"
              >
                @{item.handle}
              </a>
            </div>
          </div>
          
          {item.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {item.description}
            </p>
          )}
          
          <div className="mt-2 flex items-center gap-2">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
            >
              View profile ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
