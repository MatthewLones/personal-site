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
export function blobRadiusAt(
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

/** Saddle: hyperbolic flow outward on x-axis, inward on y-axis. */
export function saddleField(pos: Vec2, center: Vec2): number {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  return Math.atan2(-dy, dx);
}

/** Source: radial outward flow from center. */
export function sourceField(pos: Vec2, center: Vec2): number {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  return Math.atan2(dy, dx);
}

/** Sink: radial inward flow toward center. */
export function sinkField(pos: Vec2, center: Vec2): number {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  return Math.atan2(-dy, -dx);
}

/** Shear: horizontal flow whose angle depends on vertical position. */
export function shearField(pos: Vec2, center: Vec2): number {
  const dy = pos.y - center.y;
  return Math.tanh(dy * 0.02) * 0.5;
}

/** Double Vortex: two counter-rotating vortices side by side. */
export function doubleVortexField(pos: Vec2, center: Vec2): number {
  const offset = 50;
  const dx1 = pos.x - (center.x - offset);
  const dy1 = pos.y - center.y;
  const dx2 = pos.x - (center.x + offset);
  const dy2 = pos.y - center.y;
  const a1 = Math.atan2(dy1, dx1) + Math.PI / 2;
  const a2 = -(Math.atan2(dy2, dx2) + Math.PI / 2);
  const r1sq = dx1 * dx1 + dy1 * dy1;
  const r2sq = dx2 * dx2 + dy2 * dy2;
  const w1 = 1 / (r1sq + 100);
  const w2 = 1 / (r2sq + 100);
  return normalizeAngle((a1 * w1 + a2 * w2) / (w1 + w2));
}

/** Wavy: diagonal flow with sinusoidal perturbation. */
export function wavyField(pos: Vec2, center: Vec2): number {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  return Math.PI / 4 + Math.sin((dx + dy) * 0.04) * 0.6;
}

// ─── Field Presets ───────────────────────────────────────────

export interface FieldPreset {
  id: string;
  label: string;
  expression: string;
  fn: (pos: Vec2, center: Vec2) => number;
}

export const FIELD_PRESETS: FieldPreset[] = [
  { id: 'vortex',        label: 'Vortex',       expression: 'atan2(y,x) + \u03c0/2',          fn: vortexField },
  { id: 'gradient',      label: 'Gradient',     expression: 'sin(y\u00b70.03) \u00b7 0.4',    fn: gradientField },
  { id: 'spiral',        label: 'Spiral',       expression: '0.7\u00b7tan + 0.3\u00b7rad',    fn: spiralField },
  { id: 'dipole',        label: 'Dipole',       expression: 'atan2(y\u2081,x\u2081) \u2212 atan2(y\u2082,x\u2082)', fn: dipoleField },
  { id: 'saddle',        label: 'Saddle',       expression: 'atan2(\u2212y, x)',               fn: saddleField },
  { id: 'source',        label: 'Source',       expression: 'r\u0302 (outward)',               fn: sourceField },
  { id: 'sink',          label: 'Sink',         expression: '\u2212r\u0302 (inward)',          fn: sinkField },
  { id: 'shear',         label: 'Shear',        expression: 'tanh(y/50) \u00b7 0.5',          fn: shearField },
  { id: 'double-vortex', label: 'Twin Vortex',  expression: 'CCW(left) + CW(right)',           fn: doubleVortexField },
  { id: 'wavy',          label: 'Wave',         expression: '\u03c0/4 + sin((x+y)/25)\u00b70.6', fn: wavyField },
];

/** Pick a random preset. */
export function randomPreset(): FieldPreset {
  return FIELD_PRESETS[Math.floor(Math.random() * FIELD_PRESETS.length)];
}

/** Pick a random initial field function. */
export function randomInitialField(): (pos: Vec2, center: Vec2) => number {
  return randomPreset().fn;
}

// ─── Wind Transition ────────────────────────────────────────
//
// Wind enters from a random point along the top/left/bottom viewport edges,
// sweeps across the page as an organic swarm, and transitions the vector field
// arrows as it passes through. All leaf positions are in PAGE coordinates so
// they render on the full-page overlay canvas.

export interface WindTransition {
  active: boolean;
  startTime: number;
  /** Origin point (page coords) — off-screen edge. */
  origin: Vec2;
  /** General wind direction (normalized). */
  direction: Vec2;
  newAngleFn: (pos: Vec2, center: Vec2) => number;
  transitioned: Set<number>;
}

export interface LeafParticle {
  pos: Vec2;       // page coordinates
  vel: Vec2;
  angle: number;
  angularVel: number;
  life: number;
  size: number;
  variant: number;
  /** Target point near blob center this leaf converges toward (field-local coords). */
  convergencePoint: Vec2;
  /** 1 = approach, 2 = penetrate blob toward center, 3 = disperse following field. */
  phase: 1 | 2 | 3;
}

/**
 * Pick a convergence point whose radial distance adapts to the local field character.
 * Samples the field at a random angle to determine whether flow is outward, inward, or
 * tangential at that angle, then places the convergence point accordingly:
 *   outward → near center (field carries leaf outward through remaining blob)
 *   inward  → near edge   (field carries leaf inward through remaining blob)
 *   tangential → mid-range (field carries leaf along a spiral/tangent)
 */
export function randomConvergencePoint(
  blob: BlobShape,
  fieldFn: (pos: Vec2, center: Vec2) => number,
): Vec2 {
  const angle = Math.random() * Math.PI * 2;

  // Sample field at 50% radius at this angle to determine local radial character
  const sampleR = blob.baseRadius * 0.5;
  const sx = blob.center.x + Math.cos(angle) * sampleR;
  const sy = blob.center.y + Math.sin(angle) * sampleR;
  const fieldAngle = fieldFn({ x: sx, y: sy }, blob.center);

  // radialAlign: +1 = field points outward at this angle, -1 = inward, 0 = tangential
  const radialAlign = Math.cos(fieldAngle - angle);

  // Continuous mapping: outward → ~0.20, tangential → ~0.45, inward → ~0.70
  const baseFrac = 0.45 - radialAlign * 0.25;
  const jitter = (Math.random() - 0.5) * 0.20;
  const frac = Math.max(0.10, Math.min(0.85, baseFrac + jitter));
  const r = blob.baseRadius * frac;

  return {
    x: blob.center.x + Math.cos(angle) * r,
    y: blob.center.y + Math.sin(angle) * r,
  };
}

/** Pick a random spawn origin along the top, left, or bottom viewport edges. */
export function pickWindOrigin(viewW: number, viewH: number, scrollY: number): Vec2 {
  // Weighted edge selection: left (50%), top (25%), bottom (25%)
  const r = Math.random();
  if (r < 0.5) {
    // Left edge
    return { x: -30, y: scrollY + Math.random() * viewH };
  } else if (r < 0.75) {
    // Top edge
    return { x: Math.random() * viewW * 0.7, y: scrollY - 30 };
  } else {
    // Bottom edge
    return { x: Math.random() * viewW * 0.7, y: scrollY + viewH + 30 };
  }
}

/**
 * Build a spatial hash from cells for O(1) leaf→cell proximity lookup.
 * Maps grid coordinates to arrays of cell indices.
 */
export function buildCellHash(
  cells: VectorFieldCell[],
  gridSpacing: number,
): Map<string, number[]> {
  const hash = new Map<string, number[]>();
  for (let i = 0; i < cells.length; i++) {
    const gx = Math.round(cells[i].pos.x / gridSpacing);
    const gy = Math.round(cells[i].pos.y / gridSpacing);
    const key = `${gx},${gy}`;
    let bucket = hash.get(key);
    if (!bucket) { bucket = []; hash.set(key, bucket); }
    bucket.push(i);
  }
  return hash;
}

/**
 * Transition cells near in-field leaf particles. Each leaf that has entered
 * the blob checks a 3×3 neighborhood in the spatial hash and transitions
 * any nearby cells to the new field function.
 */
export function transitionCellsFromLeaves(
  leaves: LeafParticle[],
  cells: VectorFieldCell[],
  cellHash: Map<string, number[]>,
  gridSpacing: number,
  center: Vec2,
  fieldOffset: Vec2,
  newAngleFn: (pos: Vec2, center: Vec2) => number,
  transitioned: Set<number>,
): void {
  const transitionRadiusSq = gridSpacing * gridSpacing * 4; // 2× grid spacing

  for (let li = 0; li < leaves.length; li++) {
    const leaf = leaves[li];
    if (leaf.phase < 2 || leaf.life <= 0) continue;

    // Leaf position in field-local coords
    const lx = leaf.pos.x - fieldOffset.x;
    const ly = leaf.pos.y - fieldOffset.y;
    const gx = Math.round(lx / gridSpacing);
    const gy = Math.round(ly / gridSpacing);

    // Check 3×3 grid neighborhood
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = cellHash.get(`${gx + dx},${gy + dy}`);
        if (!bucket) continue;
        for (let bi = 0; bi < bucket.length; bi++) {
          const idx = bucket[bi];
          if (transitioned.has(idx)) continue;
          const cx = cells[idx].pos.x;
          const cy = cells[idx].pos.y;
          const d2 = (lx - cx) * (lx - cx) + (ly - cy) * (ly - cy);
          if (d2 < transitionRadiusSq) {
            const newAngle = newAngleFn(cells[idx].pos, center);
            cells[idx].restAngle = newAngle;
            cells[idx].targetAngle = newAngle;
            transitioned.add(idx);
          }
        }
      }
    }
  }
}

