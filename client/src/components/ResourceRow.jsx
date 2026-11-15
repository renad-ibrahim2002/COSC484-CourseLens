import { Link, useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { Button, FileBadge, IconButton, Tag, cx } from './ui';
import { useInteractions } from '../lib/useInteractions';
import { downloadResource } from '../lib/download';
import { bytes, TYPE_LABELS } from '../lib/format';
import { useToast } from './Toast';

export default function ResourceRow({ resource: r, showCourse = true }) {
  const { vote, bookmark, requireLogin } = useInteractions();
  const toast = useToast();
  const navigate = useNavigate();
  const mine = r.viewer?.isMine;
  const meta = [showCourse && r.course?.code, TYPE_LABELS[r.type], r.semester, r.file && bytes(r.file.sizeBytes)]
    .filter(Boolean)
    .join(' · ');
  const download = async () => {
    if (!requireLogin()) return;
    try {
      await downloadResource(r.id);
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <article className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <FileBadge kind={r.kind} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Link to={`/resources/${r.id}`} className="text-base leading-snug font-bold text-ink hover:underline">
            {r.title}
          </Link>
          <p className="text-[13px] text-muted">{meta}</p>
          {r.kind === 'tip' && r.text ? (
            <p className="line-clamp-2 text-sm text-ink">{r.text}</p>
          ) : (
            r.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:ml-2">
        <Button
          size="md"
          variant={r.viewer?.helpful ? 'brand-soft' : 'secondary'}
          className="h-9 px-3"
          aria-pressed={!!r.viewer?.helpful}
          disabled={mine}
          title={mine ? 'You cannot vote on your own upload' : 'Mark as helpful'}
          onClick={() => vote('resource', r.id)}
        >
          Helpful · {r.helpfulCount}
        </Button>
        <IconButton
          label={r.viewer?.bookmarked ? 'Remove bookmark' : 'Bookmark'}
          active={!!r.viewer?.bookmarked}
          onClick={() => bookmark('resource', r.id)}
        >
          <Bookmark className={cx('size-4', r.viewer?.bookmarked && 'fill-current')} aria-hidden />
        </IconButton>
        {r.kind === 'tip' ? (
          <Button size="md" variant="secondary" className="h-9 px-4" onClick={() => navigate(`/resources/${r.id}`)}>
            Read
          </Button>
        ) : (
          <Button size="md" className="h-9 px-4" onClick={download}>
            Download
          </Button>
        )}
      </div>
    </article>
  );
}
