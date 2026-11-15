import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { get } from '../../api/client';
import { Button, Card, LoadingBlock, Meter, Segmented, Select, EmptyState } from '../../components/ui';
import ReviewCard from '../../components/ReviewCard';

export default function Reviews() {
  const { course } = useOutletContext();
  const [semester, setSemester] = useState('all');
  const [sort, setSort] = useState('helpful');
  const [stars, setStars] = useState('all');
  const q = useInfiniteQuery({
    queryKey: ['reviews', course.id, semester, sort, stars],
    queryFn: ({ pageParam }) =>
      get(`/courses/${course.id}/reviews`, { semester, sort, stars: stars === 'all' ? undefined : stars, page: pageParam, limit: 3 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const first = q.data?.pages[0];
  const reviews = q.data?.pages.flatMap((p) => p.reviews) || [];
  const s = course.ratingSummary;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[26px] font-bold">{first ? `${first.total} review${first.total === 1 ? '' : 's'}` : 'Reviews'}</h2>
          <div className="flex gap-2.5">
            <Select aria-label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} className="h-10 w-[170px] text-sm">
              <option value="all">All semesters</option>
              {first?.semesters.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
            <Select aria-label="Sort reviews" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-[170px] text-sm">
              <option value="helpful">Most helpful</option>
              <option value="newest">Newest</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </Select>
          </div>
        </div>
        <Segmented
          label="Filter by rating"
          size="sm"
          className="w-fit"
          value={stars}
          onChange={setStars}
          items={[{ value: 'all', label: 'All' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n}★` }))]}
        />
        {q.isLoading && <LoadingBlock />}
        {first && !reviews.length && <EmptyState title="No reviews match these filters" />}
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
        {q.hasNextPage && (
          <Button variant="secondary" size="md" className="self-center" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
            Load more reviews
          </Button>
        )}
      </div>
      <aside className="flex flex-col gap-5">
        <Card className="flex flex-col gap-3 p-5">
          <h3 className="font-sans text-[17px] font-bold">Summary</h3>
          <Meter label="Difficulty" value={s.averages.difficulty} labelWidth="w-[86px]" barClass="flex-1" />
          <Meter label="Workload" value={s.averages.workload} labelWidth="w-[86px]" barClass="flex-1" />
          <Meter label="Usefulness" value={s.averages.usefulness} labelWidth="w-[86px]" barClass="flex-1" />
          <Meter label="Fairness" value={s.averages.fairness} labelWidth="w-[86px]" barClass="flex-1" />
        </Card>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-brand-soft p-5">
          <p className="text-sm font-bold text-ink">Reviews are anonymous</p>
          <p className="text-[13px] leading-5 text-muted">
            Each review shows only the reviewer's major and semester. Every review is tied to a verified university account.
          </p>
        </div>
      </aside>
    </div>
  );
}
