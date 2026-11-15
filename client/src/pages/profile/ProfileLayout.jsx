import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Star, Upload, Bookmark, Sun } from 'lucide-react';
import { get } from '../../api/client';
import { Avatar, cx } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { initials } from '../../lib/format';

export function SideNav({ items, header }) {
  const { pathname } = useLocation();
  return (
    <aside className="card flex h-fit flex-col gap-4 p-4 lg:w-[260px] lg:shrink-0">
      {header}
      <hr className="border-line" />
      <nav aria-label="Section" className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, count, alsoActive }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium whitespace-nowrap',
                isActive || alsoActive?.test(pathname) ? 'bg-brand-soft font-semibold text-brand-ink' : 'text-ink hover:bg-page',
              )
            }
          >
            <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
            <span className="flex-1">{label}</span>
            {count !== undefined && <span className="rounded-full bg-chip px-2 py-0.5 text-xs text-chip-ink">{count}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSummary() {
  return useQuery({ queryKey: ['me-summary'], queryFn: () => get('/me/summary') });
}

export default function ProfileLayout({ children }) {
  const { user } = useAuth();
  const { data } = useSummary();
  return (
    <div className="container-page flex flex-col gap-8 pt-8 pb-16 lg:flex-row">
      <SideNav
        header={
          <div className="flex flex-col items-start gap-1.5 px-1 pt-1">
            <Avatar text={initials(user.name)} size="lg" />
            <p className="mt-1 text-[17px] font-bold">{user.name}</p>
            <p className="text-sm text-muted">
              {user.major?.name || 'No major'} · {user.university?.shortName}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-ink">
              <Check className="size-3.5" strokeWidth={3} aria-hidden /> Verified student
            </span>
          </div>
        }
        items={[
          { to: '/me/reviews', label: 'My reviews', icon: Star, count: data?.reviews },
          { to: '/me/uploads', label: 'My uploads', icon: Upload, count: data?.uploads },
          { to: '/me/bookmarks', label: 'Bookmarks', icon: Bookmark, count: data?.bookmarks },
          { to: '/me/settings', label: 'Account settings', icon: Sun },
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:pt-6">{children}</div>
    </div>
  );
}

export const StatusPill = ({ status }) => {
  const map = {
    published: ['Published', 'bg-success-soft text-success-ink'],
    held: ['Held for moderation', 'bg-warn-soft text-warn-ink'],
    hidden: ['Hidden', 'bg-warn-soft text-warn-ink'],
  };
  const [label, cls] = map[status] || map.published;
  return <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', cls)}>{label}</span>;
};