/**
 * Spawn leaf particles at the wind origin. Each leaf is assigned a convergence
 * point near blob center — during travel it steers toward that point, penetrates
 * the blob, then disperses outward following field lines.
 */
export function spawnWindLeaves(
  transition: WindTransition,
  speed: number,
  count: number,
  originSpread: number,
  blob: BlobShape,
  fieldOffset: Vec2,
): LeafParticle[] {
  const leaves: LeafParticle[] = [];
  const perpX = -transition.direction.y;
  const perpY = transition.direction.x;
  const windAngle = Math.atan2(transition.direction.y, transition.direction.x);

  for (let i = 0; i < count; i++) {
    // Spawn near the origin with some forward scatter and perpendicular spread
    const along = Math.random() * 50;
    const across = (Math.random() - 0.5) * originSpread;

    const pageX = transition.origin.x + transition.direction.x * along + perpX * across;
    const pageY = transition.origin.y + transition.direction.y * along + perpY * across;

    // Assign a convergence point adapted to the local field character at a random angle
    const convergencePoint = randomConvergencePoint(blob, transition.newAngleFn);

    // Initial velocity: toward the wind direction with slight variation
    const spd = speed * (0.8 + Math.random() * 0.4);
    const angleVar = (Math.random() - 0.5) * 0.3;
    const initAngle = windAngle + angleVar;

    leaves.push({
      pos: { x: pageX, y: pageY },
      vel: { x: Math.cos(initAngle) * spd, y: Math.sin(initAngle) * spd },
      angle: initAngle + (Math.random() - 0.5) * 0.5,
      angularVel: (Math.random() - 0.5) * 4,
      life: 1.0,
      size: 0.6 + Math.random() * 1.0,
      variant: Math.floor(Math.random() * 3),
      convergencePoint,
      phase: 1,
    });
  }
  return leaves;
}

