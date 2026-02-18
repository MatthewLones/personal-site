// ─── Types ──────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface Peg {
  pos: Vec2;
  row: number;
}

export interface GaltonConfig {
  numRows: number;
  pegSpacingX: number;
  pegSpacingY: number;
  centerX: number;
  /** Y coordinate of the ceiling boundary (top of the board). */
  boardTopY: number;
  /** Y coordinate where particles spawn (bottom of the board). */
  spawnY: number;
  arcDuration: number;
  arcHeight: number;
  particleRadius: number;
  /** Upward gravitational acceleration (px/s²). */
  gravity: number;
  /** Exponential velocity damping coefficient (1/s). */
  damping: number;
  /** Coefficient of restitution for collisions. */
  restitution: number;
  /** Velocity magnitude below which rest detection starts (px/s). */
  restThreshold: number;
  /** Consecutive low-velocity frames before settling. */
  restFrames: number;
  /** Physics sub-steps per animation frame. */
  substeps: number;
  /** Collision resolution passes per sub-step. */
  collisionIters: number;
}

/** A waypoint the particle travels through (peg deflection points). */
export interface ParticlePath {
  /** Sequence of positions: spawn → peg deflection points. */
  waypoints: Vec2[];
  /** Which bin (0..numRows) the particle lands in. */
  binIndex: number;
}

export interface GaltonParticle {
  path: ParticlePath;
  /** Current arc segment index (0 = spawn→first peg, etc.). */
  segmentIndex: number;
  /** Progress within current arc segment [0, 1]. */
  segmentProgress: number;
  /** Current computed position. */
  pos: Vec2;
  /** Whether the particle is still active (not yet settled). */
  active: boolean;
  /** Current lifecycle phase. */
  phase: 'arc' | 'physics';
  /** Velocity X (px/s). */
  vx: number;
  /** Velocity Y (px/s). */
  vy: number;
  /** Consecutive frames with speed below rest threshold. */
  restCounter: number;
}

// ─── Peg Grid ───────────────────────────────────────────────────

/**
 * Generate pegs for an inverted triangle, anchored from the top.
 * Row 0 (bottom, near spawn) has 1 peg.
 * Row (numRows-1) (top, near bins) has numRows pegs.
 *
 * Peg Y positions are computed top-down:
 *   Row r: y = boardTopY + (numRows - r) * pegSpacingY
 */
export function generatePegs(config: GaltonConfig): Peg[] {
  const pegs: Peg[] = [];
  for (let r = 0; r < config.numRows; r++) {
    const numPegsInRow = r + 1;
    const y = config.boardTopY + (config.numRows - r) * config.pegSpacingY;
    for (let j = 0; j < numPegsInRow; j++) {
      const x = config.centerX + (j - r / 2) * config.pegSpacingX;
      pegs.push({ pos: { x, y }, row: r });
    }
  }
  return pegs;
}

// ─── Path Computation ───────────────────────────────────────────

/**
 * Compute a random path through the peg grid.
 * N random left/right choices produce Binomial(N, 0.5) distribution.
 * Returns waypoints from spawn (bottom) to the last peg (top row).
 * No final boardTopY waypoint — physics takes over at the last peg.
 */
export function computePath(config: GaltonConfig): ParticlePath {
  const waypoints: Vec2[] = [];

  // Spawn point: bottom of the board
  waypoints.push({ x: config.centerX, y: config.spawnY });

  // Track horizontal offset through peg rows
  let offset = 0;
  let rightChoices = 0;

  for (let r = 0; r < config.numRows; r++) {
    const choice = Math.random() < 0.5 ? -1 : 1;
    if (choice === 1) rightChoices++;
    offset += choice * 0.5 * config.pegSpacingX;

    const y = config.boardTopY + (config.numRows - r) * config.pegSpacingY;
    waypoints.push({ x: config.centerX + offset, y });
  }

  return { waypoints, binIndex: rightChoices };
}

// ─── Arc Interpolation ──────────────────────────────────────────

/**
 * Quadratic Bezier position between two waypoints.
 * Control point bulges upward (negative Y) for reversed-gravity feel.
 */
export function arcPosition(
  from: Vec2,
  to: Vec2,
  t: number,
  arcHeight: number,
): Vec2 {
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2 - arcHeight;
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  };
}

// ─── Arc Stepping ───────────────────────────────────────────────

/**
 * Advance a particle through its arc segments.
 * Returns 'arc' if still animating, 'done' if arc is complete.
 */
export function stepArc(
  particle: GaltonParticle,
  dt: number,
  config: GaltonConfig,
): 'arc' | 'done' {
  const numSegments = particle.path.waypoints.length - 1;
  particle.segmentProgress += dt / config.arcDuration;

  while (particle.segmentProgress >= 1 && particle.segmentIndex < numSegments - 1) {
    particle.segmentProgress -= 1;
    particle.segmentIndex++;
  }

  if (particle.segmentIndex >= numSegments - 1 && particle.segmentProgress >= 1) {
    // Arc complete — snap to final peg position
    const lastWp = particle.path.waypoints[particle.path.waypoints.length - 1];
    particle.pos.x = lastWp.x;
    particle.pos.y = lastWp.y;
    return 'done';
  }

  // Interpolate along current segment
  const from = particle.path.waypoints[particle.segmentIndex];
  const to = particle.path.waypoints[particle.segmentIndex + 1];
  const t = Math.min(1, particle.segmentProgress);
  const pos = arcPosition(from, to, t, config.arcHeight);
  particle.pos.x = pos.x;
  particle.pos.y = pos.y;

  return 'arc';
}

