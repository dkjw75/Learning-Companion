# Design System Specification: LearningCompanion

## 1. Overview & Brand Identity

**LearningCompanion** is an interactive, visual-first computing education platform engineered for tertiary computer science and software engineering students. The visual language blends high-density developer ergonomics (inspired by modern IDEs, RFC documentation, and observability consoles) with welcoming educational polish.

- **Design Philosophy**: High technical fidelity, dark-mode first, luminescent status accents, structured monospace data displays, and uncluttered cognitive hierarchy.
- **Aesthetic Tone**: Deep space midnight canvas, precise cybernetic cyan/emerald neon highlights, glassmorphic floating HUD surfaces, and deliberate typography.

---

## 2. Color Palette & Token System

### 2.1 Surfaces & Canvas (Dark Mode Foundations)
The foundation relies on tiered obsidian and midnight blue tones to create depth without visual noise.

| Token | Hex | Role & Usage |
| :--- | :--- | :--- |
| `surface-container-lowest` | `#060e20` | Base canvas background, full-screen map backing |
| `surface` | `#0b1326` | Default viewport surface, page background |
| `surface-dim` | `#0b1326` | Dimmed modals, canvas background underlay |
| `surface-container-low` | `#131b2e` | Secondary card backgrounds, nested containers |
| `surface-container` | `#1b2337` | Standard elevated cards, panels, side drawers |
| `surface-container-high` | `#232c42` | Dropdown menus, floating inspector docks, tooltips |
| `surface-bright` | `#31394d` | Hover states, active borders, card highlights |

### 2.2 Brand & Interactive Accents
Primary interactive cues, action buttons, and active selections use energetic electric hues.

| Token | Hex | Tailwind Utility | Role & Usage |
| :--- | :--- | :--- | :--- |
| `primary` | `#06b6d4` | `text-cyan-400`, `bg-cyan-500` | Primary brand accent, selected nodes, active tabs |
| `primary-hover` | `#0891b2` | `hover:bg-cyan-600` | Button hover and pressed states |
| `primary-glow` | `rgba(6, 182, 212, 0.25)` | `shadow-[0_0_20px_rgba(6,182,212,0.25)]` | Focal node aura, graph connection beam |
| `secondary` | `#818cf8` | `text-indigo-400`, `bg-indigo-500` | Tutor interactions (Byte AI mascot), deep links |
| `secondary-container`| `#1e1b4b` | `bg-indigo-950` | Byte AI tutor speech bubbles, hints |

### 2.3 Learning Status Tokens (PRD Aligned)
Color is paired with semantic icons and explicit text badges to satisfy accessibility rules.

| Learning Status | Hex / Color | Badge Class | Semantics & Meaning |
| :--- | :--- | :--- | :--- |
| **Demonstrated** | `#10b981` (Emerald) | `text-emerald-400 bg-emerald-950/60 border-emerald-500/40` | Mastery verified independently (3/3 first-attempt MCQs) |
| **Developing** | `#f59e0b` (Amber) | `text-amber-400 bg-amber-950/60 border-amber-500/40` | Partial understanding, gaps detected, review suggested |
| **Explored** | `#06b6d4` (Cyan) | `text-cyan-400 bg-cyan-950/60 border-cyan-500/40` | Content reviewed or lesson opened, not assessed |
| **Not Assessed** | `#64748b` (Slate) | `text-slate-400 bg-slate-800/60 border-slate-700/50` | Topic untouched; no diagnostic or formal submission |
| **Unverified Source**| `#f43f5e` (Rose) | `text-rose-400 bg-rose-950/60 border-rose-500/40` | AI-generated topic or lack of formal RFC/MDN grounding |

### 2.4 Typography & Text Colors
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `text-primary` | `#f1f5f9` (Slate 100) | Headings, primary labels, active menu text |
| `text-secondary` | `#94a3b8` (Slate 400) | Secondary metadata, captions, inactive nav items |
| `text-tertiary` | `#64748b` (Slate 500) | Timestamps, RFC section numbers, disabled elements |
| `border-subtle` | `rgba(255, 255, 255, 0.08)`| Subtle structural dividers, table grid lines |
| `border-default` | `rgba(255, 255, 255, 0.14)`| Card borders, inputs, button outlines |

---

## 3. Typography Scale & Fonts

The type hierarchy pairs **Geist / Inter** for conversational and product readability with **Geist Mono / JetBrains Mono** for technical codes, RFC references, and terminal outputs.

