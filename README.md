# LearningCompanion

The visual technology learning companion described in [PRD.md](PRD.md), [technical design](docs/technical-design.md), and [build plan](docs/build-plan.md). The student-facing flow currently reaches Stage 3. Stage 6 adds backend lesson generation; the guided player is Stage 7.

## Local setup

Use Node.js 24 LTS and npm 11. From this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:3000; Vite proxies `/api` to it. Students sign in with Google; new accounts enter onboarding, and completed accounts return to Home after refresh. `GET /api/health` confirms the Express process is reachable; it does not establish database, auth, or provider readiness.

Copy `.env.example` to the root `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the dedicated Supabase project's **Connect** panel. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same values for API token verification. Set `DATABASE_URL` to the project's database connection string for migration and live checks; replace the password placeholder without its brackets and URL-encode reserved characters in the password. Enable **Allow anonymous sign-ins** in the project's Authentication settings. Restart the local dev processes after changing `.env`. Only the two `VITE_` fields enter the browser; `.env` is ignored.

For database setup and verification, use `npm run db:remote:dry-run`, then `npm run db:remote:push` on the dedicated development target. Stage 3 requires `20261009000200_onboarding.sql` before onboarding can save. `npm run db:offline` replays migrations in embedded PostgreSQL without Docker. `npm run db:live` verifies two real guests, RLS, and private data boundaries; `npm run guest:browser:live` verifies that a browser refresh restores the same guest. The database URL is never printed by these scripts.

For Stage 4/5 development, run `npm run content:check`, then `npm run content:seed` to load the approved chunks. Set `GEMINI_API_KEY` and `GEMINI_MODEL` in the server-only root `.env`. After applying the Stage 5 migration, explicitly run `npm run ai:smoke` to make a bounded live provider call for one starter objective. It uses approved active chunks from Supabase and saves the validated result in private operation tables. When the local backend is running, open [http://localhost:3000/api/runs](http://localhost:3000/api/runs) for JSON listing the 20 most recent successful smoke runs, newest first. Each entry has a unique ID, a DDMMYY completion date and 24-hour time in SGT, and a `url` for `GET /api/runs/:id`. Open that URL for the run's lesson, questions, sources, and SGT start/completion times. Answer keys and grading criteria are excluded; the smoke results are not student lessons or assessments. These local-only routes are not registered in production.

Stage 6 adds authenticated `POST /api/sessions` with `{ "conceptId": "<uuid>", "mode": "learn", "requestId": "<uuid>" }` and `GET /api/sessions/:id`. The first request retrieves active approved passages and generates one saved lesson plus its initial three-question assessment. Reusing the same request ID returns the saved result; GET resumes it by session ID. Both responses exclude private keys and feedback criteria. A failed generation returns a product-level error; retry with a new request ID. The current backend supports the four starter concepts only. Apply the Stage 6 migrations before using these routes. `npm run generation:storage:check` tests live database storage with an explicitly synthetic provider and removes its test sessions; `npm run generation:live` opts into real Gemini generation for the four starter concepts and prints only metadata. `LESSON_GENERATION_ENABLED` defaults to false so Home does not claim a usable lesson before live source evaluation and the Stage 7 player are ready.

## Workspaces and verification

- `client/`: React 19, Vite, React Router, Tailwind 4, shadcn Button/Card, TanStack Query, and session Context.
- `server/`: Express 5, TypeScript, bounded JSON bodies, request IDs, health, and standard JSON errors.
- `shared/`: Zod enums, bounded lesson/diagram schemas, public assessment DTOs, and server progress-update contracts.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite runs desktop and mobile Chromium checks, reusing an existing local development stack when available. Shared output is built before dev, type checks, and tests. Production builds go to each workspace's `dist/`; `npm run start -w @learning-companion/server` runs the compiled API. Vite preview is a static preview and has no API proxy; use `npm run dev` for the local full-stack check. Vercel routing is configured in `client/vercel.json` and `server/vercel.json`.

## Vercel preview deployment

Create two Vercel projects from this repository. Set the **Root Directory** to `server` for the API project and `client` for the frontend project. In both projects, enable **Include source files outside of the Root Directory in the Build Step** so the npm workspaces and `shared/` are available. Use Node.js 24.x. The project config files install dependencies from the repository root and supply the build commands.

Deploy the API project first. Set its Preview environment variables to `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`, and `GEMINI_MODEL`. `GEMINI_SEARCH_MODEL` and the `AI_*_DAILY_LIMIT` values are optional overrides. Enter server-only values in Vercel settings, never in a `VITE_` variable. Check `https://<api-project>.vercel.app/api/health` after deployment; this checks routing, not database or provider readiness.

For the frontend project, set Preview variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Its rewrite keeps browser requests on the frontend origin and forwards `/api/*` to the API URL in `client/vercel.json`; the following rewrite serves `index.html` for client routes. Update that destination if the API domain changes. Configure Supabase Authentication URL Configuration to allow the exact frontend URL followed by `/auth/callback`. Confirm the Google provider uses the Supabase callback URL. Apply migrations to this app's Supabase project with `npm run db:remote:dry-run` and `npm run db:remote:push` before testing live flows. After changing Vercel environment variables, redeploy the affected project.

## Contract boundaries

Source modes are `source_grounded` and `unverified`; learning statuses are `not_assessed`, `explored`, `developing`, and `demonstrated_understanding`. Source and assessment basis remain explicit in progress updates, including unchanged results. Public assessments contain exactly three MCQs from distinct question families and at least one application question. Private keys and rubrics are rejected as unknown fields. An unassisted first answer is independent; retries are practice. Optional skip and inconclusive feedback carry no fabricated correctness.

Lesson schemas check four to six steps, at most two diagrams, at most eight nodes per diagram, rectangular tables, unique IDs, valid edge endpoints, highlights, and local citation references. Text is data, never generated markup. Server-side approval/retrieval checks must still validate actual citation provenance; structural schemas do not establish factual accuracy. Assessment grading, transactional progress projection, and round-family comparisons across history arrive in later stages.

Stage 3 adds interest and experience selection, a skippable five-question starting check, verified onboarding save, and Home/Learn/Knowledge Map views backed by the catalogue and per-user progress. Diagnostic answers do not create concept progress. Stage 6 can generate saved lessons through the backend; the student lesson player and full review remain later work.

## Design and client state

The user supplied [design rules](design/DESIGN.md), five local reference screenshots, and five selected 21st.dev component references. [Design handoff notes](design/README.md) explain their dark navy/cyan direction and the PRD rules governing example content; [design/manifest.json](design/manifest.json) records the files and selections. The foundation UI uses the dark navy/cyan theme. [Component references](design/component-references.md) record provenance and local adaptations for shadcn Button/Card and the selected Background ASCII Wake. The other 21st.dev selections await review. The `@/*` alias resolves to `client/src/*`; `client/components.json` configures further shadcn additions. Reference screenshots remain local and are Git-ignored.

TanStack Query owns product API request state; health verification is handled independently by tests or terminal tools. Session Context exchanges the Google OAuth code, restores a Supabase account, verifies it against `/api/me`, and clears cached data on identity changes. Private query keys must include the verified user ID. Theme variables in `client/src/style.css` are shared across local UI primitives and honor reduced motion.
