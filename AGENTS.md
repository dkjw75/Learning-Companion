# LearningCompanion implementation

Read [PRD.md](PRD.md), [technical-design.md](docs/technical-design.md), and [build-plan.md](docs/build-plan.md) before editing. Implement only the requested stage and follow the fixed contracts. This is a separate application; do not modify ThinkTwice or reuse its configuration or secrets.

Run the stage's completion checks. For application changes run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; run the relevant browser checks with `npm run test:e2e`. Report external dependencies that are unavailable as unverified. Never replace a failed live capability with an unlabeled fixture.

Record each invocation in `docs/implementations/implementation-log-StageN.X.md`, including changes, actual checks/outcomes, remaining dependencies, and the next action. Keep credentials out of source, examples, browser state, test output, and logs. Public assessment DTOs exclude answer keys and private rubrics. Only the server computes learning status; source status is independent of assessment outcomes.

## User-facing interface rule - applies to every stage

- Show only implemented product functionality required by the current stage and information the student needs to use it. This rule takes precedence over earlier scaffold/demo examples in planning documents.
- Never render development-stage labels, project-foundation panels, API/database connection indicators or test buttons, setup instructions, technical configuration details, implementation progress, or messages about features arriving in later stages. Examples to remove include Project foundation - Stage 2, Local connection, API connected, and Check connection.
- Keep health endpoints, diagnostics, verification evidence, and implementation commentary in tests, terminal output, developer documentation, or implementation logs. Do not add a hidden or development-only diagnostic website panel unless the user explicitly requests one.
- Keep necessary product loading, empty, error, and retry states. Describe the student's action in plain language (for example, Could not start your guest session. Please try again.), without mentioning servers, Supabase, migrations, environment variables, or build stages.
- Preserve required lesson citations, source/assessment labels, learning evidence, and admin source-management functions; these serve actual product needs.
- Do not invent data or enable unfinished actions to make a stage look complete. Keep unavailable features out of navigation or show an honest product-level unavailable state when needed.
- When touching a screen, remove any existing diagnostic/scaffold UI and verify the rendered result follows this rule. Check infrastructure health independently; never restore diagnostic cards to satisfy an old screenshot or test.
