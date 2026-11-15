import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { get } from '../../api/client';
import { Button, Card, EmptyState, LoadingBlock, PageTitle, Select, cx } from '../../components/ui';
import { ModLayout } from '../../components/ConsoleLayouts';
import { logTime } from '../../lib/format';

const ACTION_PILL = {
  hidden: ['Hidden', 'bg-danger-soft text-danger-ink'],
  dismissed: ['Dismissed', 'bg-chip text-chip-ink'],
  restored: ['Restored', 'bg-success-soft text-success-ink'],
};

export default function ModerationLog() {
  const [action, setAction] = useState('all');
  const [moderator, setModerator] = useState('all');
  const [days, setDays] = useState('30');
  const params = { action, moderator, days };
  const { data } = useQuery({ queryKey: ['mod-log', params], queryFn: () => get('/moderation/log', params) });
  const csv = `${import.meta.env.VITE_API_URL || ''}/api/moderation/log.csv?${new URLSearchParams(params)}`;
  return (
    <ModLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <PageTitle>Moderation log</PageTitle>
          <p className="text-sm text-muted">Every hide, restore and dismiss at this university, with who did it and why.</p>
        </div>
        <Button as="a" href={csv} variant="secondary" size="md" download>
          <Download className="size-4" aria-hidden /> Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)} className="h-10 w-[150px] text-sm">
          <option value="all">All actions</option>
          <option value="hidden">Hidden</option>
          <option value="dismissed">Dismissed</option>
          <option value="restored">Restored</option>
        </Select>
        <Select aria-label="Moderator" value={moderator} onChange={(e) => setModerator(e.target.value)} className="h-10 w-[170px] text-sm">
          <option value="all">All moderators</option>
          {data?.moderators.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Time range" value={days} onChange={(e) => setDays(e.target.value)} className="h-10 w-[150px] text-sm">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </Select>
      </div>
      {!data && <LoadingBlock />}
      {data && !data.entries.length && <EmptyState title="No moderation actions in this period" />}
      {data?.entries.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Moderation log</caption>
            <thead className="bg-page/70 text-[13px] text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-3 font-medium">
                  When
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Action
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Item
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Moderator
                </th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e) => {
                const [label, cls] = ACTION_PILL[e.action];
                return (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-[15px] whitespace-nowrap">{logTime(e.at)}</td>
                    <td className="px-3 py-3">
                      <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', cls)}>{label}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[15px] font-semibold">{e.item}</p>
                      <p className="text-[13px] text-muted">{e.note}</p>
                    </td>
                    <td className="px-5 py-3 text-[15px]">{e.moderator}</td>
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
