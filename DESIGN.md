# Design Philosophy

Personal website for Matthew Lones — 2nd year Applied Mathematics & Computer Engineering, Queen's University.

This document captures the complete design vision, aesthetic decisions, and technical plan. Every element of this site is intentional and has something behind it.

---

## Identity

This is not a typical software engineer portfolio. The site reflects an interest in mathematics, AI engineering, and data work. It should feel like it was made by someone who thinks in proofs and algorithms.

**Core principles:**
- **Intentional** — every element has a reason to exist
- **Homegrown & human** — not templated, not AI-generated-looking
- **Minimalist but textured** — clean layout with grain, noise, and mathematical flourishes
- **Intellectually interesting** — decorative elements are themselves interesting (aperiodic tiling, etc.)
- **Lightweight** — fast to load, simple to maintain

---

## Visual Design

### Color Palette

See [DESIGN_TOKENS.md](DESIGN_TOKENS.md) for all exact values. The CSS source of truth is `src/styles/tokens.css`.

**Background**: Full-viewport gradient from `#BCC6AF` (top-right) to `#3C4531` (bottom-left). Earthy green tones. `background-attachment: fixed` so it doesn't scroll.

**Text**: `#252525` primary, `#3a3a3a` secondary. Dark on the green gradient for readability.

### Typography

**Playfair Display** (Google Fonts, self-hosted woff2). Variable font covering weights 400-700. Used for both headings and body. Italic variant available.

Font files: `public/fonts/PlayfairDisplay-Regular.woff2` (variable, 38KB) and `PlayfairDisplay-Italic.woff2` (22KB).

### Texture & Grain

SVG `feTurbulence` noise overlay across the viewport. Stronger on the sides (~4% opacity), lighter in the center content area (~1.5%) for readability. Implemented via a radial gradient mask on the overlay div. Zero JavaScript.

Component: `src/components/layout/GrainOverlay.astro`

### Glassmorphic Bento Boxes

Page nav links and contact info use a glassmorphic style:
- `backdrop-filter: blur(12px)` + `rgba(255,255,255,0.1)` background
- Subtle white border (`rgba(255,255,255,0.15)`)
- `border-radius: 16px`

CSS class: `.glass-box` (defined in `src/styles/layout.css`)

---

## Layout

### 3-Column Grid

```
┌──────────────────────────────────────────────────────────────┐
│  LEFT MARGIN           CONTENT                 RIGHT MARGIN  │
│  clamp(2rem,10vw,14rem) max 720px              1fr (larger)  │
│                                                              │
│  Hat monotile          "Hey There!"                          │
│  tiling (canvas,       Profile pic + nav      Future: puzzles│
│  subtle outlines,      Contact info           games, particle│
│  hover interaction)    About                  simulations    │
│                        Projects                              │
│                        Experience                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

CSS Grid: `grid-template-columns: var(--margin-left) minmax(0, var(--content-max-width)) 1fr`

Mobile (<768px): Margins collapse, interactive elements hide, content fills width.

### Header (within content column)

```
Hey There!                    [About | Projects | Experience]  ← glassmorphic
[Profile Pic - large,
 rounded corners]
[Contact Info]                                                 ← glassmorphic
Description about myself...
```

---

## Interactive: Hat Monotile Tiling

The left margin features the **hat tile** — a single aperiodic monotile discovered in 2023 by David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss. This is the first shape ever found that tiles the plane but never periodically. It's mathematically significant, not just decorative.

### Implementation

- **Math module**: `src/lib/hat-monotile.ts` — 280 lines of pure TypeScript
  - Implements the H/T/P/F metatile substitution system from the original paper
  - Based on Craig Kaplan's reference implementation (BSD 3-clause)
  - `generateHatTiling(levels)` produces an array of tile polygons
  - `pointInPolygon()` for hover detection

- **Renderer**: `src/components/interactive/HatTiling.astro` — Canvas 2D web component
  - Draws tile outlines in `#939391` at 35% opacity (very subtle)
  - Fades out from left to right (full opacity on left, invisible by 95% of canvas width)
  - Hover: tile under cursor fills with `rgba(0,0,0,0.08)` (slightly darker than background)
  - `IntersectionObserver` pauses rendering when off-screen
  - Reads all values from CSS custom properties (tweakable via tokens.css)

### Performance
- Tile geometry generated once on load (~300 tiles at 3 substitution levels)
- Only re-renders on mouse move (no animation loop)
- Total JS: 7.83 KB (3.05 KB gzipped)

---

## Content Sections

### About
Short bio. Math/AI/data interests. Not corporate.

### Projects
Card layout. Data in `src/data/projects.json` (future). Each: title, description, tags, link, thumbnail.

### Experience
Timeline/list. Data in `src/data/experience.json` (future). Each: title, org, dates, description.

### Top Fives
Favorite songs, books, etc. Data in `src/data/top-fives.json` (future). Personality, not resume.

---

## Future: Right Margin Interactives

The right margin is intentionally larger. This is where puzzles, games, particle simulations, and other Easter eggs will live. Planned elements:

- **Particle system** — ambient floating particles, mouse interaction
- **Interactive spring lines** — push-and-spring-back physics
- **Draggable icons** — pick up and move items in the margin
- **Puzzles & riddles** — with progressive hint system (eventually LLM-powered)
- **SVG pattern interactions** — custom patterns with hover effects

---

## Future: Blog & Puzzles

### Blog
Markdown/MDX files in `src/content/blog/`. Astro Content Collections with Zod schema. Listing page + individual post pages. Infrastructure ready, content TBD.

### Puzzles
Markdown files in `src/content/puzzles/`. Each has: title, difficulty, category, hints array, answer. Phase 1: client-side hint reveal. Phase 2: LLM-powered custom hints via Astro SSR route.

---

## Technical Architecture

- **Framework**: Astro 5 (static output, islands architecture)
- **Dependencies**: `astro` + `@astrojs/mdx` only
- **CSS**: Vanilla CSS + custom properties. No Tailwind, no CSS-in-JS.
- **Interactives**: Vanilla JS + Canvas 2D. No p5.js, no WebGL.
- **Pattern**: Math in `src/lib/` (pure, no DOM), rendering in `src/components/interactive/` (Astro + web components)
- **Deployment**: Static, deployable anywhere. Add `output: 'hybrid'` + server adapter when LLM hints are needed.

---

## Open Items

- [ ] Provide SVG patterns with placement and interaction notes
- [ ] Find specific puzzles/riddles to include
- [ ] Choose deployment platform
- [ ] Profile picture asset
- [ ] Domain name
- [ ] Right margin interactive elements
- [ ] Blog infrastructure and first post
- [ ] Puzzle system with hint reveal
