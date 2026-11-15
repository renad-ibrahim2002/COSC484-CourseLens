import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-20">
        <p className="text-muted">© 2026 CourseLens · COSC 484 project</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-5 text-brand">
          <Link to="/about" className="hover:underline">
            About
          </Link>
          <Link to="/guidelines" className="hover:underline">
            Posting guidelines
          </Link>
          <Link to="/suggest-course" className="hover:underline">
            Suggest a course
          </Link>
        </nav>
      </div>
    </footer>
  );
}
