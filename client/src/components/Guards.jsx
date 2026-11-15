import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoadingBlock } from './ui';

/** Sends guests to log in (and back afterwards); checks roles for moderator/admin pages. */
export function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="container-page py-12">
        <LoadingBlock />
      </div>
    );
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-3xl font-bold">You do not have access to this page</h1>
        <p className="mt-2 text-muted">This area is for {roles.includes('moderator') ? 'moderators and admins' : 'admins'} only.</p>
      </div>
    );
  }
  return children;
}

export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const next = new URLSearchParams(useLocation().search).get('next');
  if (loading) return null;
  if (user) return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} replace />;
  return children;
}
