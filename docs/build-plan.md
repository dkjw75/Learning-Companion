# Proposed Build Plan

Version 1.3 | 16 October 2026 | Staged implementation | Source-backed catalogue can expand beyond 12 concepts

Read [PRD.md](../PRD.md) and [technical-design.md](technical-design.md) before starting. Build a new application in LearningCompanion; do not modify the existing ThinkTwice application or reuse its secrets.

## How to use this plan

Each numbered stage is one focused agent task with an observable result. Implement stages sequentially. Every stage lists its dependencies, bounded work, and completion checks. A stage is complete only when its checks pass or an unavailable external dependency is explicitly reported as unverified; do not mark an externally blocked capability complete.

If instructed to execute a single stage, stop after that stage and report its result. If instructed to execute the whole plan, proceed through the stages without asking for repeated approval for already-authorized implementation. Do not broaden a stage into unrelated features.

When a stage is too large for one turn, finish one coherent subtask, record remaining work, and resume that same stage before advancing. Do not replace failed live features with unlabeled fixtures.

This revision changes the earlier Stage 4-10 sequence: Stage 4 loads reference material; Stage 5 connects Gemini; Stage 6 generates lessons and questions; Stage 7 renders lessons; Stage 8 grades MCQs; Stage 9 displays the map; Stage 10 implements Review. Stages 1-3 and 11 onward retain their feature scope with updated dependencies.

Suggested prompt for a single stage:

> Read PRD.md, docs/technical-design.md, and docs/build-plan.md. Implement Stage N only. Inspect existing code first, follow the fixed contracts, run that stage's checks, and report changes, verification, limitations, and the next stage. Do not implement later stages.

### Frontend design inputs

Use React, Vite, Tailwind CSS 4, shadcn/ui, and selected 21st.dev component source. Keep approved Stitch design rules, screenshots, and optional code/assets under `design/`, with a manifest identifying the approved versions and selected component URLs. Follow these references for appearance and the PRD for behaviour. If references have not been supplied, use the technical design's layout defaults and report that the styling is provisional; do not claim a Stitch design has been approved.

At each stage that adds a screen, adapt only the relevant approved components, check their licence and dependencies, apply shared theme variables, and verify the resulting desktop/mobile layout. This work belongs to that screen's stage rather than a separate all-at-once redesign.

### User-facing interface at every stage

Follow the project AGENTS.md rule: screens contain only implemented product functionality and information the student needs. No stage labels, API/database connection cards, test buttons, setup/configuration details, or explanations of future development belong in the website. Run infrastructure checks through tests or terminal tools. Keep necessary product loading, errors, and retry states in plain language; do not invent features/data to replace removed diagnostics.

## Stage 1 - Project foundation and shared contracts

**Depends on:** the three planning documents.

**Work:**

- Create npm workspaces for a React/TypeScript/Vite client, Express/TypeScript server, and shared Zod schemas.
- Inspect any existing scaffold. Replace earlier Vue/Bootstrap dependencies, Vue lint/parser configuration, and Vue-specific tests with React tooling; preserve framework-neutral shared contracts and backend work. This stage must be reconciled before later screen implementation.
- Configure React Router, TanStack Query, authenticated-session Context, local `/api` proxy, type checking, React Hooks linting, and test runners using React Testing Library for component tests.
- Configure Tailwind CSS 4 through its Vite plugin, shared CSS theme variables, the `@/*` alias, and shadcn/ui. Add only a Button and Card initially to verify component styling; selected 21st.dev feature components are added with their relevant screen stages.
- Add `/api/health`, standard success/error envelopes, blank `.env.example`, and secret-safe ignore rules.
- Define shared source/learning-status enums, diagram/lesson schemas, assessment DTOs, and progress-update payloads.
- Create a project-local `AGENTS.md` pointing to these documents and requiring stage verification. Do not add delegation requirements.

**Done when:** the React client and server start locally, a themed Button/Card render correctly, health responds through the frontend proxy, React lint/type/component checks and production builds pass, active tooling no longer depends on the earlier Vue/Bootstrap stack, and no credentials are present in committed configuration.

## Stage 2 - Supabase baseline and guest identity

**Depends on:** Stage 1.

**Work:**

