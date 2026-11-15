import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../api/client';
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Field,
  Input,
  PageTitle,
  RatingButtons,
  Segmented,
  Select,
  Skeleton,
  ErrorState,
} from '../../components/ui';
import SideNote from '../../components/SideNote';
import { useToast } from '../../components/Toast';

const ROWS = [
  ['pace', 'Pace', 'How fast the material is covered'],
  ['workload', 'Workload', 'Effort needed so far'],
  ['clarity', 'Clarity', 'How clear lectures and instructions are'],
  ['fairness', 'Exam fairness', 'Did the exam match what was taught?'],
];
const SECTIONS = ['Section 01', 'Section 02', 'Section 03', 'Section 04', 'Section 05'];

export default function RateMidterm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const courseQ = useQuery({ queryKey: ['course', id], queryFn: () => get(`/courses/${id}`) });
  const mid = useQuery({ queryKey: ['midterms', id, '', 'all'], queryFn: () => get(`/courses/${id}/midterms`) });
  const [assessment, setAssessment] = useState('midterm');
  const [section, setSection] = useState('Section 01');
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (courseQ.error)
    return (
      <div className="container-page py-12">
        <ErrorState error={courseQ.error} />
      </div>
    );
  if (!courseQ.data || !mid.data)
    return (
      <div className="container-page flex flex-col gap-4 py-10">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  const { course, major, viewer } = courseQ.data;
  const finalOpen = mid.data.final.open;
  if (viewer && !viewer.canPost)
    return (
      <div className="container-page py-12">
        <Alert>You can only rate courses at your own university.</Alert>
      </div>
    );

  const submit = async (e) => {
    e.preventDefault();
    if (ROWS.some(([k]) => !ratings[k])) {
      setMissing(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await post(`/courses/${id}/midterms`, { assessment, semester: mid.data.current, section, ratings, comment });
      qc.invalidateQueries({ queryKey: ['midterms', id] });
      qc.invalidateQueries({ queryKey: ['course', id] });
      toast(r.held ? 'Saved. A moderator will check your comment first.' : 'Thanks! Your rating is in.');
      navigate(`/courses/${id}/midterms`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: '…', to: `/majors/${major?.id || ''}` },
          { label: course.code, to: `/courses/${id}` },
          { label: 'Rate mid-term / final' },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <PageTitle>Rate this semester: {course.title}</PageTitle>
            <p className="text-sm text-muted">Takes about 30 seconds. Shown under Mid-semester ratings, separate from full reviews.</p>
          </div>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            {error && <Alert>{error}</Alert>}
            <Card className="flex flex-col gap-4 p-5">
              <p className="text-[15px] font-bold">Which assessment are you rating?</p>
              <Segmented
                label="Assessment"
                value={assessment}
                onChange={(v) =>
                  v === 'final' && !finalOpen
                    ? setError('Final ratings open after final exams (week 15).')
                    : (setError(''), setAssessment(v))
                }
                items={[
                  { value: 'midterm', label: 'Mid-term' },
                  { value: 'final', label: finalOpen ? 'Final' : 'Final (opens week 15)' },
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Semester" id="mt-sem">
                  <Select id="mt-sem" value={mid.data.current} disabled>
                    <option>{mid.data.current} (current)</option>
                  </Select>
                </Field>
                <Field label="Section" id="mt-section">
                  <Select id="mt-section" value={section} onChange={(e) => setSection(e.target.value)}>
                    {SECTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>
            <Card as="fieldset" className="flex flex-col gap-4 p-5">
              <legend className="sr-only">How is it going?</legend>
              <p className="text-[15px] font-bold">How is it going?</p>
              {ROWS.map(([k, label, desc]) => (
                <div key={k} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-xs text-muted">{desc}</p>
                    {missing && !ratings[k] && (
                      <p className="text-xs text-danger" role="alert">
                        Choose a rating
                      </p>
                    )}
                  </div>
                  <RatingButtons label={label} value={ratings[k]} onChange={(v) => setRatings((r) => ({ ...r, [k]: v }))} />
                </div>
              ))}
            </Card>
            <Card className="p-5">
              <Field label="Comment (optional)" id="mt-comment" hint={`Course only, no instructor names.  ${comment.length} / 300`}>
                <Input
                  id="mt-comment"
                  maxLength={300}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="One tip for students taking this course now or next semester."
                />
              </Field>
            </Card>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" size="md" loading={busy}>
                Submit rating
              </Button>
            </div>
          </form>
        </div>
        <SideNote
          title="What is this?"
          points={[
            'A quick check-in while you are still taking the course.',
            'You can rate once after the mid-term and once after the final, per section.',
            "Ratings stay anonymous and don't change the course's overall rating.",
          ]}
        />
      </div>
    </div>
  );
}
