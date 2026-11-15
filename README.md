# CourseLens

**Know the course before you register.** CourseLens lets university students rate and discuss **courses, not instructors**: end-of-course reviews, mid-semester ratings, course-combination advice ("take before", "pairs well", "avoid together") and a searchable library of student notes, study guides, tips and formula sheets. It starts with universities in Bahrain (American University of Bahrain).

COSC 484 / 484L Web Engineering project by **Renad Ibrahim (A00848)** and **Talal AlHamer (A01163)**.

---

## Contents

1. [Quick start](#quick-start)
2. [Demo accounts](#demo-accounts)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project structure](#project-structure)
6. [Requirements traceability](#requirements-traceability)
7. [Security](#security)
8. [Testing and quality](#testing-and-quality)
9. [Deployment](#deployment)
10. [Maintenance](#maintenance)
11. [API reference](#api-reference)

---

## Quick start

Requirements: **Node.js 20+** and **MongoDB 7+** (local install, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. Install
npm run install:all

# 2. Configure the API
cp server/.env.example server/.env        # edit MONGODB_URI if needed
cp client/.env.example client/.env

# 3. Start MongoDB (pick one)
docker run -d --name courselens-mongo -p 27017:27017 mongo:8
#   ...or use an Atlas connection string in server/.env

# 4. Load the AUBH catalog and sample data
npm run seed

# 5. Run (two terminals)
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173
```

Open http://localhost:5173.

**No email or file-storage accounts are needed for local development.** Without `RESEND_API_KEY` the API prints emails to its console and the "Check your inbox" page shows a development link to open the verification email. Without `CLOUDINARY_URL` uploaded files are stored in `server/uploads/` (development) or MongoDB GridFS (production) and served through short-lived signed links.

## Demo accounts

All seeded accounts use the password **`CourseLens1`**.

| Email | Role | Use it to |
| --- | --- | --- |
| `student@aubh.edu.bh` (Renad Ibrahim) | Moderator, AUBH | My reviews / uploads / bookmarks, report queue, moderation log |
| `student2@aubh.edu.bh` (Talal AlHamer) | Student | Write reviews, rate mid-terms, upload resources |
| `admin@aubh.edu.bh` | Admin | Catalog, course suggestions, users & roles, statistics & audit log |
| `s001@aubh.edu.bh` … `s080@aubh.edu.bh` | Students | Extra reviewers used by the seed data |

Sign up with any new `@aubh.edu.bh` address to try the registration and verification flow.

## Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, TanStack Query, React Hook Form, lucide-react, pdf.js | Reusable components that mirror the Figma design system; fast builds; API caching; accessible forms; in-browser PDF preview |
| Backend | Node.js + Express 5 | Lightweight REST API with mature security middleware |
| Database | MongoDB + Mongoose | Reviews with nested ratings and recommendation lists fit documents; text and compound indexes for search |
| Auth | JWT in httpOnly cookies, bcrypt | Stateless API (scales horizontally), passwords never stored in plain text |
| Validation & security | Zod, express-mongo-sanitize, Helmet, CORS, express-rate-limit | Input validation, NoSQL-injection protection, secure headers, brute-force protection |
| Files / email | Cloudinary (optional), Resend (optional) | Private file storage with signed URLs; transactional email |
| Testing | Jest, Supertest, mongodb-memory-server, Vitest, React Testing Library, Playwright, axe-core | Unit, integration, end-to-end and accessibility tests |
| DevOps | GitHub Actions, Vercel (client), Render (API), MongoDB Atlas | CI on every pull request, automatic deploys |

Design tokens (colours, fonts, radii, shadows) come straight from the hi-fi Figma wireframes and live in `client/src/index.css`. Headings use **Bricolage Grotesque**, body text uses **Figtree**; both are self-hosted through `@fontsource`.

## Architecture

Three-tier client–server architecture. The browser only talks to the REST API; it never reaches the database or file storage directly.

```
 Browser (React SPA)
      │  HTTPS, same origin: /api/* is proxied by Vite (dev) or a Vercel rewrite (prod)
      ▼
 Express REST API  ──  auth cookies → requireAuth / requireRole / ownership checks
      │                Zod validation → sanitisation → rate limits
      ├──► MongoDB (Mongoose models, indexes, denormalised rating summaries)
      ├──► File storage (Cloudinary private assets, or local disk) via signed, expiring URLs
      └──► Email (Resend, or console in development)
```

Key design decisions:

- **Same-origin API.** In production Vercel rewrites `/api/*` to the Render API, so auth cookies are first-party (`SameSite=Lax`) and no third-party-cookie problems arise.
- **Denormalised rating summaries.** Each course stores `ratingSummary` (count, averages per criterion, 1–5 distribution, % who would recommend). It is recalculated whenever a review is created, edited, deleted, hidden or restored, so course lists and pages load without aggregations (NFR-01).
- **Anonymous by construction.** Reviews store an `authorLabel` ("Computer Science student") at posting time; serializers never output `userId`. Only moderators see the author's email, on the report page.
- **Automatic content check.** Reviews, mid-term comments and resources that look like they name an instructor or contain offensive language are *held* (not public) and an automatic report puts them in the moderation queue.
- **Sliding sessions.** 15-minute access token + refresh token. Without "Keep me logged in" the refresh token expires after 2 hours of inactivity (FR-02); with it, after 30 days. Changing or resetting a password signs out other devices (`tokenVersion`).

### Data model (MongoDB collections)

`users`, `universities`, `majors`, `courses` (with `ratingSummary`), `reviews`, `midtermratings`, `resources`, `votes`, `bookmarks`, `reports`, `auditlogs`, `coursesuggestions`, `universitysuggestions`, `tokens` (hashed verification/reset tokens with a TTL index), `counters`.

Important indexes: unique `users.email`; unique `{universityId, code}` on courses; unique `{userId, courseId, semester}` on reviews (one review per course per semester); unique `{userId, courseId, semester, section, assessment}` on mid-term ratings; unique `{userId, targetType, targetId}` on votes and bookmarks (one vote per user); text index on resource title/description/tags; compound `{courseId, type, semester}` on resources.

## Project structure

```
courselens/
├── client/                     React app (Vite)
│   ├── src/
│   │   ├── api/client.js       fetch wrapper (cookies, refresh-and-retry, errors)
│   │   ├── components/         UI kit (ui.jsx), Header, ReviewCard, ResourceRow, PdfPreview, …
│   │   ├── lib/                auth context, formatting, interactions (votes/bookmarks)
│   │   ├── pages/              one folder per wireframe section
│   │   │   ├── auth/           1.1–1.4 register, verify, log in, reset
│   │   │   ├── catalog/        2.2–2.4 universities, majors, courses
│   │   │   ├── course/         3.1–3.6 course tabs, write review, rate mid-term
│   │   │   ├── resources/      4.1–4.3 library, detail, upload
│   │   │   ├── profile/        5.1–5.4 my reviews, uploads, bookmarks, settings
│   │   │   ├── moderation/     6.1–6.3 report queue, reported item, log
│   │   │   └── admin/          7.1–7.4 catalog, suggestions, users, statistics
│   │   └── test/               Vitest + React Testing Library
│   ├── e2e/                    Playwright end-to-end + axe accessibility tests
│   └── vercel.json
├── server/                     Express API
│   ├── src/
│   │   ├── config/env.js       environment variables (secrets never hard-coded in production)
│   │   ├── models/             Mongoose schemas
│   │   ├── middleware/         auth, validate (Zod), sanitize, rate limits, upload checks, errors
│   │   ├── routes/             auth, catalog, courses, resources, interactions, me, moderation, admin, search
│   │   ├── services/           ratings, content check, storage, email, audit, serializers
│   │   └── seed/               seed script + sample PDF/DOCX/PNG generators
│   └── tests/                  Jest unit + Supertest integration tests
├── render.yaml                 Render blueprint for the API
└── .github/workflows/ci.yml    lint, tests, build, e2e on every push / PR
```

## Requirements traceability

| ID | Requirement (proposal §2.3) | Implemented in | Tested in |
| --- | --- | --- | --- |
| FR-01 | Register with a university email whose domain is in the catalog; activate only after email verification | `server/src/routes/auth.js` (`/register`, `/verify`, `/email-domain`), `client/src/pages/auth/Register.jsx`, `CheckInbox.jsx`, `VerifyEmail.jsx` | `tests/integration/auth.test.js`, `e2e/account.spec.js` |
| FR-02 | Log in / log out; session ends after inactivity | `auth.js` (`/login`, `/refresh`, `/logout`, sliding refresh token, lockout after 5 failures), `Login.jsx` | `auth.test.js`, `e2e/account.spec.js` |
| FR-03 | List universities → majors → courses | `routes/catalog.js`, `pages/catalog/*` | `e2e/browse.spec.js` |
| FR-04 | Course averages per criterion, review count, distribution | `services/ratings.js` (`summarize`, `recalculateCourse`), `pages/course/Overview.jsx`, `Reviews.jsx` | `tests/unit/ratings.test.js`, `reviews.test.js` |
| FR-05 | End-of-course review once per course per semester; 1–5 ratings + optional text | `routes/courses.js` (`POST /:id/reviews`), `pages/course/WriteReview.jsx` | `reviews.test.js`, `e2e/contribute.spec.js` |
| FR-06 | Mid-term / final ratings per section, current semester, shown separately | `routes/courses.js` (`/:id/midterms`), `pages/course/Midterms.jsx`, `RateMidterm.jsx` | `reviews.test.js` |
| FR-07 | Tag courses "take before / together / avoid together" | review `recommendations`, `services/ratings.js` (`countCombos`), `components/CourseTagInput.jsx`, `pages/course/Combos.jsx` | `ratings.test.js`, `reviews.test.js`, `e2e/contribute.spec.js` |
| FR-08 | Upload PDF / image / DOCX (or a text tip) with title, description, type, course, semester, tags | `routes/resources.js`, `middleware/upload.js` (magic-byte check, 10 MB), `services/storage.js`, `pages/resources/UploadResource.jsx` | `resources.test.js`, `tests/unit/upload.test.js`, `e2e/contribute.spec.js` |
| FR-09 | Search & filter by university, major, course, type, semester, tag, format, rating; sort newest / most helpful | `GET /api/resources`, `GET /api/courses/:id/reviews`, `GET /api/search`, `pages/resources/ResourcesPage.jsx`, header search | `resources.test.js`, `e2e/contribute.spec.js` |
| FR-10 | Helpful votes, bookmarks, reports | `routes/interactions.js`, `ReviewCard.jsx`, `ResourceRow.jsx`, `ReportModal.jsx`, `pages/profile/Bookmarks.jsx` | `reviews.test.js` |
| FR-11 | Moderators hide / restore / dismiss reported content at their university; audit log | `routes/moderation.js`, `services/audit.js`, `pages/moderation/*` | `moderation.test.js`, `e2e/moderation.spec.js` |
| FR-12 | Admins create / edit / archive universities, majors, courses; approve suggestions; assign roles | `routes/admin.js`, `pages/admin/*` | `moderation.test.js` (admin console) |
| FR-13 | Students edit / delete their own reviews and resources | `PATCH/DELETE /api/reviews/:id`, `/api/midterms/:id`, `/api/resources/:id`, `pages/profile/MyReviews.jsx`, `MyUploads.jsx` | `reviews.test.js`, `resources.test.js`, `e2e/contribute.spec.js` |

| ID | Non-functional requirement | How it is met |
| --- | --- | --- |
| NFR-01 Performance | Denormalised summaries, indexes, paginated lists, code-split routes, lazy pdf.js. Lighthouse performance 90–100 (see [docs/QUALITY.md](docs/QUALITY.md)). |
| NFR-02 Security | bcrypt (12 rounds), role and ownership checks on every protected route, Zod validation, sanitisation, secrets in env vars, HTTPS-only cookies in production. See [Security](#security). |
| NFR-03 Privacy | Public API never returns review authors; instructors are not stored as entities. Tested in `reviews.test.js`. |
| NFR-04 Usability | Home → "Show courses" → course = 2 clicks to ratings. Tested in `e2e/browse.spec.js`. |
| NFR-05 Accessibility | WCAG 2.1 AA: semantic landmarks, labelled controls, focus rings, skip link, ARIA for meters, radios and tabs. axe finds no serious issues on 27 pages; Lighthouse accessibility 100. |
| NFR-06 Compatibility | Responsive from 360 px (mobile menu, stacked layouts, scrollable tables); e2e also runs on a Pixel 7 profile. |
| NFR-07 Reliability | Health check endpoint for Render, graceful shutdown, Atlas daily backups. |
| NFR-08 Scalability | Stateless API (JWT), so more instances can be added; indexes on all hot filters. |
| NFR-09 Maintainability | ESLint + Prettier, CI on every PR, this README. |
| NFR-10 Standards | Valid semantic HTML5, `lang`, `meta description`, `robots.txt`. |

## Security

Mapped to the OWASP Top 10:

- **Authentication (A07).** Verified university emails only; bcrypt hashes; JWT in `httpOnly`, `Secure` (production), `SameSite=Lax` cookies so JavaScript cannot read them; 15-minute access tokens with rotating refresh tokens; per-account lockout after 5 failed attempts plus IP rate limits on log-in, sign-up and email endpoints; verification and reset tokens are random, single-use, stored only as SHA-256 hashes and expire (24 h / 1 h); password reset and change sign out other sessions; forgot-password responses do not reveal whether an email exists.
- **Access control (A01).** `requireAuth`, `requireRole('moderator','admin')` and `requireRole('admin')` on every protected router; ownership checks for edit/delete; moderators limited to their own university (`canModerate`); students can only post for courses at their own university; admins cannot change their own role.
- **Injection (A03).** Every body and query is validated with Zod (e.g. ratings are integers 1–5, semesters must be a real, non-future term); `$`/`.` keys are stripped from body, params and query; regex search input is escaped; React escapes all rendered text (no `dangerouslySetInnerHTML`); CSV export neutralises formula injection.
- **File uploads.** Type detected from file content (magic bytes), not the name or MIME header; PDF, PNG, JPG, DOCX only; 10 MB limit; stored privately (Cloudinary `authenticated` assets or a non-public folder); served only through 5-minute signed links with `X-Content-Type-Options: nosniff`, a sandboxing CSP and `Content-Disposition`.
- **Security misconfiguration (A05).** Helmet headers (API: `default-src 'none'`), CORS restricted to the client origin, `x-powered-by` disabled, generic 500 messages in production, request body size limits, Vercel security headers (HSTS, frame denial, nosniff).
- **Secrets.** Database URL, JWT secrets and service keys live only in environment variables (`.env` is git-ignored; Render generates JWT secrets). The app refuses to start in production without them.

## Testing and quality

```bash
npm --prefix server test          # Jest + Supertest against an in-memory MongoDB (59 tests)
npm --prefix client test          # Vitest + React Testing Library (15 tests)
npm --prefix client run e2e       # Playwright: user flows + axe accessibility (19 tests); needs the seeded API running
npm run lint                      # ESLint (both packages)
```

| Level | What is covered |
| --- | --- |
| Unit | rating averages / distribution / % recommend, combo counting, instructor-name and offensive-language detection, file-type detection, semester rules, UI components, API client refresh logic |
| Integration | registration domain check, verification, lockout, refresh/logout, password reset, NoSQL injection, review posting rules and validation, anonymity, guest previews, held content, edit/delete ownership, votes, bookmarks, reports, mid-term ratings, uploads (valid, disguised executable, oversize), signed downloads, moderator scope, hide/restore + audit log, CSV export, admin course and role management, suggestion approval |
| End-to-end | register → verify → signed in; lockout message; access control; 2-click course discovery (desktop and mobile); write and delete a review; held review; upload and find a PDF with filters; moderator decision appears in the log |
| Accessibility | axe-core (WCAG 2.1 A/AA) on guest, student, moderator and admin pages |

Audit results (Lighthouse, axe, responsive checks) are recorded in [docs/QUALITY.md](docs/QUALITY.md).

> **Note for local test runs:** `mongodb-memory-server` downloads a MongoDB binary on first run. If your network blocks that, point it at an installed `mongod` with `MONGOMS_SYSTEM_BINARY=/path/to/mongod`.

## Deployment

Planned public URL: **https://courselens.vercel.app** (frontend) with the API on Render.

1. **MongoDB Atlas** – create a free M0 cluster, a database user with read/write on one database, and allow Render's outbound IPs (or `0.0.0.0/0` for the free tier). Copy the connection string.
2. **Render (API)** – *New → Blueprint* and select this repository; `render.yaml` creates `courselens-api` from `/server`. Enter `MONGODB_URI` (and optionally `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_URL`). JWT secrets are generated automatically. The demo data is loaded automatically on first start (see step 6).
3. **Vercel (client)** – import the repository with **Root Directory `client`**. If your Render URL differs from `https://courselens-api.onrender.com`, update the `/api` rewrite in `client/vercel.json`. Set `CLIENT_URL` on Render to the final Vercel URL.
4. **Email (optional)** – verify a sending domain in Resend and set `RESEND_API_KEY` and `EMAIL_FROM`. Without it, production sign-ups cannot receive verification emails, so set it before the demo.
5. **Files** – in production uploads are stored in MongoDB GridFS by default, so they survive Render restarts (its free disk is wiped). Set `CLOUDINARY_URL` to use Cloudinary instead.
6. **First start** – with `SEED_IF_EMPTY=true` (set in `render.yaml`) the API loads the AUBH catalog and demo data the first time it starts on an empty database, and never again once data exists.

GitHub Actions runs lint, unit/integration tests, the build and the Playwright suite on every push and pull request; Vercel and Render deploy `main` automatically.

## Maintenance

- **Git workflow:** GitHub Flow. `main` is protected and always deployable; work happens on `feature/*` branches, opened as pull requests, reviewed by the other member and merged only when CI passes.
- **Commit messages:** Conventional prefixes – `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
- **Code style:** `npm run lint` and Prettier (`npm --prefix client run format`, `npm --prefix server run format`).
- **Catalog changes:** admins manage universities, majors and courses in the Admin console; students suggest missing courses; nothing needs a code change.
- **Monitoring:** Render logs (Morgan request logs, errors), the `/api/health` check, Atlas alerts and daily backups; Dependabot/`npm audit` for dependency updates.
- **Re-seeding a demo database:** `npm run seed` **drops the database** and recreates the sample data. Never run it against production after real users sign up.

## API reference

All endpoints are under `/api`. 🔒 = log-in required, 🛡 = moderator/admin, 👑 = admin.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/auth/email-domain?email=` | University + majors for an email domain |
| POST | `/auth/register`, `/auth/verify`, `/auth/resend-verification` | Sign-up and email verification |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | Sessions |
| GET | `/auth/me` | Current user (or `null`) |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Password reset |
| GET | `/universities`, `/universities/:id`, `/universities/:id/majors`, `/universities/:id/courses` | Catalog |
| GET | `/majors/:id`, `/majors/:id/courses?q&level&sort&page` | Courses of a major |
| GET | `/courses/top`, `/courses/lookup`, `/courses/:id` | Home page, autocomplete, course page |
| GET / POST🔒 | `/courses/:id/reviews` | List (filter by semester/stars, sort) / post review |
| GET / POST🔒 | `/courses/:id/midterms` | Mid-semester ratings |
| GET | `/courses/:id/combos` | Course combinations |
| GET / PATCH / DELETE 🔒 | `/reviews/:id`, `/midterms/:id` | Own content |
| GET / POST🔒 | `/resources` | Search & filter / upload (multipart) |
| GET / PATCH🔒 / DELETE🔒 | `/resources/:id` | Detail / edit / delete |
| GET 🔒 | `/resources/:id/file?disposition=` | Signed download or preview link |
| POST 🔒 | `/votes`, `/bookmarks`, `/reports` | Helpful (toggle), bookmark (toggle), report |
| POST 🔒 | `/suggestions/course`, `/suggestions/university`, `/universities/:id/notify` | Suggestions |
| GET | `/search?q=` | Header search |
| GET / PATCH / DELETE 🔒 | `/me`, `/me/summary`, `/me/reviews`, `/me/uploads`, `/me/bookmarks`, `/me/password` | Profile |
| GET 🛡 | `/moderation/queue`, `/moderation/cases/:id`, `/moderation/log`, `/moderation/log.csv` | Moderation |
| POST 🛡 | `/moderation/cases/:id/decision` | Hide / dismiss / restore with a note |
| 👑 | `/admin/universities`, `/admin/majors`, `/admin/courses`, `/admin/suggestions`, `/admin/users`, `/admin/stats`, `/admin/audit` | Admin console |
