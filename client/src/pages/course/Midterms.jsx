import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { get } from '../../api/client';
import { Button, Card, Meter, Pill, Select, Skeleton, Tag } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function Midterms() {
  const { course, viewer } = useOutletContext();
  const { user } = useAuth();
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('all');
  const { data } = useQuery({
    queryKey: ['midterms', course.id, semester, section],
    queryFn: () => get(`/courses/${course.id}/midterms`, { semester: semester || undefined, section }),
    placeholderData: (p) => p,
  });
  const rateTo = user ? `/courses/${course.id}/rate` : `/login?next=/courses/${course.id}/rate`;
  const canRate = !viewer || viewer.canPost;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-[26px] font-bold">Mid-semester ratings</h2>
          <p className="max-w-[560px] text-sm text-muted">
            Quick ratings from students taking the course this semester. Shown separately; they don't change the overall rating.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Select
            aria-label="Semester"
            value={semester || data?.semester || ''}
            onChange={(e) => setSemester(e.target.value)}
            className="h-10 w-[130px] text-sm"
          >
            {(data?.semesters || []).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          <Select aria-label="Section" value={section} onChange={(e) => setSection(e.target.value)} className="h-10 w-[130px] text-sm">
            <option value="all">All sections</option>
            {(data?.sections || []).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          {canRate && data?.semester === data?.current && (
            <Button size="md" to={rateTo}>
              Rate mid-term / final
            </Button>
          )}
        </div>
      </div>
      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-sans text-[17px] font-bold">Mid-term</h3>
                <Pill size="sm">{data.midterm.count} ratings</Pill>
              </div>
              {data.midterm.count ? (
                <>
                  <Meter label="Pace" value={data.midterm.averages.pace} labelWidth="w-[110px]" barClass="flex-1" />
                  <Meter label="Workload" value={data.midterm.averages.workload} labelWidth="w-[110px]" barClass="flex-1" />
                  <Meter label="Clarity" value={data.midterm.averages.clarity} labelWidth="w-[110px]" barClass="flex-1" />
                  <Meter label="Exam fairness" value={data.midterm.averages.fairness} labelWidth="w-[110px]" barClass="flex-1" />
                  <p className="text-xs text-muted">Rated after the mid-term exam (week 7)</p>
                </>
              ) : (
                <p className="text-sm text-muted">No mid-term ratings for {data.semester} yet.</p>
              )}
            </Card>
            {data.final.count ? (
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-[17px] font-bold">Final</h3>
                  <Pill size="sm">{data.final.count} ratings</Pill>
                </div>
                <Meter label="Pace" value={data.final.averages.pace} labelWidth="w-[110px]" barClass="flex-1" />
                <Meter label="Workload" value={data.final.averages.workload} labelWidth="w-[110px]" barClass="flex-1" />
                <Meter label="Clarity" value={data.final.averages.clarity} labelWidth="w-[110px]" barClass="flex-1" />
                <Meter label="Exam fairness" value={data.final.averages.fairness} labelWidth="w-[110px]" barClass="flex-1" />
                <p className="text-xs text-muted">Rated after the final exam (week 15)</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-line bg-white/70 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-[17px] font-bold">Final</h3>
                  {!data.final.open && (
                    <Pill tone="chip" size="sm">
                      <Clock className="size-3" aria-hidden /> Not open yet
                    </Pill>
                  )}
                </div>
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-chip text-chip-ink">
                  <Clock className="size-4" aria-hidden />
                </span>
                <p className="text-sm font-bold">{data.final.open ? 'No final ratings yet' : 'Opens after final exams (week 15)'}</p>
                <p className="text-sm text-muted">
                  Students taking the course this semester will be asked to rate the final once it has happened.
                </p>
              </div>
            )}
          </div>
          <Card className="flex flex-col p-5">
            <h3 className="mb-2 font-sans text-[17px] font-bold">Comments this semester</h3>
            {data.comments.length ? (
              data.comments.map((c) => (
                <div key={c.id} className="flex flex-col gap-1.5 border-b border-line py-3 last:border-0 last:pb-0">
                  <span className="flex gap-1.5">
                    <Tag>{c.section}</Tag>
                    <Pill size="sm" className="rounded-md text-xs font-medium">
                      {c.assessment === 'final' ? 'Final' : 'Mid-term'}
                    </Pill>
                  </span>
                  <p className="text-[15px]">{c.comment}</p>
                </div>
              ))
            ) : (
              <p className="py-2 text-sm text-muted">No comments yet.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
