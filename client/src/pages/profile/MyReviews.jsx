import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Pencil, Trash2, Star } from 'lucide-react';
import { del, get } from '../../api/client';
import { Alert, Button, Card, EmptyState, LoadingBlock, Modal, PageTitle, ScoreChip, Segmented, Tag } from '../../components/ui';
import ProfileLayout, { StatusPill } from './ProfileLayout';
import { useToast } from '../../components/Toast';

export default function MyReviews() {
  const [tab, setTab] = useState('reviews');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['me-reviews'], queryFn: () => get('/me/reviews') });

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await del(deleting.kind === 'review' ? `/reviews/${deleting.id}` : `/midterms/${deleting.id}`);
      qc.invalidateQueries();
      toast('Deleted.');
      setDeleting(null);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProfileLayout>
      <div className="flex flex-col gap-1.5">
        <PageTitle>My reviews</PageTitle>
        <p className="text-sm text-muted">Your reviews are public but anonymous: they show only your major and semester.</p>
      </div>
      <Segmented
        label="Review type"
        className="w-fit"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'reviews', label: `Course reviews (${data?.reviews.length ?? 0})` },
          { value: 'midterms', label: `Mid-semester ratings (${data?.midterms.length ?? 0})` },
        ]}
      />
      {!data && <LoadingBlock />}
      {data && tab === 'reviews' && !data.reviews.length && (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          action={
            <Button to="/universities" size="md">
              Find a course to review
            </Button>
          }
        >
          Finished a course? Your review helps the next student plan their semester.
        </EmptyState>
      )}
      {tab === 'reviews' &&
        data?.reviews.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/courses/${r.course.id}`} className="text-base font-bold hover:underline">
                  {r.course.code} · {r.course.title}
                </Link>
                <p className="text-[13px] text-muted">Took it {r.semester}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={r.status} />
                <ScoreChip value={r.ratings.overall} />
              </div>
            </div>
            {r.text && <p className="text-[15px]">{r.text}</p>}
            {r.status !== 'published' && (
              <Alert tone="warn" icon={Flag}>
                {r.flagReason || 'A moderator is checking this review.'}
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">{r.status === 'published' ? `Helpful · ${r.helpfulCount}` : 'Not public yet'}</span>
              <div className="flex gap-2">
                <Button to={`/reviews/${r.id}/edit`} variant="secondary" size="sm" className="h-8">
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-normal"
                  onClick={() => setDeleting({ kind: 'review', id: r.id, label: r.course.code })}
                >
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      {data && tab === 'midterms' && !data.midterms.length && (
        <EmptyState title="No mid-semester ratings yet">Rate a course you are taking now from its Mid-semester ratings tab.</EmptyState>
      )}
      {tab === 'midterms' &&
        data?.midterms.map((m) => (
          <Card key={m.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/courses/${m.course.id}/midterms`} className="text-base font-bold hover:underline">
                  {m.course.code} · {m.course.title}
                </Link>
                <p className="text-[13px] text-muted">
                  {m.assessment === 'final' ? 'Final' : 'Mid-term'} · {m.section} · {m.semester}
                </p>
              </div>
              <StatusPill status={m.status} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Tag>Pace {m.ratings.pace}</Tag>
              <Tag>Workload {m.ratings.workload}</Tag>
              <Tag>Clarity {m.ratings.clarity}</Tag>
              <Tag>Exam fairness {m.ratings.fairness}</Tag>
            </div>
            {m.comment && <p className="text-[15px]">{m.comment}</p>}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 font-normal"
                onClick={() => setDeleting({ kind: 'midterm', id: m.id, label: m.course.code })}
              >
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </Button>
            </div>
          </Card>
        ))}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this?"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger-soft" size="md" onClick={confirmDelete} loading={busy}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Your {deleting?.kind === 'review' ? 'review' : 'rating'} of {deleting?.label} will be removed permanently. This can't be undone.
        </p>
      </Modal>
    </ProfileLayout>
  );
}
