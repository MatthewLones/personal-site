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

## Profile Photo Reveal

Interactive profile photo with elastic drag. A formal photo sits on top of a silly photo. Drag the formal photo to peek underneath; releasing snaps it back via an underdamped spring with gentle jiggle. A visible rope connects the photo to its home position during drag and snap-back. Stays below the grain overlay like all other content.

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Spring stiffness | `--pp-spring-k` | `300` | Spring constant for snap-back (higher = snappier) |
| Damping ratio | `--pp-damping-ratio` | `0.7` | <1 = underdamped (bouncy jiggle), 1.0 = critically damped (no bounce) |
| Max tilt | `--pp-max-tilt` | `6` | Max rotation in degrees during drag |
| Rope color | `--pp-rope-color` | `var(--vf-arrow-color)` | Elastic band color (matches vector field arrows) |
| Rope tension color | `--pp-rope-tension-color` | `#8a2a20` | Strained rope color (muted brick red) — ease-in ramp as you pull |
| Rope tension distance | `--pp-rope-tension-dist` | `1200` | Distance in px at which rope is fully red (quartic ease-in, so color barely shifts until ~75% of this) |
| Rope width | `--pp-rope-width` | `2.5` | Max stroke width of rope in px (thins when stretched) |
| Shadow (resting) | `--pp-shadow` | `0 2px 12px rgba(0,0,0,0.15)` | Subtle drop shadow at rest |
| Shadow (dragging) | `--pp-shadow-dragging` | `0 10px 30px rgba(0,0,0,0.3)` | Lifted shadow while dragging |

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

### Vector Field — Dashboard

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Dashboard opacity | `--vf-dashboard-opacity` | `0.3` | Resting opacity of the control dashboard |
| Dashboard hover opacity | `--vf-dashboard-hover-opacity` | `0.7` | Opacity when hovering or focusing the dashboard |

### Vector Field — Wind Transition

When switching field functions, a dramatic wind swarm enters from off-screen — spawning continuously at a random point along the top, left, or bottom viewport edges. Leaves physically travel from the spawn point across the entire page toward the vector field. Once the first wave reaches the blob, additional leaves spawn around the blob perimeter for full 360° coverage, ensuring all edge cells are organically transitioned. Each perimeter leaf traverses a chord through the blob interior, maximizing coverage. Field influence is distance-dependent: far from the field, leaves fly straight; as they approach the field center, they increasingly steer by the new field function — curling into vortices, spiraling, etc. Transition duration is emergent (distance / speed), not a fixed value.

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Wind speed | `--vf-wind-speed` | `650` | Leaf and wavefront speed in px/s — controls both visual travel and cell transition timing |
| Leaf spawn rate | `--vf-leaf-spawn-rate` | `6` | Number of leaves spawned per frame at the origin |
| Leaf decay rate | `--vf-leaf-decay-rate` | `0.15` | Life units lost per second (leaves live ~6.7s for full cross-screen travel) |
| Leaf max count | `--vf-leaf-max-count` | `280` | Cap on simultaneous leaf particles |

## Photo Scatter

Draggable about-me photos scattered organically below the vector field in the right margin. Drag to rearrange, click to bring to front. The bounding area is invisible — no visible container.

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Box margin top | `--ps-box-margin-top` | `1.5rem` | Vertical gap below the vector field |
| Photo border radius | `--ps-photo-radius` | `8px` | Rounded corners on each photo |
| Photo shadow (resting) | `--ps-photo-shadow` | `0 2px 8px rgba(0,0,0,0.25)` | Subtle drop shadow when placed |
| Photo shadow (lifted) | `--ps-photo-shadow-lifted` | `0 8px 24px rgba(0,0,0,0.35)` | Deeper shadow while dragging |
| Photo min size | `--ps-photo-min-size` | `180px` | Smallest random photo dimension |
| Photo max size | `--ps-photo-max-size` | `280px` | Largest random photo dimension |

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
| Ripple speed | `--tile-ripple-speed` | `1200` | Wavefront expansion speed in px/s |
| Ripple fade | `--tile-ripple-fade` | `0.25` | Per-tile fade duration after wavefront passes (seconds) |
| Ripple radius | `--tile-ripple-radius` | `600` | Maximum reach of the ripple in screen px |

