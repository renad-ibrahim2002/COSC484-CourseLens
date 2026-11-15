import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/client';
import { Card, Select, Skeleton, Pagination } from '../../components/ui';
import { AdminLayout } from '../../components/ConsoleLayouts';
import { logTime } from '../../lib/format';

function Stat({ label, value, sub }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-[28px] leading-8 font-bold">{value?.toLocaleString() ?? '–'}</span>
      <span className="text-xs text-muted">{sub}</span>
    </Card>
  );
}

export default function Stats() {
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(1);
  const { data } = useQuery({ queryKey: ['admin-stats', days], queryFn: () => get('/admin/stats', { days }) });
  const audit = useQuery({ queryKey: ['admin-audit', page], queryFn: () => get('/admin/audit', { page }), placeholderData: (p) => p });
  const max = Math.max(1, ...(data?.reviewsPerWeek.map((w) => w.count) || [1]));
  const period = days === '7' ? 'this week' : days === '30' ? 'this month' : `in ${days} days`;
  return (
    <AdminLayout>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-bold sm:text-[36px]">Statistics &amp; audit log</h1>
        <Select aria-label="Period" value={days} onChange={(e) => setDays(e.target.value)} className="h-10 w-[150px] text-sm">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Verified students" value={data?.students.total} sub={data && `+${data.students.recent} ${period}`} />
        <Stat label="Reviews" value={data?.reviews.total} sub={data && `+${data.reviews.recent} ${period}`} />
        <Stat label="Resources" value={data?.resources.total} sub={data && `+${data.resources.recent} ${period}`} />
        <Stat label="Open reports" value={data?.openReports.total} sub={data && `${data.openReports.waiting} waiting > 24 h`} />
      </div>
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-sans text-[17px] font-bold">Reviews per week</h2>
          <span className="text-xs text-muted">Peaks around mid-terms and finals</span>
        </div>
        {!data ? (
          <Skeleton className="h-40" />
        ) : (
          <figure>
            <div
              className="flex h-40 items-end gap-2.5"
              role="img"
              aria-label={`Reviews per week: ${data.reviewsPerWeek.map((w) => `${w.label} ${w.count}`).join(', ')}`}
            >
              {data.reviewsPerWeek.map((w) => (
                <div key={w.label} className="flex h-full flex-1 flex-col justify-end" title={`${w.count} reviews`}>
                  <div className="rounded-t-[3px] bg-brand" style={{ height: `${Math.max(2, (w.count / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <figcaption className="mt-2 flex gap-2.5 text-xs text-muted">
              {data.reviewsPerWeek.map((w) => (
                <span key={w.label} className="flex-1 text-center">
                  {w.label}
                </span>
              ))}
            </figcaption>
          </figure>
        )}
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <caption className="sr-only">Audit log</caption>
          <thead className="bg-page/70 text-[13px] text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-3 font-medium">
                When
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                User
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Action
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {audit.data?.entries.map((e) => (
              <tr key={e.id} className="border-b border-line text-[15px] last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap">{logTime(e.at)}</td>
                <td className="px-3 py-2.5">{e.user}</td>
                <td className="px-3 py-2.5">{e.action}</td>
                <td className="px-4 py-2.5">{e.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {audit.data && <Pagination page={page} pages={Math.ceil(audit.data.total / 10)} onChange={setPage} />}
    </AdminLayout>
  );
}
