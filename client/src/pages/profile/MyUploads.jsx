import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { del, get } from '../../api/client';
import { Button, Card, EmptyState, FileBadge, IconButton, LoadingBlock, Modal, PageTitle } from '../../components/ui';
import ProfileLayout, { StatusPill } from './ProfileLayout';
import { useToast } from '../../components/Toast';
import { TYPE_LABELS } from '../../lib/format';

export default function MyUploads() {
  const { data } = useQuery({ queryKey: ['me-uploads'], queryFn: () => get('/me/uploads') });
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const confirmDelete = async () => {
    setBusy(true);
    try {
      await del(`/resources/${deleting.id}`);
      qc.invalidateQueries();
      toast('Resource deleted.');
      setDeleting(null);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <PageTitle>My uploads</PageTitle>
          <p className="text-sm text-muted">Resources you have shared. Edit or delete them at any time.</p>
        </div>
        <Button to="/resources/upload" size="md">
          <Upload className="size-4" aria-hidden /> Upload resource
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Uploads', data?.stats.uploads],
          ['Helpful votes', data?.stats.helpful],
          ['Downloads', data?.stats.downloads],
        ].map(([label, value]) => (
          <Card key={label} className="flex flex-col gap-1 p-5">
            <span className="text-sm text-muted">{label}</span>
            <span className="font-display text-[30px] leading-9 font-bold">{value ?? '–'}</span>
          </Card>
        ))}
      </div>
      {!data && <LoadingBlock />}
      {data && !data.resources.length && (
        <EmptyState
          icon={Upload}
          title="Nothing shared yet"
          action={
            <Button to="/resources/upload" size="md">
              Upload your first resource
            </Button>
          }
        >
          Notes, study guides and formula sheets help the next student.
        </EmptyState>
      )}
      {data?.resources.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <caption className="sr-only">Your uploads</caption>
            <thead className="bg-page/70 text-[13px] text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-3 font-medium">
                  Resource
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
                  Type
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">
                  Helpful
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.resources.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <FileBadge kind={r.kind} size="sm" />
                      <div>
                        <Link to={`/resources/${r.id}`} className="text-[15px] font-semibold hover:underline">
                          {r.title}
                        </Link>
                        <p className="text-[13px] text-muted">
                          {r.course?.code} · {r.semester}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-[15px] md:table-cell">{TYPE_LABELS[r.type]}</td>
                  <td className="hidden px-3 py-3 text-[15px] sm:table-cell">{r.helpfulCount}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton label={`Edit ${r.title}`} onClick={() => navigate(`/resources/${r.id}/edit`)}>
                        <Pencil className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`Delete ${r.title}`} onClick={() => setDeleting(r)}>
                        <Trash2 className="size-4" aria-hidden />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this resource?"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger-soft" size="md" loading={busy} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          “{deleting?.title}” and its file will be removed permanently, including helpful votes and bookmarks. This can't be undone.
        </p>
      </Modal>
    </ProfileLayout>
  );
}
