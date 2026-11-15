import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { get } from '../../api/client';
import { Breadcrumbs, Button, IconButton, Pill, Skeleton, Tabs, ErrorState, cx } from '../../components/ui';
import { useInteractions } from '../../lib/useInteractions';

// eslint-disable-next-line react-refresh/only-export-components
export function useCourse(id) {
  return useQuery({ queryKey: ['course', id], queryFn: () => get(`/courses/${id}`) });
}

export function CourseHeader({ data }) {
  const { bookmark, user } = useInteractions();
  const navigate = useNavigate();
  const loc = useLocation();
  const { course, university, major, viewer } = data;
  const s = course.ratingSummary;
  const needLogin = (to) => (user ? to : `/login?next=${encodeURIComponent(to)}`);
  const writeTo = viewer?.myReview ? `/reviews/${viewer.myReview.id}/edit` : `/courses/${course.id}/review`;
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: university.name, to: `/universities/${university.id}` },
          ...(major ? [{ label: major.name, to: `/majors/${major.id}` }] : []),
          { label: course.code },
        ]}
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Pill size="sm" className="px-2.5 py-1 text-[13px] font-medium">
              {course.code}
            </Pill>
            <Pill tone="chip" size="sm" className="px-2.5 py-1 text-[13px] font-medium">
              {course.credits} credits
            </Pill>
            {major && (
              <Pill tone="chip" size="sm" className="px-2.5 py-1 text-[13px] font-medium">
                {major.name}
              </Pill>
            )}
            {course.status === 'archived' && (
              <Pill tone="warn" size="sm">
                Archived
              </Pill>
            )}
          </div>
          <h1 className="text-[36px] leading-tight font-bold sm:text-[44px]">{course.title}</h1>
          {course.description && <p className="max-w-[600px] text-[15px] leading-6 text-muted">{course.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            {viewer && !viewer.canPost ? null : (
              <Button size="md" to={needLogin(writeTo)}>
                {viewer?.myReview ? 'Edit your review' : 'Write a review'}
              </Button>
            )}
            {(!viewer || viewer.canPost) && (
              <Button size="md" variant="secondary" to={needLogin(`/courses/${course.id}/rate`)}>
                Rate mid-term / final
              </Button>
            )}
            {(!viewer || viewer.canPost) && (
              <Button size="md" variant="secondary" to={needLogin(`/resources/upload?course=${course.id}`)}>
                Upload resource
              </Button>
            )}
            <IconButton
              label={viewer?.bookmarked ? 'Remove bookmark' : 'Bookmark this course'}
              active={!!viewer?.bookmarked}
              className="size-10"
              onClick={() => (user ? bookmark('course', course.id) : navigate(`/login?next=${encodeURIComponent(loc.pathname)}`))}
            >
              <Bookmark className={cx('size-4', viewer?.bookmarked && 'fill-current')} aria-hidden />
            </IconButton>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 rounded-2xl bg-dark px-6 py-5 text-white lg:w-[280px]" aria-label="Overall rating">
          <span className="eyebrow text-[11px] text-[#c9cdd6]">Overall rating</span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-[56px] leading-[1.05] font-bold">{s.count ? s.averages.overall.toFixed(1) : '–'}</span>
            <span className="text-sm text-[#c9cdd6]">/ 5</span>
          </span>
          <span className="text-[13px] leading-5 text-[#c9cdd6]">
            {s.count} review{s.count === 1 ? '' : 's'} · {s.semesters} semester{s.semesters === 1 ? '' : 's'}
            {s.count ? ` · ${s.recommendPct}% would recommend` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CourseTabs({ data, active }) {
  const { course } = data;
  const base = `/courses/${course.id}`;
  return (
    <Tabs
      label="Course sections"
      value={active}
      items={[
        { value: 'overview', label: 'Overview', to: base, replace: true },
        { value: 'reviews', label: `Reviews (${course.ratingSummary.count})`, to: `${base}/reviews`, replace: true },
        { value: 'midterms', label: 'Mid-semester ratings', to: `${base}/midterms`, replace: true },
        { value: 'combos', label: 'Course combos', to: `${base}/combos`, replace: true },
        { value: 'resources', label: `Resources (${course.resourceCount})`, to: `${base}/resources` },
      ]}
    />
  );
}

export default function CourseLayout() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { data, error, refetch } = useCourse(id);
  const active = pathname.endsWith('/reviews')
    ? 'reviews'
    : pathname.endsWith('/midterms')
      ? 'midterms'
      : pathname.endsWith('/combos')
        ? 'combos'
        : 'overview';
  if (error)
    return (
      <div className="container-page py-12">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  if (!data)
    return (
      <div className="container-page flex flex-col gap-6 pt-10 pb-16">
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  return (
    <div className="container-page flex flex-col gap-8 pt-10 pb-16">
      <CourseHeader data={data} />
      <CourseTabs data={data} active={active} />
      <Outlet context={data} />
    </div>
  );
}
