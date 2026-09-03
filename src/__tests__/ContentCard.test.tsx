import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentCard } from '../components/ContentCard';
import type { PostItem } from '../types';

const quotedPost: PostItem = {
  uri: 'at://did:plc:author/app.bsky.feed.post/post-rkey',
  cid: 'post-cid',
  type: 'post',
  text: '',
  createdAt: new Date('2026-07-19T00:00:00Z'),
  likeCount: 0,
  repostCount: 0,
  replyCount: 0,
  isReply: false,
  quote: {
    quotedUri: 'at://did:plc:quoted/app.bsky.feed.post/quoted-rkey',
    quotedAuthor: 'quoted.bsky.social',
    quotedText: '',
  },
  embed: {
    $type: 'app.bsky.embed.record#view',
    record: {
      $type: 'app.bsky.embed.record#viewRecord',
      uri: 'at://did:plc:quoted/app.bsky.feed.post/quoted-rkey',
      cid: 'quoted-cid',
      author: {
        did: 'did:plc:quoted',
        handle: 'quoted.bsky.social',
      },
      value: {
        $type: 'app.bsky.feed.post',
        text: '',
        createdAt: '2026-07-18T00:00:00Z',
      },
      indexedAt: '2026-07-18T00:00:00Z',
      embeds: [
        {
          $type: 'app.bsky.embed.images#view',
          images: [
            {
              thumb: 'https://cdn.bsky.app/img/feed_thumbnail/quoted-image',
              fullsize: 'https://cdn.bsky.app/img/feed_fullsize/quoted-image',
              alt: 'Quoted image',
            },
          ],
        },
      ],
    },
  } as PostItem['embed'],
};

describe('ContentCard', () => {
  it('renders quote post details once', () => {
    render(
      <ContentCard
        item={quotedPost}
        isSelected={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getAllByText((_, element) => (
      element?.tagName === 'P'
      && element.textContent?.includes('Quoting @quoted.bsky.social') === true
    ))).toHaveLength(1);
    expect(screen.getAllByRole('img', { name: 'Quoted image' })).toHaveLength(1);
    expect(screen.queryByText('[Content unavailable]')).toBeNull();
  });
});
