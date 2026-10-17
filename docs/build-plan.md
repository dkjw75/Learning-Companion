# Proposed Build Plan

Version 1.4 | 16 October 2026 | Staged implementation | On-demand topic tree and source discovery

Read [PRD.md](../PRD.md) and [technical-design.md](technical-design.md) before starting. Build a new application in LearningCompanion; do not modify the existing ThinkTwice application or reuse its secrets.

## How to use this plan

Each numbered stage is one focused agent task with an observable result. Implement stages sequentially. Every stage lists its dependencies, bounded work, and completion checks. A stage is complete only when its checks pass or an unavailable external dependency is explicitly reported as unverified; do not mark an externally blocked capability complete.

If instructed to execute a single stage, stop after that stage and report its result. If instructed to execute the whole plan, proceed through the stages without asking for repeated approval for already-authorized implementation. Do not broaden a stage into unrelated features.

When a stage is too large for one turn, finish one coherent subtask, record remaining work, and resume that same stage before advancing. Do not replace failed live features with unlabeled fixtures.

Stages 1-8 remain the existing foundation, including the four working source-backed lessons. Stage 9 replaces the separate knowledge map with the topic tree. Stage 13 adds on-demand expansion, source discovery, safe import, and lesson generation. Stages 16, 17A-C, and 19 are removed as separate implementation stages; their necessary validation is folded into Stages 13 and 18A. Do not implement a removed stage. Existing routes or labels from earlier stages can be redirected or renamed in Stage 9 without rewriting earlier stage history.

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
- Show substantial technical explanations and a breakdown of the same example directly below the diagram in the left column, reserving the right column for the tutor. Support operator enrichment of an existing lesson's text in place while preserving all diagram, source, assessment and progress context.
- Implement mobile layout and keyboard access. Apply the approved Lesson design and selected components while retaining application-controlled diagrams and state.

**Done when:** all four generated starter lessons render, refresh resumes the correct step without regeneration, every highlight resolves, and labels cannot execute markup or code.

## Stage 8 - MCQ grading and progress transactions

**Depends on:** Stage 7.

**Work:**

- Serve the saved three-question assessment with private server-side keys.
- Implement required-MCQ completion, feedback, hints, retries, and idempotent answer recording.
- Grade deterministically against the frozen key; compute status and finalize round/progress in one transaction.
- Show results and the committed before/after status update after Learn, with a link to the topic tree enabled in Stage 9.

**Done when:** all-independent 3/3 results qualify, assisted retries do not qualify, duplicate submissions do not duplicate evidence, incomplete checks do not erase completed history, and final results contain a committed progress/map payload. A generated key is never silently regenerated while grading.

## Stage 9 - Topic-tree experience

**Depends on:** Stage 8.

**Work:**

- Build one accessible topic-tree screen; it is both the place to choose lessons and the place to see learning history. There is no second knowledge-map or Explore screen.
- Proposed broad roots (10): Software Development; AI Engineering; Cybersecurity; Cloud Computing; Data Science and Analytics; Databases and Data Engineering; Computer Networks; Operating Systems; Hardware and Embedded Systems; Human-Computer Interaction. Align the PRD and technical design's four-root contracts before implementing this proposal. During Stage 9, show only roots/branches with currently usable lessons; hide empty roots and expansion actions until Stage 13 makes them usable. Keep the existing four working lessons reachable without fabricating three generated children for them.
- Add node details with objectives, citations, assessment basis, evidence, history, and Learn/Review actions. Show actual Not assessed, Explored, Developing, or Demonstrated understanding states.
- Adapt the approved Knowledge Map visual theme to a parent-child tree. Preserve keyboard selection and a readable list alternative; do not add a force-graph dependency or unsupported prerequisite links.
- Rename navigation to Topics when this screen is ready, and redirect any existing `/map` links to the one tree screen.

**Done when:** the tree shows real available lessons and evidence, another user's private nodes never appear, Learn results update the selected node without refresh, and no nonfunctional expansion controls or duplicate map screens are shown.

## Stage 10 - Review journey and visible tree changes

**Depends on:** Stages 6 and 9.

**Work:**

- Generate, validate, and save a distinct three-question recall set using the selected lesson's saved references and assessment history; use stored reviewed questions if independently reviewed sets are available.
- Show targeted diagrams/explanations for mistakes and optional follow-up practice.
- Offer a separately generated and saved independent confirmation set when the student wants to demonstrate understanding after assistance. Compare question families and normalized question content to earlier sets; reject near-duplicate retries rather than treating new IDs as new evidence.
- Show results followed by the committed tree-node update and evidence link, including unchanged results. Use each lesson's saved reference snapshot, whether it came from the four existing lessons or Stage 13 discovery.

