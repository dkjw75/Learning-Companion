# Frontend design handoff

Received 8 October 2026. These references were supplied by the user for LearningCompanion. Read them with [PRD.md](../PRD.md), [technical-design.md](../docs/technical-design.md), and [component-references.md](component-references.md).

[DESIGN.md](DESIGN.md) is present and contains the supplied surface/accent colours, font choices, typography scale, radii, and navigation/graph/quiz styling. Its filename has been normalized from design.md without changing its contents. Use its visual tokens with the screenshots and the product-rule clarifications below.

## Screen inventory

| File | Intended screen/state |
| --- | --- |
| [knowledge-map-overview.png](screenshots/knowledge-map-overview.png) | Full concept graph, area filters, status legend, and zoom controls. |
| [knowledge-map-node-details.png](screenshots/knowledge-map-node-details.png) | Selected HTTP concept, surrounding connections, and evidence/action details panel. |
| [home.png](screenshots/home.png) | Recommended lesson, targeted review, and learning-activity skyline. |
| [lesson-with-tutor.png](screenshots/lesson-with-tutor.png) | HTTP process diagram, step captions, citations, and typed tutor questions. |
| [quiz.png](screenshots/quiz.png) | MCQ progress, code example, answer selection, and submission controls. |

All five files are unchanged copies of the attachments, verified by matching file hashes. The lesson attachment's capture label says home; its product content is the Lesson screen, so the filename reflects that content.

## Visual direction and adaptation

Use the supplied dark navy surfaces, cyan accents, subtle grid treatment, compact navigation, technical diagrams, and panel/card layouts as the visual reference. The earlier light/indigo defaults are provisional and yield to these supplied screens. Use the supplied DESIGN.md for explicit colour/font/size values; its example Tailwind utilities do not always match the adjacent hex values, so define shared theme variables from the explicit values rather than assuming each suggested utility is exact. Where the export leaves responsive, spacing, or motion details open, apply the technical design's accessibility and layout requirements.

The surrounding dotted Stitch canvas, frame borders, capture labels/toolbars, and floating prompt overlay are capture UI, not application elements. Implement the application inside each frame. Original files are retained without cropping so no design information is lost.

Product behaviour follows the PRD when sample screenshot copy differs:

- Use Not assessed, Explored, Developing, and Demonstrated understanding. Translate sample Mastered wording to Demonstrated understanding.
- Keep source status separate from learning status. Unverified source is a tag, not a fifth learning status; do not claim a source is verified just because a screenshot says so.
- Demonstrated understanding records performance on stated assessment objectives; the export's phrase Mastery verified independently is not an accuracy guarantee. Unsupported topics keep their unverified source and AI-assessed labels even after a qualifying check.
- Do not reproduce illustrative mastery percentages, activity totals, dates, or student data as real results. The requested contribution skyline represents actual learning activity, not a mastery score.
- Keep three required MCQs, with optional explanation and visual tasks. At least one required MCQ tests application. Do not make application optional because of example screenshot wording.
- XP, countdown timers, and assessment navigation features appearing in examples are not added requirements. Follow the existing assessment flow and completion rules.
- Tutor hints that assist with an assessment must be recorded as assistance. The export's claim that scaffolding never forfeits independent scoring does not override the PRD's independence rules.
- Review results still show the committed before/after map update. That results state was not among these attachments.

No onboarding screenshot, results/map-update screenshot, or mobile layout was supplied. Adapt the selected onboarding component and existing screen theme for these views, without treating missing reference images as approved layouts. Keep keyboard access, readable text, focus states, and reduced motion.

## Design handoff readiness

The core handoff is available: DESIGN.md, five screenshots, component references, the manifest, and the foundation licence notice. Frontend work can use these now. Optional Stitch code/assets can be saved under `design/exports/`; these are not a prerequisite. A project/version identifier has not been supplied, and explicit approval metadata remains unset rather than being invented.

Onboarding, results/map-update, and mobile reference screens would add detail but do not block Stage 2's database/auth work. Adapt the supplied theme and selected onboarding component when implementing those views.

The project .gitignore excludes `docs/implementations/` and `design/screenshots/` as requested. These files remain on this computer. Other checkouts and remote agents will need screenshots supplied separately; the tracked design rules, manifest, and component links do not embed image contents.
