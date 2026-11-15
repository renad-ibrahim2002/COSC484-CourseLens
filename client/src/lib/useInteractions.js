import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { post } from '../api/client';
import { useAuth } from './auth';
import { useToast } from '../components/Toast';

/** Helpful votes and bookmarks with log-in redirect for guests. */
export function useInteractions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const loc = useLocation();
  const toast = useToast();

  const requireLogin = () => {
    if (user) return true;
    navigate(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`);
    return false;
  };

  const vote = async (targetType, targetId) => {
    if (!requireLogin()) return null;
    try {
      const r = await post('/votes', { targetType, targetId });
      qc.invalidateQueries();
      return r;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    }
  };

  const bookmark = async (targetType, targetId) => {
    if (!requireLogin()) return null;
    try {
      const r = await post('/bookmarks', { targetType, targetId });
      toast(r.bookmarked ? 'Saved to your bookmarks' : 'Removed from your bookmarks');
      qc.invalidateQueries();
      return r;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    }
  };

  return { vote, bookmark, requireLogin, user };
}
