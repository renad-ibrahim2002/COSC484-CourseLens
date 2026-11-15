import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Upload, X } from 'lucide-react';
import { get } from '../../api/client';
import {
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  LoadingBlock,
  PageTitle,
  Pagination,
  Pill,
  Segmented,
  Select,
} from '../../components/ui';
import ResourceRow from '../../components/ResourceRow';
import { useAuth } from '../../lib/auth';
import { TYPE_LABELS, TYPE_ORDER } from '../../lib/format';
import { FileText } from 'lucide-react';

const FORMATS = [
  ['pdf', 'PDF'],
  ['docx', 'DOCX'],
  ['image', 'Image'],
];
const list = (v) => (v ? v.split(',').filter(Boolean) : []);

export default function ResourcesPage({ scoped }) {
  const { id: routeCourse } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [tagDraft, setTagDraft] = useState('');

  const course = params.has('course') ? params.get('course') : scoped ? routeCourse : '';
  const filters = {
    q: params.get('q') || '',
    university: params.get('university') || '',
    major: params.get('major') || '',
    course,
    types: list(params.get('types')),
    semester: params.get('semester') || '',
    formats: list(params.get('formats')),
    tags: list(params.get('tags')),
    minRating: params.get('minRating') || '',
    sort: params.get('sort') || 'helpful',
    page: Number(params.get('page') || 1),
  };

  // Functional update so delayed calls (the debounced search box) never overwrite newer filters.
  const update = (patch) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          const val = Array.isArray(v) ? v.join(',') : v;
          if (val === '' || val === undefined || val === null) next.delete(k);
          else next.set(k, val);
        }
        if (!('page' in patch)) next.delete('page');
        if (scoped && 'course' in patch && !patch.course) next.set('course', '');
        return next;
      },
      { replace: true },
    );
  useEffect(() => {
    const t = setTimeout(() => q !== filters.q && update({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const unis = useQuery({ queryKey: ['universities'], queryFn: () => get('/universities') });
  const activeUnis = unis.data?.universities.filter((u) => u.status === 'active') || [];
  const courseInfo = useQuery({ queryKey: ['course', course], queryFn: () => get(`/courses/${course}`), enabled: !!course });
  const uniId = filters.university || courseInfo.data?.university.id || user?.universityId || activeUnis[0]?.id;
  const majors = useQuery({
    queryKey: ['majors', uniId],
    queryFn: () => get(`/universities/${uniId}/majors`, { sort: 'name' }),
    enabled: !!uniId,
  });
  const courses = useQuery({
    queryKey: ['uni-courses', uniId, filters.major],
    queryFn: () => get(`/universities/${uniId}/courses`, { majorId: filters.major || undefined }),
    enabled: !!uniId,
  });
  const sems = useQuery({ queryKey: ['semesters'], queryFn: () => get('/meta/semesters') });
  const results = useQuery({
    queryKey: ['resources', { ...filters, uniId }],
    queryFn: () =>
      get('/resources', {
        ...filters,
        university: filters.university || (course ? undefined : uniId),
        course: course || undefined,
        semester: filters.semester || undefined,
        minRating: filters.minRating || undefined,
        limit: 8,
      }),
    placeholderData: (p) => p,
  });
  const data = results.data;
  const c = courseInfo.data?.course;

  const chips = useMemo(() => {
    const out = [];
    if (c) out.push(['course', c.code, () => update({ course: '' })]);
    filters.types.forEach((t) => out.push([`type-${t}`, TYPE_LABELS[t], () => update({ types: filters.types.filter((x) => x !== t) })]));
    filters.formats.forEach((f) =>
      out.push([`fmt-${f}`, FORMATS.find((x) => x[0] === f)?.[1], () => update({ formats: filters.formats.filter((x) => x !== f) })]),
    );
    filters.tags.forEach((t) => out.push([`tag-${t}`, `#${t}`, () => update({ tags: filters.tags.filter((x) => x !== t) })]));
    if (filters.semester) out.push(['sem', filters.semester, () => update({ semester: '' })]);
    if (filters.minRating) out.push(['rating', `${filters.minRating}★+ courses`, () => update({ minRating: '' })]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, c]);

  const toggle = (key, value) =>
    update({ [key]: filters[key].includes(value) ? filters[key].filter((x) => x !== value) : [...filters[key], value] });
  const crumbs = c
    ? [
        { label: 'Home', to: '/' },
        { label: '…', to: courseInfo.data.major ? `/majors/${courseInfo.data.major.id}` : '/universities' },
        { label: c.code, to: `/courses/${c.id}` },
        { label: 'Resources' },
      ]
    : [{ label: 'Home', to: '/' }, { label: 'Resources' }];

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <PageTitle>Course resources</PageTitle>
          <p className="text-sm text-muted">Notes, study guides, tips and formula sheets shared by students, filed by course.</p>
        </div>
        <Button to={user ? `/resources/upload${course ? `?course=${course}` : ''}` : '/login?next=/resources/upload'} size="md">
          <Upload className="size-4" aria-hidden /> Upload resource
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink" aria-hidden />
          <Input
            type="search"
            aria-label="Search resources"
            placeholder="Search titles, descriptions and tags"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 pl-11 text-base"
          />
        </div>
        <Select
          aria-label="Sort resources"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
          wrapperClassName="sm:w-[210px]"
          className="h-12 text-[15px]"
        >
          <option value="helpful">Sort: Most helpful</option>
          <option value="newest">Sort: Newest</option>
        </Select>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(([key, label, remove]) => (
            <Pill key={key} className="pr-2">
              <button type="button" onClick={remove} className="inline-flex items-center gap-1" aria-label={`Remove filter ${label}`}>
                <X className="size-3" aria-hidden /> {label}
              </button>
            </Pill>
          ))}
          <button
            type="button"
            className="text-[13px] font-semibold text-brand hover:underline"
            onClick={() => setParams(scoped ? { course: '' } : {}, { replace: true })}
          >
            Clear all
          </button>
        </div>
      )}
      <div className="grid gap-7 lg:grid-cols-[280px_1fr]">
        <Card as="aside" aria-label="Filters" className="flex h-fit flex-col gap-4 p-5">
          <h2 className="font-sans text-[17px] font-bold">Filters</h2>
          <Field label="University" id="f-uni">
            <Select
              id="f-uni"
              value={uniId || ''}
              onChange={(e) => update({ university: e.target.value, major: '', course: '' })}
              className="h-10 text-sm"
            >
              {activeUnis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Major" id="f-major">
            <Select
              id="f-major"
              value={filters.major}
              onChange={(e) => update({ major: e.target.value, course: '' })}
              className="h-10 text-sm"
            >
              <option value="">All majors</option>
              {majors.data?.majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Course" id="f-course">
            <Select id="f-course" value={course} onChange={(e) => update({ course: e.target.value })} className="h-10 text-sm">
              <option value="">All courses</option>
              {courses.data?.courses.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.code} {x.title}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-2">Type</legend>
            {TYPE_ORDER.map((t) => (
              <div key={t} className="flex items-center justify-between">
                <Checkbox label={TYPE_LABELS[t]} checked={filters.types.includes(t)} onChange={() => toggle('types', t)} />
                <span className="text-xs text-muted">{data?.typeCounts?.[t] ?? ''}</span>
              </div>
            ))}
          </fieldset>
          <Field label="Semester" id="f-sem">
            <Select id="f-sem" value={filters.semester} onChange={(e) => update({ semester: e.target.value })} className="h-10 text-sm">
              <option value="">Any semester</option>
              {sems.data?.semesters.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-2">File format</legend>
            {FORMATS.map(([v, l]) => (
              <Checkbox key={v} label={l} checked={filters.formats.includes(v)} onChange={() => toggle('formats', v)} />
            ))}
          </fieldset>
          <Field label="Tags" id="f-tags">
            <Input
              id="f-tags"
              className="h-10 text-sm"
              placeholder="e.g. midterm, jwt"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const t = tagDraft.trim().toLowerCase().replace(/^#/, '');
                  if (t && !filters.tags.includes(t)) update({ tags: [...filters.tags, t] });
                  setTagDraft('');
                }
              }}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="label" id="f-rating">
              Minimum rating
            </span>
            <Segmented
              label="Minimum course rating"
              size="sm"
              value={filters.minRating || 'any'}
              onChange={(v) => update({ minRating: v === 'any' ? '' : v })}
              items={[
                { value: 'any', label: 'Any' },
                { value: '3', label: '3★+' },
                { value: '4', label: '4★+' },
              ]}
            />
          </div>
        </Card>
        <section aria-label="Results" className="flex min-w-0 flex-col gap-3">
          <p className="text-[13px] text-muted" aria-live="polite">
            {data ? `${data.total} result${data.total === 1 ? '' : 's'}${filters.q ? ` for “${filters.q}”` : ''}` : 'Loading…'}
          </p>
          {!data && <LoadingBlock rows={4} />}
          {data && !data.resources.length && (
            <EmptyState
              title="No resources found"
              icon={FileText}
              action={
                <Button to={user ? `/resources/upload${course ? `?course=${course}` : ''}` : '/login'} size="md">
                  Upload the first one
                </Button>
              }
            >
              Try fewer filters, or share your own notes for this course.
            </EmptyState>
          )}
          {data?.resources.map((r) => (
            <ResourceRow key={r.id} resource={r} />
          ))}
          {data && (
            <div className="mt-2">
              <Pagination page={data.page} pages={data.pages} onChange={(p) => update({ page: String(p) })} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
