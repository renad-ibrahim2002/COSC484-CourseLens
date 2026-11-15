import { Link, useOutletContext } from 'react-router-dom';
import { Card, FileBadge, Meter } from '../../components/ui';
import ReviewCard from '../../components/ReviewCard';
import { TYPE_LABELS } from '../../lib/format';

function Distribution({ dist }) {
  const max = Math.max(1, ...dist);
  const shades = ['bg-brand/25', 'bg-brand/35', 'bg-brand/55', 'bg-brand', 'bg-brand'];
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-[17px] font-bold">Overall distribution</figcaption>
      <div
        className="flex h-[124px] items-end gap-2"
        role="img"
        aria-label={`Ratings: ${dist.map((n, i) => `${i + 1} star ${n}`).join(', ')}`}
      >
        {dist.map((n, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
            <div
              className={`w-full rounded-t-[3px] ${shades[i]}`}
              style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
              title={`${n} reviews`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 text-xs text-muted">
        {dist.map((_, i) => (
          <span key={i} className="flex-1 text-center">
            {i + 1}★
          </span>
        ))}
      </div>
    </figure>
  );
}

const COMBO_GROUPS = [
  ['takeBefore', 'Take before', 'text-brand-ink'],
  ['takeTogether', 'Pairs well with', 'text-success-ink'],
  ['avoidTogether', 'Avoid in same semester', 'text-danger-ink'],
];

export default function Overview() {
  const { course, midterm, combos, topResources, topReview } = useOutletContext();
  const s = course.ratingSummary;
  const hasCombos = COMBO_GROUPS.some(([k]) => combos[k].length);
  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-7">
        <Card className="grid gap-8 p-5 sm:p-6 md:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-3">
            <h2 className="font-sans text-[17px] font-bold">Rating breakdown</h2>
            <Meter label="Difficulty" value={s.averages.difficulty} labelWidth="w-[118px] sm:w-[160px]" barClass="flex-1 sm:flex-none sm:w-[160px]" />
            <Meter label="Workload" value={s.averages.workload} labelWidth="w-[118px] sm:w-[160px]" barClass="flex-1 sm:flex-none sm:w-[160px]" />
            <Meter label="Usefulness" value={s.averages.usefulness} labelWidth="w-[118px] sm:w-[160px]" barClass="flex-1 sm:flex-none sm:w-[160px]" />
            <Meter label="Assessment fairness" value={s.averages.fairness} labelWidth="w-[118px] sm:w-[160px]" barClass="flex-1 sm:flex-none sm:w-[160px]" />
          </div>
          <Distribution dist={s.distribution} />
        </Card>
        <section className="flex flex-col gap-4" aria-labelledby="helpful-title">
          <div className="flex items-center justify-between">
            <h2 id="helpful-title" className="text-[22px] font-bold">
              Most helpful review
            </h2>
            <Link to="reviews" className="text-sm font-semibold text-brand hover:underline">
              All {s.count} reviews →
            </Link>
          </div>
          {topReview ? (
            <ReviewCard review={topReview} />
          ) : (
            <Card className="p-6 text-muted">No reviews yet. Be the first to review this course.</Card>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-5">
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-sans text-[17px] font-bold">{midterm.semester} mid-term</h2>
            <span className="text-xs text-muted">{midterm.count} ratings</span>
          </div>
          {midterm.count ? (
            <>
              <Meter label="Pace" value={midterm.averages.pace} labelWidth="w-[80px]" barClass="flex-1" />
              <Meter label="Workload" value={midterm.averages.workload} labelWidth="w-[80px]" barClass="flex-1" />
              <Meter label="Clarity" value={midterm.averages.clarity} labelWidth="w-[80px]" barClass="flex-1" />
            </>
          ) : (
            <p className="text-sm text-muted">No mid-term ratings yet this semester.</p>
          )}
          <Link to="midterms" className="text-[13px] font-semibold text-brand hover:underline">
            See mid-semester ratings →
          </Link>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-sans text-[17px] font-bold">Course combos</h2>
          {hasCombos ? (
            COMBO_GROUPS.filter(([k]) => combos[k].length).map(([k, label, color]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <span className={`eyebrow text-[11px] ${color}`}>{label}</span>
                <span className="flex items-baseline justify-between">
                  <Link to={`/courses/${combos[k][0].courseId}`} className="text-[15px] font-bold hover:underline">
                    {combos[k][0].code}
                  </Link>
                  <span className="text-xs text-muted">{combos[k][0].count} reviewers</span>
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No combos yet. They come from the optional section of each review.</p>
          )}
          <Link to="combos" className="text-[13px] font-semibold text-brand hover:underline">
            See all combos →
          </Link>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-sans text-[17px] font-bold">Top resources</h2>
          {topResources.length ? (
            topResources.map((r) => (
              <Link key={r.id} to={`/resources/${r.id}`} className="group flex items-center gap-3">
                <FileBadge kind={r.kind} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold group-hover:underline">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {TYPE_LABELS[r.type]} · {r.helpfulCount} helpful
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted">No resources yet.</p>
          )}
          <Link to={`/courses/${course.id}/resources`} className="text-[13px] font-semibold text-brand hover:underline">
            All {course.resourceCount} resources →
          </Link>
        </Card>
      </aside>
    </div>
  );
}