## Galton Board

Inverted particle accumulator centered at the viewport horizontal center. Each monotile click spawns a particle that rises through a peg grid and settles at the top, forming a bell curve (normal distribution).

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Number of rows | `--galton-num-rows` | `10` | Peg rows; row 0 (bottom) has 1 peg, row 9 (top) has 10 |
| Peg spacing X | `--galton-peg-spacing-x` | `16` | Horizontal distance between pegs in a row (px) |
| Peg spacing Y | `--galton-peg-spacing-y` | `20` | Vertical distance between rows (px) |
| Peg radius | `--galton-peg-radius` | `1.5` | Visual radius of each peg dot (px) |
| Peg color | `--galton-peg-color` | `#2a3020` | Peg dot fill color |
| Peg opacity | `--galton-peg-opacity` | `0.12` | Very faint — subtle/minimal pegs |
| Particle radius | `--galton-particle-radius` | `2.5` | Radius of each falling particle (px) |
| Particle color | `--galton-particle-color` | `#3a3020` | Particle fill color |
| Particle opacity | `--galton-particle-opacity` | `0.6` | Semi-transparent particles |
| Arc duration | `--galton-arc-duration` | `0.12` | Time per peg-to-peg arc segment (seconds) |
| Arc height | `--galton-arc-height` | `8` | Bezier control point offset for upward bulge (px) |
| Board top margin | `--galton-board-top-margin` | `3` | Space between top of viewport and ceiling boundary (px) |
| Gravity | `--galton-gravity` | `800` | Upward acceleration in px/s² (inverted: pulls toward y=0) |
| Damping | `--galton-damping` | `2.0` | Exponential velocity decay coefficient (1/s) |
| Restitution | `--galton-restitution` | `0.3` | Coefficient of restitution for circle-circle collisions |
| Rest threshold | `--galton-rest-threshold` | `5` | Velocity magnitude (px/s) below which rest counter increments |
| Rest frames | `--galton-rest-frames` | `10` | Consecutive sub-threshold frames before settling |
| Physics sub-steps | `--galton-substeps` | `3` | Sub-steps per animation frame for stability |
| Collision iterations | `--galton-collision-iters` | `2` | Collision resolution passes per sub-step |
| Sweep threshold | `--galton-sweep-threshold` | `100` | Settled particle count that triggers the rope sweep |
| Rope lift speed | `--galton-rope-lift-speed` | `300` | Speed at which the rope's center rises during sweep (px/s) |
| Rope deploy time | `--galton-rope-deploy-time` | `0.4` | Time for the rope to extend across the screen (seconds) |

## Double Pendulum

Subtle interactive double pendulum near the top of the page. Starts with a calm random swing, runs continuously. Users can grab a bob to reposition and throw it.

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Arm color | `--dp-arm-color` | `#3a3020` | Stroke color for pendulum arms |
| Arm width | `--dp-arm-width` | `1.5` | Stroke width for arms (px) |
| Bob radius | `--dp-bob-radius` | `4` | Radius of each bob circle (px) |
| Bob color | `--dp-bob-color` | `#3a3020` | Fill color for bobs |
| Bob opacity | `--dp-bob-opacity` | `0.7` | Alpha for bob fill |
| Pivot radius | `--dp-pivot-radius` | `2` | Radius of the pivot anchor dot (px) |
| Arm 1 length | `--dp-length1` | `34` | Length of the first arm (px) |
| Arm 2 length | `--dp-length2` | `35` | Length of the second arm (px) |
| Mass 1 | `--dp-mass1` | `1` | Relative mass of bob 1 |
| Mass 2 | `--dp-mass2` | `1` | Relative mass of bob 2 |
| Gravity | `--dp-gravity` | `400` | Gravitational acceleration (px/s²) |
| Damping | `--dp-damping` | `0.3` | Angular velocity damping (1/s); light so pendulum swings for minutes |
| Trail length | `--dp-trail-length` | `90` | Number of trail points stored for bob 2 |
| Trail opacity | `--dp-trail-opacity` | `0.12` | Max opacity of the trail line |

## Lights Out Puzzle