- Add migrations for profiles, catalogue/private concepts, edges, sessions, rounds, answer records, private assessment keys, and progress.
- Include content-pack/question-bank and source/revision/chunk tables, concept mappings, and their access boundaries now so Stage 4's local content import can run. Retrieval logic and source-import UI remain in their later stages.
- Implement RLS, restricted assessment transactions, and server-side token validation.
- Create/restore anonymous Supabase sessions and persist profiles.
- Seed the 12 catalogue concept definitions and reviewed prerequisite structure; keep unavailable content marked unavailable.
- Configure a dedicated development Supabase project (or local Supabase instance), root environment values, and anonymous sign-in. Browser configuration contains only the URL and publishable key; privileged keys stay server-only. Apply and verify migrations against that development target without reusing ThinkTwice's project.

**Done when:** refresh restores the same guest, one user cannot read or mutate another user's records, keys are not client-readable, and migration replay succeeds on a clean development database.

## Stage 3 - Onboarding and the home screen

**Depends on:** Stage 2.

**Work:**

- Build interests/experience selection through a skippable five-question diagnostic. Questions should be general areas of interest / experience in tech.
- Save diagnostic evidence without awarding full concept understanding.
- Build home according to home.pmg with nav tabs labelled as Home, Learn, Knowledge Map.
- Apply the approved Stitch shell and relevant 21st.dev navigation/cards, using shared theme variables and real API data.
- Keep lesson generation unavailable until approved reference material and the Stage 6 generation service are ready; recommendations can show catalogue concepts before lessons are enabled.

**Done when:** completed/skipped onboarding survives refresh, both home actions are visible, and a diagnostic answer does not generate an unjustified mastery claim.

## Stage 4 - First approved reference material

**Depends on:** Stage 2.

**Work:**

- Prepare approved reference material for four concepts: clients/servers, HTTP requests/responses, what an API does, and tables/records.
- Include source manifests, curated objectives/aliases, and objective-to-passage mappings. Finished lessons, diagrams, rubrics, and nine manually written MCQs per concept are not required.
- Provide local scripts to chunk and load selected reference text, source revisions, and concept/objective mappings into Supabase using Stage 2's tables.
- Record source permissions and actual approval accurately; do not call AI output independently reviewed merely because its references were approved.

**Done when:** all four concepts have approved, traceable passages covering their objectives; local validation and repeat imports pass without duplicates. Lesson generation remains unavailable until the following stages.

## Stage 5 - Gemini adapter and first source-backed call

**Depends on:** Stages 1, 2, and 4.

**Work:**

- Add `@google/genai` and the configured server-only Gemini wrapper.
- Implement bounded JSON generation, Zod/business validation, one schema-repair attempt, timeouts, and structured errors.
- Add operation-request persistence, transactional daily quota reservations, and idempotent result retrieval.
- Add an opt-in live smoke test that reads explicitly mapped approved passages for one starter concept from Supabase and asks Gemini for a bounded lesson and three MCQs with private keys. Validate the response and report metadata without printing keys or personal data; do not serve the smoke fixture as a production session.

**Done when:** mocked invalid JSON, refusal, quota, timeout, and repeated-request cases behave correctly; the live source-backed generation call succeeds using actual Supabase/Gemini credentials. Missing configuration or model access is explicitly unverified. This is the first Gemini stage, rather than the previous Stage 9.

## Stage 6 - RAG lesson and question generation

**Depends on:** Stages 4 and 5.

**Work:**

- Implement bounded concept/objective-filtered retrieval over the approved passages loaded in Stage 4, with full-text ranking and required indexes/RPCs.
- Generate the four-to-six-step lesson, structured diagram data, and one initial three-MCQ assessment including an application question. Use available learner interests/evidence to adapt examples.
- Validate schemas, objective coverage, citation membership, keys/options, and diagram references. Persist the public lesson and question snapshot separately from private keys and feedback criteria before serving them.
- Set `source_grounded` only with adequate approved reference coverage and retain `ai_generated_key`/AI-assessed for generated assessments until genuine independent review occurs.
- Add session/round creation and retrieval, immutable source snapshots, idempotent generation, and explicit failure/retry states. Reuse saved output on refresh; review and confirmation sets are generated later on demand, not on every render.
- Reconcile Stage 2's existing schema/RLS using forward migrations only if needed. Generated per-user sessions/rounds must not require an active reviewed content pack or expose drafts through the reviewed question bank. Determine supported lesson availability from approved objective coverage plus generation readiness.

**Done when:** each starter concept yields a validated saved lesson and initial assessment; fake citations/invalid keys fail; two evidence profiles produce useful differences; private keys cannot be fetched by the client or another user; refresh reuses output; failed generation does not create assessment evidence. Representative output is checked against source passages with evaluation results recorded separately from structural validation.