/**
 * Spawn leaves at uniformly distributed points around the blob perimeter.
 * Each leaf starts just outside the blob boundary, heading inward on a chord
 * that maximizes interior coverage. Starts in Phase 2 (skip approach).
 */
export function spawnPerimeterLeaves(
  blob: BlobShape,
  fieldFn: (pos: Vec2, center: Vec2) => number,
  speed: number,
  count: number,
  fieldOffset: Vec2,
): LeafParticle[] {
  const leaves: LeafParticle[] = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;

    // Spawn just outside the blob boundary at this angle
    const boundaryR = blobRadiusAt(blob.baseRadius, blob.harmonics, theta);
    const spawnR = boundaryR + 5;
    const spawnX = blob.center.x + Math.cos(theta) * spawnR;
    const spawnY = blob.center.y + Math.sin(theta) * spawnR;

    // Chord target: opposite side of blob, offset from center
    const oppTheta = theta + Math.PI;
    const oppR = blobRadiusAt(blob.baseRadius, blob.harmonics, oppTheta);
    const targetFrac = 0.5 + Math.random() * 0.3;
    const targetX = blob.center.x + Math.cos(oppTheta) * oppR * targetFrac;
    const targetY = blob.center.y + Math.sin(oppTheta) * oppR * targetFrac;

    // Initial velocity: toward the chord target
    const dx = targetX - spawnX;
    const dy = targetY - spawnY;
    const spd = speed * (0.85 + Math.random() * 0.3);
    const vAngle = Math.atan2(dy, dx);

    leaves.push({
      pos: { x: spawnX + fieldOffset.x, y: spawnY + fieldOffset.y },
      vel: { x: Math.cos(vAngle) * spd, y: Math.sin(vAngle) * spd },
      angle: vAngle + (Math.random() - 0.5) * 0.5,
      angularVel: (Math.random() - 0.5) * 4,
      life: 1.0,
      size: 0.6 + Math.random() * 1.0,
      variant: Math.floor(Math.random() * 3),
      convergencePoint: { x: targetX, y: targetY },
      phase: 2,
    });
  }

  return leaves;
}

/**
 * Step all leaf particles with three-phase behavior:
 *
 * Phase 1 (approach): Leaf steers toward its convergence point near blob center,
 * blended with the general wind direction for a natural curved path.
 *
 * Phase 2 (penetrate): Once inside the blob, leaf continues toward its convergence
 * point. Wind momentum decays and center-pull increases. Cell transitions begin.
 *
 * Phase 3 (disperse): Once near the convergence point, leaf follows the field
 * direction. Life is refreshed to ensure full blob traversal.
 *
 * Mutates in place. Returns number still alive.
 */
