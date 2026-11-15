import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { get } from '../api/client';
import { cx } from './ui';

/** Chips input that looks up course codes at the same university ("Help others plan"). */
export default function CourseTagInput({ universityId, excludeId, value, onChange, tone = 'brand', label, id }) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    if (!q.trim()) {
      setOptions([]);
      return undefined;
    }
    const t = setTimeout(() => {
      get('/courses/lookup', { universityId, q: q.trim() })
        .then((d) => setOptions(d.courses.filter((c) => c.id !== excludeId && !value.some((v) => v.id === c.id))))
        .catch(() => setOptions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, universityId, excludeId, value]);

  const add = (c) => {
    if (value.length >= 5) return;
    onChange([...value, c]);
    setQ('');
    setOptions([]);
    setActive(0);
  };
  const chip =
    tone === 'danger'
      ? 'bg-danger-soft text-danger-ink'
      : tone === 'success'
        ? 'bg-success-soft text-success-ink'
        : 'bg-brand-soft text-brand-ink';

  return (
    <div className="relative">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] border border-field bg-white px-2.5 py-1.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
        {value.map((c) => (
          <span key={c.id} className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', chip)}>
            {c.code}
            <button
              type="button"
              aria-label={`Remove ${c.code}`}
              onClick={() => onChange(value.filter((v) => v.id !== c.id))}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (options[active]) add(options[active]);
            } else if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1));
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
            else if (e.key === 'Backspace' && !q && value.length) onChange(value.slice(0, -1));
          }}
          placeholder={value.length >= 5 ? 'Up to 5 courses' : 'Add a course code'}
          disabled={value.length >= 5}
          aria-label={label}
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          className="min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle"
        />
      </div>
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-float"
        >
          {options.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(c)}
                className={cx('w-full px-3 py-2 text-left text-sm', i === active && 'bg-page')}
              >
                <span className="font-bold">{c.code}</span> <span className="text-muted">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