**Done when:** a developing concept can become demonstrated understanding after a qualifying review/confirmation; assisted practice or duplicate questions alone do not cause that transition; results retain the assessment basis and tree updates appear without a manual refresh.

## Stage 11 - Lesson tutor and animated mascot

**Depends on:** Stages 6, 7, and 8.

**Work:**
- Implement a chatbox on the right side of lesson and quiz screen - first message from tutor should be "Ask or highlight a text to clarify anything here!"
- Implement bounded conversation context, and the selected lesson's saved reference passages, including Stage 13 lessons.
- Highlighting a part of the text on the lesson brings up a box with single field "Ask Tutor", when clicked, the chatbox will have the annotation. They can then add a prompt in their chatbox. 
- Add tutor loading/error states.
- User query will direct to Gemini, then return the response in the same chat box

**Done when:** clarification highlights actual diagram parts, unsupported elaborations are labelled, saved messages survive resume, keys are not exposed in prompts, and reduced motion retains all functionality.

## Stage 12 - Adaptive recommendations

**Depends on:** Stages 10 and 11.

**Work:**

- Replace the initial catalogue-order-only recommendation with interests, available tree nodes, reviewed prerequisites where present, and learning evidence. A generated parent-child link is not a prerequisite claim.
- Confirm tentative misconceptions using further assessment evidence.
- Add due-review scheduling with 1/3/7-day defaults and clear recommendation reasons.
- Keep overrides available and preserve reviewed relationships.

**Done when:** developing and demonstrated profiles yield appropriate different suggestions, generated branches do not overwrite reviewed prerequisites, and students can choose a different tree node.

## Stage 13 - On-demand tree expansion and sourced lessons

**Depends on:** Stages 5, 6, 9, and 11.

**Work:**

- Wire the existing topic-tree suggestion link and prompt form to the backend. Any selected parent, including a broad root or a generated child, can receive another set of suggestions. For "Let me suggest for you," give Gemini the selected subtree, Stage 12 recommendation, student interests and learning activity, and accessible topics to avoid. Include the student's learning prompt when submitted. Ask for exactly three focused topics per deliberate request and a logical parent for each within the selected subtree; a new topic may parent a later topic in the same trio.
- Validate all three titles/objectives and parent references; reject duplicates or near-duplicates within the trio and against accessible topics/aliases. Parent references must point to the selected node, an accessible descendant, or an earlier topic in the same trio. Repair an invalid proposal once; otherwise fail without saving a partial trio. Save all three private IDs and parent links atomically, then display them in the tree for later selection. Siblings appear horizontally and children beneath their parent; branches expand to fit. A parent has no fixed child limit: a new deliberate request may add another trio within its subtree. Use a request ID so a double-click, retry, or concurrent copy of the same request returns its saved trio without adding nodes or repeating provider calls.
- Displaying or selecting a suggested child does not fetch sources or generate a lesson. Only when that student starts Learn for the child, discover suitable sources and generate a cited lesson; a later Learn/Review request for the same child reuses that student's saved lesson and citation snapshot, never another student's private lesson. Children can themselves be expanded on request.
- Use Gemini 2.5 Flash with Google Search grounding only for candidate source discovery. Extract URLs from grounding metadata; do not treat model-written URL text as a fetched source. Bound search attempts and candidate pages.
- Move the necessary Stage 16 importer work here: accept suitable official documentation or educational pages from any public HTTPS host after DNS, redirect, robots, page-size/time, readability, and objective-coverage checks; chunk and save usable passages with URL/version snapshots. No general crawl or admin approval gate is required for automatically discovered pages.
- Reuse the Stage 6 Gemini 3.5 Flash-Lite generator, lesson/diagram schema, private-key storage, citation validation, and saved-session behavior when Learn starts. A failed fetch or insufficient coverage leaves the child visible but its lesson unavailable with a plain-language retry or another-topic action; never fall back to an unlabeled model-only lesson.
- Add forward migrations and access rules for private saved tree nodes, parent links, multiple trios per parent, request idempotency, private lesson concepts, and automatically retrieved source snapshots; reconcile the existing private-concept constraints and approved-only passage retrieval without rewriting old migrations. Preserve existing four lessons, reviewed prerequisite edges, historical citations, and the independence of source provenance from assessment outcomes. Show source links and AI-assessed basis without an extra badge merely for Gemini discovery.
- Account for the new discovery/expansion calls under the existing operation-request and usage system. For this personal/tester deployment, replace the restrictive 20/60/300 app-call defaults with configurable pilot limits or provider free-tier limits; bound each action, cache successes, and do not enable paid billing automatically.