export function stepLeaves(
  leaves: LeafParticle[],
  dt: number,
  decayRate: number,
  fieldFn: ((pos: Vec2, center: Vec2) => number) | null,
  fieldCenter: Vec2,
  fieldOffset: Vec2,
  windDir: Vec2,
  speed: number,
  blob: BlobShape,
): number {
  let alive = 0;
  const windAngle = Math.atan2(windDir.y, windDir.x);

  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    if (leaf.life <= 0) continue;

    let targetVx: number;
    let targetVy: number;
    let steerRate: number;

    const localPos: Vec2 = {
      x: leaf.pos.x - fieldOffset.x,
      y: leaf.pos.y - fieldOffset.y,
    };

    if (leaf.phase === 1) {
      // ── Phase 1: Approach — blend wind direction with convergence point ──
      const cpx = leaf.convergencePoint.x + fieldOffset.x;
      const cpy = leaf.convergencePoint.y + fieldOffset.y;
      const dx = cpx - leaf.pos.x;
      const dy = cpy - leaf.pos.y;
      const distToCP = Math.sqrt(dx * dx + dy * dy);
      const toAngle = Math.atan2(dy, dx);

      // Far from convergence: mostly wind. Near convergence: mostly direct.
      const t = Math.min(1, distToCP / 400);
      const blendedAngle = toAngle * (1 - t * 0.3) + windAngle * (t * 0.3);
      targetVx = Math.cos(blendedAngle) * speed;
      targetVy = Math.sin(blendedAngle) * speed;
      steerRate = 4;

      // Transition: entered blob boundary → Phase 2
      if (isInsideBlob(localPos, blob)) {
        leaf.phase = 2;
      }
    }

    if (leaf.phase === 2) {
      // ── Phase 2: Penetrate — blend wind with convergence-point pull ──
      const cpx = leaf.convergencePoint.x + fieldOffset.x;
      const cpy = leaf.convergencePoint.y + fieldOffset.y;
      const dx = cpx - leaf.pos.x;
      const dy = cpy - leaf.pos.y;
      const distToCP = Math.sqrt(dx * dx + dy * dy);
      const toAngle = Math.atan2(dy, dx);

      // Close to convergence: heavy center pull. Far: wind still blends in.
      const centerPull = 1 - Math.min(1, distToCP / 200);
      const blended = toAngle * (0.6 + 0.4 * centerPull) + windAngle * (0.4 - 0.4 * centerPull);
      targetVx = Math.cos(blended) * speed;
      targetVy = Math.sin(blended) * speed;
      steerRate = 5;

      // Transition: reached convergence point → Phase 3
      if (distToCP < 25) {
        leaf.phase = 3;
        leaf.life = 1.0; // refresh life for full dispersal traversal
      }
    }

    if (leaf.phase === 3) {
      // ── Phase 3: Disperse — follow actual field direction ──
      // Convergence point placement ensures the field here carries the leaf
      // through untransitioned cells (no outward bias needed).
      if (fieldFn) {
        const fieldAngle = fieldFn(localPos, fieldCenter);
        targetVx = Math.cos(fieldAngle) * speed;
        targetVy = Math.sin(fieldAngle) * speed;
      } else {
        // Fallback: continue in wind direction
        targetVx = Math.cos(windAngle) * speed;
        targetVy = Math.sin(windAngle) * speed;
      }
      steerRate = 8;
    }

    // Apply velocity steering
    const blend = 1 - Math.exp(-steerRate! * dt);
    leaf.vel.x += (targetVx! - leaf.vel.x) * blend;
    leaf.vel.y += (targetVy! - leaf.vel.y) * blend;

    // Flutter perpendicular to velocity for organic feel
    const vMag = Math.sqrt(leaf.vel.x * leaf.vel.x + leaf.vel.y * leaf.vel.y);
    if (vMag > 1) {
      const flutter = Math.sin(leaf.pos.x * 0.015 + leaf.pos.y * 0.02 + leaf.life * 10) * 20 * dt;
      leaf.vel.x += (-leaf.vel.y / vMag) * flutter;
      leaf.vel.y += (leaf.vel.x / vMag) * flutter;
    }

    leaf.pos.x += leaf.vel.x * dt;
    leaf.pos.y += leaf.vel.y * dt;
    leaf.angle += leaf.angularVel * dt;
    leaf.life -= decayRate * dt;

    // Accelerate fizzle for Phase 3 leaves stuck near blob center
    // (life < 0.85 means >1s in Phase 3 — enough time for outward leaves to exit)
    if (leaf.phase === 3 && leaf.life < 0.85) {
      const cdx = localPos.x - fieldCenter.x;
      const cdy = localPos.y - fieldCenter.y;
      const centerFrac = Math.sqrt(cdx * cdx + cdy * cdy) / blob.baseRadius;
      if (centerFrac < 0.3) {
        leaf.life -= decayRate * dt * 6 * (1 - centerFrac / 0.3);
      }
    }

    alive++;
  }
  return alive;
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
