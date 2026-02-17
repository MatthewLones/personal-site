# Vector Field & Ball Simulation — Technical Reference

Complete implementation reference for the interactive vector field in the right margin of the site. Covers the math, physics, rendering architecture, and coordinate systems.

---

## Architecture

The system is split into two files following the project's pattern of separating pure math from rendering:

| File | Role |
|---|---|
| `src/lib/vector-field.ts` | Pure math and physics — no DOM, no canvas, no side effects |
| `src/components/interactive/VectorField.astro` | Rendering, DOM events, animation loop, canvas management |

All visual constants live in `src/styles/tokens.css` as CSS custom properties. The renderer reads them at startup via `getComputedStyle`. See `DESIGN_TOKENS.md` for the full token table.

---

## Blob Shape Generation

The vector field doesn't fill a circle — it fills an organic blob shape that's procedurally generated on every page load. This makes each visit feel slightly different.

### How It Works

The blob boundary is defined in polar coordinates as a perturbed circle:

```
r(θ) = baseRadius × (1 + Σᵢ aᵢ sin(fᵢ θ + φᵢ))
```

Where for each harmonic `i`:
- `fᵢ` = frequency (integers 2 through 7)
- `aᵢ` = amplitude, randomized per load
- `φᵢ` = phase offset, randomized per load

**Why these frequencies?** Frequency 2 gives the blob two broad bumps (an ellipse-like deformation). Frequency 3 gives three bumps. Higher frequencies add finer detail. Frequencies below 2 would shift the center or create a simple ellipse, which isn't interesting.

**Amplitude scaling:** Higher frequencies get smaller amplitudes (`0.03 + random × 0.12/√freq`). This prevents the boundary from becoming jagged — low-frequency bumps dominate the silhouette, and high-frequency bumps add subtle texture.

### Point-in-Blob Test

To check if a point is inside the blob:
1. Compute the angle `θ = atan2(dy, dx)` from the blob center to the point
2. Evaluate `r(θ)` using the harmonic formula
3. Compare the point's distance from center against `r(θ)`

This is O(numHarmonics) per test — fast because there are only 6 harmonics.

### Precomputed Boundary

120 boundary points are precomputed at generation time by sampling `r(θ)` at equal angular intervals. These are stored in `BlobShape.pathPoints` and could be used for visual rendering of the blob outline (currently unused, but available).

---

## Vector Field Grid

### Cell Generation

A rectangular grid of points is generated over the blob's bounding box (1.2× the base radius to account for bulges). Each point is tested against the blob boundary — points inside become field cells, points outside are discarded.

Each cell stores:

| Property | Type | Purpose |
|---|---|---|
| `pos` | Vec2 | Fixed grid position (never moves) |
| `angle` | number | Current visual angle of the arrow |
| `targetAngle` | number | Where the arrow wants to be (set by interactions) |
| `restAngle` | number | The initial angle — where it springs back to |
| `angularVelocity` | number | Current rotational speed (rad/s) |

With default spacing of 12px and radius of 250px, this produces roughly 1,300–1,500 cells depending on the blob shape.

### Initial Angle Functions

On page load, one of four field patterns is randomly selected:

**Vortex** — arrows rotate tangentially around the center:
```
angle = atan2(dy, dx) + π/2
```

**Gradient** — gentle horizontal flow with sinusoidal undulation:
```
angle = sin(dy × 0.03) × 0.4
```

**Spiral** — blend of tangential (70%) and radial (30%):
```
angle = normalize(tangential × 0.7 + radial × 0.3)
```

**Dipole** — two poles separated by 120px vertically, field lines curve between them:
```
angle = normalize(atan2_to_pole1 - atan2_to_pole2)
```

---

## Spring-Damper Physics

Every arrow is an independent angular spring-damper. This is the core of the "feel" — arrows resist being pushed, overshoot slightly, and settle smoothly.

### The Equation

```
acceleration = k × angleDiff(current, target) - d × angularVelocity
```

Where:
- `k` = spring stiffness (default 200) — higher = snappier response
- `d` = damping coefficient (default 22) — higher = less wobble
- `angleDiff` = shortest signed angular difference in [-π, π]

### Integration

Semi-implicit Euler (velocity updated before position):
```
velocity += acceleration × dt
angle += velocity × dt
```

`dt` is capped at 0.05s (20 FPS minimum) to prevent instability from large timesteps.

### Settle Detection

When both `|angleDiff| < 0.001` and `|velocity| < 0.001`, the cell snaps to its target and stops. This prevents indefinite animation of nearly-still arrows and allows the render loop to sleep when nothing is moving.

### Angle Normalization

All angles are normalized to [-π, π] after every update. The `angleDiff` function computes the shortest path between two angles, so springs always take the short way around (never wind up 350° to reach a target 10° away).

---

## Interaction Modes

### Push (default)

The most physical mode. The mouse acts like a finger pushing actual physical arrows.

