# Proposed Technical Design

Version 1.2 | 8 October 2026 | Implementation proposal | Source-backed Gemini generation from Stage 5

Read [PRD.md](../PRD.md) for product behaviour and [build-plan.md](build-plan.md) for implementation order. This proposal fixes practical defaults so an implementing agent does not need to invent the architecture. It does not represent an implemented or deployed application.

## 1. Architecture and selected stack

### Application structure

Use one new project, separate from the existing ThinkTwice application, with npm workspaces:

```text
LearningCompanion/
  PRD.md
  docs/technical-design.md
  docs/build-plan.md
  client/                 React application
  server/                 Express API and importer
  shared/                 Zod schemas, DTOs, and status constants
  supabase/migrations/    Versioned SQL migrations
  content/                Approved reference text, source manifests, and evaluation fixtures
  design/                 Approved Stitch exports, screenshots, and component references
```

- **Backend:** Node.js 24 LTS, Express 5, TypeScript, Zod, and the official Supabase JavaScript client.
- **Frontend:** React 19, TypeScript, Vite, React Router, and Tailwind CSS 4 through `@tailwindcss/vite`. Use shadcn/ui primitives and selected 21st.dev components copied into the repository. This replaces the earlier Vue/Bootstrap proposal.
- **Client state:** TanStack Query for API-backed data and request state; React Context for the authenticated session; local React state/reducers for lesson navigation and transient interactions. Supabase remains the persisted source of learning history. Do not introduce a second global state library by default.
- **AI:** Gemini through Google's `@google/genai` SDK, called only by Express.
- **Database:** Supabase Postgres; Supabase Auth for guest and permanent identities; private Supabase Storage for retained source files where needed.
- **Retrieval:** concept-filtered Postgres full-text search over imported passages. RAG does not require vector search. At 12 supported concepts, use explicit concept mappings and full-text retrieval first; embeddings and pgvector are a later extension, not an initial dependency.
- **Visuals:** controlled React components and SVG. Add animation libraries only when selected components require them; preserve the reduced-motion experience. No separate graph database, generated HTML execution, or raster-generation dependency.
- **Tests:** Vitest, React Testing Library with user-event and jest-dom, Supertest, and Playwright for selected end-to-end journeys.
- **Proposed hosting:** two Vercel projects from the same repository: Vite frontend and Express backend. Rewrite frontend `/api/*` requests to the backend and route non-API paths to the SPA. Local development uses Vite's API proxy.