Interactive Lights Out game embedded in the content card. An organic ~5×5 grid where clicking a cell toggles it and its 4-connected neighbors. Goal: turn all lights off. Includes a "?" overlay with history, math (GF(2) linear algebra), and generalized versions (3D graph, mod-K).

### Grid & Cells

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Cell size | `--lo-cell-size` | `44` | Base cell size in px |
| Cell gap | `--lo-cell-gap` | `5` | Gap between cells (px) |
| Cell radius | `--lo-cell-radius` | `12px` | Border radius for blobby feel |
| Color on | `--lo-color-on` | `#c47a2a` | Warm orange for lit cells |
| Color off | `--lo-color-off` | `#2e2a22` | Dark brown for unlit cells |
| On glow | `--lo-color-on-glow` | `rgba(196, 122, 42, 0.35)` | Glow halo around lit cells |
| Border color | `--lo-border-color` | `#3a3020` | Cell border stroke (site dark brown) |
| Toggle duration | `--lo-toggle-duration` | `0.12` | Color lerp animation (seconds) |

### Controls

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Controls opacity | `--lo-controls-opacity` | `0.3` | Resting opacity (matches toy controls) |
| Controls hover opacity | `--lo-controls-hover-opacity` | `0.7` | Hover/focus opacity |

### Confetti

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Confetti count | `--lo-confetti-count` | `60` | Number of confetti particles on win |
| Confetti gravity | `--lo-confetti-gravity` | `400` | Gravity in px/s² |
| Confetti spread | `--lo-confetti-spread` | `300` | Initial burst radius (px) |

### Overlay

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Overlay bg | `--lo-overlay-bg` | `#adb99f` | Slightly darker than site bg-light for contrast against page |
| Overlay max width | `--lo-overlay-max-width` | `760px` | Max width of overlay panel |

### 3D Graph (overlay)

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Node radius | `--lo-3d-node-radius` | `6` | Circle radius for graph nodes (px) |
| Edge color | `--lo-3d-edge-color` | `#5a5040` | Line color for edges |
| Node on | `--lo-3d-node-on` | `#c47a2a` | Lit node color (warm orange) |
| Node off | `--lo-3d-node-off` | `#3a3020` | Unlit node color (dark brown) |
| Rotate speed | `--lo-3d-rotate-speed` | `0.008` | Radians per pixel of drag |

### Mod-K (overlay)

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Mod-K colors | `--lo-modk-colors` | `#2e2a22, #7a5a30, #c47a2a, #e8b85a, #f0d88a` | Color ramp for states 0..K-1 |

## Peg Solitaire (English Board)

Classic cross-shaped board from Louis XIV's court (1697). Jump pegs over each other to remove them — goal is one peg remaining, ideally back in the center. Deep connections to group theory (position class parity proves only 5 possible final positions) and Conway's pagoda function (golden ratio impossibility proof).

### Board & Cells

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Cell size | `--peg-cell-size` | `30` | Grid cell size in px (7×7 cross = ~250px wide) |
| Hole color | `--peg-hole-color` | `#3a3020` | Subtle dot for empty valid cells |
| Hole opacity | `--peg-hole-opacity` | `0.15` | Very faint hole indicators |

### Pegs

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Peg color | `--peg-color` | `#3a3020` | Dark brown peg fill |
| Peg radius | `--peg-radius` | `10` | Radius of peg circles (px) |
| Selected color | `--peg-selected-color` | `#c47a2a` | Warm orange highlight on selected peg |
| Selected glow | `--peg-selected-glow` | `rgba(196, 122, 42, 0.3)` | Glow behind selected peg |

### Valid Moves

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Target color | `--peg-target-color` | `#c47a2a` | Dashed ring on valid jump destinations |
| Target opacity | `--peg-target-opacity` | `0.3` | Subtle highlight for reachable cells |

### Controls

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Controls opacity | `--peg-controls-opacity` | `0.3` | Resting opacity (matches toy controls) |
| Controls hover opacity | `--peg-controls-hover-opacity` | `0.7` | Hover/focus opacity |
| Border color | `--peg-border-color` | `#3a3020` | Button border color |

