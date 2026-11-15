# Quality audit record

Audits were run on the production build (`vite build` + `vite preview`) against the seeded API, in headless Chrome, at the end of the implementation sprint (15 Nov 2026). Re-run them before the final report and add screenshots of the tool output.

## Lighthouse (desktop, headless Chrome)

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home `/` | 97 | 100 | 100 | 100 |
| Course page `/courses/:id` | 90 | 100 | 100 | 91 → 100 |
| Resource library `/resources` | 94 | 100 | 100 | 91 → 100 |
| Log in `/login` | 100 | 100 | 100 | 91 → 100 |

Targets from the proposal: performance ≥ 85 (NFR-01), accessibility ≥ 90 (NFR-05). All met.

**Improvement made:** SEO was 91 on every page because `robots.txt` was missing (the SPA fallback returned HTML). Added `client/public/robots.txt`, which also keeps private areas (`/me`, `/moderation`, `/admin`) out of search engines. SEO went to 100.

## Accessibility (axe-core, WCAG 2.1 A/AA)

Automated in `client/e2e/a11y.spec.js`; runs in CI. 27 pages are scanned as a guest, a student/moderator and an admin. Result: **0 critical or serious violations**.

**Issue found and fixed:** `label-content-name-mismatch` (WCAG 2.5.3) on the avatar menu button: its accessible name ("Account menu for Renad Ibrahim") did not contain the visible text "RI". Changed to "RI, account menu for Renad Ibrahim".

Manual checks: keyboard-only navigation through every form (skip link, visible focus rings, 1–5 rating buttons and segmented controls are ARIA radio groups, modals use the native `<dialog>` with focus trapping and Escape), screen-reader names on icon-only buttons, rating meters expose `role="meter"` values, charts have text alternatives, `prefers-reduced-motion` respected.

## Responsive / cross-device

- Every page checked at 360 px, 768 px, 1280 px and 1920 px; no horizontal page scrolling at 360 px.
- **Fixed:** at 360 px the course "Rating breakdown" bars overflowed their card (fixed 160 px label + bar). Bars now flex on small screens.
- **Fixed:** the "My uploads" table squeezed titles on phones; it now scrolls horizontally inside its card.
- Playwright runs the browsing tests on a Pixel 7 mobile profile as well as desktop Chrome.
- Still to do before the demo: manual pass in Firefox, Safari (macOS/iOS) and Edge (NFR-06).

## Functional bugs caught by testing

| Found by | Problem | Fix |
| --- | --- | --- |
| Visual comparison with Figma | Account settings showed the first major in the list instead of the student's major, because the options load after the form; saving would have changed the major | Re-apply the saved value once options load (`Settings.jsx`) |
| Playwright | Ticking a filter immediately after typing in the resource search box could be undone by the search box's delayed update | URL updates now use a functional updater that merges with the latest filters (`ResourcesPage.jsx`, `Courses.jsx`) |
| Jest | Instructor detection missed "Professor [name]" (capitalised title) | Case-insensitive title matching (`contentCheck.js`) |
| Browser console | `/auth/me` returned 401 for guests, logging an error on every page (Lighthouse best-practices) | Returns `{ user: null }` for guests and renews expired access tokens from the refresh cookie |
| Playwright | Login rate limit (20 / 15 min) blocked repeated local test runs | Strict limits in production only; 20× higher in development |

## Visual fidelity

Every page was screenshotted at 1280 px and compared side by side with its hi-fi Figma frame (29 frames). Adjustments made during the comparison: heading font optical sizing (headings were wider than in Figma), meter row height, review/resource detail column widths, guidance cards aligned with the page titles, sidebar padding, PDF preview height, active state for the report queue item.

## Still to run for the final report

- W3C HTML validator on the rendered pages (paste the page source from DevTools → Elements) and CSS validator on `dist/assets/*.css`.
- WAVE browser extension on the deployed site.
- Lighthouse on the deployed URL (scores on Vercel/Render will differ from local runs, especially the API cold start on Render's free tier).
