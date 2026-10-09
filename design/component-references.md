# Component references and provenance

The user supplied five Stitch screenshots and selected five 21st.dev components in [AI Lodge Project](https://docs.google.com/document/d/1PRz_CMHGRaG2JbfjWrIlTbNEuoneaibxopdoYjgL9Wc/edit?tab=t.0). Component links and their parenthetical purposes were read from Tab 1, Components, on 8 October 2026. See [README.md](README.md) for the screenshot inventory and handoff rules and [manifest.json](manifest.json) for the machine-readable inventory.

## User-selected 21st.dev components

| Component | Exact link from planning document | Intended use | Adaptation for this app |
| --- | --- | --- | --- |
| Sign-in card 2, @jatin-yadav05 | [Sign-in component](https://21st.dev/?preview=%2F%40jatin-yadav05%2Fcomponents%2Fsign-in-card-2) | Sign-in/account conversion, Stage 15 | Match the supplied dark theme and use the actual Supabase Google sign-in/account-preservation flow. Keep guest continuation available. |
| Onboarding 3, @olewandowski1 | [Onboarding component](https://21st.dev/?qt=onboarding&preview=%2F%40olewandowski1%2Fcomponents%2Fonboarding-3) | Interests, experience, and skippable diagnostic, Stage 3 | Replace sample steps with the PRD onboarding flow; preserve Back/Continue/Skip controls and keyboard access. |
| Background ASCII wake, @nikolas-sapa | [Background component](https://21st.dev/?qt=background&preview=%2F%40nikolas-sapa%2Fcomponents%2Fbackground-ascii-wake) | Background treatment on every app screen | Mounted globally in `client/src/App.tsx` through `client/src/components/ui/background-ascii-wake.tsx`. Navy/cyan ink, sparse static scatter, pointer wake behind content, no pointer interception, and static reduced-motion frame. |
| Contribution skyline, @kedhareswer | [Contribution/streak component](https://21st.dev/?preview=%2F%40kedhareswer%2Fcomponents%2Fcontribution-skyline) | Contributions/streaks on Home, Stage 3 | Applied in `client/src/components/ui/contribution-skyline.tsx` using real lesson session counts grouped by UTC date. Shows a flat calendar, keyboard day navigation, daily counts, total sessions, busiest day, and streaks. The chart fills the activity panel's content width without an extra padded wrapper. It does not change understanding status or add a leaderboard/XP system. |
| Button UI, @prebuiltui | [Button component](https://21st.dev/?qt=button&preview=%2F%40prebuiltui%2Fcomponents%2Fbutton-ui) | Every interactive button in the app | Applied through `client/src/components/ui/button-ui.tsx` for button and link actions, including onboarding selection cards. Follows the preview's glossy dark pill, bright upper edge, and subtle glow, adapted to the app's navy/cyan palette. Hover brightens the surface and rim; there is no arrow or expanding fill animation. Semantic controls and disabled/loading states are preserved. |

### Selected component source review (9 October 2026)

- The Button UI preview and user-supplied import example were reviewed at [21st.dev](https://21st.dev/@prebuiltui/components/button-ui). The local implementation adapts the visible appearance to the app's React/Vite and navy/cyan theme; it does not copy remote source or add a package dependency. Contribution Skyline is listed as MIT licensed and React-only.
- Contribution data counts saved lesson sessions by UTC creation date from the learner's own rows, limited to 365 days and 2,000 sessions. The returned home DTO is now `activityCounts: [{ date, count }]`.
- Contribution Skyline uses a local SVG calendar, Flat/3D switch, hover/focus day detail, keyboard arrow navigation, yearly total, busiest day, longest streak, and current streak. The view is green to match the supplied contribution reference and sits in the documented full-width, centered 980px wrapper.
- Button UI treatment is shared by all app action buttons and action links, including onboarding choice cards. Its dark glossy surface and cool bright rim match the selected preview, with a subtle hover glow and cyan keyboard focus. CSS disables motion under reduced-motion preferences.
- Use supplied screen layouts as the visual reference; use the PRD and technical design for product behaviour and data. Example screenshot values are not user records.

### Background ASCII Wake source review (9 October 2026)

The [21st.dev component page](https://21st.dev/@nikolas-sapa/components/background-ascii-wake) identifies the source as [ns-ui's registry item](https://design.helpmarq.com/r/background-ascii-wake.json) and lists the MIT License. The [author's source page](https://design.helpmarq.com/components/background-ascii-wake) shows a React-only canvas component with no added package dependencies. The local adaptation uses React 19 hooks and plain CSS, so it does not rely on Tailwind internals. It retains the per-cell ambient, heat, and decay behavior, uses the app's monospace font and cyan theme, listens on the window while its canvas ignores pointer input, and honors both the system and profile reduced-motion settings. Attribution is retained in the local source file.

## Existing foundation components

| Component | Source | Licence | Local adaptation |
| --- | --- | --- | --- |
| Button | [shadcn new-york-v4 registry](https://ui.shadcn.com/r/styles/new-york-v4/button.json) | MIT; [retained notice](shadcn-LICENSE.md) | Local `cn` utility and individual `@radix-ui/react-slot` import instead of aggregate Radix package. |
| Card | [shadcn new-york-v4 registry](https://ui.shadcn.com/r/styles/new-york-v4/card.json) | MIT; [retained notice](shadcn-LICENSE.md) | Local `cn` utility. Screen headings use semantic `h2` elements. |

Retrieved 8 October 2026 during Stage 1. Source copied into `client/src/components/ui/`; no hosted runtime widget. Button uses class-variance-authority, clsx/tailwind-merge, and Radix Slot. Card uses clsx/tailwind-merge only. Both use React props/types and Tailwind 4-compatible utilities and shared theme variables. The rows above preserve the existing foundation provenance; the selected 21st.dev components are additional implementation inputs.
