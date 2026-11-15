import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/client';
import { Button, Card, Field, PageTitle, Select } from '../../components/ui';
import SuggestCourseModal from '../../components/SuggestCourseModal';
import { useAuth } from '../../lib/auth';

export default function SuggestCourse() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [major, setMajor] = useState('');
  const { data } = useQuery({
    queryKey: ['majors', user?.universityId],
    queryFn: () => get(`/universities/${user.universityId}/majors`, { sort: 'name' }),
    enabled: !!user,
  });
  const m = data?.majors.find((x) => x.id === (major || user?.majorId)) || data?.majors[0];
  return (
    <div className="container-page flex max-w-[720px] flex-col gap-6 py-12">
      <PageTitle>Suggest a course</PageTitle>
      <Card className="flex flex-col gap-4 p-6">
        <p className="text-[15px] text-muted">
          If a course you took is missing from the catalog, suggest it. An admin checks each suggestion and adds it to the major.
        </p>
        {user ? (
          <>
            <Field label="Major" id="sg-major">
              <Select id="sg-major" value={m?.id || ''} onChange={(e) => setMajor(e.target.value)}>
                {data?.majors.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button className="self-start" onClick={() => setOpen(true)} disabled={!m}>
              Suggest a course
            </Button>
            {m && <SuggestCourseModal open={open} onClose={() => setOpen(false)} majorId={m.id} majorName={m.name} />}
          </>
        ) : (
          <Button to="/login?next=/suggest-course" className="self-start">
            Log in to suggest a course
          </Button>
        )}
      </Card>
    </div>
  );
}
