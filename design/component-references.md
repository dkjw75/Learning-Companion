# Component references and provenance

The user supplied five Stitch screenshots and selected five 21st.dev components in [AI Lodge Project](https://docs.google.com/document/d/1PRz_CMHGRaG2JbfjWrIlTbNEuoneaibxopdoYjgL9Wc/edit?tab=t.0). Component links and their parenthetical purposes were read from Tab 1, Components, on 8 October 2026. This file records those selections; it does not claim their source has been installed or reviewed. See [README.md](README.md) for the screenshot inventory and handoff rules and [manifest.json](manifest.json) for the machine-readable inventory.

## User-selected 21st.dev components

| Component | Exact link from planning document | Intended use | Adaptation for this app |
| --- | --- | --- | --- |
| Sign-in card 2, @jatin-yadav05 | [Sign-in component](https://21st.dev/?preview=%2F%40jatin-yadav05%2Fcomponents%2Fsign-in-card-2) | Sign-in/account conversion, Stage 15 | Match the supplied dark theme and use the actual Supabase Google sign-in/account-preservation flow. Keep guest continuation available. |
| Onboarding 3, @olewandowski1 | [Onboarding component](https://21st.dev/?qt=onboarding&preview=%2F%40olewandowski1%2Fcomponents%2Fonboarding-3) | Interests, experience, and skippable diagnostic, Stage 3 | Replace sample steps with the PRD onboarding flow; preserve Back/Continue/Skip controls and keyboard access. |
| Background ASCII wake, @nikolas-sapa | [Background component](https://21st.dev/?qt=background&preview=%2F%40nikolas-sapa%2Fcomponents%2Fbackground-ascii-wake) | Background treatment; screen placement not specified by the user | Use restrained decoration consistent with the navy/cyan references. Keep diagrams, graph labels, and lesson text readable, prevent decoration from intercepting input, and provide a static reduced-motion version. |
| Contribution skyline, @kedhareswer | [Contribution/streak component](https://21st.dev/?preview=%2F%40kedhareswer%2Fcomponents%2Fcontribution-skyline) | Contributions/streaks on Home, Stage 3 shell with actual activity when available | Follow the Home screenshot's activity-panel appearance. Use stored learning activity instead of GitHub/sample contributions; keep activity counts separate from understanding. Define the counted activity explicitly before wiring it. This selection adds the requested activity visual, not a leaderboard, XP system, or new learning-status rule. |
| Flow button, @xubohuah | [Button component](https://21st.dev/?qt=button&preview=%2F%40xubohuah%2Fcomponents%2Fflow-button) | Buttons; individual placements not specified by the user | Apply to suitable primary actions such as Start lesson, Continue, and Submit. Use consistent sizing, focus, disabled/loading states, and reduced motion. Preserve semantic button or link behaviour. |

### Before importing selected source

- Read the selected component's actual source and licence, record its dependencies and retained notices, and verify React 19/Tailwind 4 compatibility. These checks are pending for all five selections; a reference URL alone does not establish a licence or dependency list.
- Copy and adapt the selected source locally using the technical design's component directories, aliases, and shared theme variables. Adapt any Next.js-specific assumptions to the React/Vite SPA.
- Record the local file path and any changes here after import. No 21st.dev feature source was copied during this design-handoff task.
- Use supplied screen layouts as the visual reference; use the PRD and technical design for product behaviour, data, and assessment rules. Example screenshot values are not user records.

## Existing foundation components

| Component | Source | Licence | Local adaptation |
| --- | --- | --- | --- |
| Button | [shadcn new-york-v4 registry](https://ui.shadcn.com/r/styles/new-york-v4/button.json) | MIT; [retained notice](shadcn-LICENSE.md) | Local `cn` utility and individual `@radix-ui/react-slot` import instead of aggregate Radix package. |
| Card | [shadcn new-york-v4 registry](https://ui.shadcn.com/r/styles/new-york-v4/card.json) | MIT; [retained notice](shadcn-LICENSE.md) | Local `cn` utility. Screen headings use semantic `h2` elements. |

Retrieved 8 October 2026 during Stage 1. Source copied into `client/src/components/ui/`; no hosted runtime widget. Button uses class-variance-authority, clsx/tailwind-merge, and Radix Slot. Card uses clsx/tailwind-merge only. Both use React props/types and Tailwind 4-compatible utilities and shared theme variables. The rows above preserve the existing foundation provenance; the selected 21st.dev components are additional implementation inputs.
