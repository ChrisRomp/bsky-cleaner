# Agent Instructions

Context for AI coding assistants working on this codebase.

## Architecture

- **Fully client-side** - No backend server. All API calls go directly from browser to Bluesky.
- **Session storage** - Tokens stored in sessionStorage (cleared on tab close). Never localStorage.
- **Optimistic updates** - After deletion, items are removed from local state immediately rather than refetching.

## Key Files

| File | Purpose |
|------|---------|
| `src/services/bluesky.ts` | All AT Protocol API interactions |
| `src/hooks/useAuth.ts` | Authentication state and session management |
| `src/hooks/useContent.ts` | Content fetching, filtering, pagination |
| `src/components/Dashboard.tsx` | Main UI with tabs, selection, deletion logic |
| `src/components/ContentCard.tsx` | Content rendering with embed previews for posts, likes, reposts |
| `src/components/ErrorLog.tsx` | Activity log for errors/warnings |

## AT Protocol Gotchas

These caused bugs during development:

1. **`deletePost(uri)` expects full AT URI** - Not just the rkey. Pass the complete `at://did:plc:xxx/app.bsky.feed.post/rkey` string.

2. **`agent.session` is read-only** - Cannot set directly. Must use `resumeSession()` with both `accessJwt` and `refreshJwt`.

3. **`resumeSession()` requires refreshJwt** - Will 400 error if refreshJwt is empty string or missing.

4. **Deleted parent posts** - When fetching posts, `reply.parent.record` can be undefined if the parent was deleted. Always null-check.

5. **Token lifetimes** - accessJwt ~2 hours, refreshJwt ~2 months. The `persistSession` callback fires on refresh.

6. **`PostView.record.text` can be empty for media posts** - Image-only, video-only, and link-only posts have `text: ""`. Always check `post.embed` for content when text is empty. Embed thumbnails are CDN URLs available without extra API calls.

## Code Conventions

- Use `import type` for type-only imports (Vite's verbatimModuleSyntax)
- Prefix unused callback args with `_` (e.g., `_event`)
- Run `npm run check` (tsc + eslint) before committing
- **Always run `npm run check` and `npm test` before pushing to `main`** — CI runs lint, type-check, test, and build on every push

## Testing

- Unit tests use Vitest: `npm test`
- CI workflow: `.github/workflows/ci.yml` (test + deploy to GitHub Pages)
- Manual testing with Playwright browser tools
- Test credentials can be stored in `.env` (not committed)
- Use `user_handle` and `app_password` env vars
