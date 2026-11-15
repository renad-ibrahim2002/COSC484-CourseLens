import { useQuery } from '@tanstack/react-query';
import { Shield, Inbox, List, GraduationCap, Users, ChartColumn } from 'lucide-react';
import { get } from '../api/client';
import { SideNav } from '../pages/profile/ProfileLayout';
import { useAuth } from '../lib/auth';

export function ModLayout({ children }) {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['mod-queue', 'open', 'all', 'all', 'oldest'], queryFn: () => get('/moderation/queue') });
  const isAdmin = user.role === 'admin';
  return (
    <div className="container-page flex flex-col gap-8 pt-8 pb-16 lg:flex-row">
      <SideNav
        header={
          <div className="flex flex-col items-start gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold ${isAdmin ? 'bg-dark text-white' : 'bg-warn-soft text-warn-ink'}`}
            >
              <Shield className="size-3.5" aria-hidden /> {isAdmin ? 'Admin' : 'Moderator'}
            </span>
            <p className="mt-1 text-[15px] font-bold">{isAdmin ? 'All universities' : user.university?.name}</p>
            <p className="text-[13px] text-muted">
              {isAdmin ? 'Admins can moderate content from every university.' : 'You can act on content from this university only.'}
            </p>
          </div>
        }
        items={[
          { to: '/moderation', label: 'Report queue', icon: Inbox, count: data?.counts.open, alsoActive: /^\/moderation\/reports\// },
          { to: '/moderation/log', label: 'Moderation log', icon: List },
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:pt-6">{children}</div>
    </div>
  );
}

export function AdminLayout({ children }) {
  const { data } = useQuery({
    queryKey: ['admin-suggestions', 'pending'],
    queryFn: () => get('/admin/suggestions', { status: 'pending' }),
  });
  return (
    <div className="container-page flex flex-col gap-8 pt-8 pb-16 lg:flex-row">
      <SideNav
        header={
          <div className="flex flex-col items-start gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-dark px-2.5 py-1 text-[13px] font-semibold text-white">
              <Shield className="size-3.5" aria-hidden /> Admin
            </span>
            <p className="mt-1 text-[15px] font-bold">Platform administrator</p>
            <p className="text-[13px] text-muted">All universities</p>
          </div>
        }
        items={[
          { to: '/admin/catalog', label: 'Catalog', icon: GraduationCap },
          { to: '/admin/suggestions', label: 'Course suggestions', icon: Inbox, count: data?.counts.pending },
          { to: '/admin/users', label: 'Users & roles', icon: Users },
          { to: '/admin/stats', label: 'Statistics & audit log', icon: ChartColumn },
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:pt-6">{children}</div>
    </div>
  );
}
