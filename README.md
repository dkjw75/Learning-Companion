# LearningCompanion

Stage 2 foundation for the visual technology learning companion described in [PRD.md](PRD.md), [technical design](docs/technical-design.md), and [build plan](docs/build-plan.md).

## Local setup

Use Node.js 24 LTS and npm 11. From this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:3000; Vite proxies `/api` to it. The student landing page offers a guest action when Supabase is configured. `GET /api/health` confirms the Express process is reachable; it does not establish database, auth, or provider readiness.

Copy `.env.example` to the root `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the dedicated Supabase project's **Connect** panel. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same values for API token verification. Set `DATABASE_URL` to the project's database connection string for migration and live checks; replace the password placeholder without its brackets and URL-encode reserved characters in the password. Enable **Allow anonymous sign-ins** in the project's Authentication settings. Restart the local dev processes after changing `.env`. Only the two `VITE_` fields enter the browser; `.env` is ignored.

For Stage 2 database setup and verification, use `npm run db:remote:dry-run`, then `npm run db:remote:push` on the dedicated development target. `npm run db:offline` replays migrations in embedded PostgreSQL without Docker. `npm run db:live` verifies two real guests, RLS, and private data boundaries; `npm run guest:browser:live` verifies that a browser refresh restores the same guest. The database URL is never printed by these scripts.

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

The browser suite runs desktop and mobile Chromium checks, reusing an existing local development stack when available. Shared output is built before dev, type checks, and tests. Production builds go to each workspace's `dist/`; `npm run start -w @learning-companion/server` runs the compiled API. Vite preview is a static preview and has no API proxy; use `npm run dev` for the local full-stack check. Production routing is deferred to Stage 18B.

## Contract boundaries

Source modes are `source_grounded` and `unverified`; learning statuses are `not_assessed`, `explored`, `developing`, and `demonstrated_understanding`. Source and assessment basis remain explicit in progress updates, including unchanged results. Public assessments contain exactly three MCQs from distinct question families and at least one application question. Private keys and rubrics are rejected as unknown fields. An unassisted first answer is independent; retries are practice. Optional skip and inconclusive feedback carry no fabricated correctness.

Lesson schemas check four to six steps, at most two diagrams, at most eight nodes per diagram, rectangular tables, unique IDs, valid edge endpoints, highlights, and local citation references. Text is data, never generated markup. Server-side approval/retrieval checks must still validate actual citation provenance; structural schemas do not establish factual accuracy. Assessment grading, transactional progress projection, and round-family comparisons across history arrive in later stages.

Stage 2 includes the Supabase database baseline, RLS, verified `/api/me`, guest identity, and reserved content/source tables. Lessons, AI provider calls, onboarding, and deployment remain later stages.

## Design and client state

The user supplied [design rules](design/DESIGN.md), five local screenshots, and five selected 21st.dev component references. [Design handoff notes](design/README.md) explain their dark navy/cyan direction and the PRD rules governing example content; [design/manifest.json](design/manifest.json) records the files and selections. The foundation UI uses the dark navy/cyan theme. [Component references](design/component-references.md) retain the official shadcn source, MIT notice, and local adaptations; selected 21st.dev source remains to be imported in the relevant stages. Only Button and Card are imported so far. The `@/*` alias resolves to `client/src/*`; `client/components.json` configures further shadcn additions. Implementation logs and reference screenshots remain local and are Git-ignored.

TanStack Query owns product API request state; health verification is handled independently by tests or terminal tools. Session Context creates and restores a Supabase guest, verifies it against `/api/me`, and clears cached data on identity changes. Private query keys must include the verified user ID. Theme variables in `client/src/style.css` are shared across local UI primitives and honor reduced motion.