// ─── Exit Velocity ──────────────────────────────────────────────

/**
 * Compute the exit velocity when a particle finishes its arc.
 * Uses the Bezier tangent at t=1 of the last segment, scaled by 1/arcDuration.
 */
export function computeExitVelocity(
  particle: GaltonParticle,
  config: GaltonConfig,
): Vec2 {
  const waypoints = particle.path.waypoints;
  const n = waypoints.length;
  const from = waypoints[n - 2];
  const to = waypoints[n - 1];

  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2 - config.arcHeight;

  // Bezier tangent at t=1: 2 * (endpoint - control)
  const tangentX = 2 * (to.x - cx);
  const tangentY = 2 * (to.y - cy);

  return {
    x: tangentX / config.arcDuration,
    y: tangentY / config.arcDuration,
  };
}

// ─── Physics Stepping ───────────────────────────────────────────

/**
 * Advance a physics particle by one sub-step.
 * Applies inverted gravity (upward), damping, position integration,
 * and ceiling boundary enforcement.
 */
export function stepPhysics(
  particle: GaltonParticle,
  subDt: number,
  config: GaltonConfig,
): void {
  // Inverted gravity: accelerate upward (negative Y)
  particle.vy -= config.gravity * subDt;

  // Exponential velocity damping
  const decay = Math.exp(-config.damping * subDt);
  particle.vx *= decay;
  particle.vy *= decay;

  // Integrate position
  particle.pos.x += particle.vx * subDt;
  particle.pos.y += particle.vy * subDt;

  // Ceiling boundary: particle cannot go above particleRadius from top
  const minY = config.boardTopY + config.particleRadius;
  if (particle.pos.y < minY) {
    particle.pos.y = minY;
    if (particle.vy < 0) {
      particle.vy = -particle.vy * config.restitution;
    }
  }
}

// ─── Collision Detection ────────────────────────────────────────

/**
 * Resolve collision between active particle A and static particle B.
 * B has infinite mass and does not move.
 * Returns new position and velocity for A, or null if no collision.
 */
export function resolveCollision(
  ax: number, ay: number, avx: number, avy: number,
  bx: number, by: number,
  radius: number,
  restitution: number,
): { x: number; y: number; vx: number; vy: number } | null {
  const dx = bx - ax;
  const dy = by - ay;
  const dist2 = dx * dx + dy * dy;
  const minDist = radius * 2;

  if (dist2 >= minDist * minDist || dist2 < 0.0001) return null;

  const dist = Math.sqrt(dist2);
  const overlap = minDist - dist;

  // Normal from A toward B
  const nx = dx / dist;
  const ny = dy / dist;

  // Push A away by the full overlap
  const newX = ax - nx * overlap;
  const newY = ay - ny * overlap;

  // Velocity component along normal (positive = A moving toward B)
  const vn = avx * nx + avy * ny;

  let newVx = avx;
  let newVy = avy;

  if (vn > 0) {
    // Reflect velocity along normal
    newVx -= (1 + restitution) * vn * nx;
    newVy -= (1 + restitution) * vn * ny;
  }

  return { x: newX, y: newY, vx: newVx, vy: newVy };
}

/**
 * Resolve collision between active particle A and a moving kinematic body B.
 * B has infinite mass and moves at (bvx, bvy). Its position does not change.
 * radiusA and radiusB may differ (e.g., particle vs sweeper collider).
 * Returns new position and velocity for A, or null if no collision.
 */
export function resolveKinematicCollision(
  ax: number, ay: number, avx: number, avy: number,
  bx: number, by: number, bvx: number, bvy: number,
  radiusA: number, radiusB: number,
  restitution: number,
): { x: number; y: number; vx: number; vy: number } | null {
  const dx = bx - ax;
  const dy = by - ay;
  const dist2 = dx * dx + dy * dy;
  const minDist = radiusA + radiusB;

  if (dist2 >= minDist * minDist || dist2 < 0.0001) return null;

  const dist = Math.sqrt(dist2);
  const overlap = minDist - dist;

  const nx = dx / dist;
  const ny = dy / dist;

  // Push A away by the full overlap
  const newX = ax - nx * overlap;
  const newY = ay - ny * overlap;

  // Relative velocity of A w.r.t. B
  const relVn = (avx - bvx) * nx + (avy - bvy) * ny;

  let newVx = avx;
  let newVy = avy;

  if (relVn > 0) {
    newVx -= (1 + restitution) * relVn * nx;
    newVy -= (1 + restitution) * relVn * ny;
  }

  return { x: newX, y: newY, vx: newVx, vy: newVy };
}

// ─── Rest Detection ─────────────────────────────────────────────

/**
 * Check if a particle's speed is below the rest threshold.
 */
export function isAtRest(particle: GaltonParticle, threshold: number): boolean {
  return (particle.vx * particle.vx + particle.vy * particle.vy) < threshold * threshold;
}
