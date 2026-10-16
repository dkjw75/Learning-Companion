# LearningCompanion implementation

Before editing, read the requested stage's section in [build-plan.md](docs/build-plan.md) and only the relevant sections of [PRD.md](PRD.md), [technical-design.md](docs/technical-design.md), and the design references. Follow any fixed contracts those sections reference; read further when needed to resolve a dependency or conflict. Do not reread unchanged sections already available in this chat. Implement only the requested stage. This is a separate application; do not modify ThinkTwice or reuse its configuration or secrets.

Keep context and output small: use targeted searches and read only the file sections needed for the task and its dependencies. Avoid whole-file dumps, repeated reads, and verbose tool output. Answer in concise, plain language; include only the explanation, evidence, and limitations needed to understand the result. Complete required checks, but repeat or broaden them only after relevant changes, failures, or unresolved risks.

Keep testing minimal for each turn: run only the smallest relevant check, usually one focused test or typecheck. Do not run full test suites, lint, build, or E2E by default; use them only when a concrete risk calls for them or the user asks. Do not add broad tests or repeat passing checks without a reason. The user handles manual browser testing. Report external dependencies that are unavailable as unverified. Never replace a failed live capability with an unlabeled fixture.

Treat LearningCompanion as a desktop app. Do not spend implementation or testing effort on phone or other small-screen layouts unless the user explicitly asks.

Do not create or update implementation logs, including `docs/implementations/implementation-log-StageN.X.md`, unless the user explicitly requests them. Report changes, checks, outcomes, and remaining dependencies briefly in the final response instead. This overrides earlier requirements to log each invocation.

Keep credentials out of source, examples, browser state, and test output. Public assessment DTOs exclude answer keys and private rubrics. Only the server computes learning status; source status is independent of assessment outcomes.

## User-facing interface rule - applies to every stage

- Show only implemented product functionality required by the current stage and information the student needs to use it. This rule takes precedence over earlier scaffold/demo examples in planning documents.
- Never render development-stage labels, project-foundation panels, API/database connection indicators or test buttons, setup instructions, technical configuration details, implementation progress, or messages about features arriving in later stages. Examples to remove include Project foundation - Stage 2, Local connection, API connected, and Check connection.
- Keep health endpoints, diagnostics, verification evidence, and implementation commentary in tests, terminal output, or developer documentation. Do not add a hidden or development-only diagnostic website panel unless the user explicitly requests one.
- Keep necessary product loading, empty, error, and retry states. Describe the student's action in plain language (for example, Could not start your guest session. Please try again.), without mentioning servers, Supabase, migrations, environment variables, or build stages.
- Preserve required lesson citations, source/assessment labels, learning evidence, and admin source-management functions; these serve actual product needs.
- Do not invent data or enable unfinished actions to make a stage look complete. Keep unavailable features out of navigation or show an honest product-level unavailable state when needed.
- When touching a screen, remove any existing diagnostic/scaffold UI and verify the rendered result follows this rule. Check infrastructure health independently; never restore diagnostic cards to satisfy an old screenshot or test.
