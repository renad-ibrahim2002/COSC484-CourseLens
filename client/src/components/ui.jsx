/* Shared UI kit. Sizes, colours and radii follow the hi-fi wireframes. */
import { forwardRef, useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X, Loader2, AlertCircle } from 'lucide-react';

// eslint-disable-next-line react-refresh/only-export-components
export const cx = (...c) => c.filter(Boolean).join(' ');

/* ---------------- Buttons ---------------- */
const BTN = {
  primary: 'bg-brand text-white hover:bg-brand-hover disabled:bg-brand/50',
  secondary: 'border border-line bg-white text-ink hover:bg-page disabled:text-muted',
  outline: 'border border-field bg-white text-ink hover:bg-page',
  dark: 'bg-dark text-white hover:bg-black',
  white: 'bg-white text-ink hover:bg-page',
  'danger-soft': 'bg-danger-soft text-danger-ink hover:bg-[#f7d6cf]',
  ghost: 'text-muted hover:text-ink hover:bg-chip/60',
  'brand-soft': 'border border-brand/40 bg-brand-soft text-brand-ink hover:bg-[#dde3fb]',
};
const SIZE = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-11 px-[18px] text-[15px] gap-2 rounded-[10px]',
  xl: 'h-[52px] px-[26px] text-[15px] gap-2 rounded-[10px]',
  icon: 'size-9 rounded-lg',
};

export const Button = forwardRef(function Button(
  { as: As = 'button', variant = 'primary', size = 'lg', className, loading, children, type, ...props },
  ref,
) {
  const Comp = props.to ? Link : As;
  return (
    <Comp
      ref={ref}
      type={Comp === 'button' ? type || 'button' : undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors select-none disabled:opacity-80',
        BTN[variant],
        SIZE[size],
        className,
      )}
      disabled={Comp === 'button' ? props.disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Comp>
  );
});

