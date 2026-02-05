import type { ContentItem, PostItem, LikeItem, RepostItem } from '../types';

interface ContentCardProps {
  item: ContentItem;
  isSelected: boolean;
  onToggle: (uri: string) => void;
}

// Convert AT URI to Bluesky web URL
function getBskyUrl(uri: string, handle?: string): string | null {
  // URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const match = uri.match(/at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)/);
  if (!match) return null;
  const [, did, rkey] = match;
  // Use handle if provided, otherwise use DID
  const identifier = handle || did;
  return `https://bsky.app/profile/${identifier}/post/${rkey}`;
}

function ExternalLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`text-blue-500 hover:text-blue-600 hover:underline ${className}`}
    >
      {children}
    </a>
  );
}

export function ContentCard({ item, isSelected, onToggle }: ContentCardProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getContent = () => {
    switch (item.type) {
      case 'post':
        return <PostContent item={item} />;
      case 'like':
        return <LikeContent item={item} />;
      case 'repost':
        return <RepostContent item={item} />;
    }
  };

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
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              item.type === 'post' && !item.isReply
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : item.type === 'post' && item.isReply
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : item.type === 'like'
                ? 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
            }`}>
              {item.type === 'post' && item.isReply ? 'reply' : item.type}
              {item.type === 'post' && item.quote && ' + quote'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(item.createdAt)}
            </span>
          </div>
          {getContent()}
        </div>
      </div>
    </div>
  );
}

function PostContent({ item }: { item: PostItem }) {
  const truncate = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trim() + '…';
  };

  const postUrl = getBskyUrl(item.uri);

  return (
    <div>
      {/* Reply context */}
      {item.replyTo && (
        <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            ↩️ Replying to{' '}
            {getBskyUrl(item.replyTo.parentUri, item.replyTo.parentAuthor) ? (
              <ExternalLink href={getBskyUrl(item.replyTo.parentUri, item.replyTo.parentAuthor)!}>
                @{item.replyTo.parentAuthor}
              </ExternalLink>
            ) : (
              `@${item.replyTo.parentAuthor}`
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
            "{truncate(item.replyTo.parentText, 120)}"
          </p>
        </div>
      )}

      {/* Post text */}
      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
        {item.text}
      </p>

      {/* Quote post */}
      {item.quote && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            📎 Quoting{' '}
            {getBskyUrl(item.quote.quotedUri, item.quote.quotedAuthor) ? (
              <ExternalLink href={getBskyUrl(item.quote.quotedUri, item.quote.quotedAuthor)!}>
                @{item.quote.quotedAuthor}
              </ExternalLink>
            ) : (
              `@${item.quote.quotedAuthor}`
            )}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {truncate(item.quote.quotedText, 150)}
          </p>
        </div>
      )}

      {/* Engagement stats + link */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>❤️ {item.likeCount}</span>
        <span>🔁 {item.repostCount}</span>
        <span>💬 {item.replyCount}</span>
        {postUrl && (
          <ExternalLink href={postUrl} className="ml-auto">
            View on Bluesky ↗
          </ExternalLink>
        )}
      </div>
    </div>
  );
}

function LikeContent({ item }: { item: LikeItem }) {
  const record = item.likedPost?.record as { text?: string } | undefined;
  const text = record?.text || '[Content unavailable]';
  const author = item.likedPost?.author;
  const postUrl = item.likedPost ? getBskyUrl(item.likedPost.uri, author?.handle) : null;

  return (
    <div className="text-gray-600 dark:text-gray-300">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        Liked post by{' '}
        {postUrl ? (
          <ExternalLink href={postUrl}>@{author?.handle || 'unknown'}</ExternalLink>
        ) : (
          `@${author?.handle || 'unknown'}`
        )}
      </p>
      <p className="text-sm whitespace-pre-wrap break-words line-clamp-3">
        {text}
      </p>
      {postUrl && (
        <div className="mt-2">
          <ExternalLink href={postUrl} className="text-xs">
            View on Bluesky ↗
          </ExternalLink>
        </div>
      )}
    </div>
  );
}

function RepostContent({ item }: { item: RepostItem }) {
  const record = item.repostedPost?.record as { text?: string } | undefined;
  const text = record?.text || '[Content unavailable]';
  const author = item.repostedPost?.author;
  const postUrl = item.repostedPost ? getBskyUrl(item.repostedPost.uri, author?.handle) : null;

  return (
    <div className="text-gray-600 dark:text-gray-300">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        Reposted from{' '}
        {postUrl ? (
          <ExternalLink href={postUrl}>@{author?.handle || 'unknown'}</ExternalLink>
        ) : (
          `@${author?.handle || 'unknown'}`
        )}
      </p>
      <p className="text-sm whitespace-pre-wrap break-words line-clamp-3">
        {text}
      </p>
      {postUrl && (
        <div className="mt-2">
          <ExternalLink href={postUrl} className="text-xs">
            View on Bluesky ↗
          </ExternalLink>
        </div>
      )}
    </div>
  );
}
