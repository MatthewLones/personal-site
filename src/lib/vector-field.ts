// ─── Types ──────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface VectorFieldCell {
  pos: Vec2;
  angle: number;
  targetAngle: number;
  restAngle: number;
  angularVelocity: number;
}

export interface VectorFieldConfig {
  gridSpacing: number;
  radius: number;
  center: Vec2;
}

export type InteractionMode = 'push' | 'combing' | 'radial' | 'trace';

// ─── Blob Shape ─────────────────────────────────────────────────

/** A harmonic that perturbs the base radius at a given frequency. */
interface BlobHarmonic {
  frequency: number;
  amplitude: number;
  phase: number;
}

export interface BlobShape {
  center: Vec2;
  baseRadius: number;
  harmonics: BlobHarmonic[];
  /** Precomputed boundary points for rendering the clip path. */
  pathPoints: Vec2[];
}

/**
 * Generate a procedural organic blob shape.
 * Uses superimposed sinusoidal harmonics in polar coordinates:
 *   r(theta) = baseRadius * (1 + sum(amplitude * sin(frequency * theta + phase)))
 *
 * Low frequencies give broad bumps, higher frequencies add smaller details.
 * Each reload produces a different shape.
 */
export function generateBlobShape(
  center: Vec2,
  baseRadius: number,
  numHarmonics = 6,
  pathResolution = 120,
): BlobShape {
  const harmonics: BlobHarmonic[] = [];

  for (let i = 0; i < numHarmonics; i++) {
    const freq = i + 2; // frequencies 2, 3, 4, 5, 6, 7
    // Amplitude decreases with frequency for smooth organic shapes
    const maxAmp = 0.12 / Math.sqrt(freq);
    const amplitude = 0.03 + Math.random() * maxAmp;
    const phase = Math.random() * Math.PI * 2;
    harmonics.push({ frequency: freq, amplitude, phase });
  }

  // Precompute boundary path points
  const pathPoints: Vec2[] = [];
  for (let i = 0; i < pathResolution; i++) {
    const theta = (i / pathResolution) * Math.PI * 2;
    const r = blobRadiusAt(baseRadius, harmonics, theta);
    pathPoints.push({
      x: center.x + Math.cos(theta) * r,
      y: center.y + Math.sin(theta) * r,
    });
  }

  return { center, baseRadius, harmonics, pathPoints };
}

/** Evaluate the blob radius at a given angle. */
function blobRadiusAt(
  baseRadius: number,
  harmonics: BlobHarmonic[],
  theta: number,
): number {
  let perturbation = 0;
  for (let i = 0; i < harmonics.length; i++) {
    const h = harmonics[i];
    perturbation += h.amplitude * Math.sin(h.frequency * theta + h.phase);
  }
  return baseRadius * (1 + perturbation);
}

/** Check if a point is inside the blob boundary. */
export function isInsideBlob(pos: Vec2, blob: BlobShape): boolean {
  const dx = pos.x - blob.center.x;
  const dy = pos.y - blob.center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const theta = Math.atan2(dy, dx);
  const r = blobRadiusAt(blob.baseRadius, blob.harmonics, theta);
  return dist <= r;
}

// ─── Angle Utilities ────────────────────────────────────────────