## Stage 7 - Guided visual lesson player

**Depends on:** Stages 3 and 6.

**Work:**

- Implement flow, relationship, and table renderers with controlled layout for Gemini's validated diagram data.
- Add step navigation, component selection, captions, source links, generation loading/error/retry UI, and session-position persistence.
- Load the saved generated lessons from Stage 6; never call Gemini directly from the browser.
- Require one running example per lesson, concrete diagram values, directly connected labelled arrows, and per-step node/edge or table-row highlights. Apply the shared diagram contract and renderer to every future concept and both source modes; follow the diagram standard in `technical-design.md` and `design/README.md`.
- Implement mobile layout and keyboard access. Apply the approved Lesson design and selected components while retaining application-controlled diagrams and state.

**Done when:** all four generated starter lessons render, refresh resumes the correct step without regeneration, every highlight resolves, and labels cannot execute markup or code.

## Stage 8 - MCQ grading and progress transactions

**Depends on:** Stage 7.

**Work:**

- Serve the saved three-question assessment with private server-side keys.
- Implement required-MCQ completion, feedback, hints, retries, and idempotent answer recording.
- Grade deterministically against the frozen key; compute status and finalize round/progress in one transaction.
- Show results and the committed before/after status update after Learn, with a full-map link enabled in Stage 9.

**Done when:** all-independent 3/3 results qualify, assisted retries do not qualify, duplicate submissions do not duplicate evidence, incomplete checks do not erase completed history, and final results contain a committed progress/map payload. A generated key is never silently regenerated while grading.

## Stage 9 - Knowledge-map experience

**Depends on:** Stage 8.

**Work:**

- Build area summaries and an interactive SVG concept graph with source/status badges.
- Add a node-details panel with objectives, sources, assessment basis, evidence, history, and Learn/Review actions.
- Follow the approved Knowledge Map design and reuse selected cards/badges around the application's SVG graph.
- Display catalogue concepts as not assessed and explored/assessed concepts with their actual state.
- Support keyboard selection and a list alternative for accessibility.

**Done when:** map states match stored evidence, another user's private nodes never appear, completing Learn refreshes relevant counts/nodes, and source status remains independent from AI assessment outcomes.

## Stage 10 - Review journey and visible map changes

**Depends on:** Stages 6 and 9.

**Work:**

- Generate, validate, and save a distinct three-question recall set using the same approved references and the assessment history; use stored reviewed questions if independently reviewed sets are available.
- Show targeted diagrams/explanations for mistakes and optional follow-up practice.
- Offer a separately generated and saved independent confirmation set when the student wants to demonstrate understanding after assistance. Compare question families and normalized question content to earlier sets; reject near-duplicate retries rather than treating new IDs as new evidence.
- Show results followed by the committed map update and evidence link, including unchanged results.

**Done when:** a developing concept can become demonstrated understanding after a qualifying review/confirmation; assisted practice or duplicate questions alone do not cause that transition; results retain the assessment basis and graph updates appear without a manual refresh.

## Stage 11 - Lesson tutor and animated mascot

**Depends on:** Stages 6, 7, and 8.

**Work:**

- Add the original SVG mascot and four animation states.
- Implement typed clarification using current step, bounded conversation context, and reference passages.
- Validate returned highlights/citations, save conversations, and mark assessment assistance when applicable.
- Add reduced-motion behaviour and tutor loading/error states.
- Adapt any approved 21st.dev chat/input/loading components to the saved tutor-message API and shared design theme.

**Done when:** clarification highlights actual diagram parts, unsupported elaborations are labelled, saved messages survive resume, keys are not exposed in prompts, and reduced motion retains all functionality.

## Stage 12 - Adaptive recommendations

**Depends on:** Stages 10 and 11.

**Work:**

- Replace the initial catalogue-order-only recommendation with the specified interests/prerequisites/evidence rules.
- Confirm tentative misconceptions using further assessment evidence.
- Add due-review scheduling with 1/3/7-day defaults and clear recommendation reasons.
- Keep overrides available and preserve reviewed relationships.

**Done when:** developing and demonstrated profiles yield appropriate different suggestions, unsupported evidence does not overwrite reviewed prerequisites, and students can choose a different topic.

## Stage 13 - Unsupported exploration

**Depends on:** Stages 5, 9, and 11.

**Work:**

