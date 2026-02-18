// ─── Types ──────────────────────────────────────────────────────

export interface PendulumState {
  /** Angle of arm 1 from downward vertical (rad). */
  theta1: number;
  /** Angle of arm 2 from downward vertical (rad). */
  theta2: number;
  /** Angular velocity of arm 1 (rad/s). */
  omega1: number;
  /** Angular velocity of arm 2 (rad/s). */
  omega2: number;
}

export interface PendulumConfig {
  length1: number;
  length2: number;
  mass1: number;
  mass2: number;
  /** Gravitational acceleration (px/s²). */
  gravity: number;
  /** Angular velocity damping coefficient (1/s). */
  damping: number;
}

// ─── Equations of Motion ────────────────────────────────────────

/**
 * Compute angular accelerations using Lagrangian mechanics.
 * Uses absolute angles (both measured from downward vertical).
 * Solves the 2×2 linear system via Cramer's rule.
 */
export function computeAccelerations(
  state: PendulumState,
  config: PendulumConfig,
): { alpha1: number; alpha2: number } {
  const { theta1, theta2, omega1, omega2 } = state;
  const { length1: L1, length2: L2, mass1: m1, mass2: m2, gravity: g, damping } = config;

  const delta = theta1 - theta2;
  const sinD = Math.sin(delta);
  const cosD = Math.cos(delta);

  // Coefficient matrix
  const a11 = (m1 + m2) * L1;
  const a12 = m2 * L2 * cosD;
  const a21 = L1 * cosD;
  const a22 = L2;

  // Right-hand side
  const b1 = -m2 * L2 * omega2 * omega2 * sinD - (m1 + m2) * g * Math.sin(theta1);
  const b2 = L1 * omega1 * omega1 * sinD - g * Math.sin(theta2);

  // Cramer's rule
  const det = a11 * a22 - a12 * a21;
  const alpha1 = (a22 * b1 - a12 * b2) / det - damping * omega1;
  const alpha2 = (a11 * b2 - a21 * b1) / det - damping * omega2;

  return { alpha1, alpha2 };
}

// ─── RK4 Integration ────────────────────────────────────────────

/**
 * Advance the pendulum state by dt using 4th-order Runge-Kutta.
 * RK4 preserves energy much better than Euler for chaotic systems.
 */
export function stepPendulum(
  state: PendulumState,
  dt: number,
  config: PendulumConfig,
): PendulumState {
  // State vector: [theta1, theta2, omega1, omega2]
  const s = [state.theta1, state.theta2, state.omega1, state.omega2];

  function deriv(sv: number[]): number[] {
    const st: PendulumState = {
      theta1: sv[0], theta2: sv[1], omega1: sv[2], omega2: sv[3],
    };
    const { alpha1, alpha2 } = computeAccelerations(st, config);
    return [sv[2], sv[3], alpha1, alpha2];
  }

  const k1 = deriv(s);
  const k2 = deriv(s.map((v, i) => v + 0.5 * dt * k1[i]));
  const k3 = deriv(s.map((v, i) => v + 0.5 * dt * k2[i]));
  const k4 = deriv(s.map((v, i) => v + dt * k3[i]));

  return {
    theta1: s[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    theta2: s[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    omega1: s[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    omega2: s[3] + (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
  };
}

// ─── Position Helpers ───────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Convert pendulum angles to screen-space bob positions.
 * Y increases downward (screen coordinates).
 */
export function getBobPositions(
  state: PendulumState,
  config: PendulumConfig,
  pivotX: number,
  pivotY: number,
): { bob1: Vec2; bob2: Vec2 } {
  const bob1: Vec2 = {
    x: pivotX + config.length1 * Math.sin(state.theta1),
    y: pivotY + config.length1 * Math.cos(state.theta1),
  };
  const bob2: Vec2 = {
    x: bob1.x + config.length2 * Math.sin(state.theta2),
    y: bob1.y + config.length2 * Math.cos(state.theta2),
  };
  return { bob1, bob2 };
}

// ─── Inverse Kinematics ─────────────────────────────────────────

/**
 * Solve 2-link IK to place a target bob at (tx, ty).
 * If dragging bob2: finds theta1 and theta2.
 * If dragging bob1: finds theta1 only (theta2 stays).
 * Picks the solution closest to currentTheta1 to avoid configuration jumps.
 */
export function solveIKBob2(
  tx: number,
  ty: number,
  pivotX: number,
  pivotY: number,
  config: PendulumConfig,
  currentTheta1: number,
): { theta1: number; theta2: number } {
  const dx = tx - pivotX;
  const dy = ty - pivotY;
  let dist = Math.sqrt(dx * dx + dy * dy);

  // Clamp to reachable range
  const maxDist = config.length1 + config.length2 - 0.1;
  const minDist = Math.abs(config.length1 - config.length2) + 0.1;
  dist = Math.max(minDist, Math.min(maxDist, dist));

  // Scale target to reachable distance
  const scale = dist / Math.sqrt(dx * dx + dy * dy) || 1;
  const sdx = dx * scale;
  const sdy = dy * scale;

  // Law of cosines: angle at pivot between arm1 and the line to target
  const cosAlpha = (config.length1 * config.length1 + dist * dist -
    config.length2 * config.length2) / (2 * config.length1 * dist);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

  // Base angle from downward vertical to target (atan2(x, y) for screen coords)
  const baseAngle = Math.atan2(sdx, sdy);

  // Two elbow solutions
  const sol1 = baseAngle - alpha;
  const sol2 = baseAngle + alpha;

  // Pick closest to current configuration
  const diff1 = angleDiff(sol1, currentTheta1);
  const diff2 = angleDiff(sol2, currentTheta1);
  const theta1 = Math.abs(diff1) < Math.abs(diff2) ? sol1 : sol2;

  // Compute bob1 position
  const b1x = pivotX + config.length1 * Math.sin(theta1);
  const b1y = pivotY + config.length1 * Math.cos(theta1);

  // theta2: angle from downward vertical such that bob2 is at target
  const theta2 = Math.atan2(sdx - config.length1 * Math.sin(theta1),
    sdy - config.length1 * Math.cos(theta1));

  return { theta1, theta2 };
}

/**
 * Solve IK for dragging bob1: simply point arm1 toward the target.
 */
export function solveIKBob1(
  tx: number,
  ty: number,
  pivotX: number,
  pivotY: number,
  config: PendulumConfig,
): number {
  const dx = tx - pivotX;
  const dy = ty - pivotY;
  return Math.atan2(dx, dy);
}

// ─── Utilities ──────────────────────────────────────────────────

/** Signed shortest angular difference from a to b. */
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