### Overlay

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Overlay background | `--peg-overlay-bg` | `#adb99f` | Same as other puzzle overlays |
| Overlay max width | `--peg-overlay-max-width` | `760px` | Same as other puzzle overlays |

## Back From The Klondike (Jump Maze)

Sam Loyd's 1898 puzzle designed specifically to defeat Euler's method for solving mazes. A diamond-shaped grid of numbered cells — start at the heart in the center, jump N steps in one of 8 directions (where N is the current cell's number), and escape by landing exactly on a border cell.

### Grid & Cells

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Cell size | `--bfk-cell-size` | `22` | Grid cell size in px |
| Cell radius | `--bfk-cell-radius` | `4px` | Border radius for cell squares |
| Cell color | `--bfk-cell-color` | `#2e2a22` | Default cell fill (matches Lights Out off) |
| Number color | `--bfk-number-color` | `#f0e8d8` | Number text on cells |
| Border cell color | `--bfk-border-cell-color` | `#6a6058` | Deep stone fill for exit/border cells |
| Border cell opacity | `--bfk-border-cell-opacity` | `0.45` | Visible stone ring around diamond |

### Player & Path

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Current color | `--bfk-current-color` | `#c47a2a` | Warm orange highlight on current cell |
| Visited color | `--bfk-visited-color` | `#484840` | Cool grey-olive tint on visited cells (distinct from warm orange targets) |
| Path color | `--bfk-path-color` | `#c47a2a` | Line connecting visited cells |
| Path opacity | `--bfk-path-opacity` | `0.4` | Path line transparency |
| Path width | `--bfk-path-width` | `1.5` | Path line stroke width (px) |

### Valid Moves & Heart

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Target color | `--bfk-target-color` | `#c47a2a` | Dashed ring on valid move targets |
| Target opacity | `--bfk-target-opacity` | `0.3` | Subtle highlight for reachable cells |
| Heart color | `--bfk-heart-color` | `#c47a2a` | Heart symbol at start position |

### Controls

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Controls opacity | `--bfk-controls-opacity` | `0.3` | Resting opacity (matches toy controls) |
| Controls hover opacity | `--bfk-controls-hover-opacity` | `0.7` | Hover/focus opacity |
| Border color | `--bfk-border-color` | `#3a3020` | Button border color |

### Overlay

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Overlay background | `--bfk-overlay-bg` | `#adb99f` | Same as Lights Out overlay |
| Overlay max width | `--bfk-overlay-max-width` | `760px` | Same as Lights Out overlay |

## Loading Screen

Full-screen leaf-based loading overlay. Dark-brown leaves orbit in a tight circle at screen center while the site loads. When everything is ready, they spiral outward — each leaf erasing a soft trail through the gradient overlay, revealing the site beneath in organic streaks.

| Token | CSS Variable | Value | Notes |
|---|---|---|---|
| Z-index | `--ls-z-index` | `9998` | Below grain overlay (9999), above all content |
| Leaf count | `--ls-leaf-count` | `14` | Number of orbiting leaf particles |
| Leaf color | `--ls-leaf-color` | `var(--vf-arrow-color)` | Same dark brown as vector field arrows (#3a3020) |
| Leaf opacity | `--ls-leaf-opacity` | `0.6` | Alpha for leaf shapes |
| Orbit radius | `--ls-orbit-radius` | `30` | Radius of the circular spinner orbit (px) |
| Orbit speed | `--ls-orbit-speed` | `3.0` | Angular speed in rad/s (~0.5 revolutions/sec) |
| Fan-out acceleration | `--ls-fanout-accel` | `400` | Outward acceleration during spiral reveal (px/s²) |
| Eraser base size | `--ls-eraser-base` | `20` | Starting eraser brush radius (px) |
| Eraser growth | `--ls-eraser-growth` | `40` | Additional eraser radius per 100px of radial distance (px) |
| Eraser softness | `--ls-eraser-softness` | `0.5` | Inner gradient stop for feathered edge (0 = hard, 1 = very soft) |
| Ready timeout | `--ls-ready-timeout` | `5000` | Max ms to wait for components before forcing fan-out |
| Min spin time | `--ls-min-spin-time` | `800` | Minimum orbit time before fan-out can trigger (ms) |
