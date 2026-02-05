import { useState, useCallback, useEffect } from 'react';
import type { AuthState } from '../types';
import * as bluesky from '../services/bluesky';

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    handle: null,
    did: null,
  });
  const [isLoading, setIsLoading] = useState(true); // Start true for initial session check
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Set up session expiry callback
  useEffect(() => {
    bluesky.setSessionExpiredCallback(() => {
      setAuth({
        isAuthenticated: false,
        handle: null,
        did: null,
      });
      setSessionExpired(true);
    });
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const session = await bluesky.restoreSession();
        if (session) {
          setAuth({
            isAuthenticated: true,
            handle: session.handle,
            did: session.did,
          });
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (handle: string, appPassword: string) => {
    setIsLoading(true);
    setError(null);
    setSessionExpired(false);
    
    try {
      const result = await bluesky.login(handle, appPassword);
      setAuth({
        isAuthenticated: true,
        handle: result.handle,
        did: result.did,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to login';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    bluesky.logout();
    setAuth({
      isAuthenticated: false,
      handle: null,
      did: null,
    });
    setError(null);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  return {
    auth,
    isLoading,
    error,
    sessionExpired,
    login,
    logout,
    clearSessionExpired,
  };
}
