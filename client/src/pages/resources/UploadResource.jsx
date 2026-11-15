import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import { get, patch, ApiError } from '../../api/client';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Field,
  FileBadge,
  Input,
  PageTitle,
  Segmented,
  Select,
  Skeleton,
  Textarea,
  cx,
} from '../../components/ui';
import SideNote from '../../components/SideNote';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';
import { bytes, TYPE_LABELS, TYPE_ORDER } from '../../lib/format';

const MAX = 10 * 1024 * 1024;
const EXT = { pdf: 'pdf', docx: 'docx', png: 'img', jpg: 'img', jpeg: 'img' };

/** Upload with progress (fetch has no upload progress events, so this uses XHR). */
function uploadWithProgress(form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${import.meta.env.VITE_API_URL || ''}/api/resources`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data.error || 'Upload failed', data));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Network error. Check your connection and try again.'));
    xhr.send(form);
  });
}

export default function UploadResource() {
  const { id: editId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const fileInput = useRef(null);

  const existing = useQuery({ queryKey: ['resource', editId], queryFn: () => get(`/resources/${editId}`), enabled: !!editId });
  const courses = useQuery({
    queryKey: ['uni-courses', user?.universityId, ''],
    queryFn: () => get(`/universities/${user.universityId}/courses`),
    enabled: !!user?.universityId,
  });
  const sems = useQuery({ queryKey: ['semesters'], queryFn: () => get('/meta/semesters') });

  const [form, setForm] = useState({
    type: 'notes',
    courseId: params.get('course') || '',
    semester: '',
    title: '',
    description: '',
    text: '',
    tags: [],
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [progress, setProgress] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const r = existing.data?.resource;
    if (r) {
      setForm({
        type: r.type,
        courseId: r.courseId,
        semester: r.semester,
        title: r.title,
        description: r.description,
        text: r.text || '',
        tags: r.tags,
      });
      setTextMode(r.kind === 'tip');
      setConfirm(true);
    }
  }, [existing.data]);
  useEffect(() => {
    if (!form.semester && sems.data) setForm((f) => ({ ...f, semester: sems.data.semesters[0] }));
  }, [sems.data, form.semester]);
  useEffect(() => {
    if (!form.courseId && courses.data?.courses.length) setForm((f) => ({ ...f, courseId: courses.data.courses[0].id }));
  }, [courses.data, form.courseId]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const pick = (f) => {
    setFileError('');
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!EXT[ext]) return setFileError('Only PDF, PNG, JPG or DOCX files are allowed.');
    if (f.size > MAX) return setFileError('Files can be up to 10 MB.');
    setFile(f);
    if (!form.title)
      set(
        'title',
        f.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .slice(0, 120),
      );
    return undefined;
  };

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase().replace(/^#/, '');
    if (t && !form.tags.includes(t) && form.tags.length < 8) set('tags', [...form.tags, t]);
    setTagDraft('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.courseId) errs.courseId = 'Choose a course';
    if (form.title.trim().length < 3) errs.title = 'Add a title';
    if (!editId && !textMode && !file) errs.file = 'Attach a file or write a text tip';
    if (!editId && textMode && !form.text.trim()) errs.text = 'Write your tip';
    if (!confirm) errs.confirm = 'Confirm you wrote this or have permission to share it';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setServerError('');
    try {
      let res;
      if (editId) {
        const { courseId, ...rest } = form;
        void courseId;
        res = await patch(`/resources/${editId}`, { ...rest, text: textMode ? form.text : undefined });
      } else {
        const fd = new FormData();
        for (const [k, v] of Object.entries(form)) {
          if (k === 'tags') v.forEach((t) => fd.append('tags', t));
          else if (k === 'text') {
            if (textMode) fd.append('text', v);
          } else fd.append(k, v);
        }
        fd.append('confirmOwnership', 'true');
        if (!textMode && file) fd.append('file', file);
        setProgress(0);
        res = await uploadWithProgress(fd, setProgress);
      }
      qc.invalidateQueries();
      toast(
        res.held
          ? 'Uploaded. A moderator will check it before it is public.'
          : editId
            ? 'Resource updated.'
            : 'Thanks! Your resource is published.',
      );
      navigate(`/resources/${res.resource.id}`);
    } catch (err) {
      setProgress(null);
      const fields = err.fieldErrors?.() || {};
      if (Object.keys(fields).length) setErrors(fields);
      setServerError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (editId && !existing.data)
    return (
      <div className="container-page py-10">
        <Skeleton className="h-[600px]" />
      </div>
    );
  const course = courses.data?.courses.find((c) => c.id === form.courseId);
  const kind = file ? EXT[file.name.split('.').pop().toLowerCase()] : null;

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: '…', to: '/universities' },
          ...(course
            ? [
                { label: course.code, to: `/courses/${course.id}` },
                { label: 'Resources', to: `/courses/${course.id}/resources` },
              ]
            : [{ label: 'Resources', to: '/resources' }]),
          { label: editId ? 'Edit' : 'Upload' },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <PageTitle>{editId ? 'Edit resource' : 'Upload a resource'}</PageTitle>
            <p className="text-sm text-muted">Share notes, guides, tips or formula sheets with students who take this course after you.</p>
          </div>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            {serverError && <Alert>{serverError}</Alert>}
            <Card className="flex flex-col gap-4 p-5">
              <p className="text-[15px] font-bold">What are you sharing?</p>
              <Segmented
                label="Resource type"
                size="sm"
                className="[&>button]:h-9"
                value={form.type}
                onChange={(v) => set('type', v)}
                items={TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Course" id="up-course" error={errors.courseId}>
                  <Select
                    id="up-course"
                    value={form.courseId}
                    onChange={(e) => set('courseId', e.target.value)}
                    disabled={!!editId}
                    error={errors.courseId}
                  >
                    {courses.data?.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Semester" id="up-sem">
                  <Select id="up-sem" value={form.semester} onChange={(e) => set('semester', e.target.value)}>
                    {sems.data?.semesters.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Title" id="up-title" error={errors.title}>
                <Input
                  id="up-title"
                  maxLength={120}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  error={errors.title}
                />
              </Field>
              <Field label="Description" id="up-desc">
                <Textarea
                  id="up-desc"
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="What does it cover and when is it most useful?"
                />
              </Field>
            </Card>

            <Card className="flex flex-col gap-3 p-5">
              <p className="text-[15px] font-bold">{textMode ? 'Your tip' : 'File'}</p>
              {editId && !textMode ? (
                <p className="text-sm text-muted">
                  The file can't be replaced. Delete this resource and upload a new one to change the file.
                </p>
              ) : textMode ? (
                <Field id="up-text" error={errors.text}>
                  <Textarea
                    id="up-text"
                    aria-label="Your tip"
                    rows={6}
                    maxLength={4000}
                    value={form.text}
                    onChange={(e) => set('text', e.target.value)}
                    placeholder="Write a tip for students taking this course."
                  />
                </Field>
              ) : (
                <>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      pick(e.dataTransfer.files[0]);
                    }}
                    className={cx(
                      'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                      dragging
                        ? 'border-brand bg-brand-soft/50'
                        : errors.file
                          ? 'border-danger/60 bg-danger-soft/30'
                          : 'border-line bg-page/60',
                    )}
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                      <Upload className="size-5" aria-hidden />
                    </span>
                    <p className="text-sm font-bold">
                      Drag a file here or{' '}
                      <button type="button" className="text-brand underline" onClick={() => fileInput.current.click()}>
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-muted">PDF, PNG, JPG or DOCX · up to 10 MB</p>
                    <input
                      ref={fileInput}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      aria-label="Choose a file"
                      onChange={(e) => pick(e.target.files[0])}
                    />
                  </div>
                  {(fileError || errors.file) && (
                    <p role="alert" className="text-[13px] text-danger">
                      {fileError || errors.file}
                    </p>
                  )}
                  {file && (
                    <div className="flex items-center gap-3 rounded-xl border border-line p-3">
                      <FileBadge kind={kind} size="sm" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-semibold">{file.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-[45%] overflow-hidden rounded bg-brand-soft">
                            <span
                              className="block h-full rounded bg-brand transition-[width]"
                              style={{ width: `${progress === null ? 100 : Math.round(progress * 100)}%` }}
                            />
                          </span>
                          <span className="text-xs text-success-ink">
                            {bytes(file.size)} · {progress === null ? 'Checked' : `Uploading ${Math.round(progress * 100)}%`}
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove file"
                        onClick={() => setFile(null)}
                        className="rounded p-1 text-muted hover:bg-chip"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
              {!editId && (
                <Checkbox
                  label="Write a text tip instead of uploading a file"
                  checked={textMode}
                  onChange={(e) => {
                    setTextMode(e.target.checked);
                    if (e.target.checked && form.type === 'notes') set('type', 'tips');
                  }}
                />
              )}
            </Card>

            <Card className="flex flex-col gap-2 p-5">
              <label htmlFor="up-tags" className="label">
                Tags
              </label>
              <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] border border-field bg-white px-2.5 py-1.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md bg-chip px-2 py-0.5 text-xs text-chip-ink">
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() =>
                        set(
                          'tags',
                          form.tags.filter((x) => x !== t),
                        )
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="up-tags"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    } else if (e.key === 'Backspace' && !tagDraft && form.tags.length) set('tags', form.tags.slice(0, -1));
                  }}
                  onBlur={addTag}
                  placeholder="Add a tag"
                  className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
                />
              </div>
              <p className="text-xs text-muted">Tags help students find it in search.</p>
            </Card>

            <div>
              <Checkbox
                label="I wrote this myself or have permission to share it."
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              {errors.confirm && (
                <p role="alert" className="mt-1 text-[13px] text-danger">
                  {errors.confirm}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" size="md" loading={progress !== null}>
                {editId ? 'Save changes' : 'Publish resource'}
              </Button>
            </div>
          </form>
        </div>
        <SideNote
          title="Before you upload"
          points={[
            'Only share your own notes or material you are allowed to share.',
            'Files are checked for type and size (PDF, PNG, JPG, DOCX up to 10 MB).',
            'Downloads need a verified account; your name is never shown.',
            'You can edit or delete it later from My uploads.',
          ]}
        />
      </div>
    </div>
  );
}