**Done when:** both existing suggestion controls return exactly three stable, distinct private topics per deliberate request, each linked within the selected subtree; later deliberate requests can add another trio within that subtree or a child's, while retries and concurrent copies of one request add none; a failed request saves no partial trio; all saved suggestions remain selectable; Learn for a child yields a cited, validated lesson only from fetched suitable passages and later visits reuse only that student's saved lesson; another student cannot read its tree, lesson, or source snapshots; unavailable or unsuitable sources fail honestly; the two configured models are proven with live calls within the project's free-tier access.

## Stage 14 - Optional explanation and visual tasks

**Depends on:** Stages 5, 8, and 13.

**Work:**

- Generate and persist the optional explanation question/rubric, then provide rubric-based feedback with an inconclusive grading state.
- Generate and validate step-ordering and label-matching tasks with saved private keys and deterministic server grading.
- Add explicit Skip controls and retain optional-task evidence separately.
- Support these tasks for both existing catalogue sessions and generated tree lessons.

**Done when:** skipping has no penalty, alternate valid explanations can be accepted, malformed grading does not fabricate evidence, and optional tasks do not change required completion/status rules.

## Stage 15 - Sign-in and guest-progress preservation

**Depends on:** Stages 2, 9, and 13.

**Work:**

- Configure Google identity linking and the auth callback flow.
- Add the non-blocking sign-in offer after the first lesson.
- Implement single-use merge tickets and transactional transfer to an existing account.
- Recompute progress from combined evidence and move private tree nodes, parent links, source snapshots, and sessions without losing histories or exposing private data.
- Implement settings, sign-out, and deletion of personal learning data.

**Done when:** new-account linking keeps the guest UUID/history and tree; existing-account sign-in retains both histories and resolves duplicate tree nodes without losing their lessons; expired/replayed tickets fail; another user's records cannot be merged without proof; and deletion retains the shared roots and catalogue material.


## Stage 16A - Integration and failure verification

**Depends on:** Stages 12-15.

**Work:**

- Run guest root expansion -> child lesson -> tree update, developing-to-demonstrated Review -> tree update, deeper expansion, and account-conversion browser journeys.
- Verify RLS, answer-key secrecy, transactional tree updates, duplicate/concurrent expansion handling, saved source snapshots, and the four earlier lessons.
- Pilot varied nodes under all four roots; record valid source/lesson rate, page access and suitability failures, factual/diagram/question defects, wait time, Gemini calls, token use, and free-tier quota outcomes. Do not claim an arbitrary-topic success rate from the four hand-selected lessons.
- Exercise prompt manipulation through fetched pages, unsafe URLs and redirects, invalid citations/diagrams, alternate valid answers, inconclusive grading, provider failures, and interrupted sessions.
- Verify mobile, keyboard, reduced motion, and text alternatives; fix failures within existing scope.
- Compare Home, Lesson, and the topic tree with approved Stitch references while adapting the old graph image to the new product flow. Verify interactions, theme consistency, and absence of sample-data placeholders.

**Done when:** required journeys and failure cases pass with clearly recorded evidence; automatic sourcing has a measured success rate and usage profile across varied topics. Live provider/auth/database checks are identified separately from mocks.

## Stage 16B - Deployment preparation and validation

**Depends on:** Stage 16A.

**Work:**

- Prepare Vercel frontend/backend configuration, SPA/API routing, environment documentation, OAuth redirects, migration instructions, and production builds.
- Write the README sections required by the hackathon, including the two Gemini models, automatic sourcing, tools, safety, free-tier limits, measured limitations, and tested behaviour.
- Prepare a short demo showing tree expansion, cited visual teaching, clarification, adaptive recommendations, and Review/tree updates.
- Deploy only when deployment is included in the user's authorized scope. Do not purchase services or publish artifacts merely because this stage exists.

**Done when:** reproducible setup and builds pass; deployment configuration is ready. If deployment is authorized, verify the live URLs and real learning/auth/provider flows before marking deployment complete.


## Completion boundary

The build delivers the agreed product, not additional gamification or new providers. User-facing claims must match observed behaviour. A polished tree is not proof of learning; any student pilot should measure application and later independent recall, with its sample and limitations recorded.
