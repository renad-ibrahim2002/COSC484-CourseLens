import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Plus, X } from 'lucide-react';
import { get, patch, post } from '../../api/client';
import { Alert, Button, Card, Checkbox, Field, IconButton, Input, LoadingBlock, Modal, Pill, Select } from '../../components/ui';
import { AdminLayout } from '../../components/ConsoleLayouts';
import { useToast } from '../../components/Toast';

function CourseForm({ universityId, majors, course, defaultMajor, onDone, onCancel }) {
  const [form, setForm] = useState(
    course
      ? { code: course.code, title: course.title, credits: course.credits, majorIds: course.majorIds, visible: course.status === 'active' }
      : { code: '', title: '', credits: 3, majorIds: defaultMajor ? [defaultMajor] : [], visible: true },
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (course) {
        await patch(`/admin/courses/${course.id}`, {
          code: form.code,
          title: form.title,
          credits: Number(form.credits),
          majorIds: form.majorIds,
          status: form.visible ? 'active' : 'archived',
        });
      } else {
        await post('/admin/courses', {
          universityId,
          code: form.code,
          title: form.title,
          credits: Number(form.credits),
          majorIds: form.majorIds,
          visible: form.visible,
        });
      }
      toast(course ? 'Course updated.' : `${form.code.toUpperCase()} added to the catalog.`);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const majorNames = majors
    .filter((m) => form.majorIds.includes(m.id))
    .map((m) => m.name)
    .join(', ');
  return (
    <Card as="form" onSubmit={submit} noValidate className="flex flex-col gap-4 border-brand p-5 ring-1 ring-brand/40">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-[17px] font-bold">{course ? `Edit ${course.code}` : 'Add course'}</h2>
        <button type="button" aria-label="Close" onClick={onCancel} className="rounded p-1 text-muted hover:bg-chip">
          <X className="size-4" />
        </button>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-[140px_1fr_80px]">
        <Field label="Course code" id="c-code">
          <Input
            id="c-code"
            className="h-10 text-sm"
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
            placeholder="COSC 499"
            required
          />
        </Field>
        <Field label="Title" id="c-title">
          <Input id="c-title" className="h-10 text-sm" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </Field>
        <Field label="Credits" id="c-credits">
          <Input
            id="c-credits"
            type="number"
            min={0}
            max={30}
            className="h-10 text-sm"
            value={form.credits}
            onChange={(e) => set('credits', e.target.value)}
          />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">Majors</legend>
        <details className="group relative">
          <summary className="input flex h-10 cursor-pointer list-none items-center text-sm">{majorNames || 'Choose majors'}</summary>
          <div className="absolute inset-x-0 z-10 mt-1 flex flex-col gap-2 rounded-xl border border-line bg-white p-3 shadow-float">
            {majors.map((m) => (
              <Checkbox
                key={m.id}
                label={m.name}
                checked={form.majorIds.includes(m.id)}
                onChange={(e) => set('majorIds', e.target.checked ? [...form.majorIds, m.id] : form.majorIds.filter((x) => x !== m.id))}
              />
            ))}
          </div>
        </details>
      </fieldset>
      <Checkbox label="Visible to students right away" checked={form.visible} onChange={(e) => set('visible', e.target.checked)} />
      <div className="flex justify-end gap-2.5">
        <Button variant="secondary" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="md" loading={busy}>
          Save course
        </Button>
      </div>
    </Card>
  );
}

function AddDialog({ kind, open, onClose, universities, universityId, onDone }) {
  const [form, setForm] = useState({ name: '', shortName: '', location: 'Bahrain', domain: '', code: '' });
  const [error, setError] = useState('');
  const toast = useToast();
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (kind === 'university') {
        await post('/admin/universities', {
          name: form.name,
          shortName: form.shortName,
          location: form.location,
          emailDomains: form.domain ? [form.domain] : [],
          status: 'coming_soon',
        });
      } else {
        await post('/admin/majors', { universityId, name: form.name, code: form.code });
      }
      toast(`${form.name} added.`);
      setForm({ name: '', shortName: '', location: 'Bahrain', domain: '', code: '' });
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  const uni = universities.find((u) => u.id === universityId);
  return (
    <Modal open={open} onClose={onClose} title={kind === 'university' ? 'Add university' : `Add major to ${uni?.shortName}`}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {error && <Alert>{error}</Alert>}
        <Field label="Name" id="a-name">
          <Input id="a-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        {kind === 'university' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Short name" id="a-short">
                <Input
                  id="a-short"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  required
                  placeholder="UOB"
                />
              </Field>
              <Field label="Location" id="a-loc">
                <Input id="a-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
            </div>
            <Field label="Student email domain" id="a-domain" hint="New universities start as “Coming soon”.">
              <Input
                id="a-domain"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="uob.edu.bh"
              />
            </Field>
          </>
        ) : (
          <Field label="Code" id="a-code">
            <Input id="a-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="COSC" />
          </Field>
        )}
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="md">
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Catalog() {
  const qc = useQueryClient();
  const toast = useToast();
  const unis = useQuery({ queryKey: ['admin-unis'], queryFn: () => get('/admin/universities') });
  const [uniId, setUniId] = useState('');
  const [majorId, setMajorId] = useState('');
  const [editing, setEditing] = useState(null); // 'new' | course
  const [dialog, setDialog] = useState(null);
  const list = unis.data?.universities || [];
  const uni = list.find((u) => u.id === uniId) || list.find((u) => u.status === 'active') || list[0];
  const majors = (uni?.majors || []).filter((m) => !m.archived);
  useEffect(() => {
    if (uni && !uniId) setUniId(uni.id);
  }, [uni, uniId]);
  useEffect(() => {
    if (majors.length && !majors.some((m) => m.id === majorId)) setMajorId(majors.find((m) => m.code === 'COSC')?.id || majors[0].id);
  }, [majors, majorId]);
  const courses = useQuery({
    queryKey: ['admin-courses', uni?.id, majorId],
    queryFn: () => get('/admin/courses', { universityId: uni.id, majorId: majorId || undefined }),
    enabled: !!uni,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-courses'] });
    qc.invalidateQueries({ queryKey: ['admin-unis'] });
    setEditing(null);
  };
  const toggleArchive = async (c) => {
    await patch(`/admin/courses/${c.id}`, { status: c.status === 'active' ? 'archived' : 'active' });
    toast(c.status === 'active' ? `${c.code} archived.` : `${c.code} restored.`);
    refresh();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-[30px] leading-tight font-bold xl:text-[34px]">Universities, majors &amp; courses</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={() => setDialog('university')}>
            <Plus className="size-4" aria-hidden /> Add university
          </Button>
          <Button variant="secondary" size="md" onClick={() => setDialog('major')} disabled={!uni}>
            <Plus className="size-4" aria-hidden /> Add major
          </Button>
        </div>
      </div>
      {!unis.data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="University" id="cat-uni">
              <Select
                id="cat-uni"
                value={uni?.id || ''}
                onChange={(e) => {
                  setUniId(e.target.value);
                  setMajorId('');
                }}
              >
                {list.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.status !== 'active' ? ' (coming soon)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Major" id="cat-major">
              <Select id="cat-major" value={majorId} onChange={(e) => setMajorId(e.target.value)}>
                {!majors.length && <option value="">No majors yet</option>}
                {majors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{courses.data?.courses.length ?? 0} courses</span>
            <Button size="md" onClick={() => setEditing('new')} disabled={!majors.length}>
              <Plus className="size-4" aria-hidden /> Add course
            </Button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <caption className="sr-only">Courses</caption>
              <thead className="bg-page/70 text-[13px] text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Code
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Title
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Credits
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.data?.courses.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-[15px] font-bold whitespace-nowrap">{c.code}</td>
                    <td className="px-3 py-3 text-[15px]">{c.title}</td>
                    <td className="px-3 py-3 text-[15px]">{c.credits}</td>
                    <td className="px-3 py-3">
                      {c.status === 'active' ? (
                        <Pill tone="success" size="sm">
                          Active
                        </Pill>
                      ) : (
                        <Pill tone="chip" size="sm">
                          Archived
                        </Pill>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <IconButton label={`Edit ${c.code}`} className="size-8" onClick={() => setEditing(c)}>
                          <Pencil className="size-3.5" aria-hidden />
                        </IconButton>
                        <IconButton
                          label={c.status === 'active' ? `Archive ${c.code}` : `Restore ${c.code}`}
                          className="size-8"
                          onClick={() => toggleArchive(c)}
                        >
                          {c.status === 'active' ? (
                            <Archive className="size-3.5" aria-hidden />
                          ) : (
                            <ArchiveRestore className="size-3.5" aria-hidden />
                          )}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {courses.data && !courses.data.courses.length && <p className="p-5 text-sm text-muted">No courses yet for this major.</p>}
          </Card>
          {editing && (
            <CourseForm
              key={editing === 'new' ? 'new' : editing.id}
              universityId={uni.id}
              majors={majors}
              defaultMajor={majorId}
              course={editing === 'new' ? null : editing}
              onDone={refresh}
              onCancel={() => setEditing(null)}
            />
          )}
        </>
      )}
      <AddDialog
        kind={dialog}
        open={!!dialog}
        onClose={() => setDialog(null)}
        universities={list}
        universityId={uni?.id}
        onDone={refresh}
      />
    </AdminLayout>
  );
}
