import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, X, Inbox } from 'lucide-react';
import { get, post } from '../../api/client';
import { Button, Card, EmptyState, Field, Input, LoadingBlock, Modal, PageTitle, Pill, Tabs } from '../../components/ui';
import { AdminLayout } from '../../components/ConsoleLayouts';
import { timeAgo } from '../../lib/format';
import { useToast } from '../../components/Toast';

export default function Suggestions() {
  const [status, setStatus] = useState('pending');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-suggestions', status], queryFn: () => get('/admin/suggestions', { status }) });
  const act = async (s, action, body) => {
    try {
      await post(`/admin/suggestions/${s.id}/${action}`, body);
      toast(action === 'approve' ? `${body?.code || s.code} added to ${s.major}.` : 'Suggestion rejected.');
      qc.invalidateQueries({ queryKey: ['admin-suggestions'] });
      setEditing(null);
    } catch (e) {
      setError(e.message);
      toast(e.message, 'error');
    }
  };
  return (
    <AdminLayout>
      <div className="flex flex-col gap-1.5">
        <PageTitle>Course suggestions</PageTitle>
        <p className="text-sm text-muted">Students suggest courses missing from the catalog. Approving one adds it to the major.</p>
      </div>
      <Tabs
        label="Suggestion status"
        value={status}
        onChange={setStatus}
        items={[
          { value: 'pending', label: `Pending (${data?.counts.pending ?? 0})` },
          { value: 'approved', label: `Approved (${data?.counts.approved ?? 0})` },
          { value: 'rejected', label: `Rejected (${data?.counts.rejected ?? 0})` },
        ]}
      />
      {!data && <LoadingBlock />}
      {data && !data.suggestions.length && <EmptyState icon={Inbox} title={`No ${status} suggestions`} />}
      {data?.suggestions.map((s) => (
        <Card key={s.id} className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold">
                {s.code} · {s.title}
              </p>
              <p className="text-[13px] text-muted">
                {s.university} · {s.major}
              </p>
            </div>
            <Pill size="sm">
              {s.requests} student{s.requests === 1 ? '' : 's'} asked
            </Pill>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[13px] text-muted">Suggested by a verified student · {timeAgo(s.createdAt)}</span>
            {status === 'pending' && (
              <div className="flex gap-2">
                <Button variant="ghost" size="md" className="font-normal" onClick={() => act(s, 'reject')}>
                  <X className="size-4" aria-hidden /> Reject
                </Button>
                <Button variant="secondary" size="md" onClick={() => setEditing({ ...s })}>
                  <Pencil className="size-4" aria-hidden /> Edit first
                </Button>
                <Button size="md" onClick={() => act(s, 'approve')}>
                  <Check className="size-4" aria-hidden /> Approve
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit before approving"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              size="md"
              onClick={() => act(editing, 'approve', { code: editing.code, title: editing.title, credits: Number(editing.credits) })}
            >
              Approve
            </Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-3">
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="grid grid-cols-[1fr_2fr_80px] gap-3">
              <Field label="Code" id="e-code">
                <Input id="e-code" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </Field>
              <Field label="Title" id="e-title">
                <Input id="e-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </Field>
              <Field label="Credits" id="e-cr">
                <Input
                  id="e-cr"
                  type="number"
                  value={editing.credits}
                  onChange={(e) => setEditing({ ...editing, credits: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
