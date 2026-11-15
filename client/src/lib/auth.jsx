import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post } from '../api/client';

const AuthContext = createContext(null);

async function fetchMe() {
  const data = await api('/auth/me', { retry: false });
  return data.user || null;
}

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: 5 * 60 * 1000, retry: false });

  const setUser = useCallback((u) => qc.setQueryData(['me'], u), [qc]);
  const logout = useCallback(async () => {
    await post('/auth/logout').catch(() => {});
    qc.setQueryData(['me'], null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
  }, [qc]);

  const value = useMemo(
    () => ({
      user: user || null,
      loading: isLoading,
      setUser,
      logout,
      isMod: user?.role === 'moderator' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
    }),
    [user, isLoading, setUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
