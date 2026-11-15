import { Card, PageTitle } from '../../components/ui';

const PAGES = {
  about: {
    title: 'About CourseLens',
    body: [
      'Most universities share only a short description and prerequisites before you register. CourseLens fills the gap with what students actually want to know: how heavy the workload is, how fair the exams are, which courses to take first, and which ones not to take together.',
      'CourseLens rates courses, not professors. A course keeps the same content and assessments across semesters, so its ratings stay useful for longer, and reviews stay about the course rather than about a person.',
      'Only students with a verified university email can post. Reviews are shown anonymously by major and semester, but every review is tied to a verified account to prevent fake reviews.',
      'CourseLens was built by Renad Ibrahim and Talal AlHamer for COSC 484 Web Engineering at the American University of Bahrain.',
    ],
  },
  guidelines: {
    title: 'Posting guidelines',
    body: [
      'Review the course, not the people. Talk about the content, workload, projects and assessments. Do not name or describe instructors or teaching assistants; reviews that do are held for a moderator.',
      'One review per course per semester. You can edit or delete it at any time from My reviews.',
      'Be respectful. No offensive language, harassment or personal attacks. Flagged content is checked by a moderator at your university.',
      'Only share material you are allowed to share. Do not upload exam papers, answer keys or anything copyrighted that you do not own. Uploads are limited to PDF, PNG, JPG and DOCX files up to 10 MB.',
      'Be specific and honest. Future students plan their semester around what you write.',
    ],
  },
};

export default function StaticPage({ page }) {
  const p = PAGES[page];
  return (
    <div className="container-page flex max-w-[860px] flex-col gap-6 py-12">
      <PageTitle>{p.title}</PageTitle>
      <Card className="flex flex-col gap-4 p-6 text-[15px] leading-7">
        {p.body.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </Card>
    </div>
  );
}
