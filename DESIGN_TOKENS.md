# Design Tokens

Single source of truth for all visual values. Update `src/styles/tokens.css` when changing values — this file is the human-readable mirror.

---

## Colors

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Background (light end) | `--color-bg-light` | `#BCC6AF` | Top-right corner of gradient |
| Background (dark end) | `--color-bg-dark` | `#3C4531` | Bottom-left corner of gradient |
| Background gradient | `--gradient-bg` | `linear-gradient(to bottom left, #BCC6AF, #3C4531)` | Full-viewport background |
| Text primary | `--color-text-primary` | `#252525` | Main body and heading text |
| Text secondary | `--color-text-secondary` | `#3a3a3a` | Subdued text, labels |
| Tile outline | `--color-tile-outline` | `#939391` | Hat monotile outlines, very subtle |
| Tile hover darken | `--tile-hover-darken` | `0.08` | How much darker a tile gets on hover (multiplier) |

## Typography

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Heading font | `--font-heading` | `Playfair Display` | Google Fonts, self-hosted woff2 |
| Body font | `--font-body` | `Playfair Display` | Same family for now |
| Mono font | `--font-mono` | `JetBrains Mono` | Code/technical text |

## Glassmorphic Bento Boxes

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Background | `--glass-bg` | `rgba(255, 255, 255, 0.1)` | Semi-transparent white fill |
| Blur | `--glass-blur` | `12px` | Backdrop blur amount |
| Border | `--glass-border` | `rgba(255, 255, 255, 0.15)` | Subtle white edge |
| Border radius | `--glass-border-radius` | `16px` | Rounded corners |

## Layout

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Left margin | `--margin-left` | `clamp(2rem, 10vw, 14rem)` | Monotile tiling lives here |
| Content max width | `--content-max-width` | `720px` | Center column cap |
| Right margin | — | `1fr` (remaining space) | Larger side, for future interactives |
| Profile pic radius | `--profile-border-radius` | `12px` | Slightly rounded corners |

## Grain / Noise

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Grain opacity (sides) | `--grain-opacity` | `0.06` | Heavier texture at edges |
| Grain opacity (center) | `--grain-opacity-center` | `0.02` | Lighter in content area for readability |
| Grain base frequency | `--grain-base-frequency` | `0.65` | feTurbulence frequency — higher = finer grain |
| Grain mask center | `--grain-mask-center-opacity` | `0.3` | How much grain shows in center (0=none, 1=full) |

## Monotile

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Outline color | `--color-tile-outline` | `#939391` | Etched outlines |
| Outline width | `--tile-outline-width` | `0.5` | Very thin lines |
| Outline opacity | `--tile-outline-opacity` | `0.35` | Subtle presence |
| Hover darken | `--tile-hover-darken` | `0.08` | Relative to local gradient position |