- Resolve exact catalogue aliases or create private unsupported concepts from bounded topic input.
- Generate validated guided lessons and optional three-MCQ assessments with stored private keys.
- Add private AI-suggested graph connections with unverified labels.
- Apply the same learning statuses while retaining source/assessment labels.

**Done when:** an unsupported topic can progress from explored to developing to demonstrated understanding, its unverified tag never disappears because of a pass, private topics remain private, and failed generation is not replaced by a fake successful lesson.

## Stage 14 - Optional explanation and visual tasks

**Depends on:** Stages 5, 8, and 13.

**Work:**

- Generate and persist the optional explanation question/rubric, then provide rubric-based feedback with an inconclusive grading state.
- Generate and validate step-ordering and label-matching tasks with saved private keys and deterministic server grading.
- Add explicit Skip controls and retain optional-task evidence separately.
- Support these tasks for both supported and unsupported sessions.

**Done when:** skipping has no penalty, alternate valid explanations can be accepted, malformed grading does not fabricate evidence, and optional tasks do not change required completion/status rules.

## Stage 15 - Sign-in and guest-progress preservation

**Depends on:** Stages 2, 9, and 13.

**Work:**

- Configure Google identity linking and the auth callback flow.
- Add the non-blocking sign-in offer after the first lesson.
- Implement single-use merge tickets and transactional transfer to an existing account.
- Recompute progress from combined evidence without losing histories or exposing private data.
- Implement settings, sign-out, and deletion of personal learning data.

**Done when:** new-account linking keeps the guest UUID/history; existing-account sign-in retains both histories; expired/replayed tickets fail; another user's records cannot be merged without proof; and deletion retains the shared catalogue.

## Stage 16 - Admin source management and single-page importer

**Depends on:** Stage 6.

**Work:**

- Build source list, URL/concept entry, import preview, and revision-approval controls.
- Implement host/DNS/redirect restrictions, bounded fetch/extraction, and non-executing HTML parsing.
- Preserve headings/examples, chunk passages, and retain historical revisions.
- Activate approved revisions transactionally; keep failed imports and pending revisions out of retrieval.

**Done when:** a permitted page can be previewed and approved; unapproved/private/redirected targets are rejected; oversized and failed extraction is visible; and earlier lesson citations remain resolvable after source updates.

## Stage 17A - Add remaining web and API references

**Depends on:** Stages 14 and 16.

**Work:** add approved references and objective mappings for HTTP methods, status codes, REST basics, and JSON, following Stage 4's source contract. Use the Stage 16 admin importer for permitted pages; the existing catalogue definitions do not require a new concept editor. Replace the four-starter-concept generation restriction with approved objective coverage and supported-concept status before enabling these concepts. Generate lessons, assessments, and optional tasks through the Stage 6/14 services.

**Done when:** all four concepts have adequate approved coverage, validated generated diagrams/questions/tasks, retained AI-assessed provenance where applicable, and a passing sample learning/review journey.

## Stage 17B - Add remaining database and access-control references

**Depends on:** Stage 17A.

**Work:** approve references and objective mappings for keys/relationships, selecting/filtering, joins, and authentication versus authorization using the same importer/generation flow. Review cross-area connections and evaluate sample generated examples.

**Done when:** all 12 concepts have approved reference coverage and working generated lesson/assessment flows; reviewed relationships remain consistent; and representative source-backed outputs across all three areas have recorded evaluations.

## Stage 17C - Create new source-backed catalogue concepts

**Depends on:** Stages 16 and 17B.

**Work:**

- Add an admin workflow to draft a new shared computing concept with its area, title, aliases, learning objectives, and proposed prerequisite/related links. Extend the area taxonomy and student catalogue/map filters without hard-coded 12-concept or three-area lists.
- Let an admin add permitted web pages or upload PDF, Markdown, and plain-text documents. Preview bounded, non-executing extraction with title, origin/author, version, and permission metadata; retain the original file or stable source reference and historical revisions so citations remain resolvable. Review revisions and map approved passages to each objective. Show missing coverage before activation. New concepts stay unavailable to students until their objectives and source mappings are approved; uploaded material or a Gemini suggestion alone never approves a concept or its claims.
- Reuse the Stage 6 lesson generator and Stage 7-14 learning flow for activated concepts. Keep private unverified explorations from Stage 13 separate from shared supported concepts. Preserve old lesson/source snapshots when a concept or source is revised.
- Prove the workflow with at least one new concept in programming, computer systems, and security, with reviewed relationships to existing concepts. Record the approved source, objective mapping, sample lesson/assessment evaluation, and any coverage gaps for each.

