import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Menu, X, LogOut, Star, Upload, Bookmark, Sun, Shield, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import { Button, cx, Avatar } from './ui';
import { useAuth } from '../lib/auth';
import { get } from '../api/client';
import { initials } from '../lib/format';

function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function SearchBox({ className, onDone }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const box = useRef(null);
  const term = useDebounced(q.trim());
  const { data } = useQuery({
    queryKey: ['search', term],
    queryFn: () => get('/search', { q: term }),
    enabled: term.length >= 2,
    staleTime: 30000,
  });
  const results =
    term.length >= 2 && data
      ? [...data.courses.map((c) => ({ ...c, kind: 'course' })), ...data.resources.map((r) => ({ ...r, kind: 'resource' }))]
      : [];

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (item) => {
    setOpen(false);
    setQ('');
    onDone?.();
    if (!item) navigate(`/resources?q=${encodeURIComponent(q.trim())}`);
    else navigate(item.kind === 'course' ? `/courses/${item.id}` : `/resources/${item.id}`);
  };

  return (
    <div ref={box} className={cx('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(results[active]);
        }}
        className="flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-page px-3.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15"
      >
        <Search className="size-[18px] shrink-0 text-ink" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(results.length - 1, a + 1));
            if (e.key === 'ArrowUp') setActive((a) => Math.max(-1, a - 1));
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search a course code, title or resource"
          aria-label="Search a course code, title or resource"
          aria-expanded={open && results.length > 0}
          aria-controls="search-results"
          role="combobox"
          aria-autocomplete="list"
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
      </form>
      {open && term.length >= 2 && (
        <div
          id="search-results"
          role="listbox"
          className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-xl border border-line bg-white shadow-float"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{data ? `No courses or resources match “${term}”.` : 'Searching…'}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cx('flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm', i === active && 'bg-page')}
              >
                <span className="min-w-0">
                  {r.kind === 'course' ? (
                    <>
                      <span className="font-bold text-brand">{r.code}</span> <span className="text-ink">{r.title}</span>
                    </>
                  ) : (
                    <span className="text-ink">{r.title}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted">{r.kind === 'course' ? r.university : `Resource · ${r.course}`}</span>
              </button>
            ))
          )}
          {q.trim() && (
            <button
              type="button"
              onClick={() => go(null)}
              className="w-full border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-brand hover:bg-page"
            >
              Search resources for “{q.trim()}” →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const item = 'flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-page';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${initials(user.name)}, account menu for ${user.name}`}
        className="rounded-full"
      >
        <Avatar text={initials(user.name)} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-14 right-0 z-40 w-60 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-float"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link role="menuitem" to="/me/reviews" className={item}>
            <Star className="size-4" aria-hidden /> My reviews
          </Link>
          <Link role="menuitem" to="/me/uploads" className={item}>
            <Upload className="size-4" aria-hidden /> My uploads
          </Link>
          <Link role="menuitem" to="/me/bookmarks" className={item}>
            <Bookmark className="size-4" aria-hidden /> Bookmarks
          </Link>
          <Link role="menuitem" to="/me/settings" className={item}>
            <Sun className="size-4" aria-hidden /> Account settings
          </Link>
          {(user.role === 'moderator' || user.role === 'admin') && (
            <Link role="menuitem" to="/moderation" className={cx(item, 'border-t border-line')}>
              <Shield className="size-4" aria-hidden /> Moderation
            </Link>
          )}
          {user.role === 'admin' && (
            <Link role="menuitem" to="/admin" className={item}>
              <LayoutDashboard className="size-4" aria-hidden /> Admin console
            </Link>
          )}
          <button role="menuitem" type="button" onClick={onLogout} className={cx(item, 'w-full border-t border-line')}>
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);
  const navCls = ({ isActive }) => cx('text-base font-semibold text-ink hover:text-brand', isActive && 'text-brand');
  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-5 py-3.5 sm:px-10">
        <Logo />
        <SearchBox className="hidden flex-1 md:block" />
        <nav aria-label="Main" className="ml-auto hidden items-center gap-[22px] md:flex">
          <NavLink to="/universities" className={navCls}>
            Browse
          </NavLink>
          <NavLink to="/resources" className={navCls}>
            Resources
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {loading ? (
            <span className="size-11" />
          ) : user ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Button to="/login" variant="secondary" size="md" className="h-11">
                Log in
              </Button>
              <Button to="/register" size="md" className="h-11 px-5">
                Sign up
              </Button>
            </div>
          )}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-[10px] border border-line md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 md:hidden">
          <SearchBox onDone={() => setMobileOpen(false)} />
          <nav aria-label="Mobile" className="flex flex-col">
            <NavLink to="/universities" className="py-2 font-semibold">
              Browse
            </NavLink>
            <NavLink to="/resources" className="py-2 font-semibold">
              Resources
            </NavLink>
          </nav>
          {!user && !loading && (
            <div className="flex gap-3">
              <Button to="/login" variant="secondary" className="flex-1">
                Log in
              </Button>
              <Button to="/register" className="flex-1">
                Sign up
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
