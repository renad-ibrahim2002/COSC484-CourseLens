import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch } from '../../api/client';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Field,
  PageTitle,
  RatingButtons,
  Select,
  Skeleton,
  Textarea,
  ErrorState,
} from '../../components/ui';
import CourseTagInput from '../../components/CourseTagInput';
import SideNote from '../../components/SideNote';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';

const CRITERIA = [
  ['difficulty', 'Difficulty', 'How hard the material is'],
  ['workload', 'Workload', 'Hours per week outside class'],
  ['usefulness', 'Usefulness', 'Value for your degree and career'],
  ['fairness', 'Assessment fairness', 'Exams and grading match what was taught'],
];
const PLAN = [
  ['takeBefore', 'Take before this course', 'text-brand-ink', 'brand'],
  ['takeTogether', 'Pairs well in the same semester', 'text-success-ink', 'success'],
  ['avoidTogether', 'Avoid in the same semester', 'text-danger-ink', 'danger'],
];

export default function WriteReview() {
  const { id: courseParam, reviewId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ['review', reviewId], queryFn: () => get(`/reviews/${reviewId}`), enabled: !!reviewId });
  const courseId = courseParam || existing.data?.review.courseId;
  const courseQ = useQuery({ queryKey: ['course', courseId], queryFn: () => get(`/courses/${courseId}`), enabled: !!courseId });
  const sems = useQuery({ queryKey: ['semesters'], queryFn: () => get('/meta/semesters') });

  const [form, setForm] = useState({ semester: '', ratings: {}, text: '', recs: { takeBefore: [], takeTogether: [], avoidTogether: [] } });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = existing.data?.review;
    if (r) setForm({ semester: r.semester, ratings: r.ratings, text: r.text, recs: r.recommendations });
  }, [existing.data]);
  useEffect(() => {
    if (!form.semester && sems.data && !reviewId) setForm((f) => ({ ...f, semester: sems.data.semesters[0] }));
  }, [sems.data, form.semester, reviewId]);
  // A student can only review once per course per semester: send them to edit instead.
  useEffect(() => {
    const mine = courseQ.data?.viewer?.myReview;
    if (!reviewId && mine && mine.semester === form.semester)
      setServerError(`You already reviewed this course for ${mine.semester}. You can edit that review or pick another semester.`);
    else setServerError('');
  }, [courseQ.data, form.semester, reviewId]);

  if (existing.error || courseQ.error)
    return (
      <div className="container-page py-12">
        <ErrorState error={existing.error || courseQ.error} />
      </div>
    );
  const data = courseQ.data;
  if (!data || !sems.data)
    return (
      <div className="container-page flex flex-col gap-4 py-10">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  const { course, university, major } = data;
  if (data.viewer && !data.viewer.canPost) {
    return (
      <div className="container-page py-12">
        <Alert>You can only review courses at your own university.</Alert>
      </div>
    );
  }
  const majorName = user?.major?.name || major?.name || 'Verified';
  const setRating = (k, v) => {
    setForm((f) => ({ ...f, ratings: { ...f.ratings, [k]: v } }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    for (const [k] of [...CRITERIA, ['overall']]) if (!form.ratings[k]) errs[k] = 'Choose a rating';
    if (!form.semester) errs.semester = 'Choose a semester';
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    const body = {
      semester: form.semester,
      ratings: form.ratings,
      text: form.text,
      recommendations: Object.fromEntries(Object.entries(form.recs).map(([k, v]) => [k, v.map((c) => c.id)])),
    };
    try {
      const res = reviewId ? await patch(`/reviews/${reviewId}`, body) : await post(`/courses/${course.id}/reviews`, body);
      qc.invalidateQueries();
      toast(
        res.held ? 'Saved. A moderator will check it before it is public.' : reviewId ? 'Review updated.' : 'Thanks! Your review is live.',
      );
      navigate(res.held ? '/me/reviews' : `/courses/${course.id}/reviews`);
    } catch (err) {
      setServerError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const RatingRow = ([k, label, desc]) => (
    <div key={k} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-error={!!errors[k]}>
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-muted">{desc}</p>
        {errors[k] && (
          <p className="text-xs text-danger" role="alert">
            {errors[k]}
          </p>
        )}
      </div>
      <RatingButtons label={label} value={form.ratings[k]} onChange={(v) => setRating(k, v)} />
    </div>
  );

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: '…', to: `/majors/${major?.id || ''}` },
          { label: course.code, to: `/courses/${course.id}` },
          { label: reviewId ? 'Edit review' : 'Write a review' },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <PageTitle>Review {course.title}</PageTitle>
            <p className="text-sm text-muted">
              It will appear as “{majorName} student, {form.semester}”. Your name and email are never shown.
            </p>
          </div>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            {serverError && <Alert>{serverError}</Alert>}
            <Card className="flex flex-col gap-2 p-5">
              <Field
                label="Semester you took it"
                id="semester"
                error={errors.semester}
                hint="You can post one review per course per semester."
              >
                <Select
                  id="semester"
                  value={form.semester}
                  onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                  wrapperClassName="max-w-[320px]"
                >
                  {sems.data.semesters.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </Card>
            <Card as="fieldset" className="flex flex-col gap-4 p-5">
              <legend className="sr-only">Rate the course</legend>
              <div>
                <p className="text-[15px] font-bold">Rate the course</p>
                <p className="text-[13px] text-muted">
                  1 is the lowest, 5 the highest. For difficulty and workload, 5 means hardest and heaviest.
                </p>
              </div>
              {CRITERIA.map(RatingRow)}
              <hr className="border-line" />
              {RatingRow(['overall', 'Overall', 'Would you recommend it?'])}
            </Card>
            <Card className="flex flex-col gap-2 p-5">
              <Field
                label="Your review"
                optional
                id="text"
                hint={`Talk about the course, not the instructor. Reviews that name instructors are held for moderation.  ${form.text.length} / 2000`}
              >
                <Textarea
                  id="text"
                  rows={5}
                  maxLength={2000}
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="What was the workload like week to week? How were the exams and projects? What do you wish you had known?"
                />
              </Field>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <p className="text-sm font-bold">
                Help others plan <span className="font-normal text-muted">(optional) · feeds Course combos</span>
              </p>
              {PLAN.map(([k, label, color, tone]) => (
                <div key={k} className="flex flex-col gap-1.5">
                  <label htmlFor={`plan-${k}`} className={`eyebrow text-[11px] ${color}`}>
                    {label}
                  </label>
                  <CourseTagInput
                    id={`plan-${k}`}
                    label={label}
                    tone={tone}
                    universityId={university.id}
                    excludeId={course.id}
                    value={form.recs[k]}
                    onChange={(v) => setForm((f) => ({ ...f, recs: { ...f.recs, [k]: v } }))}
                  />
                </div>
              ))}
            </Card>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" size="md" loading={busy}>
                {reviewId ? 'Save changes' : 'Submit review'}
              </Button>
            </div>
          </form>
        </div>
        <SideNote
          title="Posting guidelines"
          points={[
            'Rate the course content, workload and assessments, not people.',
            'One review per course per semester; edit or delete it later from My reviews.',
            'No offensive language. Flagged reviews are checked by a moderator.',
            'Be specific: future students plan their semester around this.',
          ]}
        />
      </div>
    </div>
  );
}
