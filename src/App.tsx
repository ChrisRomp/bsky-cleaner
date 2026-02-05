import { useEffect, useCallback, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useContent } from './hooks/useContent';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import logo from '/favicon.svg';
import { ErrorLog, type LogEntry } from './components/ErrorLog';

let logIdCounter = 0;

function App() {
  const { auth, isLoading: authLoading, error: authError, sessionExpired, login, logout, clearSessionExpired } = useAuth();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  
  const addLogEntry = useCallback((message: string, type: LogEntry['type'] = 'error') => {
    setLogEntries(prev => [...prev, {
      id: ++logIdCounter,
      timestamp: new Date(),
      message,
      type,
    }]);
  }, []);
  
  const handleContentError = useCallback((message: string, isAuthErr: boolean) => {
    addLogEntry(message, 'error');
    if (isAuthErr) {
      addLogEntry('Session may have expired. Please log in again.', 'warning');
      // Don't auto-logout - let user see the error first
    }
  }, [addLogEntry]);
  
  const clearLog = useCallback(() => {
    setLogEntries([]);
  }, []);
  
  const {
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
    loadPosts,
    loadLikes,
    loadReposts,
    loadFollows,
    removeItems,
  } = useContent(auth.did, handleContentError);

  useEffect(() => {
    if (auth.isAuthenticated && auth.did) {
      loadPosts();
      loadLikes();
      loadReposts();
      loadFollows();
    }
    // Only run on auth state change, not when load functions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.did]);

  // Reload all content (fresh fetch, not load more)
  const handleReload = useCallback(() => {
    loadPosts();
    loadLikes();
    loadReposts();
    loadFollows();
  }, [loadPosts, loadLikes, loadReposts, loadFollows]);

  // Handle session error - log and force logout
  const handleSessionError = useCallback(() => {
    addLogEntry('Session expired or invalid. Logging out...', 'error');
    logout();
  }, [logout, addLogEntry]);
  
  // Log deletion errors from Dashboard
  const handleDeleteError = useCallback((message: string) => {
    addLogEntry(`Deletion error: ${message}`, 'error');
  }, [addLogEntry]);
  
  // Log successful deletions
  const handleDeleteSuccess = useCallback((count: number) => {
    addLogEntry(`Successfully deleted ${count} item(s)`, 'info');
  }, [addLogEntry]);

  // Show loading spinner while checking for existing session
  if (authLoading && !auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4"><img src={logo} alt="Bluesky Cleaner" width="48" height="48" className="inline-block" /></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <LoginForm
        onLogin={login}
        isLoading={authLoading}
        error={authError}
        sessionExpired={sessionExpired}
        onClearSessionExpired={clearSessionExpired}
      />
    );
  }

  return (
    <>
      <Dashboard
        handle={auth.handle!}
        did={auth.did!}
        posts={posts}
        likes={likes}
        reposts={reposts}
        follows={follows}
        postsLoading={postsLoading}
        likesLoading={likesLoading}
        repostsLoading={repostsLoading}
        followsLoading={followsLoading}
        postsCursor={postsCursor}
        likesCursor={likesCursor}
        repostsCursor={repostsCursor}
        followsCursor={followsCursor}
        onLoadMorePosts={() => loadPosts(true)}
        onLoadMoreLikes={() => loadLikes(true)}
        onLoadMoreReposts={() => loadReposts(true)}
        onLoadMoreFollows={() => loadFollows(true)}
        onRemoveItems={removeItems}
        onReload={handleReload}
        onSessionError={handleSessionError}
        onLogout={logout}
        onDeleteError={handleDeleteError}
        onDeleteSuccess={handleDeleteSuccess}
        hasLogEntries={logEntries.length > 0}
      />
      <ErrorLog entries={logEntries} onClear={clearLog} />
    </>
  );
}

export default App;
