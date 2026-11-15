import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { get } from '../../api/client';
import { Card, EmptyState, IconButton, LoadingBlock, PageTitle, ScoreChip, Tabs, Button } from '../../components/ui';
import ProfileLayout from './ProfileLayout';
import ResourceRow from '../../components/ResourceRow';
import { useInteractions } from '../../lib/useInteractions';

const Section = ({ title, children }) => (
  <section className="flex flex-col gap-3" aria-label={title}>
    <h2 className="eyebrow font-sans text-xs text-muted">{title}</h2>
    {children}
  </section>
);

export default function Bookmarks() {
  const [tab, setTab] = useState('all');
  const { bookmark } = useInteractions();
  const { data } = useQuery({ queryKey: ['me-bookmarks'], queryFn: () => get('/me/bookmarks') });
  const n = (k) => data?.[k].length ?? 0;
  const total = n('courses') + n('reviews') + n('resources');
  const show = (k) => tab === 'all' || tab === k;
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-1.5">
        <PageTitle>Bookmarks</PageTitle>
        <p className="text-sm text-muted">Courses, reviews and resources you saved for later.</p>
      </div>
      <Tabs
        label="Bookmark type"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'all', label: `All (${total})` },
          { value: 'courses', label: `Courses (${n('courses')})` },
          { value: 'reviews', label: `Reviews (${n('reviews')})` },
          { value: 'resources', label: `Resources (${n('resources')})` },
        ]}
      />
      {!data && <LoadingBlock />}
      {data && !total && (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          action={
            <Button to="/universities" size="md">
              Browse courses
            </Button>
          }
        >
          Use the bookmark button on courses, reviews and resources to save them here.
        </EmptyState>
      )}
      {data && show('courses') && n('courses') > 0 && (
        <Section title="Courses">
          <div className="grid gap-4 md:grid-cols-2">
            {data.courses.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                <Link to={`/courses/${c.id}`} className="flex flex-col hover:underline">
                  <span className="text-[13px] font-bold text-brand">{c.code}</span>
                  <span className="text-base font-bold">{c.title}</span>
                  <span className="text-[13px] text-muted">
                    {c.ratingSummary.averages.overall.toFixed(1)} overall · {c.ratingSummary.count} reviews
                  </span>
                </Link>
                <IconButton label={`Remove ${c.code} from bookmarks`} active onClick={() => bookmark('course', c.id)}>
                  <Bookmark className="size-4 fill-current" aria-hidden />
                </IconButton>
              </Card>
            ))}
          </div>
        </Section>
      )}
      {data && show('resources') && n('resources') > 0 && (
        <Section title="Resources">
          {data.resources.map((r) => (
            <ResourceRow key={r.id} resource={r} />
          ))}
        </Section>
      )}
      {data && show('reviews') && n('reviews') > 0 && (
        <Section title="Reviews">
          {data.reviews.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <Link to={`/courses/${r.course.id}/reviews`} className="text-[15px] font-bold hover:underline">
                  {r.course.code} · {r.authorLabel}, {r.semester}
                </Link>
                <div className="flex items-center gap-2">
                  <ScoreChip value={r.ratings.overall} />
                  <IconButton label="Remove bookmark" active className="size-8" onClick={() => bookmark('review', r.id)}>
                    <Bookmark className="size-3.5 fill-current" aria-hidden />
                  </IconButton>
                </div>
              </div>
              <p className="text-[15px]">{r.text}</p>
            </Card>
          ))}
        </Section>
      )}
    </ProfileLayout>
  );
}