export function IconButton({ label, children, className, active, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active ?? undefined}
      className={cx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white text-ink transition-colors hover:bg-page',
        active ? 'border-brand/40 bg-brand-soft text-brand-ink' : 'border-line',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Pills & badges ---------------- */
const PILL = {
  brand: 'bg-brand-soft text-brand-ink',
  danger: 'bg-danger-soft text-danger-ink',
  success: 'bg-success-soft text-success-ink',
  warn: 'bg-warn-soft text-warn-ink',
  chip: 'bg-chip text-chip-ink',
  dark: 'bg-dark text-white',
};
export function Pill({ tone = 'brand', size = 'md', className, children, ...props }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-[13px]',
        PILL[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Small grey tag like "Difficulty 4" or "jwt". */
export function Tag({ children, className }) {
  return <span className={cx('inline-flex items-center rounded-md bg-chip px-2 py-0.5 text-xs text-chip-ink', className)}>{children}</span>;
}

/** Black rating chip ("5.0"). */
export function ScoreChip({ value, className }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 min-w-9 items-center justify-center rounded-md bg-dark px-1.5 text-[13px] font-bold text-white',
        className,
      )}
    >
      {Number(value).toFixed(1)}
    </span>
  );
}

/* ---------------- Form fields ---------------- */
export function Field({ label, hint, error, children, className, id, optional }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={id ? `${id}-error` : undefined} role="alert" className="flex items-center gap-1 text-[13px] text-danger">
          <AlertCircle className="size-3.5" aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, error, id, ...props }, ref) {
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={cx('input', className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, error, id, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      id={id}
      aria-invalid={error ? 'true' : undefined}
      className={cx('input h-auto min-h-24 resize-y py-2.5 leading-[1.45]', className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, wrapperClassName, children, error, ...props }, ref) {
  return (
    <div className={cx('relative', wrapperClassName)}>
      <select
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={cx('input cursor-pointer appearance-none truncate pr-9', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

export function Checkbox({ label, className, id, ...props }) {
  const autoId = useId();
  const cid = id || autoId;
  return (
    <label htmlFor={cid} className={cx('flex cursor-pointer items-start gap-2.5 text-sm text-ink', className)}>
      <input id={cid} type="checkbox" className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-brand" {...props} />
      <span>{label}</span>
    </label>
  );
}

/* ---------------- Layout bits ---------------- */
export function Card({ className, children, as: As = 'div', ...props }) {
  return (
    <As className={cx('card', className)} {...props}>
      {children}
    </As>
  );
}

export function PageTitle({ children, className, as: As = 'h1' }) {
  return <As className={cx('font-display text-[34px] leading-[1.1] font-bold text-ink sm:text-[40px]', className)}>{children}</As>;
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-muted" aria-hidden>
                /
              </span>
            )}
            {it.to && i < items.length - 1 ? (
              <Link to={it.to} className="text-brand hover:underline">
                {it.label}
              </Link>
            ) : (
              <span className="font-medium text-ink" aria-current={i === items.length - 1 ? 'page' : undefined}>
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Underlined tabs (course page, bookmarks, moderation). Renders links or buttons. */
export function Tabs({ items, value, onChange, className, label }) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((t) => {
        const active = t.value === value;
        const cls = cx(
          '-mb-px shrink-0 border-b-[3px] px-3.5 pt-1 pb-3 text-[15px] whitespace-nowrap transition-colors',
          active ? 'border-brand font-semibold text-ink' : 'border-transparent text-muted hover:text-ink',
        );
        return t.to ? (
          <Link key={t.value} to={t.to} role="tab" aria-selected={active} className={cls} replace={t.replace}>
            {t.label}
          </Link>
        ) : (
          <button key={t.value} type="button" role="tab" aria-selected={active} className={cls} onClick={() => onChange(t.value)}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Grey segmented control with a white active pill (Log in / Create account, star filters). */
export function Segmented({ items, value, onChange, className, size = 'md', label }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex rounded-xl bg-chip p-1', className)}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t.value)}
            className={cx(
              'flex-1 rounded-lg whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[15px]',
              active ? 'bg-white font-semibold text-ink shadow-tab' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal meter: label, bar, value (rating breakdowns). */
export function Meter({ label, value, max = 5, labelWidth = 'w-[100px]', barClass = 'w-[170px]', tone = 'brand', className }) {
  const pct = value ? Math.min(100, (value / max) * 100) : 0;
  const fill = tone === 'success' ? 'bg-success' : tone === 'danger' ? 'bg-danger-ink' : 'bg-brand';
  const track = tone === 'success' ? 'bg-success-soft' : tone === 'danger' ? 'bg-danger-soft' : 'bg-brand-soft';
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <span className={cx('shrink-0 text-[15px] leading-[18px] text-ink', labelWidth)}>{label}</span>
      <span
        className={cx('relative h-2 shrink overflow-hidden rounded', track, barClass)}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value || 0}
      >
        <span className={cx('absolute inset-y-0 left-0 rounded', fill)} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-7 shrink-0 text-[15px] leading-[18px] font-bold text-ink">{value ? Number(value).toFixed(1) : '–'}</span>
    </div>
  );
}

/** Five small segments, used for difficulty/workload in the course list. */
export function Pips({ value, label }) {
  const filled = Math.round(value || 0);
  return (
    <span className="flex gap-1" role="img" aria-label={`${label} ${value ? Number(value).toFixed(1) : 'not rated'} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cx('h-2 w-3 rounded-sm', i <= filled ? 'bg-brand' : 'bg-brand-soft')} />
      ))}
    </span>
  );
}

/** 1–5 rating buttons used in the review and mid-term forms. */
export function RatingButtons({ value, onChange, name, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            name={name}
            aria-checked={active}
            aria-label={`${label}: ${n}`}
            onClick={() => onChange(n)}
            className={cx(
              'size-10 rounded-lg border text-sm font-semibold transition-colors',
              active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:border-brand/50',
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/** File type tile: PDF (red), DOCX (blue), TIP (green), IMG (amber). */
export function FileBadge({ kind, size = 'md' }) {
  const map = {
    pdf: ['PDF', 'bg-danger-soft text-danger-ink'],
    docx: ['DOCX', 'bg-brand-soft text-brand-ink'],
    tip: ['TIP', 'bg-success-soft text-success-ink'],
    img: ['IMG', 'bg-warn-soft text-warn-ink'],
  };
  const [label, cls] = map[kind] || map.pdf;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-bold',
        size === 'lg' ? 'size-[52px] text-[11px]' : size === 'sm' ? 'size-8 text-[10px]' : 'size-10 text-[11px]',
        cls,
      )}
      aria-label={`${label} file`}
    >
      {label}
    </span>
  );
}

export function Avatar({ text, size = 'md', tone = 'brand', className }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        size === 'lg' ? 'size-[52px] text-lg' : size === 'sm' ? 'size-9 text-xs' : 'size-11 text-base',
        tone === 'brand' ? 'bg-brand-soft text-brand-ink' : 'border border-line bg-chip text-chip-ink',
        className,
      )}
      aria-hidden
    >
      {text}
    </span>
  );
}

/* ---------------- Feedback ---------------- */
export function Alert({ tone = 'danger', icon: Icon, children, className }) {
  const cls = {
    danger: 'bg-danger-soft text-danger-ink',
    warn: 'bg-warn-soft text-warn-ink',
    success: 'bg-success-soft text-success-ink',
    brand: 'bg-brand-soft text-brand-ink',
  }[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex items-start gap-2.5 rounded-[10px] px-4 py-3 text-sm font-medium', cls, className)}
    >
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function LoadingBlock({ rows = 3, className }) {
  return (
    <div className={cx('flex flex-col gap-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action, icon: Icon }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-1 inline-flex size-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="text-base font-bold text-ink">{title}</p>
      {children && <p className="max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      title={error?.status === 404 ? 'Not found' : 'Could not load this page'}
      icon={AlertCircle}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {error?.message}
    </EmptyState>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={cx('m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-white p-0 shadow-float backdrop:bg-ink/40', width)}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-xl font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-chip hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
          {children}
          {footer && <div className="flex justify-end gap-2.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      {page > 1 && (
        <Button size="sm" variant="secondary" className="h-9" onClick={() => onChange(page - 1)}>
          ← Previous
        </Button>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-muted">…</span>}
          <button
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cx(
              'size-9 rounded-lg text-sm font-semibold',
              n === page ? 'bg-dark text-white' : 'border border-line bg-white hover:bg-page',
            )}
          >
            {n}
          </button>
        </span>
      ))}
      {page < pages && (
        <Button size="sm" variant="secondary" className="h-9" onClick={() => onChange(page + 1)}>
          Next →
        </Button>
      )}
    </nav>
  );
}
