import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThumbsUp, Flag, Bookmark } from 'lucide-react';
import { Avatar, Button, Pill, ScoreChip, Tag, cx } from './ui';
import ReportModal from './ReportModal';
import { useInteractions } from '../lib/useInteractions';

const majorInitials = (label = '') =>
  label
    .replace(/ student$/, '')
    .split(/[\s&]+/)
    .filter((w) => w && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || 'ST';

export default function ReviewCard({ review, className }) {
  const { vote, bookmark, requireLogin } = useInteractions();
  const [reporting, setReporting] = useState(false);
  const loc = useLocation();
  const r = review;
  const recs = [
    ...r.recommendations.takeBefore.map((c) => ['brand', `Take before · ${c.code}`, c.id]),
    ...r.recommendations.takeTogether.map((c) => ['success', `Pairs well · ${c.code}`, c.id]),
    ...r.recommendations.avoidTogether.map((c) => ['danger', `Avoid together · ${c.code}`, c.id]),
  ];
  const mine = r.viewer?.isMine;
  return (
    <article className={cx('card flex flex-col gap-3.5 p-6', className)} aria-label={`Review by ${r.authorLabel}, ${r.semester}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar text={majorInitials(r.authorLabel)} size="sm" tone="chip" />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">{r.authorLabel}</p>
            <p className="text-[13px] text-muted">Took it {r.semester}</p>
          </div>
        </div>
        <ScoreChip value={r.ratings.overall} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Tag>Difficulty {r.ratings.difficulty}</Tag>
        <Tag>Workload {r.ratings.workload}</Tag>
        <Tag>Usefulness {r.ratings.usefulness}</Tag>
        <Tag>Fairness {r.ratings.fairness}</Tag>
      </div>
      {r.text && (
        <p className="text-[15px] leading-6 text-ink">
          {r.text}{' '}
          {r.truncated && (
            <Link to={`/login?next=${encodeURIComponent(loc.pathname)}`} className="font-semibold text-brand hover:underline">
              Log in to read the full review
            </Link>
          )}
        </p>
      )}
      {recs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recs.map(([tone, label, id]) => (
            <Pill key={label} tone={tone} size="sm" className="px-2.5 py-1 text-xs">
              <Link to={`/courses/${id}`}>{label}</Link>
            </Pill>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant={r.viewer?.helpful ? 'brand-soft' : 'secondary'}
          size="md"
          className="h-9 px-3"
          aria-pressed={!!r.viewer?.helpful}
          disabled={mine}
          title={mine ? 'You cannot vote on your own review' : 'Mark as helpful'}
          onClick={() => vote('review', r.id)}
        >
          <ThumbsUp className="size-4" aria-hidden /> Helpful · {r.helpfulCount}
        </Button>
        {!mine && (
          <Button variant="ghost" size="md" className="h-9 px-3 font-normal" onClick={() => requireLogin() && setReporting(true)}>
            <Flag className="size-4" aria-hidden /> Report
          </Button>
        )}
        <Button
          variant="ghost"
          size="md"
          className={cx('h-9 px-3 font-normal', r.viewer?.bookmarked && 'text-brand-ink')}
          aria-pressed={!!r.viewer?.bookmarked}
          onClick={() => bookmark('review', r.id)}
        >
          <Bookmark className={cx('size-4', r.viewer?.bookmarked && 'fill-current')} aria-hidden />{' '}
          {r.viewer?.bookmarked ? 'Saved' : 'Save'}
        </Button>
      </div>
      <ReportModal target={reporting ? { type: 'review', id: r.id } : null} onClose={() => setReporting(false)} />
    </article>
  );
}
