import { Link } from 'react-router-dom';
import { cx } from './ui';

export function CourseCard({ course, className }) {
  const s = course.ratingSummary;
  return (
    <Link to={`/courses/${course.id}`} className={cx('card flex flex-col gap-2 p-5 transition-shadow hover:shadow-float', className)}>
      <span className="text-[13px] font-bold text-brand">{course.code}</span>
      <span className="text-lg leading-snug font-bold text-ink">{course.title}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold text-ink">{s.count ? s.averages.overall.toFixed(1) : '–'}</span>
        <span className="text-[13px] text-muted">
          · {s.count} review{s.count === 1 ? '' : 's'}
          {s.count ? ` · Difficulty ${s.averages.difficulty.toFixed(1)}` : ''}
        </span>
      </span>
    </Link>
  );
}