**Contact detection:** For each arrow, project the mouse position onto the arrow's line segment. If the perpendicular distance is within `contactRadius` (4px) and the parallel projection is within the arrow's half-length (+2px margin for the arrowhead), the mouse is "touching" the arrow.

**Torque calculation:**
```
torque = (offset × velocity_hat) / halfLen × pushStrength
```

This is a 2D cross product: `ox × vy - oy × vx`. It naturally produces:
- Positive torque when the mouse sweeps counterclockwise relative to the arrow
- Stronger torque at the arrow tips (larger lever arm)
- Zero torque when pushing along the arrow's axis

The torque is added directly to the cell's `targetAngle`, and the spring-damper drives the visual angle toward it.

**Interpolation:** Because `pointermove` events arrive at screen refresh rate (~60Hz), fast mouse movement can skip over arrows. The renderer interpolates along the mouse path in 8px steps, sampling each position against all cells.

### Flow (Combing)

Arrows within the influence radius point in the direction of mouse movement:
```
targetAngle = atan2(cursorDelta.y, cursorDelta.x)
```

The influence falls off quadratically: `influence = 1 - (dist/radius)²`. Arrows at the edge of the radius are barely affected; arrows at the center fully align.

### Radial

Arrows point toward the cursor position:
```
targetAngle = atan2(cursor.y - cell.y, cursor.x - cell.x)
```

Same quadratic falloff as flow mode. This creates a "magnet" or "black hole" visual where arrows converge on the cursor.

### Trace

No arrow interaction. Instead, clicking places a trace ball that follows the field. See the Ball Simulation section below.

---

## Ball Simulation

### Placement

Clicking in trace mode creates a ball at the click position. The click coordinates are converted from client (viewport-relative) to field-local, then to page coordinates. Multiple balls can coexist — each click adds a new one.

### Two Zones

The ball exists in one of two physics zones:

**Inside the blob (field zone):** The ball follows the vector field. At each timestep:
1. Sample the field angle at the ball's position using inverse-distance-weighted interpolation
2. Compute a target velocity: `(cos(angle) × ballSpeed, sin(angle) × ballSpeed)`
3. Exponentially blend the ball's current velocity toward the target

The blend uses `absorb = 1 - e^(-5 × dt)`, which means:
- ~8% blend per frame at 60fps — smooth absorption
- A ball entering at high speed (e.g., falling from above) decelerates gradually, not instantly
- The field acts like a viscous medium, absorbing momentum before redirecting the ball

**Outside the blob (free-fall zone):** Pure gravity:
```
vel.y += gravity × dt
```

No terminal velocity cap. The ball accelerates freely — at 500 px/s², it reaches ~300 px/s in the first 0.6 seconds of falling and keeps accelerating until it leaves the page.

### Field Angle Sampling

The ball needs the field angle at an arbitrary position, but the field is defined only at discrete grid points. The solution is inverse-distance-weighted averaging in Cartesian (cos/sin) space:

```
For each cell within searchRadius:
    weight = 1 / distance  (or 100 if distance < 1)
    sumCos += cos(cell.angle) × weight
    sumSin += sin(cell.angle) × weight

result = atan2(sumSin / totalWeight, sumCos / totalWeight)
```

**Why cos/sin averaging?** Averaging angles directly fails at wrapping boundaries (averaging 350° and 10° gives 180°, not 0°). By averaging the unit vectors (cos, sin) and then taking atan2, the result is the correct circular mean.

The search radius is `gridSpacing × 2` (24px), ensuring at least 4–8 cells contribute to each sample.

### Trail

Each ball maintains a trail — an array of recent positions in page coordinates.

**Minimum distance threshold:** New trail points are only recorded when the ball has moved at least 2px (`dx² + dy² > 4`) from the last point. This prevents dot-like artifacts when the ball moves slowly through the field.

**Maximum length:** Configurable via `--vf-ball-trail` (default 8 points). Older points are shifted off the front of the array as new ones are added.

**Rendering:** The trail is drawn as a polyline with per-segment alpha fading. The oldest segment is nearly transparent (alpha → 0), and the newest is at alpha 0.5. Line width also grows from thin (40% of ball radius) to full (ball radius). `lineCap: 'butt'` prevents round-cap artifacts at segment endpoints that would look like dots.

### Multi-Ball System

The renderer maintains two parallel arrays:
- `balls: TraceBall[]` — physics state
- `ballShades: [number, number, number][]` — per-ball RGB color

Each ball gets a random shade on creation: the base color (`--vf-ball-color`, default `#3a3020` = RGB 58, 48, 32) with ±15 random offset per channel. This gives each ball a slightly different brown tone.

When dead balls are pruned (position past the bottom of the page), both arrays are filtered in sync.

### Deactivation

A ball is marked `active = false` when its Y position exceeds the document's scroll height (the overlay canvas height). Dead balls are pruned from the arrays on the next frame.

---

## Rendering Architecture

