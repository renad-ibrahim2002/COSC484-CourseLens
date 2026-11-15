import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Download, Flag, ThumbsUp, Lock } from 'lucide-react';
import { get } from '../../api/client';
import { Breadcrumbs, Button, Card, FileBadge, IconButton, Skeleton, Tag, ErrorState, Alert, cx } from '../../components/ui';
import PdfPreview from '../../components/PdfPreview';
import ReportModal from '../../components/ReportModal';
import { useInteractions } from '../../lib/useInteractions';
import { downloadResource } from '../../lib/download';
import { bytes, longDate, TYPE_LABELS } from '../../lib/format';
import { useToast } from '../../components/Toast';

function Placeholder({ title, children }) {
  return (
    <div className="flex h-[min(560px,75vh)] flex-col gap-3 bg-white p-8 shadow-sm">
      <p className="text-xl font-bold">{title}</p>
      {[92, 86, 72, 92, 80, 60].map((w, i) => (
        <span key={i} className="h-2.5 rounded bg-chip" style={{ width: `${w}%` }} />
      ))}
      {children}
    </div>
  );
}

function Preview({ resource, user }) {
  const fmt = resource.file?.format;
  const { data, error } = useQuery({
    queryKey: ['preview-url', resource.id],
    queryFn: () => get(`/resources/${resource.id}/file`, { disposition: 'inline' }),
    enabled: !!user && (fmt === 'pdf' || fmt === 'png' || fmt === 'jpg'),
    staleTime: 4 * 60 * 1000,
  });
  if (resource.kind === 'tip') {
    return (
      <div className="min-h-[300px] bg-white p-8 shadow-sm">
        <p className="mb-3 text-xl font-bold">{resource.title}</p>
        <p className="text-[15px] leading-7 whitespace-pre-line">{resource.text}</p>
      </div>
    );
  }
  if (!user) {
    return (
      <Placeholder title={resource.title}>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-page p-6 text-center">
          <Lock className="size-5 text-muted" aria-hidden />
          <p className="text-sm text-muted">Log in with your university email to preview and download resources.</p>
          <Button to={`/login?next=/resources/${resource.id}`} size="md">
            Log in to preview
          </Button>
        </div>
      </Placeholder>
    );
  }
  if (error) return <Alert>{error.message}</Alert>;
  if (fmt === 'docx') {
    return (
      <Placeholder title={resource.title}>
        <p className="mt-6 text-sm text-muted">Word files can't be previewed in the browser. Download it to open the full document.</p>
      </Placeholder>
    );
  }
  if (!data) return <Skeleton className="h-[480px] w-full" />;
  if (fmt === 'pdf') return <PdfPreview url={data.url} />;
  return (
    <div className="h-[min(560px,75vh)] overflow-y-auto bg-white shadow-sm">
      <img src={data.url} alt={`Preview of ${resource.title}`} className="w-full" />
    </div>
  );
}

export default function ResourceDetail() {
  const { id } = useParams();
  const { vote, bookmark, requireLogin, user } = useInteractions();
  const toast = useToast();
  const [reporting, setReporting] = useState(false);
  const { data, error, refetch } = useQuery({ queryKey: ['resource', id], queryFn: () => get(`/resources/${id}`) });
  if (error)
    return (
      <div className="container-page py-12">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  if (!data)
    return (
      <div className="container-page grid gap-7 py-10 lg:grid-cols-[1fr_300px]">
        <Skeleton className="h-[600px]" />
        <Skeleton className="h-80" />
      </div>
    );
  const r = data.resource;
  const mine = r.viewer?.isMine;
  const fmtLabel = r.file ? r.file.format.toUpperCase().replace('JPG', 'image').replace('PNG', 'image') : 'text tip';
  const download = async () => {
    if (!requireLogin()) return;
    try {
      await downloadResource(r.id);
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  const details = [
    ['Course', `${r.course.code} · ${r.course.title}`],
    ['Type', r.typeLabel],
    ['Semester', r.semester],
    [
      'Format',
      r.file
        ? `${r.file.format.toUpperCase()}${r.file.pages ? ` · ${r.file.pages} page${r.file.pages === 1 ? '' : 's'}` : ` · ${bytes(r.file.sizeBytes)}`}`
        : 'Text tip',
    ],
    ['Uploaded by', r.uploaderLabel],
    ['Uploaded', longDate(r.createdAt)],
  ];

  return (
    <div className="container-page flex flex-col gap-6 pt-10 pb-16">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: '…', to: '/universities' },
          { label: r.course.code, to: `/courses/${r.course.id}` },
          { label: 'Resources', to: `/courses/${r.course.id}/resources` },
          { label: r.title },
        ]}
      />
      {r.status === 'hidden' && <Alert tone="warn">This resource is hidden and only visible to you and moderators.</Alert>}
      <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="rounded-2xl bg-[#ebe9e3] p-5">
            <Preview resource={r} user={user} />
          </div>
          <Card className="flex flex-col gap-2.5 p-5">
            <h2 className="font-sans text-[17px] font-bold">About this resource</h2>
            <p className="text-[15px] leading-6">{r.description || 'No description.'}</p>
            {r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.tags.map((t) => (
                  <Link key={t} to={`/resources?tags=${encodeURIComponent(t)}`}>
                    <Tag>{t}</Tag>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
        <aside className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <FileBadge kind={r.kind} />
              <div>
                <h1 className="font-sans text-[17px] leading-snug font-bold">{r.title}</h1>
                <p className="text-[13px] text-muted">
                  {TYPE_LABELS[r.type]}
                  {r.file && ` · ${bytes(r.file.sizeBytes)}`}
                </p>
              </div>
            </div>
            {r.file && (
              <Button onClick={download} className="w-full">
                <Download className="size-4" aria-hidden /> Download {fmtLabel}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant={r.viewer?.helpful ? 'brand-soft' : 'secondary'}
                className="flex-1"
                aria-pressed={!!r.viewer?.helpful}
                disabled={mine}
                onClick={() => vote('resource', r.id)}
              >
                <ThumbsUp className="size-4" aria-hidden /> Helpful · {r.helpfulCount}
              </Button>
              <IconButton
                label={r.viewer?.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                active={!!r.viewer?.bookmarked}
                className="size-11"
                onClick={() => bookmark('resource', r.id)}
              >
                <Bookmark className={cx('size-4', r.viewer?.bookmarked && 'fill-current')} aria-hidden />
              </IconButton>
              {!mine && (
                <IconButton label="Report" className="size-11" onClick={() => requireLogin() && setReporting(true)}>
                  <Flag className="size-4" aria-hidden />
                </IconButton>
              )}
            </div>
            {mine && (
              <Button to={`/resources/${r.id}/edit`} variant="ghost" size="md">
                Edit this resource
              </Button>
            )}
          </Card>
          <Card className="flex flex-col gap-2 p-4">
            <h2 className="mb-1 font-sans text-[15px] font-bold">Details</h2>
            <dl className="flex flex-col gap-2 text-[13px]">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {data.more.length > 0 && (
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="font-sans text-[15px] font-bold">More for {r.course.code}</h2>
              {data.more.map((m) => (
                <Link key={m.id} to={`/resources/${m.id}`} className="flex items-center gap-3 text-sm font-medium hover:underline">
                  <FileBadge kind={m.kind} size="sm" /> {m.title}
                </Link>
              ))}
            </Card>
          )}
        </aside>
      </div>
      <ReportModal target={reporting ? { type: 'resource', id: r.id } : null} onClose={() => setReporting(false)} />
    </div>
  );
}
