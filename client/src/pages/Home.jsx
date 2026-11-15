import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, Activity, LayoutDashboard, FileText } from 'lucide-react';
import { get } from '../api/client';
import { Button, Meter, Pill, Select, Skeleton } from '../components/ui';
import { CourseCard } from '../components/CourseBits';
import { useAuth } from '../lib/auth';

const FEATURES = [
  [Star, 'Course ratings', 'Difficulty, workload, usefulness and assessment fairness, scored by students who finished it.'],
  [Activity, 'Mid-semester ratings', 'Quick mid-term and final ratings from this semester, so you see how a course feels right now.'],
  [LayoutDashboard, 'Course combos', 'See what to take first, what pairs well, and which courses to keep apart.'],
  [FileText, 'Course resources', 'Notes, study guides and formula sheets, filed by course and semester and searchable.'],
];

function Picker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: unis } = useQuery({ queryKey: ['universities'], queryFn: () => get('/universities') });
  const active = unis?.universities.filter((u) => u.status === 'active') || [];
  const [uni, setUni] = useState('');
  const [major, setMajor] = useState('');
  const uniId = uni || user?.universityId || active[0]?.id || '';
  const { data: majors } = useQuery({
    queryKey: ['majors', uniId],
    queryFn: () => get(`/universities/${uniId}/majors`, { sort: 'name' }),
    enabled: !!uniId,
  });
  const majorList = useMemo(() => majors?.majors || [], [majors]);
  useEffect(() => {
    if (!majorList.length) return;
    if (!majorList.some((m) => m.id === major)) {
      setMajor(majorList.find((m) => m.id === user?.majorId)?.id || majorList.find((m) => m.code === 'COSC')?.id || majorList[0].id);
    }
  }, [majorList, major, user]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (major) navigate(`/majors/${major}`);
      }}
      className="flex w-full flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-float sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="pick-uni" className="label">
          University
        </label>
        <Select id="pick-uni" value={uniId} onChange={(e) => setUni(e.target.value)}>
          {active.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 sm:w-[200px]">
        <label htmlFor="pick-major" className="label">
          Major
        </label>
        <Select id="pick-major" value={major} onChange={(e) => setMajor(e.target.value)}>
          {majorList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={!major}>
        Show courses
      </Button>
    </form>
  );
}

function Preview({ course }) {
  if (!course) return <Skeleton className="h-[300px] w-full lg:w-[420px]" />;
  const a = course.ratingSummary.averages;
  return (
    <Link
      to={`/courses/${course.id}`}
      className="flex w-full shrink-0 flex-col gap-4 rounded-[20px] border border-line bg-white p-7 shadow-float transition-transform hover:-translate-y-0.5 lg:w-[420px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-brand">{course.code}</span>
          <span className="font-display text-2xl leading-[27px] font-bold">{course.title}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-4xl leading-10 font-bold">{a.overall ? a.overall.toFixed(1) : '–'}</span>
          <span className="text-xs text-muted">overall</span>
        </div>
      </div>
      <Meter label="Difficulty" value={a.difficulty} />
      <Meter label="Workload" value={a.workload} />
      <Meter label="Usefulness" value={a.usefulness} />
      <Meter label="Fairness" value={a.fairness} />
      <div className="flex flex-wrap gap-2">
        {course.takeBefore && <Pill size="md">Take before: {course.takeBefore.code}</Pill>}
        {course.avoidTogether && <Pill tone="danger">Avoid with: {course.avoidTogether.code}</Pill>}
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['courses-top', user?.universityId],
    queryFn: () => get('/courses/top', { universityId: user?.universityId, limit: 4 }),
  });

  return (
    <div className="container-page flex flex-col gap-16 py-12 lg:py-[72px]">
      <section className="flex flex-col items-center gap-12 lg:flex-row" aria-labelledby="hero-title">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[22px]">
          <Pill size="lg">Starting with universities in Bahrain</Pill>
          <h1 id="hero-title" className="text-[40px] leading-[1.12] font-bold sm:text-[58px] sm:leading-[65px]">
            Know the course before you register.
          </h1>
          <p className="max-w-[520px] text-[17px] leading-[29px] text-muted sm:text-[19px]">
            Course-only ratings, mid-semester ratings from this semester, and the notes past students left behind, in one place.
          </p>
          <Picker />
        </div>
        <Preview course={data?.featured} />
      </section>

      <section aria-label="What you get" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([Icon, title, text]) => (
          <div key={title} className="card flex flex-col gap-2.5 p-6">
            <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand-ink">
              <Icon className="size-[22px]" strokeWidth={1.8} aria-hidden />
            </span>
            <h2 className="font-sans text-lg font-bold">{title}</h2>
            <p className="text-[15px] leading-[23px] text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="most-reviewed" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="most-reviewed" className="text-[30px] leading-[34px] font-bold">
            Most reviewed at {data?.university?.shortName || '…'}
          </h2>
          <Link
            to={data?.university ? `/universities/${data.university._id}` : '/universities'}
            className="text-[15px] font-semibold text-brand hover:underline"
          >
            Browse all courses →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data
            ? data.courses.map((c) => <CourseCard key={c.id} course={c} />)
            : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[118px]" />)}
        </div>
      </section>

      <section
        className="flex flex-col gap-6 rounded-[20px] bg-dark p-8 sm:flex-row sm:items-center sm:gap-8 sm:p-10"
        aria-labelledby="cta-title"
      >
        <div className="flex flex-1 flex-col gap-2.5">
          <h2 id="cta-title" className="text-[26px] leading-9 font-bold text-white sm:text-[32px]">
            Finished a course? Leave the review you wish you'd had.
          </h2>
          <p className="text-[15px] text-[#c9cdd6]">
            Courses, not professors. Verified university emails only. Shown anonymously by major and semester.
          </p>
        </div>
        <Button to={user ? `/majors/${user.majorId}` : '/register'} variant="white" size="xl">
          Write a review
        </Button>
      </section>
    </div>
  );
}