**Done when:** an admin can add and activate a source-backed concept in a previously absent area without a code or seed-data change; each pilot concept appears in Learn and the map, generates a cited interactive lesson and assessment, and remains unavailable when coverage or approval is incomplete. Existing 12 concepts and historical sessions still work; another user cannot publish or edit the shared catalogue.

## Stage 18A - Integration and failure verification

**Depends on:** Stages 12-17C.

**Work:**

- Run the guest Learn/map, developing-to-demonstrated Review/map, unsupported exploration, and account-conversion browser journeys.
- Verify RLS, answer-key secrecy, transactional map updates, duplicate-request handling, and source-provenance persistence.
- Exercise prompt manipulation, invalid citations/diagrams, alternate valid answers, inconclusive grading, provider failures, and interrupted sessions.
- Verify mobile, keyboard, reduced motion, and text alternatives; fix failures within existing scope.
- Compare Home, Lesson, and Knowledge Map with approved Stitch references and verify imported component interactions, theme consistency, and absence of sample-data placeholders.

**Done when:** required journeys and failure cases pass with clearly recorded evidence. Live provider/auth/database checks are identified separately from mocks.

## Stage 18B - Deployment preparation and validation

**Depends on:** Stage 18A.

**Work:**

- Prepare Vercel frontend/backend configuration, SPA/API routing, environment documentation, OAuth redirects, migration instructions, and production builds.
- Write the README sections required by the hackathon, including AI integration, tools, safety, limitations, and tested behaviour.
- Prepare a short demo showing visual teaching, clarification, adaptive recommendations, Review/map updates, and unverified-topic handling.
- Deploy only when deployment is included in the user's authorized scope. Do not purchase services or publish artifacts merely because this stage exists.

**Done when:** reproducible setup and builds pass; deployment configuration is ready. If deployment is authorized, verify the live URLs and real learning/auth/provider flows before marking deployment complete.

## Stage 19 - Expand approved coverage across core computing

**Depends on:** Stages 17C and 18B.

**Work:** use the Stage 17C workflow in area-sized batches to extend the shared catalogue beyond the original 12. The proposed core curriculum below is a starting scope, not a claim to cover every computing specialty. Keep each concept small enough for a focused lesson; split broad entries during source review. For every concept, curate objectives and aliases, approve suitable references, map passages to objectives, review prerequisite links, and evaluate a generated diagram, application question, and full Learn journey before marking it available.

**Proposed concepts** (in addition to the original 12):

- **Programming foundations:** values and types; control flow; functions and scope; collections; objects and classes; errors and exceptions.
- **Data structures and algorithms:** arrays and linked lists; stacks and queues; hash tables; trees and graphs; searching and sorting; time and space complexity.
- **Computer systems:** binary and text encoding; CPU and memory; processes and threads; concurrency; filesystems; virtualization.
- **Networking:** IP addresses and routing; DNS; TCP and UDP; TLS; latency and bandwidth; caching and CDNs.
- **Browser and frontend:** semantic HTML; CSS layout; DOM and events; forms and validation; browser storage; accessibility.
- **Backend and distributed systems:** routing and middleware; server-side validation; sessions and tokens; caches; message queues; retries and consistency.
- **Database design:** schema design and normalization; indexes; transactions; query plans; replication and backups; document databases.
- **Security:** password hashing; encryption; OAuth and OpenID Connect; injection attacks; XSS and CSRF; threat modeling and least privilege.
- **Cloud and operations:** cloud compute and storage; containers; CI/CD; load balancing; monitoring and logs; infrastructure as code.
- **Software engineering:** Git and version control; debugging; automated testing; API contracts and versioning; design patterns; system design.
- **Data and AI:** data cleaning; probability and statistics; machine-learning training; model evaluation and overfitting; embeddings and vector search; LLM grounding and retrieval.

**Done when:** the proposed core concepts have approved objective-level source coverage and working cited lessons/assessments, or any deliberately deferred concept is explicitly removed from the approved scope with its reason recorded. Verify each area in a separate batch (`Stage19.X`) and keep unsupported or weakly sourced topics visibly unverified rather than presenting broad coverage as complete. Re-run cross-area map, search/filter, mobile, and accessibility checks after the final batch.

## Completion boundary

The build delivers the agreed product, not additional gamification or new providers. User-facing claims must match observed behaviour. A polished graph is not proof of learning; any student pilot should measure application and later independent recall, with its sample and limitations recorded.