Node 24 is an LTS release in the [Node release schedule](https://github.com/nodejs/Release). React documents [Vite-based application setup](https://react.dev/learn/build-a-react-app-from-scratch), and shadcn/ui provides a [React, Vite, and Tailwind setup](https://ui.shadcn.com/docs/installation/vite). Tailwind documents its [Vite plugin](https://tailwindcss.com/docs/installation/using-vite). The [21st.dev catalogue](https://docs.21st.dev/) supplies React component source using Tailwind and shadcn/ui conventions. Vercel documents [Express hosting](https://vercel.com/docs/frameworks/backend/express) and [Vite hosting](https://vercel.com/docs/frameworks/frontend/vite). Hosting is a proposal; this document does not authorize creating or publishing a deployment.

Pin compatible package versions in the lockfile during Stage 1. When resuming an earlier scaffold, replace its frontend framework, styling, lint, and component-test configuration before implementing screens. Shared DTOs and Express contracts continue to apply.

### AI model default

Set `GEMINI_MODEL=gemini-3.5-flash-lite` as the initial cost-conscious model. The current [official model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) lists structured-output support. Verify actual access and structured-output behaviour using the project's own credentials before enabling generated lessons. Model availability and quota are not proven by this document.

Use `GoogleGenAI` with stateless generation through `models.generateContent`, JSON output, and a supplied response schema. Do not use provider-managed conversation history; the application selects the context from Supabase. Validate JSON again with Zod and business rules. Google's [structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) supports this interface; syntactically valid JSON is not a factual accuracy check.

Keep the model configurable. Do not silently substitute another provider or model. A model change requires rerunning lesson, grading, and tutor evaluation cases.

## 2. Frontend screens and visual interaction

All screens follow the user-facing interface rule in project AGENTS.md. Infrastructure diagnostics and implementation-stage commentary stay in tests, terminal output, and developer documentation. Use product-level loading/error/retry states only when they help a student complete an implemented action.

### Routes

- `/`: introduction and start/resume action.
- `/onboarding`: interests, experience, and optional diagnostic.
- `/home`: Learn, Review, resume, and recommendation reasons.
- `/learn/:sessionId`: lesson player, tutor, and assessment.
- `/review`: concept selection; starts a review session in the shared player.
- `/explore`: topic entry and existing explorations; generated sessions use the shared player.
- `/map`: area overview, graph, node details, and learning history.
- `/auth/callback`: account linking or sign-in completion and guest-data merge.
- `/settings`: interests, reduced motion, sign-out, and deletion.
- `/admin/sources`: admin-only source import and approval.

Use the same session player for Learn, Review, and Explore. A session's mode determines its initial screen and assessment ordering.

Use a deterministic SVG graph layout: one column per area, catalogue nodes in catalogue order, then private nodes in creation order; place unclassified explorations in an Other column. Provide zoom controls, horizontal scrolling on narrow screens, selectable nodes, and an equivalent list view. Draw directional prerequisite edges and labelled related edges. Avoid a force-simulation dependency in v1.

### Layout defaults

Use Tailwind utilities and shared CSS theme variables for a neutral background, one accent colour, clear status badges, and generous diagram space. Approved Stitch designs determine the final colours, typography, spacing, and component appearance; these defaults apply until references are supplied. Desktop places the diagram and lesson content beside the tutor. Mobile presents the tutor in a collapsible panel below the current step. Do not obscure the diagram with a persistent character overlay.

Use text labels alongside colour and icons. Diagram parts and task controls must work with keyboard input. Provide button alternatives to drag interactions. Honour `prefers-reduced-motion` and the saved preference. Never rely on animation to communicate a result.

### Stitch and 21st.dev component workflow

The PRD specifies behaviour; approved Stitch screens and design rules specify appearance; this document specifies implementation. Keep the approved `DESIGN.md`, screen images, optional exported code/assets, and a reference manifest under `design/`. The manifest records which version is approved, selected 21st.dev component URLs, their intended screens, and any requested visual exceptions. These are inputs to provide when available, not existing approved designs.

- Build the app shell and screen layouts from the approved Stitch references. Extend the same theme to screens without mockups and include loading, empty, error, selected, and disabled states.
- Use shadcn/ui for basic buttons, cards, forms, dialogs, tooltips, and collapsible panels; use selected 21st.dev components for the specific cards, navigation, progress displays, or tutor interface the user approves. Add only components used by the product.
- Copy reusable UI source into `client/src/components/ui/`; keep feature components under `client/src/features/`. Configure the TypeScript and Vite alias `@/*` to resolve to `client/src/*` and shadcn's `components.json` accordingly.
- Check each selected component's source, licence, dependencies, and React/Tailwind compatibility. Retain required notices and record provenance in `design/component-references.md`. Components are maintained locally after import, rather than relying on a hosted runtime widget.
- Adapt imports, theme tokens, and Tailwind 3-era conventions to the Tailwind 4 setup where needed. Use the primitive and animation packages required by that component, and avoid duplicate UI systems. Components tied to Next.js need their routing/image/server assumptions adapted to this Vite SPA.
- Connect UI to the existing Express API and shared DTOs. Sample component data must be replaced with actual application data; visual components never determine assessment results or learning status.
- Keep lesson diagrams, assessment interactions, and knowledge-map layout as controlled application components. A generic progress widget must not introduce an unsupported mastery percentage.
- Compare implemented screens with approved references in desktop and mobile browser views. Verify focus, keyboard operation, readable contrast, and reduced motion after adapting imported components.

Use TanStack Query keys scoped to the authenticated user and resource. Clear private cached data when identity changes, and invalidate home, map, and concept-history queries after a committed progress update. Do not store answer keys in React Context, component state, or the query cache.

### Diagram contracts

Support three initial renderer types: `flow`, `relationship`, and `table`.

```ts
type DiagramSpec = {
  id: string;
  type: 'flow' | 'relationship' | 'table';
  title: string;
  nodes: Array<{ id: string; label: string; description: string }>;
  edges: Array<{ id: string; from: string; to: string; label: string }>;
  table?: { columns: string[]; rows: string[][] };
};

type LessonStep = {
  id: string;
  heading: string;
  caption: string;
  diagramId: string;
  highlightNodeIds: string[];
  highlightEdgeIds: string[];
  citationChunkIds: string[];
};
```

Each generated lesson contains four to six steps, at most two diagrams, no more than eight nodes per diagram, and captions of at most 100 words per step. Validate unique IDs, edge endpoints, rectangular table rows, and every highlight/citation reference. Layout coordinates come from the renderer, not Gemini. Render labels as text; never interpret them as HTML, CSS, SVG markup, or JavaScript.

For supported concepts, Gemini generates diagram data, captions, a short explanation, a worked example, and a corrected common mistake for every step from approved source passages and curated learning objectives. The React renderer controls layout, reveals the extra step details on demand, and accepts only the validated diagram contract. Require source references for instructional relationships and evaluate representative diagrams against the passages; generated diagram structure is not automatically reviewed. Do not let generation rewrite reviewed catalogue prerequisites. An existing independently reviewed diagram may be reused as an optional base. Unsupported topics use the same structural validation and retain the unverified label.

### Mascot and visual tasks

Implement an original friendly robot mascot as a local SVG component. State values are `idle`, `thinking`, `explaining`, and `encouraging`, controlled by request and feedback state. Use small CSS transitions; provide a static reduced-motion version.

Provide two reusable visual-task types: ordering three to five process steps and matching three to five labels to diagram parts. Store answer keys on the server and grade deterministically. Supported concepts use the format that fits their objective. Optional tasks never block completion or become compulsory evidence for a status.

## 3. Supabase data and access design

Use UUID primary keys and UTC timestamps. Store each historical result and the lesson/source version that produced it. Never overwrite historical answer evidence when content is revised.

### Tables

- `profiles`: `user_id`, selected interest areas, experience level, onboarding completion, structured diagnostic evidence, timezone, reduced-motion preference, timestamps.
- `admin_users`: privileged user IDs, populated through a protected administrative operation. Users cannot grant themselves admin access.
- `concepts`: slug, title, area, objectives, catalogue order, supported flag, optional owning user for private exploratory concepts, timestamps. Catalogue concepts are shared; unsupported additions are private to their creator.
- `concept_edges`: source and target concept IDs, relation type (`prerequisite` or `related`), reviewed flag, optional owner, supporting source IDs. AI-suggested edges may only target concepts the user can access.
- `content_packs`: optional independently reviewed base lessons/assessment packs, with concept ID, immutable version, private metadata, review state, reviewer, and review date. Preserve this Stage 2 table for genuinely reviewed material and optional fallbacks; source-grounded generated sessions do not require an active reviewed pack. Never mark generation as reviewed to satisfy an existing pack constraint. Serve a public projection without private keys/rubrics.
- `sources`: canonical URL, title, host, reuse/permission review, supported-concept mappings, active revision, status, timestamps.
- `source_revisions`: source ID, content hash, fetched date, source version metadata, review/approval dates, optional Storage path.
- `source_chunks`: revision ID, section heading, ordinal, extracted text, concept mappings, and indexed English `tsvector`.
- `question_bank`: optional independently reviewed MCQ prompts, options, objective IDs, source references, difficulty, and question-family ID. Unreviewed generated questions belong in per-user assessment-round snapshots, not the reviewed public bank. Correct keys and grading explanations remain server-private.
- `lesson_sessions`: owner, concept, mode, generation state, public lesson JSON, source mode, citation snapshot, content version, current step, completion state, and timestamps.
- `assessment_rounds`: owner, session, round kind (`initial`, `review`, or `confirmation`), public question snapshot, source mode, assessment basis (`reviewed_key` or `ai_generated_key`), completion timestamp, and qualification result.
- `assessment_secrets`: server-only answer keys, rubrics, optional-task solutions, and feedback criteria for bank questions or generated rounds. Deny client access entirely.
- `answer_attempts`: owner, round, question ID, client request ID, attempt index, answer, correctness, assistance flag, objective IDs, and grading state/result.
- `tutor_messages`: owner, session, ordered user/assistant messages, citation IDs, source mode, highlighted IDs, and request ID.
- `user_concept_progress`: owner, concept, current learning status, latest completed qualifying round, last explored/reviewed dates, and counts. A projection of evidence, not a separately AI-generated score.
- `operation_requests`: owner, idempotency key, operation kind, canonical input hash, state, bounded usage metadata, result ID, and request timestamps. Used for generation, optional grading, tutor calls, and transactional usage reservation. Reusing a key for different input returns a conflict.
- `guest_merge_tickets`: hashed one-time ticket, verified guest user ID, expiry, consumption time, and destination account ID.

Use unique constraints on `(owner, operation kind, request ID)`, `(round, question ID, attempt index)`, and `(owner, concept)` as applicable. Put compound uniqueness on private concept owner and normalized topic title. Do not deduplicate different students' private topics into a shared public record.

### Access boundaries

Enable RLS on all exposed tables. A user can access only their profile, sessions, messages, attempts, progress, and private concepts/edges. Catalogue concepts and approved source metadata/passages are readable by authenticated users. Draft source content, operation internals, merge tickets, and assessment secrets are not client-readable.

Express validates bearer tokens with Supabase Auth and derives the caller from the verified token. Do not accept caller-supplied ownership, admin role, grading outcome, or source status. Prefer a JWT-scoped Supabase client for user operations. Private keys and administrative operations use a server-only client after explicit ownership/admin checks.

Finalize assessments with a Postgres transaction/RPC that derives the caller from `auth.uid()`, stores results, computes progress, and returns before/after states together. Restrict any security-definer function's search path, public execute privileges, and accessible operations. Returning a completed round must imply that its map projection is committed.

### Guest-to-account conversion

Create a guest with Supabase `signInAnonymously()`; its anonymous auth UUID owns all learning records. Use Google sign-in as the initial permanent-account option.

For a new account, link Google using `linkIdentity()` with manual identity linking enabled. Keeping the same UUID preserves progress. Supabase documents this flow in [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

For an existing Google account, issue a cryptographically random, single-use, ten-minute merge ticket while the guest is still authenticated. After existing-account sign-in, the backend verifies the permanent account and consumes the ticket in a transaction. Move private sessions, attempts, messages, and exploratory concepts to the account; union interests; preserve permanent-account settings; and recompute progress from combined history. Reject expired, reused, or forged tickets. Never merge based on an unverified user ID or email. Supabase notes that existing-account conflicts require application-specific handling in its [identity-conflict guidance](https://supabase.com/docs/guides/auth/auth-anonymous#resolving-identity-conflicts).

## 4. Content importing and retrieval

### Reference preparation and generated content

Stage 4 prepares reference material under `content/`: source manifests, selected approved text, source versions, curated objectives/aliases, and objective-to-passage mappings for the first four concepts. Local scripts chunk and load this material into Supabase. Finished lessons, manually authored diagrams, and nine manually written MCQs per concept are no longer required before generation.

Stage 5 introduces the server-only Gemini adapter and a live source-backed smoke test. Stage 6 provides production retrieval and generation: Express selects passages from Supabase, sends them with objectives and learner context to Gemini, validates the lesson/questions, saves the snapshots and private keys, and returns public DTOs to React. The player is implemented in Stage 7. Gemini does not connect directly to the database or browser.

Generate an initial three-MCQ set when creating a lesson assessment. Generate Review and confirmation sets on demand in Stage 10 and persist each once. Every set includes an application question and covers the selected objectives. Require each question's correct answer and feedback criteria to cite the retrieved passages; require one unambiguous correct option. Question-family IDs, normalized prompt comparison, and an explicit near-duplicate check prevent the same question being presented as new independent evidence merely by changing IDs. Optional explanation rubrics and visual-task keys arrive in Stage 14.

Validate schemas, option/key membership, objective IDs and coverage, diagram references, and citation membership before storing or serving generated content. Reject malformed, out-of-scope, or insufficiently sourced output with a visible failure; a second model agreeing is not independent factual review. Record representative source-based output evaluations, including incorrect/ambiguous keys and diagram relationships. These evaluations do not certify every future generated question.

Source approval and answer-key review are separate. Generated questions use `assessmentBasis: 'ai_generated_key'` even when `sourceMode: 'source_grounded'`; show AI-assessed with source references. Use `reviewed_key` only for keys that were actually independently reviewed, with reviewer/date recorded. Optional reviewed packs and banks can provide audited examples or fallbacks, but are not a mandatory input to source-backed generation.

Keep the Stage 2 migration and RLS boundaries intact. Reconcile future generation requirements through forward migrations in Stage 6 if necessary; do not retroactively weaken reviewed-pack approval or expose draft question-bank records. Determine supported lesson availability from approved objective coverage and generation readiness rather than requiring a hand-authored active pack.

### Single-page URL ingestion

The admin creates a draft source and assigns concepts. Import the exact approved URL using the backend importer, extract the article body while preserving useful headings, tables, and code examples, then preview it before approval.

Initial accepted input is public HTML from an allowlisted host. Configure `SOURCE_ALLOWED_HOSTS` initially for `developer.mozilla.org`, `www.postgresql.org`, and `developers.google.com`. An allowed host permits fetching; it does not substitute for checking reuse permissions or content quality. Exclude W3Schools ingestion by default because its [terms](https://www.w3schools.com/about/about_copyright.asp) prohibit crawling/scraping and large-scale copying; it can be linked as further reading.

Reject credentials in URLs, non-HTTPS schemes, private/local IP ranges, and unapproved hosts. Check DNS results, pin the approved connection target, and validate each manually followed redirect. Limit redirects to three, HTML size to 2 MB, and fetch time to ten seconds. Do not execute webpage scripts, bypass logins, or crawl linked pages. Fail visibly when content cannot be extracted.

Use `@mozilla/readability` with `jsdom` in non-script-executing mode for HTML extraction. Bound extracted text to 100,000 characters; ask for a narrower source rather than silently discarding excess content. Split by heading into approximately 250-450-word chunks, keeping examples intact and using at most 50 words of overlap. Store a new revision and mark it pending approval. Atomically activate the approved revision; retain old revisions referenced by historical sessions.

PDFs or Markdown reference material can be included through a local reference-import script with approved extracted text. A general PDF-upload UI is not part of v1.

### Retrieval at generation time

1. Resolve the selected concept and objectives; prefer explicitly mapped approved chunks.
2. For clarification, search mapped chunks plus approved material for directly related concepts using Postgres full-text ranking.
3. Select at most six chunks, with a combined ceiling of 12,000 characters, keeping source IDs and headings.
4. Provide those passages, curated objectives, and relevant learner evidence to Gemini to generate a lesson or assessment. Include reviewed base content only when it actually exists.
5. Validate cited chunk IDs against the retrieved set and construct displayed links from stored URLs.

For the small catalogue, a supported lesson uses a curated objective-to-source mapping rather than relying solely on a search-score threshold. A tutor answer without adequate references is explicitly unverified. Source support is decided per response; having a source somewhere for a topic is insufficient.

Citation-ID validation establishes traceability, not semantic correctness. Approved source material and representative generated-output evaluations support reliability; unreviewed generated lessons/questions retain their AI provenance. Do not advertise every generated response as independently verified.

## 5. AI calls, assessment, and recommendation rules

### Bounded AI operations

Use four separate prompts/contracts: lesson generation/adaptation, assessment generation for supported or unsupported topics, tutor response, and explanation grading. Treat student text and reference passages as data, not system instructions. Generate questions before assessment submission; never ask Gemini to invent or revise the answer key while grading a student's MCQ response.

Tutor output is `{ answer, sourceMode, citationChunkIds, highlightNodeIds, highlightEdgeIds, suggestedClarification }`. Grading output is `{ criterionResults, feedback, possibleMisconceptions }`. Only the server computes learning statuses; Gemini never returns an authoritative progress update.

Tutor input includes current lesson/step, retrieved passages, concise objective-level evidence, and at most the last eight conversation messages. Never send the whole user history or identity information. Limit student question length to 2,000 characters and explanation answers to 3,000 characters. Do not include private assessment keys in tutor prompts.

For each operation, reserve usage and insert an idempotency record before calling Gemini. Store only validated output. A repeated request returns the existing result or operation state. Disable automatic provider retries; permit one bounded schema-repair call after a completed but invalid response, counted as another AI call. On an ambiguous timeout, mark the operation failed/uncertain instead of automatically issuing another paid call.

Suggested defaults: 25-second per-call timeout, 6,000 output tokens for lesson generation, 3,000 for assessment generation, and 1,500 for tutor/grading responses. Start with configurable daily limits of 20 AI calls per guest, 60 per permanent user, and 300 across the deployment; count repair calls. Reserve quotas transactionally in Postgres, not process memory. Use Asia/Singapore calendar days for these v1 limits. An already completed response remains retrievable after the limit is reached.

Show a retry action for failed operations. Reopen an already saved valid lesson without another generation call. A genuinely reviewed base lesson may be offered as an explicitly labelled fallback if one exists; there is no mandatory reviewed fallback in the new reference-first flow. For a first generation with no valid saved/reviewed content, show the failure. Never substitute a successful-looking fixture or grade.

### Assessment mechanics

- For supported concepts, generate questions and private keys from retrieved approved passages, validate them, and save them once per assessment round. Retain source-grounded and AI-assessed labels unless the keys actually received independent review. Independently reviewed sets may be selected when available.
- For unsupported topics, generate and save questions/keys with the same structural validation, while retaining unverified source and AI-assessed labels.
- MCQs and visual tasks are graded deterministically against stored keys. Optional explanations use the stored rubric and Gemini feedback; uncertain grading is returned as inconclusive and does not manufacture evidence.
- Save each question's first response and assistance separately. A retry or question from the same family is practice, not a new independent answer.
- During an active assessment, tutor help for a question marks it assisted. Track the active question on the server; client omission must not erase that flag. Lesson clarification before the assessment is ordinary instruction.
- Initial and review rounds contain exactly three MCQs. Three correct independent first responses including an application question establish `demonstrated_understanding`. Otherwise a completed check establishes `developing`.
- Optional tasks do not change the categorical status in v1; retain their feedback and possible misconceptions for targeted teaching. Confirm suggested misconceptions with a further source-backed question and learner evidence before changing the path; preserve its assessment basis.
- A follow-up retry explains and practises a gap. To establish a status after assisted practice, offer a separate three-question confirmation check from distinct question families. It is optional and can be left for a later review.
- Use the latest completed initial/review/confirmation round for current status. Partial activity creates `developing` only when no earlier completed result exists. Preserve completed status during an abandoned partial review.
- Never change source status because an assessment passed. Historical session source modes remain unchanged even after a source is added later.

Return `progressUpdate: { conceptId, previousStatus, currentStatus, changed, evidenceRoundId, sourceMode, assessmentBasis }` with final results. Both Learn and Review render this update and invalidate cached home/map queries. This explicitly supports a Review change from developing to demonstrated understanding.

### Recommendations

Keep path selection deterministic and explainable. Gemini personalises teaching; it does not freely rewrite the catalogue graph.

For Learn, prioritize an unexplored supported concept in the selected area whose prerequisites have been explored. Break ties by catalogue order, then suggest adjacent interests when the area is exhausted. If a prerequisite has confirmed gaps, offer it as a review without preventing the chosen lesson.

For Review, prioritize developing concepts, then concepts never reviewed, then demonstrated concepts due for recall. Suggested recall intervals after independent success are 1, 3, and 7 days; a completed failed check resets the suggested interval to one day. These are simple scheduling defaults, not a validated forgetting model.

Unsupported concepts remain selectable and can be recommended within the student's own explorations with the unverified label. Their results do not rewrite reviewed prerequisite edges or silently determine readiness for the supported curriculum.

## 6. HTTP interface

All routes are under `/api`. Use JSON request bodies, schema validation, ownership checks, and bearer authentication except for `/health`. Success returns `{ data }`; failure returns `{ error: { code, message, requestId } }`. Use 400 for invalid input, 401/403 for authentication/authorization, 404 for inaccessible or missing records, 409 for conflicting state, 429 for quota, and 502/504 for provider failure/timeout. Use generic missing-record responses to avoid leaking ownership.

### Identity and profile

- `GET /health`: application health without exposing secrets.
- `GET /me`: verified profile and onboarding/account state.
- `PUT /me`: interests, experience, timezone, and reduced-motion preference.
- `POST /onboarding/diagnostic`: answers to the served diagnostic; returns baseline evidence and recommendation, not full concept mastery.
- `POST /auth/merge-ticket`: creates a one-time ticket for the current guest.
- `POST /auth/merge`: consumes that ticket for the signed-in permanent account.
- `DELETE /me`: deletes personal learning data and account through a verified server operation; does not delete shared catalogue material.

### Learning

- `GET /concepts`: accessible catalogue/private concepts, area filters, and per-user progress.
- `GET /recommendations`: separate Learn and Review choices with reason codes and display text.
- `POST /sessions`: `{ conceptId, mode: 'learn' | 'review', requestId }`; returns a saved session with generation state.
- `GET /sessions/:id`: public lesson and saved activity; excludes keys and rubrics that reveal answers.
- `PATCH /sessions/:id/position`: current lesson step or assessment question.
- `POST /sessions/:id/rounds`: `{ kind, requestId }`; generates or selects and persists a three-question set, then returns only its public snapshot, available optional tasks, source labels, and assessment basis. Repeated requests reuse the saved round and never expose keys.
- `POST /rounds/:id/answers`: `{ questionId, answer, requestId }`; server grades, records, and completes the round when all required answers exist. Returns feedback and a committed progress update when appropriate.
- `POST /rounds/:id/hints`: records assistance and returns a hint without changing the answer's first-attempt history.
- `POST /sessions/:id/tutor`: `{ message, stepId, requestId }`; returns validated text, citations, highlights, and assessment-assistance state.
- `GET /sessions/:id/messages`: paginated saved clarification history.
- `POST /sessions/:id/optional-tasks/:taskId/answer`: grades explanation/visual work; supports inconclusive state without affecting required completion.
- `GET /map`: accessible nodes, edges, area counts, source labels, and statuses.
- `GET /concepts/:id/evidence`: assessment and conversation history for the caller.
- `POST /explore`: `{ topic, requestId }`; resolves an exact known alias or creates a private unsupported concept and generated session.

### Administration

- `GET /admin/sources`: sources, revisions, and import/review states.
- `POST /admin/sources`: approved URL and concept mappings; creates a draft source.
- `POST /admin/sources/:id/import`: fetches/extracts one page and returns a revision preview.
- `POST /admin/sources/:id/approve`: approved revision ID; activates it atomically.

Do not expose a generic SQL, arbitrary URL-fetch, or model-prompt endpoint. Generated answer keys are never included in lesson/map payloads or client state/cache. Existing source links are references; clicking a link does not imply permission to fetch unrelated pages.

## 7. Configuration, verification, and deployment preparation

### Environment variables

Browser-safe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key requires correct RLS; it is not a service secret.

Server-only: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (or the project's legacy service-role key), `GEMINI_API_KEY`, `GEMINI_MODEL`, `SOURCE_ALLOWED_HOSTS`, `APP_ORIGIN`, and configurable AI limits. Local server defaults to port 3000; Vite defaults to 5173.

Root script contract: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`. Add `npm run content:check`, `npm run content:seed`, `npm run db:check`, and an explicitly opt-in `npm run ai:smoke` when those capabilities are implemented. External-service checks must report unavailable configuration rather than passing without running.

Use blank placeholders in `.env.example`. Do not reuse ThinkTwice credentials, create paid resources, alter its Supabase project, or publish a deployment as part of this documentation task. Pin installed versions in the lockfile when implementing.

### Essential verification

- Unit tests: qualification and status projection, source-grounded versus unverified mode independently from reviewed versus AI-generated assessment basis, recommendation ordering, bounded schemas, question-family independence, and graph-update payloads.
- Database/API integration: two-user isolation, answer-key secrecy, atomic assessment/map updates, duplicate submissions, stale lesson references, source activation, and guest merge replay/expiry.
- AI adapter tests: prompt manipulation, unsupported citations, invalid graph IDs, missing objective coverage, malformed JSON, rate limit, refusal, timeout, and ambiguous/inconclusive grading.
- Live provider smoke test: one bounded structured request using the configured model. Record actual model access and result; do not infer availability from mocked tests.
- Browser journeys: guest onboarding -> Learn -> map; developing concept -> Review -> independent success -> map status change; unsupported topic -> AI-assessed demonstrated understanding with unverified badge; guest sign-in and existing-account merge; refresh/resume; mobile and reduced motion.

Logs contain operation IDs, model name, elapsed time, outcome, and usage counts. Exclude secrets, raw student answers, and full conversation text. Keep review fixtures and test outputs clearly separate from live user-facing results.

Prepare frontend/backend builds, SPA/API routing, OAuth redirect URLs, Supabase migrations, RLS checks, and environment documentation before any deployment. Public release requires actual provider, database, authentication, and browser checks; a build alone is not evidence of a working live app.
