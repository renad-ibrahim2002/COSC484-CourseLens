import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { get } from '../../api/client';
import { Breadcrumbs, Button, Input, PageTitle, Pips, Select, Skeleton, ErrorState, EmptyState } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import SuggestCourseModal from '../../components/SuggestCourseModal';

export default function Courses() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [suggest, setSuggest] = useState(false);
  const level = params.get('level') || 'all';
  const sort = params.get('sort') || 'code';
  const page = Number(params.get('page') || 1);
  const set = (k, v) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v && v !== 'all' && !(k === 'page' && v === 1)) next.set(k, v);
        else next.delete(k);
        if (k !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );
  useEffect(() => {
    const t = setTimeout(() => q !== (params.get('q') || '') && set('q', q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const meta = useQuery({ queryKey: ['major', id], queryFn: () => get(`/majors/${id}`) });
  const list = useQuery({
    queryKey: ['major-courses', id, params.toString()],
    queryFn: () => get(`/majors/${id}/courses`, { q: params.get('q'), level, sort, page, limit: 6 }),
    placeholderData: (prev) => prev,
  });
  const m = meta.data;
  if (meta.error)
    return (
      <div className="container-page py-12">
        <ErrorState error={meta.error} />
      </div>
    );

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: m?.university.name || '…', to: m && `/universities/${m.university.id}` },
          { label: m?.major.name || '…' },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <PageTitle>{m ? `${m.major.name} courses` : <Skeleton className="h-10 w-96" />}</PageTitle>
          <p className="text-[15px] text-muted">Pick a course to see its ratings, mid-semester ratings, course combos and resources.</p>
        </div>
        <Button variant="secondary" onClick={() => (user ? setSuggest(true) : navigate(`/login?next=/majors/${id}`))}>
          <Plus className="size-4" aria-hidden /> Suggest a course
        </Button>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink" aria-hidden />
          <Input
            aria-label="Filter by code or title"
            placeholder="Filter by code or title"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        <Select
          aria-label="Course level"
          value={level}
          onChange={(e) => set('level', e.target.value)}
          wrapperClassName="md:w-[190px]"
          className="h-12 text-base"
        >
          <option value="all">Level: All</option>
          {[100, 200, 300, 400].map((l) => (
            <option key={l} value={l}>
              Level: {l}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Sort courses"
          value={sort}
          onChange={(e) => set('sort', e.target.value)}
          wrapperClassName="md:w-[210px]"
          className="h-12 text-base"
        >
          <option value="code">Sort: Course code</option>
          <option value="rating">Sort: Highest rated</option>
          <option value="reviews">Sort: Most reviewed</option>
          <option value="difficulty">Sort: Easiest first</option>
        </Select>
      </div>

      {list.data && !list.data.courses.length ? (
        <EmptyState title="No courses found">Try a different filter, or suggest a course that is missing.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">Courses in {m?.major.name}</caption>
            <thead className="bg-page/70 text-[13px] text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-3.5 font-medium">
                  Course
                </th>
                <th scope="col" className="hidden px-3 py-3.5 font-medium sm:table-cell">
                  Overall
                </th>
                <th scope="col" className="hidden px-3 py-3.5 font-medium md:table-cell">
                  Difficulty
                </th>
                <th scope="col" className="hidden px-3 py-3.5 font-medium md:table-cell">
                  Workload
                </th>
                <th scope="col" className="hidden px-3 py-3.5 font-medium sm:table-cell">
                  Reviews
                </th>
                <th scope="col" className="w-12 px-5 py-3.5">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!list.data &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td colSpan={6} className="px-5 py-3">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))}
              {list.data?.courses.map((c) => {
                const s = c.ratingSummary;
                return (
                  <tr key={c.id} className="relative border-b border-line last:border-0 hover:bg-page/60">
                    <td className="px-5 py-3">
                      <Link to={`/courses/${c.id}`} className="flex flex-col after:absolute after:inset-0">
                        <span className="text-[13px] font-bold text-brand">{c.code}</span>
                        <span className="text-[15px] font-semibold text-ink">{c.title}</span>
                      </Link>
                    </td>
                    <td className="hidden px-3 py-3 text-[15px] sm:table-cell">{s.count ? s.averages.overall.toFixed(1) : '–'}</td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <Pips value={s.averages.difficulty} label="Difficulty" />
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <Pips value={s.averages.workload} label="Workload" />
                    </td>
                    <td className="hidden px-3 py-3 text-[15px] sm:table-cell">{s.count}</td>
                    <td className="px-5 py-3 text-right">
                      <ArrowRight className="inline size-[18px] text-brand" aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {list.data && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Showing {list.data.courses.length} of {list.data.total} courses
          </span>
          <span className="flex gap-4 font-semibold text-brand">
            {page > 1 && (
              <button type="button" onClick={() => set('page', page - 1)} className="hover:underline">
                ← Previous page
              </button>
            )}
            {page < list.data.pages && (
              <button type="button" onClick={() => set('page', page + 1)} className="hover:underline">
                Next page →
              </button>
            )}
          </span>
        </div>
      )}
      {m && <SuggestCourseModal open={suggest} onClose={() => setSuggest(false)} majorId={id} majorName={m.major.name} />}
    </div>
  );
}
