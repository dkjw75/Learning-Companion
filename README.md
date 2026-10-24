# LearningCompanion
Try it here: https://learning-companion-blush.vercel.app/ 
PRD: https://github.com/dkjw75/Learning-Companion/blob/main/PRD.md 

LearningCompanion is a desktop web app that helps computing students find a direction for self-directed technology learning, study a concept through a visual lesson, and check what they understood.

## Problem Statement

Students in computing courses can find explanations in documentation, courses, social media, and AI tools, but those explanations are often disconnected. A student who knows a few tools may still struggle to choose what to learn next, see how concepts relate, or tell whether they can apply a concept independently. LearningCompanion addresses that gap in direction, connection, and feedback during self-directed study on a laptop.

## Solution Overview

A student signs in with Google, chooses interests and an experience level, and explores a topic tree covering ten technology areas. They can pick an existing topic, enter a topic of their own, or request three suggestions within a branch. When they start a new suggested topic, the app finds suitable public references, saves relevant passages, and generates a cited lesson and a three-question check. Their lesson position, answers, learning status, and activity are saved to their account so they can return later.

The tree shows where a topic was added; a generated parent-child link is not a verified prerequisite. A new suggested topic needs usable fetched passages before its lesson can start.

## Key Features

- **Personal starting point:** Google sign-in and onboarding for interests and overall experience.
- **Topic discovery:** Explore ten broad technology areas, then discover more topics by following your interests or choosing suggestions based on your learning history.
- **Guided lessons:** Short steps with text, diagrams, worked examples, common mistakes, citations, saved position, and a text tutor that can highlight diagram elements.
- **Understanding checks:** Three multiple-choice questions, including application; feedback, optional hints, and practice retries. First answers and help use remain separate from retries.
- **Visible progress:** Learning status in the tree, an unfinished lesson to resume, recommendations, suggested revisits, and recent activity on Home.

## AI Integration

The Express server calls Google Gemini through `@google/genai`; the browser never holds the Gemini key. The configurable `GEMINI_MODEL` (the design default is `gemini-3.5-flash-lite`) proposes topics and generates structured lessons, diagrams, questions, and tutor replies. A separate `GEMINI_SEARCH_MODEL` (default `gemini-2.5-flash`) uses Google Search grounding to propose candidate source URLs. The server fetches and checks those pages itself, retrieves saved passages, validates citations and output shape, then stores the accepted lesson and private assessment keys. Resuming a saved lesson reuses its content and source snapshot.

AI-generated assessment keys are labelled **AI-assessed** even when the lesson has sources. Multiple-choice grading and learning status are computed by the server from stored answers and evidence, not decided by Gemini. Suggestions, source discovery, lesson generation, and tutor replies require working provider access; failures are shown as unavailable or retry states rather than a fabricated lesson.

## External Tools & Datasets

| Service or tool | Use |
| --- | --- |
| Google Gemini API and Google Search grounding | Topic suggestions, candidate source discovery, lesson and question generation, and tutor replies. |
| Supabase Auth and Postgres | Google account sign-in, saved learning data, approved and discovered passage snapshots, and access controls. |
| React, Vite, Tailwind CSS, Express, TypeScript, Zod, and PostgreSQL | Application UI, API, validation, and storage. |

## Installation & Setup

You need Node.js 24, npm 11, a **dedicated LearningCompanion Supabase project** with Google OAuth configured, and a Gemini API key with access to the configured models. Do not use credentials or configuration from another app.

1. Clone the repository, open its root directory, and install the workspaces:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project's Connect panel. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same project values for the API. Set `DATABASE_URL` to that project's Postgres connection string. Set the server-only `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, and optionally `GEMINI_SEARCH_MODEL=gemini-2.5-flash`. The `VITE_` values are browser-visible; keep all secrets in the untracked `.env` and never prefix them with `VITE_`.

3. Enable the Google provider in Supabase Auth. Configure its Google OAuth credentials and allow `http://127.0.0.1:5173/auth/callback` as a redirect URL in Supabase. The Google provider must use the callback URL supplied by Supabase. Use the exact frontend origin you open in the browser.

4. For a new Supabase project, apply the database migrations and catalogue seed. This creates the tables and access rules needed for accounts, saved topics, discovered sources, lessons, and progress:

   ```sh
   npm run db:remote:dry-run
   npm run db:remote:push
   ```

   The database migrations remain required for a new project; students using an already configured app do not run these commands. For suggested topics, the app finds and checks public sources when a student selects Learn.

5. Start the frontend and API together:

   ```sh
   npm run dev
   ```

   Open `http://127.0.0.1:5173`. Vite forwards `/api` requests to the Express API on port 3000. Sign in with Google and complete onboarding. Restart the dev processes after changing `.env`.

For local checks, `npm run typecheck` validates TypeScript, `npm test` runs unit and component tests, and `npm run test:e2e` runs Playwright browser tests after `npx playwright install chromium`. Provider and database checks are opt-in: `npm run db:live`, `npm run ai:smoke`, and `npm run generation:live` need valid external access and may make real calls. A local build or mocked test does not prove those services are available.

## AI Safety & Limitations

- **Accuracy:** A valid schema and a real citation do not prove that an explanation, diagram, or answer key is correct. Generated questions have AI-assessed provenance; students should consult the linked source and treat the result as learning feedback, not a certified measure of mastery.
- **Source quality:** New lessons require retrieved passages that cover the selected objective. Candidate URLs come from grounding metadata, then the server checks public HTTPS access, redirects, robots rules, readable text, and coverage. Automated checks do not amount to human approval or a legal reuse determination. If suitable sources cannot be prepared, lesson creation fails visibly.
- **RAG and chunking:** The app extracts readable text from checked source pages and splits it into smaller, heading-based passages called chunks. For a lesson, it retrieves a bounded selection of relevant saved chunks, gives those chunks to Gemini as context, and checks that the lesson cites chunks it actually received. This limits the material used for generation and makes claims traceable, but it cannot guarantee that a source is correct, that retrieval found the best passage, or that the AI interpreted it correctly.
- **Data and access:** Supabase access rules keep each student's tree, lessons, answers, and tutor messages private. Public assessment responses omit answer keys and private rubrics. Student text and fetched pages are treated as data in AI prompts; only the server updates learning status. Keep API keys and database credentials server-side.
- **Bounded operations:** Generation has schema and citation validation, request idempotency, timeouts, usage limits, and bounded retries. A saved lesson is reused rather than regenerated. A provider refusal, timeout, quota failure, or invalid output can still leave a topic without a lesson.

The current app uses multiple-choice checks. It does not include a separate recall-first review round, explanation or visual grading tasks, or an animated mascot.