/** Normalize angle to [-PI, PI]. */
export function normalizeAngle(a: number): number {
  a = a % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Shortest angular difference from `from` to `to`, in [-PI, PI]. */
export function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

// ─── Grid Generation ────────────────────────────────────────────

/**
 * Generate a grid of cells inside a blob shape.
 * Points on a rectangular grid are culled to those within the blob boundary.
 */
export function generateField(
  config: VectorFieldConfig,
  blob: BlobShape,
  initialAngleFn: (pos: Vec2, center: Vec2) => number,
): VectorFieldCell[] {
  const { gridSpacing, radius, center } = config;
  const cells: VectorFieldCell[] = [];

  // Scan over the bounding box (baseRadius is the max extent)
  const extent = radius * 1.2; // a little extra for blob bulges
  for (let x = center.x - extent; x <= center.x + extent; x += gridSpacing) {
    for (let y = center.y - extent; y <= center.y + extent; y += gridSpacing) {
      const pos = { x, y };
      if (isInsideBlob(pos, blob)) {
        const angle = initialAngleFn(pos, center);
        cells.push({
          pos,
          angle,
          targetAngle: angle,
          restAngle: angle,
          angularVelocity: 0,
        });
      }
    }
  }

  return cells;
}

// ─── Initial Angle Functions ────────────────────────────────────

/** Vortex: vectors rotate around the center. */
export function vortexField(pos: Vec2, center: Vec2): number {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  return Math.atan2(dy, dx) + Math.PI / 2;
}

/** Uniform flow with a gentle sinusoidal wave. */
export function gradientField(pos: Vec2, center: Vec2): number {
  const dy = pos.y - center.y;
  return Math.sin(dy * 0.03) * 0.4;
}

/** Spiral: vortex blended with outward radial. */
export function spiralField(pos: Vec2, center: Vec2): number {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  const radial = Math.atan2(dy, dx);
  const tangential = radial + Math.PI / 2;
  return normalizeAngle(tangential * 0.7 + radial * 0.3);
}

/** Dipole: two poles with field lines curving between them. */
export function dipoleField(pos: Vec2, center: Vec2): number {
  const offset = 60;
  const dx1 = pos.x - center.x;
  const dy1 = pos.y - (center.y - offset);
  const dx2 = pos.x - center.x;
  const dy2 = pos.y - (center.y + offset);

  const a1 = Math.atan2(dy1, dx1);
  const a2 = Math.atan2(dy2, dx2);
  return normalizeAngle(a1 - a2);
}

/** Pick a random initial field function. */
export function randomInitialField(): (pos: Vec2, center: Vec2) => number {
  const fns = [vortexField, gradientField, spiralField, dipoleField];
  return fns[Math.floor(Math.random() * fns.length)];
}

// ─── Interaction ────────────────────────────────────────────────

/**
 * Compute the target angle for a cell based on mouse interaction.
 * Returns null if the cell is outside the influence radius.
 */
export function computeInteractionTarget(
  cell: VectorFieldCell,
  cursorPos: Vec2,
  cursorDelta: Vec2,
  mode: InteractionMode,
  influenceRadius: number,
): { angle: number; influence: number } | null {
  const dx = cell.pos.x - cursorPos.x;
  const dy = cell.pos.y - cursorPos.y;
  const dist2 = dx * dx + dy * dy;
  const r2 = influenceRadius * influenceRadius;

  if (dist2 > r2) return null;

  const dist = Math.sqrt(dist2);
  const t = dist / influenceRadius;
  const influence = (1 - t * t);

  let targetAngle: number;
  if (mode === 'combing') {
    targetAngle = Math.atan2(cursorDelta.y, cursorDelta.x);
  } else {
    targetAngle = Math.atan2(cursorPos.y - cell.pos.y, cursorPos.x - cell.pos.x);
  }

  return { angle: targetAngle, influence };
}

// ─── Push Interaction ────────────────────────────────────────────

/**
 * Compute angular delta for "push" mode — physical torque from mouse contact.
 * The mouse must be within contactRadius of the arrow's line segment.
 * Torque = (offset × velocity_hat) / halfLen * pushStrength.
 * Returns the angular delta to add to targetAngle, or null if no contact.
 */
export function computePushTarget(
  cell: VectorFieldCell,
  cursorPos: Vec2,
  cursorDelta: Vec2,
  arrowHalfLen: number,
  contactRadius: number,
  pushStrength: number,
): number | null {
  // Velocity magnitude — skip if mouse barely moved
  const vLen = Math.sqrt(cursorDelta.x * cursorDelta.x + cursorDelta.y * cursorDelta.y);
  if (vLen < 0.5) return null;

  // Offset from cell center to mouse
  const ox = cursorPos.x - cell.pos.x;
  const oy = cursorPos.y - cell.pos.y;

  // Arrow direction from current visual angle
  const cos = Math.cos(cell.angle);
  const sin = Math.sin(cell.angle);

  // Project offset onto arrow axis
  const parallel = ox * cos + oy * sin;       // along-arrow component
  const perp = ox * sin - oy * cos;           // perpendicular distance (signed)

  // Contact check: mouse must be near the line segment
  const margin = 2; // small extra reach for arrowhead
  if (Math.abs(parallel) > arrowHalfLen + margin) return null;
  if (Math.abs(perp) > contactRadius) return null;

  // Normalized velocity direction
  const vx = cursorDelta.x / vLen;
  const vy = cursorDelta.y / vLen;

  // 2D torque: offset × velocity_hat
  const torque = ox * vy - oy * vx;

  return (torque / arrowHalfLen) * pushStrength;
}

// ─── Trace Ball ─────────────────────────────────────────────────

export interface TraceBall {
  pos: Vec2;
  vel: Vec2;
  active: boolean;
  trail: Vec2[];
}

/**
 * Sample the field angle at an arbitrary position by inverse-distance-weighted
 * averaging of nearby cell angles. Works in cartesian (cos/sin) space to avoid
 * angle-wrapping artifacts.
 * Returns null if no cells are within searchRadius.
 */
export function sampleFieldAngle(
  cells: VectorFieldCell[],
  pos: Vec2,
  searchRadius: number,
): number | null {
  const r2 = searchRadius * searchRadius;
  let sumCos = 0;
  let sumSin = 0;
  let totalWeight = 0;

  for (let i = 0; i < cells.length; i++) {
    const dx = cells[i].pos.x - pos.x;
    const dy = cells[i].pos.y - pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;

    const dist = Math.sqrt(d2);
    const w = dist < 1 ? 100 : 1 / dist;
    sumCos += Math.cos(cells[i].angle) * w;
    sumSin += Math.sin(cells[i].angle) * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return null;
  return Math.atan2(sumSin / totalWeight, sumCos / totalWeight);
}

/**
 * Step the trace ball one frame.
 * Ball position is in page coordinates. fieldOffset converts to field-local
 * coords for blob check and field sampling.
 * Inside blob: velocity follows the interpolated field at constant ballSpeed.
 * Outside blob: gravity pulls the ball downward.
 * Mutates ball in place. Returns whether ball is inside the blob.
 */
export function stepBall(
  ball: TraceBall,
  cells: VectorFieldCell[],
  blob: BlobShape,
  fieldOffset: Vec2,
  dt: number,
  ballSpeed: number,
  gravity: number,
  searchRadius: number,
  trailMax: number,
): boolean {
  if (!ball.active) return false;

  // Convert page coords to field-local for blob check and sampling
  const fieldPos: Vec2 = {
    x: ball.pos.x - fieldOffset.x,
    y: ball.pos.y - fieldOffset.y,
  };

  const inside = isInsideBlob(fieldPos, blob);

  if (inside) {
    // Field absorbs the ball's momentum — exponential blend toward field velocity.
    // A ball entering at high speed decelerates to zero, then the field takes over.
    const angle = sampleFieldAngle(cells, fieldPos, searchRadius);
    if (angle !== null) {
      const targetVx = Math.cos(angle) * ballSpeed;
      const targetVy = Math.sin(angle) * ballSpeed;
      const absorb = 1 - Math.exp(-5 * dt);
      ball.vel.x += (targetVx - ball.vel.x) * absorb;
      ball.vel.y += (targetVy - ball.vel.y) * absorb;
    }
  } else {
    // Free-fall — no practical terminal velocity
    ball.vel.y += gravity * dt;
  }

  // Update position (page coords)
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;

  // Record trail (minimum distance between points to avoid dot artifacts)
  const last = ball.trail.length > 0 ? ball.trail[ball.trail.length - 1] : null;
  if (!last || (ball.pos.x - last.x) ** 2 + (ball.pos.y - last.y) ** 2 > 4) {
    ball.trail.push({ x: ball.pos.x, y: ball.pos.y });
    if (ball.trail.length > trailMax) {
      ball.trail.shift();
    }
  }

  return inside;
}

// ─── Physics ────────────────────────────────────────────────────

const SETTLE_THRESHOLD = 0.001;

/**
 * Spring-damper physics step for a single cell.
 * Mutates cell in place. Returns true if still animating.
 */
export function stepCellPhysics(
  cell: VectorFieldCell,
  dt: number,
  springK: number,
  damping: number,
): boolean {
  const diff = angleDiff(cell.angle, cell.targetAngle);
  const absDiff = Math.abs(diff);
  const absVel = Math.abs(cell.angularVelocity);

  if (absDiff < SETTLE_THRESHOLD && absVel < SETTLE_THRESHOLD) {
    cell.angle = cell.targetAngle;
    cell.angularVelocity = 0;
    return false;
  }

  const acceleration = springK * diff - damping * cell.angularVelocity;
  cell.angularVelocity += acceleration * dt;
  cell.angle = normalizeAngle(cell.angle + cell.angularVelocity * dt);

  return true;
}

/**
 * Step all cells. Returns true if any cell is still animating.
 */
export function stepField(
  cells: VectorFieldCell[],
  dt: number,
  springK: number,
  damping: number,
): boolean {
  let anyMoving = false;
  for (let i = 0; i < cells.length; i++) {
    if (stepCellPhysics(cells[i], dt, springK, damping)) {
      anyMoving = true;
    }
  }
  return anyMoving;
}

/**
 * Gradually blend all cell targets toward their rest angles.
 * Called when cursor leaves the field.
 */
export function restoreField(
  cells: VectorFieldCell[],
  speed: number,
): void {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const diff = angleDiff(cell.targetAngle, cell.restAngle);
    if (Math.abs(diff) > SETTLE_THRESHOLD) {
      cell.targetAngle = normalizeAngle(cell.targetAngle + diff * speed);
    } else {
      cell.targetAngle = cell.restAngle;
    }
  }
}
