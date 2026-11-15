import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { get } from '../../api/client';
import { Button, Card, EmptyState, LoadingBlock, PageTitle, Pill, Select, Tabs } from '../../components/ui';
import { ModLayout } from '../../components/ConsoleLayouts';
import { REASONS, timeAgo } from '../../lib/format';

const TYPE_PILL = { review: ['Review', 'brand'], resource: ['Resource', 'success'], midterm: ['Mid-term', 'brand'] };

export default function ReportQueue() {
  const [status, setStatus] = useState('open');
  const [type, setType] = useState('all');
  const [reason, setReason] = useState('all');
  const [sort, setSort] = useState('oldest');
  const { data } = useQuery({
    queryKey: ['mod-queue', status, type, reason, sort],
    queryFn: () => get('/moderation/queue', { status, type, reason, sort }),
  });
  return (
    <ModLayout>
      <div className="flex flex-col gap-1.5">
        <PageTitle>Report queue</PageTitle>
        <p className="text-sm text-muted">Reviews and resources that students reported. Every decision is saved to the moderation log.</p>
      </div>
      <Tabs
        label="Report status"
        value={status}
        onChange={setStatus}
        items={[
          { value: 'open', label: `Open (${data?.counts.open ?? 0})` },
          { value: 'hidden', label: `Hidden (${data?.counts.hidden ?? 0})` },
          { value: 'dismissed', label: `Dismissed (${data?.counts.dismissed ?? 0})` },
        ]}
      />
      <div className="flex flex-wrap gap-2.5">
        <Select aria-label="Content type" value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-[150px] text-sm">
          <option value="all">All types</option>
          <option value="review">Reviews</option>
          <option value="resource">Resources</option>
          <option value="midterm">Mid-term comments</option>
        </Select>
        <Select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-[170px] text-sm">
          <option value="all">All reasons</option>
          {REASONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-[150px] text-sm">
          <option value="oldest">Oldest first</option>
          <option value="newest">Newest first</option>
          <option value="most">Most reports</option>
        </Select>
      </div>
      {!data && <LoadingBlock />}
      {data && !data.items.length && (
        <EmptyState icon={Inbox} title="Nothing here">
          No {status} reports match these filters.
        </EmptyState>
      )}
      {data?.items.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">Reported content</caption>
            <thead className="bg-page/70 text-[13px] text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3 font-medium">
                  Reported content
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">
                  Course
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
                  Reason
                </th>
                <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">
                  Reports
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => {
                const [label, tone] = TYPE_PILL[i.targetType];
                return (
                  <tr key={i.reportId} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Pill tone={tone} size="sm" className="rounded-md font-medium">
                        {label}
                      </Pill>
                      <p className="mt-1 text-sm font-semibold">{i.preview}</p>
                      <p className="text-xs text-muted">Reported {timeAgo(i.firstAt)}</p>
                    </td>
                    <td className="hidden px-3 py-3 text-[15px] sm:table-cell">{i.course}</td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <Pill tone="warn" size="sm">
                        {i.reasonLabel}
                      </Pill>
                    </td>
                    <td className="hidden px-3 py-3 text-[15px] sm:table-cell">{i.reports || (i.autoFlagged ? 'Auto' : 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        to={`/moderation/reports/${i.reportId}`}
                        variant="secondary"
                        size="sm"
                        className="h-9 px-4 text-sm"
                        aria-label={`Review report on ${i.course}`}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </ModLayout>
  );
}
