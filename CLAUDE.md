# Project Instructions

## Design Token Traceability

**Every visual change must be tracked in the design token files.**

When making any change to colors, fonts, spacing, opacity, effects, or any visual property:

1. **`src/styles/tokens.css`** — Update the CSS custom property (this is the source of truth used by the site)
2. **`DESIGN_TOKENS.md`** — Update the human-readable reference table to match

If you introduce a new visual value (e.g., a new color, a new opacity, a new border radius), it MUST be added as a CSS custom property in `tokens.css` and documented in `DESIGN_TOKENS.md`. Do not hardcode visual values in component files — always reference a CSS variable from `tokens.css`.

This ensures Matthew can tweak any visual aspect of the site by editing a single file, without needing to hunt through component code.

## Project Structure

- **Astro 5** static site with MDX support
- **CSS**: Vanilla CSS + custom properties only (no Tailwind, no CSS-in-JS)
- **Interactives**: Vanilla JS + Canvas 2D (no p5.js, no WebGL)
- **Pattern**: Pure math in `src/lib/`, rendering in `src/components/interactive/`
- **Design docs**: `DESIGN.md` (vision/philosophy), `DESIGN_TOKENS.md` (exact values)
