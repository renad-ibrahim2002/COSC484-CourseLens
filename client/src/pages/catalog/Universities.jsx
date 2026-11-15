import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Check } from 'lucide-react';
import { get, post } from '../../api/client';
import { Breadcrumbs, Button, Card, Field, Input, Modal, PageTitle, Pill, Skeleton, ErrorState } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';

function SuggestUniversity({ open, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/suggestions/university', { name });
      toast('Thanks! An admin will review your suggestion.');
      setName('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Suggest a university">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="University name" id="uni-name" error={error}>
          <Input id="uni-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} autoFocus />
        </Field>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Send suggestion
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Universities() {
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, error, refetch } = useQuery({ queryKey: ['universities'], queryFn: () => get('/universities') });
  const list = (data?.universities || []).filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.shortName.toLowerCase().includes(q.toLowerCase()),
  );

  const notify = async (u) => {
    if (!user) return navigate('/login?next=/universities');
    await post(`/universities/${u.id}/notify`);
    qc.invalidateQueries({ queryKey: ['universities'] });
    toast(`We'll let you know when ${u.name} is added.`);
    return undefined;
  };

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Universities' }]} />
      <div className="mt-4 flex flex-col gap-2">
        <PageTitle>Choose your university</PageTitle>
        <p className="text-[15px] text-muted">
          CourseLens is starting with universities in Bahrain. Pick yours to see its majors and courses.
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink" aria-hidden />
        <Input
          aria-label="Search universities"
          placeholder="Search universities"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-[52px] pl-11 text-base"
        />
      </div>
      {error && <ErrorState error={error} onRetry={refetch} />}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {!data && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[260px]" />)}
        {list.map((u) => {
          const available = u.status === 'active';
          return (
            <Card key={u.id} className="flex flex-col gap-2 p-6">
              <div className="mb-2 flex items-start justify-between">
                <span
                  className={`inline-flex size-[54px] items-center justify-center rounded-xl text-[15px] font-bold ${available ? 'bg-brand-soft text-brand-ink' : 'bg-chip text-chip-ink'}`}
                  aria-hidden
                >
                  {available ? u.shortName : 'UNI'}
                </span>
                {available ? <Pill tone="success">Available</Pill> : <Pill tone="chip">Coming soon</Pill>}
              </div>
              <h2 className="font-sans text-lg font-bold">{u.name}</h2>
              <p className="text-sm text-muted">{u.location}</p>
              <p className="text-sm text-ink">
                {available
                  ? `${u.majorCount} majors · ${u.courseCount} courses · ${u.reviewCount.toLocaleString()} reviews`
                  : 'Catalog being added'}
              </p>
              {available ? (
                <Button to={`/universities/${u.id}`} variant="outline" className="mt-3 w-full">
                  View majors
                </Button>
              ) : (
                <Button variant="outline" className="mt-3 w-full" onClick={() => notify(u)} disabled={u.notifying}>
                  {u.notifying ? (
                    <>
                      <Check className="size-4" aria-hidden /> We'll notify you
                    </>
                  ) : (
                    'Notify me'
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {data && !list.length && <p className="text-muted">No universities match “{q}”.</p>}
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-line bg-white/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-bold">Don't see your university?</p>
          <p className="text-[15px] text-muted">Suggest it and an admin will add its majors and courses to the catalog.</p>
        </div>
        <Button variant="outline" onClick={() => (user ? setSuggest(true) : navigate('/login?next=/universities'))}>
          Suggest a university
        </Button>
      </div>
      <SuggestUniversity open={suggest} onClose={() => setSuggest(false)} />
    </div>
  );
}
