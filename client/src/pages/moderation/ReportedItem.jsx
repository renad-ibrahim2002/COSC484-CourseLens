import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Flag } from 'lucide-react';
import { get, post } from '../../api/client';
import { Alert, Avatar, Breadcrumbs, Button, Card, ErrorState, Field, Pill, ScoreChip, Skeleton, Textarea, cx } from '../../components/ui';
import { ModLayout } from '../../components/ConsoleLayouts';
import { timeAgo } from '../../lib/format';
import { useToast } from '../../components/Toast';

const ACTIONS = [
  ['hide', 'Hide content', EyeOff],
  ['dismiss', 'Dismiss reports', Check],
  ['restore', 'Restore', Eye],
];

export default function ReportedItem() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, error } = useQuery({ queryKey: ['mod-case', reportId], queryFn: () => get(`/moderation/cases/${reportId}`) });
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async () => {
    if (!action) return setErr('Choose a decision');
    if (note.trim().length < 3) return setErr('Add a note for the log');
    setBusy(true);
    try {
      await post(`/moderation/cases/${reportId}/decision`, { action, note });
      qc.invalidateQueries();
      toast('Decision saved to the moderation log.');
      navigate('/moderation');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  if (error)
    return (
      <ModLayout>
        <ErrorState error={error} />
      </ModLayout>
    );
  const c = data?.case;
  const t = c?.target;
  const kind = c?.targetType === 'resource' ? 'resource' : c?.targetType === 'midterm' ? 'mid-term comment' : 'review';

  return (
    <ModLayout>
      {!c ? (
        <Skeleton className="h-[600px]" />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Breadcrumbs
              items={[{ label: 'Report queue', to: '/moderation' }, { label: `Report #R-${String(c.number).padStart(4, '0')}` }]}
            />
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[36px] font-bold">Reported {kind}</h1>
              <Pill tone={c.status === 'open' ? 'warn' : 'chip'} className="capitalize">
                {c.status}
              </Pill>
            </div>
          </div>
          <Card className="flex flex-col gap-3 p-5">
            <p className="eyebrow text-[11px] text-muted">
              {c.targetType === 'resource' ? 'Resource' : 'Review'} on {c.course?.code} · {c.course?.title}
            </p>
            {t ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      text={t.authorLabel
                        ?.split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')}
                      size="sm"
                      tone="chip"
                    />
                    <div className="leading-tight">
                      <p className="text-[15px] font-semibold">{t.authorLabel}</p>
                      <p className="text-[13px] text-muted">
                        {c.targetType === 'resource' ? 'Shared' : 'Took it'} {t.semester} · posted {timeAgo(t.createdAt)}
                      </p>
                    </div>
                  </div>
                  {t.rating && <ScoreChip value={t.rating} />}
                </div>
                {t.title && <p className="text-base font-bold">{t.title}</p>}
                {t.text && <p className="text-[15px]">{t.text}</p>}
                {c.targetType === 'resource' && (
                  <Link to={`/resources/${t.id}`} className="text-sm font-semibold text-brand hover:underline">
                    Open the resource →
                  </Link>
                )}
                {t.autoFlag && (
                  <Alert tone="warn" icon={Flag}>
                    {t.autoFlag}
                  </Alert>
                )}
                <p className="text-xs text-muted">Currently: {t.status === 'held' ? 'held for moderation (not public)' : t.status}</p>
              </>
            ) : (
              <p className="text-muted">This item was deleted by its author.</p>
            )}
          </Card>
          <Card className="flex flex-col p-5">
            <h2 className="mb-2 font-sans text-[17px] font-bold">Reports ({c.reports.length})</h2>
            {c.reports.length ? (
              c.reports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                  <Pill tone="warn" size="sm">
                    {r.reasonLabel}
                  </Pill>
                  <span className="flex-1 text-sm">{r.comment ? `“${r.comment}”` : <span className="text-muted">No comment</span>}</span>
                  <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Only the automatic check flagged this item.</p>
            )}
          </Card>
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="font-sans text-[17px] font-bold">Decision</h2>
            {err && <Alert>{err}</Alert>}
            <div role="radiogroup" aria-label="Decision" className="grid gap-2.5 sm:grid-cols-3">
              {ACTIONS.map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={action === v}
                  onClick={() => {
                    setAction(v);
                    setErr('');
                  }}
                  className={cx(
                    'flex h-11 items-center justify-center gap-2 rounded-[10px] border text-[15px] font-semibold transition-colors',
                    action === v ? 'border-dark bg-dark text-white' : 'border-line bg-white text-ink hover:bg-page',
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
            <Field label="Note for the log" id="mod-note">
              <Textarea
                id="mod-note"
                rows={2}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why you made this decision (required)."
              />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Author (moderators only): {c.author?.email || '[deleted account]'} · {c.author?.earlierReports ?? 0} earlier reports
              </p>
              <Button size="md" onClick={decide} loading={busy}>
                Confirm decision
              </Button>
            </div>
          </Card>
        </>
      )}
    </ModLayout>
  );
}
