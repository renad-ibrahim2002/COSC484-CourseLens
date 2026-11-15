import { Check } from 'lucide-react';
import Logo from '../../components/Logo';

const POINTS = [
  'Sign up with your university email; only verified students can post.',
  'Reviews show your major and semester, never your name.',
  'Read every review and download every resource for free.',
];

/** Two-column layout from the "Account access" wireframes: dark brand panel + form. */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-2">
      <aside className="flex flex-col justify-between gap-10 bg-dark px-6 py-8 text-white sm:px-14 sm:py-14">
        <Logo dark />
        <div className="hidden max-w-[470px] lg:block">
          <p className="font-display text-[44px] leading-[50px] font-bold">Honest course reviews from verified students.</p>
          <ul className="mt-6 flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-[22px] text-[#d9dce2]">
                <Check className="mt-0.5 size-4 shrink-0 text-[#8ea3f2]" strokeWidth={2.5} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-[13px] text-[#c9cdd6] lg:block">© 2026 CourseLens</p>
      </aside>
      <main id="main" className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, sub }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[28px] leading-tight font-bold">{title}</h1>
      {sub && <p className="text-[15px] text-muted">{sub}</p>}
    </div>
  );
}
