import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search } from 'lucide-react';
import { get } from '../../api/client';
import { Breadcrumbs, Input, Pill, Select, Skeleton, ErrorState, cx } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function Majors() {
  const { id } = useParams();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('reviews');
  const uni = useQuery({ queryKey: ['university', id], queryFn: () => get(`/universities/${id}`) });
  const majors = useQuery({ queryKey: ['majors', id, sort], queryFn: () => get(`/universities/${id}/majors`, { sort }) });
  const u = uni.data?.university;
  const list = (majors.data?.majors || []).filter((m) => `${m.name} ${m.code}`.toLowerCase().includes(q.toLowerCase()));

  if (uni.error)
    return (
      <div className="container-page py-12">
        <ErrorState error={uni.error} />
      </div>
    );

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Universities', to: '/universities' }, { label: u?.name || '…' }]} />
      <div className="flex items-center gap-5">
        <span
          className="inline-flex size-[72px] shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-base font-bold text-brand-ink"
          aria-hidden
        >
          {u?.shortName}
        </span>
        <div>
          <h1 className="text-[32px] leading-tight font-bold sm:text-[44px]">{u?.name || <Skeleton className="h-10 w-80" />}</h1>
          {u && (
            <p className="text-base text-muted">
              {u.location} · {u.majorCount} majors · {u.courseCount} courses
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink" aria-hidden />
          <Input
            aria-label="Filter majors"
            placeholder="Filter majors"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        <Select
          aria-label="Sort majors"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          wrapperClassName="sm:w-[220px]"
          className="h-12 text-base"
        >
          <option value="reviews">Sort: Most reviewed</option>
          <option value="courses">Sort: Most courses</option>
          <option value="name">Sort: A–Z</option>
        </Select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {!majors.data && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[136px]" />)}
        {list.map((m) => (
          <Link
            key={m.id}
            to={`/majors/${m.id}`}
            className={cx(
              'card flex flex-col gap-2 p-6 transition-shadow hover:shadow-float',
              String(user?.majorId) === m.id && 'border-2 border-brand p-[23px]',
            )}
          >
            <span className="flex items-center justify-between">
              <Pill>{m.code}</Pill>
              <ArrowRight className="size-5 text-brand" aria-hidden />
            </span>
            <span className="mt-1 text-xl font-bold">{m.name}</span>
            <span className="text-sm text-muted">
              {m.courseCount} courses · {m.reviewCount} reviews
            </span>
          </Link>
        ))}
      </div>
      {majors.data && !list.length && <p className="text-muted">No majors match “{q}”.</p>}
    </div>
  );
}
