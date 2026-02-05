import { useState } from 'react';

interface LoginFormProps {
  onLogin: (handle: string, appPassword: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  sessionExpired?: boolean;
  onClearSessionExpired?: () => void;
}

export function LoginForm({ onLogin, isLoading, error, sessionExpired, onClearSessionExpired }: LoginFormProps) {
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onClearSessionExpired?.();
    await onLogin(handle, appPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {sessionExpired && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
            <p className="text-amber-800 dark:text-amber-200 font-medium">Session expired</p>
            <p className="text-amber-600 dark:text-amber-300 text-sm mt-1">
              Please log in again to continue.
            </p>
          </div>
        )}
        <div className="text-center">
          <img 
            src="/favicon.svg" 
            alt="Bluesky Cleaner logo" 
            className="w-24 h-24 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bluesky Cleaner
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Clean up your old posts, likes, reposts, and follows
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="space-y-4">
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Handle
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="username.bsky.social"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="appPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                App Password
              </label>
              <input
                id="appPassword"
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Create an app password at{' '}
                <a
                  href="https://bsky.app/settings/app-passwords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  bsky.app/settings/app-passwords
                </a>
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p>🔒 Your app password is never stored.</p>
            <p>Session expires after ~2 hours or when you close the tab.</p>
            <p>All operations happen directly in your browser.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
