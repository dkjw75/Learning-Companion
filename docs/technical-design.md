# Proposed Technical Design

Version 1.3 | 16 October 2026 | Implementation proposal | On-demand topic tree and two-model source discovery

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
- **Retrieval:** concept-filtered Postgres full-text search over saved passages. Stage 13 adds bounded on-demand web discovery and private fetched-passage snapshots; RAG does not require vector search or a manually expanded catalogue.
- **Visuals:** controlled React components and SVG. Add animation libraries only when selected components require them; preserve the reduced-motion experience. No separate graph database, generated HTML execution, or raster-generation dependency.
- **Tests:** Vitest, React Testing Library with user-event and jest-dom, Supertest, and Playwright for selected end-to-end journeys.
- **Proposed hosting:** two Vercel projects from the same repository: Vite frontend and Express backend. Rewrite frontend `/api/*` requests to the backend and route non-API paths to the SPA. Local development uses Vite's API proxy.

Node 24 is an LTS release in the [Node release schedule](https://github.com/nodejs/Release). React documents [Vite-based application setup](https://react.dev/learn/build-a-react-app-from-scratch), and shadcn/ui provides a [React, Vite, and Tailwind setup](https://ui.shadcn.com/docs/installation/vite). Tailwind documents its [Vite plugin](https://tailwindcss.com/docs/installation/using-vite). The [21st.dev catalogue](https://docs.21st.dev/) supplies React component source using Tailwind and shadcn/ui conventions. Vercel documents [Express hosting](https://vercel.com/docs/frameworks/backend/express) and [Vite hosting](https://vercel.com/docs/frameworks/frontend/vite). Hosting is a proposal; this document does not authorize creating or publishing a deployment.

Pin compatible package versions in the lockfile during Stage 1. When resuming an earlier scaffold, replace its frontend framework, styling, lint, and component-test configuration before implementing screens. Shared DTOs and Express contracts continue to apply.

### AI model default

Keep `GEMINI_MODEL=gemini-3.5-flash-lite` for lesson and assessment generation. In Stage 13 set a separate server-only `GEMINI_SEARCH_MODEL=gemini-2.5-flash` for candidate-source discovery with Google Search grounding. Google's [pricing table](https://ai.google.dev/gemini-api/docs/pricing) currently lists Free-tier generation for 3.5 Flash-Lite and Free-tier Search grounding for 2.5 Flash, shared with 2.5 Flash-Lite up to 500 grounded requests per day; these are provider limits, not a promise of this project's access or future pricing. Verify both models and grounding with the project's actual key before enabling on-demand lessons. Do not set up paid billing automatically.

Use `GoogleGenAI` with stateless generation through `models.generateContent`, JSON output, and a supplied response schema. Do not use provider-managed conversation history; the application selects the context from Supabase. Validate JSON again with Zod and business rules. Google's [structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) supports this interface; syntactically valid JSON is not a factual accuracy check.

Keep both model IDs configurable. The same `GEMINI_API_KEY` can be used for both models if the project's access permits them; the backend chooses the configured model for each operation. Do not silently substitute another provider or model. A model change requires rerunning source-discovery, lesson, grading, and tutor evaluation cases.

## 2. Frontend screens and visual interaction

All screens follow the user-facing interface rule in project AGENTS.md. Infrastructure diagnostics and implementation-stage commentary stay in tests, terminal output, and developer documentation. Use product-level loading/error/retry states only when they help a student complete an implemented action.

### Routes

- `/`: introduction and start/resume action.
- `/onboarding`: interests, experience, and optional diagnostic.
- `/home`: Learn, Review, resume, and recommendation reasons.
- `/learn/:sessionId`: lesson player, tutor, and assessment.
- `/review`: redirect existing links to the topic tree's review selection; do not build a separate topic picker.
- `/topics`: the one expandable topic tree, node details, lesson selection, and learning history. Redirect existing `/map` links here after Stage 9; do not keep a second map screen.
- `/auth/callback`: account linking or sign-in completion and guest-data merge.
- `/settings`: interests, reduced motion, sign-out, and deletion.

Use the same session player for Learn and Review on both existing catalogue concepts and generated tree nodes. A session's mode determines its initial screen and assessment ordering.

Use a deterministic parent-child tree rooted in Software Development, AI Engineering, Cybersecurity, and Cloud Computing. Render only saved descendants; each expanded node has at most three children. Provide keyboard navigation and an equivalent list view on narrow screens. A parent-child link means a browsing branch, not a reviewed prerequisite. Preserve reviewed catalogue relationships separately; avoid a force-simulation dependency.

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
- Keep lesson diagrams, assessment interactions, and topic-tree layout as controlled application components. A generic progress widget must not introduce an unsupported mastery percentage.
- Compare implemented screens with approved references in desktop and mobile browser views. Verify focus, keyboard operation, readable contrast, and reduced motion after adapting imported components.

Use TanStack Query keys scoped to the authenticated user and resource. Clear private cached data when identity changes, and invalidate home, tree, and concept-history queries after a committed progress update. Do not store answer keys in React Context, component state, or the query cache.

### Diagram contracts

Support three initial renderer types: `flow`, `relationship`, and `table`.

```ts
type DiagramSpec = {
  id: string;
  type: 'flow' | 'relationship' | 'table';
  title: string;
  nodes: Array<{ id: string; label: string; description: string; example: string; icon?: DiagramIcon }>;
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
  highlightRowIndexes: number[];
  citationChunkIds: string[];
};
```

Each generated lesson contains four to six steps, at most two diagrams, no more than eight nodes per diagram, and captions of at most 100 words per step. Validate unique IDs, edge endpoints, rectangular table rows, and every highlight/citation reference. Layout coordinates come from the renderer, not Gemini. Render labels as text; never interpret them as HTML, CSS, SVG markup, or JavaScript.

Every lesson also requires one `runningExample` (30-300 characters), shared by its diagrams and step explanations. Pick a concrete situation appropriate to the topic, with illustrative names, values, requests, records, code or states. Every node requires a visible `example` (at most 200 characters); tables require nonempty concrete rows. Flow and relationship diagrams require at least two connected nodes and one directed, labelled edge. Every step must highlight a valid node/edge, or at least one zero-based table row. Keep labels compact (nodes 50 characters, edges 60). The generation prompt asks all worked examples to follow the same situation, while the application controls the visual standard: navy canvas, coloured cards, inset example values, actual SVG connectors, clickable labels, current-step emphasis, and reduced-motion-safe flow animation. The desktop diagram sits above the step explanation. This is a shared contract for every concept ID and both historical source modes, including future private tree topics; no generation endpoint may bypass `lessonSchema` or introduce a weaker diagram format. On-demand tree lessons arrive in Stage 13.

Structural validation enforces the data and references, not factual accuracy or whether an example teaches well. Review representative real outputs against their passages and inspect the rendered diagrams. Older snapshots without this contract remain stored but are excluded from Resume so students can start a new lesson; never invent example data for them.

Lesson text standard: show the caption, two explanatory paragraphs, a technical breakdown of the existing running example, a corrected common mistake, and citations directly below the diagram. Paragraphs explain mechanisms and the purpose of actual values in the diagram; avoid repetition, filler, and unsupported technical claims. Explanations permit up to 2400 characters. New generated explanations require at least two paragraphs, and use the same standard for every concept. Desktop places the diagram and text together in the left column; reserve a 300px right column for the Stage 11 tutor without displaying unfinished tutor controls.

An operator may enrich named existing sessions using `npm run lesson:enrich -- <session UUID> ...` after building. Gemini receives only the public lesson and its saved cited passages and returns step IDs plus caption, explanation, workedExample and commonMistake. Validate the complete response, preserve step order and all non-text context, reserve usage under existing limits, and atomically update the same session only if its saved lesson still matches the input. Never regenerate its diagrams, sources, assessment or progress. Migration `20261016000200_lesson_text_enrichment.sql` narrows snapshot immutability to permit these four text fields while retaining all identity, diagram, step-reference and source protections; client database update permissions remain unchanged. The operation creates normal private request/usage tracking, not new lesson or assessment rows. Unsupported sessions retain their source label and the same text/diagram standard.

Gemini generates diagram data, captions, a short explanation, a worked example, and a corrected common mistake for every step from the lesson's saved source passages and objectives. The React renderer controls layout, reveals the extra step details on demand, and accepts only the validated diagram contract. Require source references for instructional relationships and evaluate representative diagrams against the passages; generated diagram structure is not automatically reviewed. Do not let generation rewrite reviewed catalogue prerequisites. An existing independently reviewed diagram may be reused as an optional base. New tree topics use the same structural validation and cite their automatically fetched passages.

### Mascot and visual tasks

Implement an original friendly robot mascot as a local SVG component. State values are `idle`, `thinking`, `explaining`, and `encouraging`, controlled by request and feedback state. Use small CSS transitions; provide a static reduced-motion version.

Provide two reusable visual-task types: ordering three to five process steps and matching three to five labels to diagram parts. Store answer keys on the server and grade deterministically. Supported concepts use the format that fits their objective. Optional tasks never block completion or become compulsory evidence for a status.

## 3. Supabase data and access design

Use UUID primary keys and UTC timestamps. Store each historical result and the lesson/source version that produced it. Never overwrite historical answer evidence when content is revised.

### Tables

- `profiles`: `user_id`, selected interest areas, experience level, onboarding completion, structured diagnostic evidence, timezone, reduced-motion preference, timestamps.
- `admin_users`: privileged user IDs, populated through a protected administrative operation. Users cannot grant themselves admin access.
- `concepts`: the existing shared catalogue and private lesson concepts, with objectives, ownership, and timestamps. Keep the original 12 and their historical sessions; generated tree lessons use owner-scoped concepts and can reuse a matching existing concept rather than creating a duplicate.
- `topic_tree_nodes` (Stage 13 forward migration): four shared root IDs plus owner-scoped children with parent ID, normalized title/aliases, focused objectives, creation order, and expansion state. An expanded parent has exactly three stable children; enforce per-owner/parent uniqueness and one idempotent expansion transaction. Validate all three before insertion; an invalid or duplicate proposal may receive one repair, then fail without a partial branch. Check semantic near-duplicates against accessible nodes. Tree links do not assert prerequisites.
- `concept_edges`: source and target concept IDs, relation type (`prerequisite` or `related`), reviewed flag, optional owner, supporting source IDs. AI-suggested edges may only target concepts the user can access.
- `content_packs`: optional independently reviewed base lessons/assessment packs, with concept ID, immutable version, private metadata, review state, reviewer, and review date. Preserve this Stage 2 table for genuinely reviewed material and optional fallbacks; source-grounded generated sessions do not require an active reviewed pack. Never mark generation as reviewed to satisfy an existing pack constraint. Serve a public projection without private keys/rubrics.
- `sources`: existing approved catalogue sources, with canonical URL, title, host, reuse/permission review, active revision, status, and timestamps.
- `discovered_source_snapshots` (Stage 13 forward migration): owner, selected tree node, canonical URL, title, fetched/version timestamp, extracted bounded text, chunk IDs, and source-check result. Keep fetched material private to its owner and retain cited snapshots for historical lessons; automatic retrieval never changes an existing approved source's review state.
- `source_revisions`: source ID, content hash, fetched date, source version metadata, review/approval dates, optional Storage path.
- `source_chunks`: approved catalogue chunks; Stage 13 may reuse this chunk shape or add private discovered chunks with equivalent immutable citation IDs and bounded indexed text. Do not make unreviewed fetched pages appear as approved revisions.
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

For an existing Google account, issue a cryptographically random, single-use, ten-minute merge ticket while the guest is still authenticated. After existing-account sign-in, the backend verifies the permanent account and consumes the ticket in a transaction. Move private tree nodes, source snapshots, sessions, attempts, messages, and lesson concepts to the account; reconcile duplicate titles without discarding their lesson histories; union interests; preserve permanent-account settings; and recompute progress from combined history. Reject expired, reused, or forged tickets. Never merge based on an unverified user ID or email. Supabase notes that existing-account conflicts require application-specific handling in its [identity-conflict guidance](https://supabase.com/docs/guides/auth/auth-anonymous#resolving-identity-conflicts).

## 4. Content importing and retrieval

### Reference preparation and generated content

Stage 4 prepared reference material under `content/`: source manifests, selected approved text, source versions, curated objectives/aliases, and objective-to-passage mappings for the first four concepts. Local scripts chunk and load this material into Supabase. Those lessons remain a working fallback and regression set, not a gate requiring manual reference work for every future tree node.

Stage 5 introduces the server-only Gemini adapter and a live source-backed smoke test. Stage 6 provides production retrieval and generation: Express selects passages from Supabase, sends them with objectives and learner context to Gemini, validates the lesson/questions, saves the snapshots and private keys, and returns public DTOs to React. The player is implemented in Stage 7. Gemini does not connect directly to the database or browser.

Generate an initial three-MCQ set when creating a lesson assessment. Generate Review and confirmation sets on demand in Stage 10 and persist each once. Every set includes an application question and covers the selected objectives. Require each question's correct answer and feedback criteria to cite the saved passages; require one unambiguous correct option. Question-family IDs, normalized prompt comparison, and an explicit near-duplicate check prevent the same question being presented as new independent evidence merely by changing IDs. Optional explanation rubrics and visual-task keys arrive in Stage 14.

Validate schemas, option/key membership, objective IDs and coverage, diagram references, and citation membership before storing or serving generated content. Reject malformed, out-of-scope, or insufficiently sourced output with a visible failure; a second model agreeing is not independent factual review. Record representative source-based output evaluations, including incorrect/ambiguous keys and diagram relationships. These evaluations do not certify every future generated question.

Source provenance and answer-key review are separate. Generated questions use `assessmentBasis: 'ai_generated_key'` even when `sourceMode: 'source_grounded'`; show AI-assessed with source references. `source_grounded` means the actual cited passages were saved and checked for coverage, not that a person approved them. Use `reviewed_key` only for keys that were actually independently reviewed, with reviewer/date recorded. Optional reviewed packs and banks can provide audited examples or fallbacks, but are not a mandatory input to source-backed generation.

Keep existing Stage 2 migrations and RLS boundaries intact. Stage 13 uses forward migrations for private tree nodes, private lesson-capable concepts, and discovered-source snapshots. Reconcile the current private-concept `content_available` constraint and approved-only retrieval through those forward migrations so a checked fetched passage can serve a private lesson without being marked approved. Do not retroactively weaken reviewed-pack approval or expose draft question-bank records. A lesson is available only when saved passages adequately cover its objective and generation succeeds.

### On-demand source discovery and single-page ingestion (Stage 13)

After a student selects a new tree node, ask `gemini-2.5-flash` with Google Search grounding for a bounded set of relevant candidate references. Read candidate URLs from grounding metadata, not from arbitrary generated prose. One search response may contain several searches, and grounding may return no usable URL. Never let Gemini connect to the database or fetch a URL on the application's behalf. The backend selects pages to fetch and decides whether the extracted passages cover the node's focused objective.

Accept only public HTML from explicitly allowlisted hosts with recorded reuse/permission checks. Start with the existing `developer.mozilla.org`, `www.postgresql.org`, and `developers.google.com` hosts; Stage 13 must add suitable official documentation hosts for all four broad roots after checking their terms, or leave a root unavailable until adequate sources work. An allowed host is not proof of content quality or human approval. Exclude W3Schools ingestion by default because its [terms](https://www.w3schools.com/about/about_copyright.asp) prohibit crawling/scraping and large-scale copying; it can be linked as further reading.

Reject credentials in URLs, non-HTTPS schemes, private/local IP ranges, and unapproved hosts. Check DNS results, pin the approved connection target, and validate each manually followed redirect. Limit redirects to three, HTML size to 2 MB, and fetch time to ten seconds. Do not execute webpage scripts, bypass logins, or crawl linked pages. Try only a small bounded number of candidate pages. Fail visibly when none can be extracted or support the objective.

Use `@mozilla/readability` with `jsdom` in non-script-executing mode for HTML extraction. Bound extracted text to 100,000 characters; ask for a narrower source rather than silently discarding excess content. Split by heading into approximately 250-450-word chunks, keeping examples intact and using at most 50 words of overlap. Save private immutable passage/citation snapshots for the learner's lesson. Reuse them on resume and review; do not mark them human-approved or overwrite a historical citation when a page changes. PDF/upload administration is outside this flow.

### Retrieval at generation time

1. Resolve the selected tree node and focused objectives. For an existing lesson, use its saved citation snapshot; for one of the four original concepts, existing approved chunks remain available. For a new child, use only successfully fetched and checked private chunks.
2. For clarification, search that learner's saved chunks and accessible approved material for directly related concepts using Postgres full-text ranking.
3. Select at most six chunks, with a combined ceiling of 12,000 characters, keeping source IDs and headings.
4. Provide those passages, the node's validated objectives, and relevant learner evidence to Gemini 3.5 Flash-Lite to generate a lesson or assessment. Include reviewed base content only when it actually exists.
5. Validate cited chunk IDs against the retrieved set and construct displayed links from stored URLs.

The four original concepts keep their curated objective-to-source mapping. A new child must pass bounded coverage checks on fetched text before generation; a source URL alone is insufficient. A tutor answer without adequate saved references must say so rather than invent a sourced claim.

Citation-ID validation establishes traceability, not semantic correctness. Representative generated-output evaluations support reliability; automatically sourced lessons and questions retain their AI provenance. Do not advertise every generated response as independently verified.

## 5. AI calls, assessment, and recommendation rules

### Bounded AI operations

Use separate bounded prompts/contracts for three-child tree expansion, grounded source discovery, lesson generation/adaptation, assessment generation, tutor response, and explanation grading. Treat student text and fetched reference passages as data, not system instructions. Generate questions before assessment submission; never ask Gemini to invent or revise the answer key while grading a student's MCQ response.

Tutor output is `{ answer, sourceMode, citationChunkIds, highlightNodeIds, highlightEdgeIds, suggestedClarification }`. Grading output is `{ criterionResults, feedback, possibleMisconceptions }`. Only the server computes learning statuses; Gemini never returns an authoritative progress update.

Tutor input includes current lesson/step, retrieved passages, concise objective-level evidence, and at most the last eight conversation messages. Never send the whole user history or identity information. Limit student question length to 2,000 characters and explanation answers to 3,000 characters. Do not include private assessment keys in tutor prompts.

For each operation, reserve usage and insert an idempotency record before calling Gemini. Store only validated output. A repeated request returns the existing result or operation state. Disable automatic provider retries; permit one bounded schema-repair call after a completed but invalid response, counted as another AI call. On an ambiguous timeout, mark the operation failed/uncertain instead of automatically issuing another paid call.

Keep bounded timeouts and output tokens: 25 seconds per call, 6,000 output tokens for lesson generation, 3,000 for assessment generation, and 1,500 for tutor/grading responses. Stage 13 must also bound one expansion to three children and one lesson's search/page attempts. The existing 20/60/300 daily app-call defaults were chosen before the personal/tester tree flow; revise or disable those restrictive defaults in Stage 13, while retaining transactional operation accounting, idempotency, and per-action bounds. Stay within the project's actual provider Free-tier limits; do not enable billing or silently issue paid retries. Already saved output remains retrievable after a limit is reached.

Show a retry action for failed operations. Reopen an already saved valid lesson without another generation call. A genuinely reviewed base lesson may be offered as an explicitly labelled fallback if one exists; there is no mandatory reviewed fallback in the new reference-first flow. For a first generation with no valid saved/reviewed content, show the failure. Never substitute a successful-looking fixture or grade.

### Assessment mechanics

- For existing catalogue and newly sourced tree lessons, generate questions and private keys from the lesson's saved passages, validate them, and save them once per assessment round. Retain citations and AI-assessed basis unless the keys actually received independent review. Independently reviewed sets may be selected when available.
- Preserve historical unverified sessions and their labels, but do not start a new tree lesson without sufficient saved references.
- MCQs and visual tasks are graded deterministically against stored keys. Optional explanations use the stored rubric and Gemini feedback; uncertain grading is returned as inconclusive and does not manufacture evidence.
- Save each question's first response and assistance separately. A retry or question from the same family is practice, not a new independent answer.
- During an active assessment, tutor help for a question marks it assisted. Track the active question on the server; client omission must not erase that flag. Lesson clarification before the assessment is ordinary instruction.
- Initial and review rounds contain exactly three MCQs. Three correct independent first responses including an application question establish `demonstrated_understanding`. Otherwise a completed check establishes `developing`.
- Optional tasks do not change the categorical status in v1; retain their feedback and possible misconceptions for targeted teaching. Confirm suggested misconceptions with a further source-backed question and learner evidence before changing the path; preserve its assessment basis.
- A follow-up retry explains and practises a gap. To establish a status after assisted practice, offer a separate three-question confirmation check from distinct question families. It is optional and can be left for a later review.
- Use the latest completed initial/review/confirmation round for current status. Partial activity creates `developing` only when no earlier completed result exists. Preserve completed status during an abandoned partial review.
- Never change source status because an assessment passed. Historical session source modes remain unchanged even after a source is added later.

Return `progressUpdate: { conceptId, previousStatus, currentStatus, changed, evidenceRoundId, sourceMode, assessmentBasis }` with final results. Both Learn and Review render this update and invalidate cached home/tree queries. This explicitly supports a Review change from developing to demonstrated understanding.

### Recommendations

Keep recommendations deterministic and explainable. Gemini proposes children when asked, but it does not freely rewrite an existing tree, reviewed catalogue prerequisites, or learning status.

For Learn, prioritize an available unexplored node in an interest area; recommend expanding a relevant branch only when the student chooses to do so. Use reviewed prerequisites where present, but never infer readiness from a generated parent-child link. If a prerequisite has confirmed gaps, offer it as a review without preventing the chosen lesson.

For Review, prioritize developing concepts, then concepts never reviewed, then demonstrated concepts due for recall. Suggested recall intervals after independent success are 1, 3, and 7 days; a completed failed check resets the suggested interval to one day. These are simple scheduling defaults, not a validated forgetting model.

Private generated nodes remain selectable only by their owner. Their results do not rewrite reviewed prerequisite edges or silently determine readiness for a catalogue concept.

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

- `GET /concepts`: accessible existing catalogue/private lesson concepts and per-user progress.
- `GET /topics`: four roots and the caller's saved children, expansion state, lesson availability, and progress.
- `POST /topics/:id/expand`: `{ requestId }`; generates and persists exactly three distinct children once, or returns the saved children. Check owner access and duplicate/concurrent requests.
- `GET /recommendations`: separate Learn and Review choices with reason codes and display text.
- `POST /sessions`: `{ conceptId, mode: 'learn' | 'review', requestId }`; Stage 13 accepts an owned tree-node concept, reuses a saved lesson or runs bounded source discovery, backend fetch/chunk, and validated generation. Returns a saved session or an honest pending/failure state, never keys or rubrics.
- `GET /sessions/:id`: public lesson and saved activity; excludes keys and rubrics that reveal answers.
- `PATCH /sessions/:id/position`: current lesson step or assessment question.
- `POST /sessions/:id/rounds`: `{ kind, requestId }`; generates or selects and persists a three-question set, then returns only its public snapshot, available optional tasks, source labels, and assessment basis. Repeated requests reuse the saved round and never expose keys.
- `POST /rounds/:id/answers`: `{ questionId, answer, requestId }`; server grades, records, and completes the round when all required answers exist. Returns feedback and a committed progress update when appropriate.
- `POST /rounds/:id/hints`: records assistance and returns a hint without changing the answer's first-attempt history.
- `POST /sessions/:id/tutor`: `{ message, stepId, requestId }`; returns validated text, citations, highlights, and assessment-assistance state.
- `GET /sessions/:id/messages`: paginated saved clarification history.
- `POST /sessions/:id/optional-tasks/:taskId/answer`: grades explanation/visual work; supports inconclusive state without affecting required completion.
- `GET /concepts/:id/evidence`: assessment and conversation history for the caller.

Do not expose a generic SQL, arbitrary URL-fetch, or model-prompt endpoint. Generated answer keys are never included in lesson/tree payloads or client state/cache. Existing source links are references; clicking a link does not imply permission to fetch unrelated pages.

## 7. Configuration, verification, and deployment preparation

### Environment variables

Browser-safe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key requires correct RLS; it is not a service secret.

Server-only: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (or the project's legacy service-role key), `GEMINI_API_KEY`, `GEMINI_MODEL`, `SOURCE_ALLOWED_HOSTS`, `APP_ORIGIN`, and configurable AI limits. Stage 13 adds `GEMINI_SEARCH_MODEL` with `gemini-2.5-flash` as the planned value; it normally uses the same server-only Gemini API key, subject to project access. No key rotation or second key is implied by the plan. Local server defaults to port 3000; Vite defaults to 5173.

Root script contract: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:e2e`. Add `npm run content:check`, `npm run content:seed`, `npm run db:check`, and an explicitly opt-in `npm run ai:smoke` when those capabilities are implemented. External-service checks must report unavailable configuration rather than passing without running.

Use blank placeholders in `.env.example`. Do not reuse ThinkTwice credentials, create paid resources, alter its Supabase project, or publish a deployment as part of this documentation task. Pin installed versions in the lockfile when implementing.

### Essential verification

- Unit tests: qualification and status projection independently from source provenance and assessment basis, recommendation ordering, exactly-three-child expansion, duplicate-title/idempotency rules, bounded schemas, question-family independence, and tree-update payloads.
- Database/API integration: two-user tree/source isolation, answer-key secrecy, atomic assessment/tree updates, duplicate/concurrent submissions, stale lesson references, citation persistence, and guest merge replay/expiry.
- AI adapter and importer tests: prompt manipulation from fetched pages, unsafe URLs/redirects, extraction and coverage failures, unsupported citations, invalid diagram IDs, malformed JSON, rate limit, refusal, timeout, and ambiguous/inconclusive grading.
- Live provider smoke tests: bounded calls to both configured models, including Gemini 2.5 Flash with Search grounding and Gemini 3.5 Flash-Lite structured lesson generation. Record actual project access, result, quota and token use; do not infer availability from mocked tests.
- Browser journeys: guest root -> three children -> cited lesson -> tree update; developing concept -> Review -> independent success -> same tree node changes; repeated expansion; unavailable source retry; guest sign-in and existing-account merge; refresh/resume; mobile and reduced motion.

Logs contain operation IDs, model name, elapsed time, outcome, and usage counts. Exclude secrets, raw student answers, and full conversation text. Keep review fixtures and test outputs clearly separate from live user-facing results.

Prepare frontend/backend builds, SPA/API routing, OAuth redirect URLs, Supabase migrations, RLS checks, and environment documentation before any deployment. Public release requires actual provider, database, authentication, and browser checks; a build alone is not evidence of a working live app.