### Two Canvases

**Field canvas** (`<canvas>` in the component template):
- Renders only the arrows
- Lives inside the `.vector-field-container` in the right margin column
- Sized to `containerWidth × (fieldRadius × 2 + 60)`
- Uses a single batched `beginPath()` for all arrows (efficient — one draw call for ~1,400 arrows)

**Ball overlay canvas** (created dynamically, appended to `document.body`):
- Renders balls and their trails
- `position: absolute; top: 0; left: 0` — scrolls with the document
- Sized to `document.scrollWidth × document.scrollHeight`
- `pointer-events: none; z-index: 3`

**Why a separate overlay?** Balls need to fall below the field canvas — they drop through the entire page under gravity. A viewport-sized canvas in the field's container would clip them at the container boundary.

**Why `position: absolute` instead of `position: fixed`?** A `fixed` canvas stays in the viewport while the page scrolls, requiring JavaScript to convert page coordinates to viewport coordinates every frame. But the browser's compositor scrolls the page independently of JavaScript — this creates a 1-frame lag where the ball appears to "jump" on scroll. An `absolute` canvas scrolls natively with the document, so ball positions drawn in page coordinates stay correct without any JS coordinate conversion.

### DPR Handling

Both canvases use device pixel ratio scaling:
```
canvas.width = logicalWidth × dpr
canvas.height = logicalHeight × dpr
canvas.style.width = logicalWidth + 'px'
canvas.style.height = logicalHeight + 'px'
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
```

This makes all drawing operations work in CSS pixels while the backing store uses physical pixels for crisp rendering on Retina/HiDPI displays.

### Viewport Culling

Trail segments where both endpoints are more than 20px outside the viewport (above or below) are skipped entirely. This avoids wasting draw calls on trails that aren't visible, which matters when many balls are off-screen.

---

## Coordinate Systems

Three coordinate spaces are used:

| Space | Origin | Used For |
|---|---|---|
| **Field-local** | Top-left of the field canvas | Arrow positions, blob shape, field sampling |
| **Page** | Top-left of the document | Ball positions, trail points, overlay canvas drawing |
| **Client/Viewport** | Top-left of the viewport | Pointer events, custom cursor positioning |

### Conversions

**Client → Field-local:**
```
fieldX = clientX - canvas.getBoundingClientRect().left
fieldY = clientY - canvas.getBoundingClientRect().top
```

**Field-local → Page (fieldOffset):**
```
pageX = fieldX + canvas.rect.left + window.scrollX
pageY = fieldY + canvas.rect.top + window.scrollY
```

**Page → Field-local:**
```
fieldX = pageX - fieldOffset.x
fieldY = pageY - fieldOffset.y
```

The `getFieldOffset()` method computes the field-to-page offset on demand. It's called every frame rather than cached because the canvas position can change with scroll or layout shifts.

---

## Animation Loop

The render loop uses `requestAnimationFrame` with a manual scheduling pattern:

1. `scheduleRender()` sets a flag and calls `requestAnimationFrame`
2. The callback clears the flag, computes `dt`, and runs one full frame:
   - Step all arrow spring-damper physics
   - Step all ball physics (field following + gravity)
   - Prune dead balls
   - Render arrows on the field canvas
   - Render balls on the overlay canvas
3. If anything is still moving (arrows or balls), schedule the next frame
4. If everything has settled, set `isAnimating = false` and stop

This means the loop is **dormant when nothing is happening** — no CPU usage when the user isn't interacting and all springs have settled. The loop wakes up when:
- A pointer event triggers a cell target change
- A ball is placed (trace mode click)
- Balls are still falling

---

## Custom Cursor

In trace mode, the native cursor is hidden (`cursor: none` on the canvas) and replaced with a custom crosshair element — a thin + shape (four arms with a gap in the center) rendered as an inline SVG.

The cursor element is `position: fixed` and tracks the mouse via `style.left`/`style.top` updates on `pointermove`.

On click, a CSS animation plays: the crosshair drops down 3px and shrinks to 80%, bounces up 1px and grows to 106%, then returns to normal — giving tactile "I just released something" feedback. The animation is 200ms with `ease-out` timing.

---

## Design Tokens

All visual parameters are read from CSS custom properties at startup. See `DESIGN_TOKENS.md` for the complete reference table. Key tokens:

| Token | Default | Controls |
|---|---|---|
| `--vf-grid-spacing` | 12 | Arrow density |
| `--vf-field-radius` | 250 | Blob size |
| `--vf-spring-k` | 200 | Arrow snappiness |
| `--vf-damping` | 22 | Arrow wobble |
| `--vf-ball-speed` | 120 | Field-following speed (px/s) |
| `--vf-ball-gravity` | 500 | Free-fall acceleration (px/s²) |
| `--vf-ball-trail` | 8 | Trail point count |
| `--vf-ball-color` | #3a3020 | Base ball color (shades randomized ±15/channel) |
