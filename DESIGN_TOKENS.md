# Design Tokens

Single source of truth for all visual values. Update `src/styles/tokens.css` when changing values — this file is the human-readable mirror.

---

## Colors

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Background (light end) | `--color-bg-light` | `#BCC6AF` | Top-right corner of gradient |
| Background (dark end) | `--color-bg-dark` | `#3C4531` | Bottom-left corner of gradient |
| Background gradient | `--gradient-bg` | `linear-gradient(to bottom left, #BCC6AF, #3C4531)` | Full-page background (scrolls with content) |
| Text primary | `--color-text-primary` | `#252525` | Main body and heading text |
| Text secondary | `--color-text-secondary` | `#3a3a3a` | Subdued text, labels |
| Tile hover darken | `--tile-hover-darken` | `0.08` | How much a tile darkens on hover (always darker, relative to local gradient) |

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
| Left margin | `--margin-left` | `clamp(2rem, 10vw, 14rem)` | Space left of content card |
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

## Vector Field

Interactive vector field in the right margin. An organic blob of small arrows with spring-damper physics. Blob shape is procedurally generated each page load.

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Arrow color | `--vf-arrow-color` | `#3a3020` | Dark brown stroke color |
| Arrow length | `--vf-arrow-length` | `10` | Arrow line length in px |
| Arrow head size | `--vf-arrow-head-size` | `3` | Arrowhead barb length in px |
| Arrow width | `--vf-arrow-width` | `1` | Stroke width in px |
| Grid spacing | `--vf-grid-spacing` | `12` | Distance between arrow centers in px |
| Field radius | `--vf-field-radius` | `250` | Base radius of the procedural blob in px |
| Influence radius | `--vf-influence-radius` | `70` | Mouse influence radius in px |
| Spring stiffness | `--vf-spring-k` | `200` | Spring constant (higher = snappier) |
| Spring damping | `--vf-damping` | `22` | Damping coefficient (higher = less wobble) |
| Push contact radius | `--vf-push-contact` | `4` | How close mouse must be to arrow line to "touch" it (px) |
| Push strength | `--vf-push-strength` | `0.8` | Angular impulse magnitude per contact (radians at full lever arm) |
| Ball radius | `--vf-ball-radius` | `3` | Visual radius of the trace ball (px) |
| Ball color | `--vf-ball-color` | `#3a3020` | Base color of trace balls (each ball gets a random shade ±15 per RGB channel) |
| Ball speed | `--vf-ball-speed` | `120` | Speed when following the field (px/sec) |
| Ball gravity | `--vf-ball-gravity` | `500` | Gravity acceleration outside the blob (px/sec²) |
| Ball trail length | `--vf-ball-trail` | `8` | Number of trail points stored |

## Content Card

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Background | `--content-card-bg` | `transparent` | No visible fill; tiles fade seamlessly into content area |
| Blur | `--content-card-blur` | `8px` | Backdrop blur for text readability over tiled background |
| Border | `--content-card-border` | `transparent` | No visible borders; tile alpha fade handles transition |

## Monotile

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Outline color | `--tile-outline-color` | `#2a3020` | Fixed dark outline color (change to match any gradient) |
| Outline width | `--tile-outline-width` | `0.5` | Very thin lines |
| Outline opacity | `--tile-outline-opacity` | `0.35` | Overall alpha for tile outlines |
| Hover darken | `--tile-hover-darken` | `0.08` | Always darkens on hover, relative to local gradient position |
| Hover hold | `--tile-hover-hold` | `0.3` | Seconds a tile stays highlighted after cursor leaves |
| Hover fade | `--tile-hover-fade` | `0.7` | Seconds to fade from highlighted back to normal |
| Size scale | `--tile-size-scale` | `1.0` | Visual tile size multiplier (1.0 = default, <1 = smaller, >1 = bigger). Coverage is independent (handled by substitution level) |
| Click darken | `--tile-click-darken` | `0.15` | Darken amount on click (stronger than hover's 0.08) |
| Click scale | `--tile-click-scale` | `1.25` | Max scale during pop animation (1.0 = no change) |
| Click duration | `--tile-click-duration` | `0.15` | Snap-back time on release in seconds (scale-up is always 90ms) |