- **Primary Font**: `font-sans` (`Geist`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`)
- **Monospace Font**: `font-mono` (`Geist Mono`, `JetBrains Mono`, `ui-monospace`, `monospace`)

| Level | Size / Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display / H1** | `28px` / `34px` (`text-2xl` to `text-3xl`) | `font-bold` (700) | `-tracking-tight` | Screen titles, Dashboard metric hero numbers |
| **H2 / Section** | `20px` / `28px` (`text-xl`) | `font-semibold` (600) | `-tracking-tight` | Module headers, Inspector title |
| **H3 / Card Header** | `15px` / `22px` (`text-base`) | `font-medium` (500) | `normal` | Quiz question lead, card groupings |
| **Body (Default)** | `14px` / `20px` (`text-sm`) | `font-normal` (400) | `normal` | Tutor explanations, descriptive paragraphs |
| **Caption / Meta** | `12px` / `16px` (`text-xs`) | `font-normal` / `500` | `tracking-wide` | Status chips, timestamps, keyboard hints (`[1]`, `⌘K`) |
| **Code / Protocol** | `12px` - `13px` | `font-mono` | `tracking-tight` | RFC standards (`RFC 9112`), HTTP headers, payloads |

---

## 4. Spacing, Elevation & Border Radius

### 4.1 Border Radius System
- **Pills / Status / Tags**: `rounded-full` (`9999px`) — filter tags, status pills, circular concept graph nodes (`w-16 h-16 rounded-full`).
- **Interactive Controls / Inputs**: `rounded-lg` (`8px`) — buttons, quiz option boxes, search inputs.
- **Floating Panels / Modals**: `rounded-xl` (`12px`) to `rounded-2xl` (`16px`) — side-docked inspector cards, floating HUD bars.

### 4.2 Depth & Glassmorphism
- **Glass Panel**: `backdrop-blur-md bg-slate-900/80 border border-white/10 shadow-2xl`
- **Glow Accent**: `box-shadow: 0 0 24px -4px rgba(6, 182, 212, 0.35)`
- **Node Halo**: Circular SVG gradients and double-ring borders (`ring-2 ring-cyan-400/40 ring-offset-2 ring-offset-[#060e20]`).

---

## 5. Key UI Component Standards

### 5.1 Global Top Navigation Shell
- **Height**: `64px` (`h-16`)
- **Structure**: Brand logo + version pill (`LearningCompanion v1.1`) on the left; navigation links (`Home`, `Learn`, `Knowledge Map`, `Explore`) centered; Quick-search (`⌘K`), streak indicator flame badge (`4-day habit`), and student avatar profile on the right.
- **Style**: Fixed / sticky top bar with border divider (`border-b border-white/10`).

### 5.2 Circular Knowledge Graph Node
- **Diameter**: `64px × 64px` (`w-16 h-16 rounded-full`)
- **Center**: Centered Lucide SVG icon representing the domain (Network, Database, API contract).
- **Below Node**: Monospace concept badge (e.g., `SYS-NET-201`), concept title (`HTTP requests and responses`), and mastery progress.
- **Rays & Edges**: SVG paths styled with glowing neon gradients (`stroke-cyan-500/30` or `stroke-emerald-500/40`), animated with subtle dash arrays for active dependency paths.

### 5.3 Side-Docked Node Inspector Card
- **Position**: Pinned to the right viewport edge (`fixed right-6 top-20 bottom-6 w-96 md:w-[480px] z-40`).
- **Header**: Taxonomy category + Close `✕` button.
- **Body**: Verified source tag (`RFC 9110 & MDN Verified`), assessed learning objectives checklist, diagnostic evidence, and inline Byte AI prompt.
- **Actions**: High-contrast CTA `Resume Visual Lesson` + secondary `Practice Gap Review`.

### 5.4 Activity Streak & Skyline Visualization
- **Header**: Section title `"Activity Streak"` accompanied by timeframe pills (`Last day`, `Week`, `30 days` [active], `6 months`).
- **3D Skyline**: Isometric pseudo-3D bar matrix representing daily contributions and XP.
- **Metric Cards (3-Column Grid)**:
  1. **Current Streak**: e.g., `4 Days` (+ flame badge)
  2. **Longest Streak**: e.g., `27 Days` (historical record)
  3. **Consistency Rate**: e.g., `86%` (target >80%)

### 5.5 Assessment & Quiz Workspace
- **Layout**: Widescreen desktop card layout.
- **Item Header**: Question tracker (`Question 2 of 4 (3 Required MCQs + 1 Optional Application Task)`), countdown timer, potential XP gain (`+30 XP`), and exit button.
- **Options List**: Lettered/numbered keyboard shortcut boxes (`[1]`, `[2]`, `[3]`, `[4]`) with subtle hover transitions and selected border glow (`border-cyan-400 bg-cyan-950/20`).
- **Tutor Drawer**: Integrated Byte mascot offering conceptual scaffolding without forfeiting independent scoring.
