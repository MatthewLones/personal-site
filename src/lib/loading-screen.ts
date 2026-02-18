// ─────────────────────────────────────────────────────────
// Loading Screen — pure math
// Leaf orbit, spiral fan-out, and eraser geometry.
// Rendering lives in LoadingScreen.astro.
// ─────────────────────────────────────────────────────────

export interface LoadingLeaf {
  orbitAngle: number;      // position on orbit circle (rad)
  orbitSpeed: number;      // angular speed (rad/s)
  orbitRadius: number;     // distance from center (px)
  selfAngle: number;       // individual tumble rotation (rad)
  selfAngularVel: number;  // tumble speed (rad/s)
  size: number;            // leaf size multiplier
  variant: number;         // 0 = ellipse, 1 = curved leaf, 2 = circle
  radialVel: number;       // outward velocity during fan-out (px/s)
  phase: 'orbit' | 'fanout' | 'done';
  eraserSize: number;      // current eraser brush radius (px)
}

/** Create leaves evenly spaced around a circle. */
export function createLeaves(
  count: number,
  orbitRadius: number,
  baseSpeed: number,
): LoadingLeaf[] {
  const leaves: LoadingLeaf[] = [];
  for (let i = 0; i < count; i++) {
    leaves.push({
      orbitAngle: (i / count) * Math.PI * 2,
      orbitSpeed: baseSpeed * (0.95 + Math.random() * 0.1),
      orbitRadius,
      selfAngle: Math.random() * Math.PI * 2,
      selfAngularVel: (Math.random() - 0.5) * 8,
      size: 0.8 + Math.random() * 0.8,       // 0.8 – 1.6
      variant: Math.floor(Math.random() * 3), // 0, 1, or 2
      radialVel: 0,
      phase: 'orbit',
      eraserSize: 0,
    });
  }
  return leaves;
}

/** Advance a leaf along its circular orbit. */
export function stepOrbit(leaf: LoadingLeaf, dt: number): void {
  leaf.orbitAngle += leaf.orbitSpeed * dt;
  leaf.selfAngle += leaf.selfAngularVel * dt;
}

/**
 * Spiral fan-out step.
 * Uses the same 0.7 tangential + 0.3 radial blend as spiralField
 * in vector-field.ts, but applied as velocity rather than a field angle.
 */
export function stepFanOut(
  leaf: LoadingLeaf,
  dt: number,
  centerX: number,
  centerY: number,
  accel: number,
  eraserBase: number,
  eraserGrowth: number,
  startRadius: number,
): void {
  // Accelerate outward
  leaf.radialVel += accel * dt;

  // Current position relative to center
  const dx = Math.cos(leaf.orbitAngle) * leaf.orbitRadius;
  const dy = Math.sin(leaf.orbitAngle) * leaf.orbitRadius;
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

  // Radial unit vector (outward from center)
  const radX = dx / dist;
  const radY = dy / dist;

  // Tangential unit vector (perpendicular, maintaining orbit direction)
  const tanX = -radY;
  const tanY = radX;

  // Spiral blend: 70% tangential + 30% radial (same as spiralField)
  const spiralX = tanX * 0.7 + radX * 0.3;
  const spiralY = tanY * 0.7 + radY * 0.3;

  // Decompose spiral direction into tangential & radial components
  const tangentialComponent = spiralX * tanX + spiralY * tanY;
  const radialComponent = spiralX * radX + spiralY * radY;

  // Speed is the base orbital speed + outward acceleration
  const speed = Math.abs(leaf.orbitSpeed) * leaf.orbitRadius + leaf.radialVel;

  // Update orbit angle (tangential motion)
  if (leaf.orbitRadius > 1) {
    leaf.orbitAngle += (tangentialComponent * speed * dt) / leaf.orbitRadius;
  }

  // Update orbit radius (radial motion)
  leaf.orbitRadius += radialComponent * speed * dt;

  // Continue individual tumble
  leaf.selfAngle += leaf.selfAngularVel * dt;

  // Grow eraser brush with distance from start
  const distFromStart = Math.max(0, leaf.orbitRadius - startRadius);
  leaf.eraserSize = eraserBase + (distFromStart / 100) * eraserGrowth;
}

/** Create a single fan-out leaf spawned near the center. */
export function createFanOutLeaf(baseSpeed: number): LoadingLeaf {
  // Spawn at a small random radius near center (0–15px)
  const startRadius = Math.random() * 15;
  return {
    orbitAngle: Math.random() * Math.PI * 2,
    orbitSpeed: baseSpeed * (0.85 + Math.random() * 0.3),
    orbitRadius: startRadius,
    selfAngle: Math.random() * Math.PI * 2,
    selfAngularVel: (Math.random() - 0.5) * 8,
    size: 0.6 + Math.random() * 1.0,
    variant: Math.floor(Math.random() * 3),
    radialVel: 30 + Math.random() * 60,  // small initial outward kick
    phase: 'fanout',
    eraserSize: 0,
  };
}

/** Compute pixel position from orbital state. */
export function leafPosition(
  leaf: LoadingLeaf,
  cx: number,
  cy: number,
): { x: number; y: number } {
  return {
    x: cx + Math.cos(leaf.orbitAngle) * leaf.orbitRadius,
    y: cy + Math.sin(leaf.orbitAngle) * leaf.orbitRadius,
  };
}

/** True when the leaf has left the viewport (with margin). */
export function isOffScreen(
  leaf: LoadingLeaf,
  cx: number,
  cy: number,
  w: number,
  h: number,
): boolean {
  const { x, y } = leafPosition(leaf, cx, cy);
  const margin = 100;
  return x < -margin || x > w + margin || y < -margin || y > h + margin;
}
