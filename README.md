# Bluesky Cleaner

<img src="public/favicon.svg" alt="Bluesky Cleaner logo" width="128" height="128">

A web-based tool to help you clean up your old Bluesky posts, likes, reposts, and follows.

## Features

- **100% Client-Side** - Your credentials never leave your browser
- **Browse Content** - View your posts, likes, reposts, and follows with pagination
- **Smart Filtering** - Filter by date range and keyword search
- **Bulk Selection** - Select individual items or all filtered results
- **Dry Run Preview** - See a summary before deleting (counts, date range, detected topics)
- **Safe Deletion** - Confirmation dialogs and progress indicators
- **Dark Mode** - Automatic dark mode support based on system preferences

## Privacy & Security

- Uses Bluesky [App Passwords](https://bsky.app/settings/app-passwords) for authentication
- Credentials are stored only in memory during your session
- No data is sent to any third-party servers
- All API calls go directly from your browser to Bluesky

## Getting Started

### Online

Visit [TODO: add deployed URL] to use the tool directly.

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/bksy-cleaner.git
cd bksy-cleaner

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Create an [App Password](https://bsky.app/settings/app-passwords) in your Bluesky settings
2. Enter your handle (e.g., `username.bsky.social`) and app password
3. Browse your content using the tabs (Posts, Likes, Reposts, Follows)
4. Use filters to narrow down what you want to delete
5. Select items by clicking on them or use "Select All"
6. Click "Delete selected" to see a preview summary
7. Confirm to delete the selected items

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for fast builds
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [@atproto/api](https://www.npmjs.com/package/@atproto/api) for Bluesky integration

## Future Features

- [ ] AI-powered content categorization (political, snarky, etc.)
- [ ] Export data before deletion
- [ ] Scheduled cleanup rules

## Credits

Built with [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli/).

## License

[AGPL-3.0](LICENSE) - This software is free to use and modify, but any modifications must be shared under the same license. If you run a modified version as a network service, you must make the source code available to users.
