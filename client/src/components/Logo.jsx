import { Link } from 'react-router-dom';
import { cx } from './ui';

export function LogoMark({ className = 'size-[30px]' }) {
  return (
    <svg viewBox="0 0 30 30" className={className} aria-hidden focusable="false">
      <circle cx="15" cy="15" r="15" fill="#2a4bd7" />
      <circle cx="16.5" cy="11.5" r="6" fill="#fff" />
    </svg>
  );
}

export default function Logo({ dark = false, className }) {
  return (
    <Link to="/" className={cx('flex shrink-0 items-center gap-2.5', className)} aria-label="CourseLens home">
      <LogoMark />
      <span className={cx('font-display text-[22px] font-bold', dark ? 'text-white' : 'text-ink')}>CourseLens</span>
    </Link>
  );
}
