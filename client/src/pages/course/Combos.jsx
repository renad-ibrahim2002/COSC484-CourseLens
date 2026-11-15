import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard } from 'lucide-react';
import { get } from '../../api/client';
import { Button, Card, Skeleton } from '../../components/ui';
import { useAuth } from '../../lib/auth';

const GROUPS = [
  ['takeBefore', 'Take before', 'Finish these first', 'text-brand-ink', 'bg-brand', 'bg-brand-soft'],
  ['takeTogether', 'Pairs well with', 'Good in the same semester', 'text-success-ink', 'bg-success', 'bg-success-soft'],
  ['avoidTogether', 'Avoid in same semester', 'Too heavy together', 'text-danger-ink', 'bg-danger-ink', 'bg-danger-soft'],
];

export default function Combos() {
  const { course, viewer } = useOutletContext();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['combos', course.id], queryFn: () => get(`/courses/${course.id}/combos`) });
  const writeTo = viewer?.myReview ? `/reviews/${viewer.myReview.id}/edit` : `/courses/${course.id}/review`;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[26px] font-bold">Course combos</h2>
        <p className="text-sm text-muted">
          Based on {data?.reviewCount ?? course.ratingSummary.count} reviews. The number shows how many reviewers recommended each course.
        </p>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-3">
        {!data && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48" />)}
        {data &&
          GROUPS.map(([key, eyebrow, title, color, fill, track]) => (
            <Card key={key} className="flex flex-col gap-3 p-5">
              <span className={`eyebrow text-[11px] ${color}`}>{eyebrow}</span>
              <h3 className="font-sans text-[17px] font-bold">{title}</h3>
              {data[key].length ? (
                data[key].slice(0, 5).map((c) => (
                  <div key={c.courseId} className="flex flex-col gap-1.5">
                    <Link to={`/courses/${c.courseId}`} className="text-sm hover:underline">
                      <span className="font-bold">{c.code}</span> <span className="text-muted">{c.title}</span>
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className={`relative h-[7px] flex-1 overflow-hidden rounded ${track}`}>
                        <span
                          className={`absolute inset-y-0 left-0 rounded ${fill}`}
                          style={{ width: `${Math.max(4, (c.count / Math.max(1, data.reviewCount)) * 100)}%` }}
                        />
                      </span>
                      <span className="w-6 text-sm font-bold">{c.count}</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No recommendations yet.</p>
              )}
            </Card>
          ))}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-line bg-white/70 p-5 sm:flex-row sm:items-center">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
          <LayoutDashboard className="size-5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-bold">Where these come from</p>
          <p className="text-sm text-muted">
            Each review has an optional "Help others plan" section where students tag courses to take before, pair with, or avoid.
          </p>
        </div>
        {(!viewer || viewer.canPost) && (
          <Button variant="secondary" size="md" to={user ? writeTo : `/login?next=${writeTo}`}>
            Write a review
          </Button>
        )}
      </div>
    </div>
  );
}
