/* ──────────────────────────────────────────────────────────────
   Lights Out – Pure game logic (no DOM / canvas references)
   ────────────────────────────────────────────────────────────── */

// ─── Types ───────────────────────────────────────────────────

export interface Cell {
  row: number;
  col: number;
  /** 0 = off, 1..K-1 = on states. Binary: 0 or 1. */
  state: number;
  /** Screen-space center x. */
  x: number;
  /** Screen-space center y. */
  y: number;
  /** Indices into the cells array for 4-connected neighbours. */
  neighbors: number[];
}

export interface GridShape {
  /** Set of "row,col" keys describing which cells exist. */
  positions: Set<string>;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface LightsOutConfig {
  gridSize: number;
  modulus: number;
  cellSize: number;
  cellGap: number;
}

export interface LightsOutState {
  cells: Cell[];
  config: LightsOutConfig;
  shape: GridShape;
  solved: boolean;
  moves: number;
}

// ─── 3-D Graph Types ─────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GraphNode {
  pos: Vec3;
  state: number;
  screenX: number;
  screenY: number;
  depth: number;
}

export interface GraphEdge {
  a: number;
  b: number;
}

export interface Graph3DState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: number[][];
  rotX: number;
  rotY: number;
  solved: boolean;
  moves: number;
}

// ─── Confetti Types ──────────────────────────────────────────

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  color: string;
  w: number;
  h: number;
  life: number;
}

// ═══════════════════════════════════════════════════════════════
//  SHAPE GENERATION
// ═══════════════════════════════════════════════════════════════

function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

function parseKey(k: string): [number, number] {
  const [r, c] = k.split(',').map(Number);
  return [r, c];
}

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** BFS connectivity check. */
export function isConnected(shape: GridShape): boolean {
  const keys = [...shape.positions];
  if (keys.length === 0) return true;
  const visited = new Set<string>();
  const queue = [keys[0]];
  visited.add(keys[0]);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const [r, c] = parseKey(cur);
    for (const [dr, dc] of DIRS) {
      const nk = posKey(r + dr, c + dc);
      if (shape.positions.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === shape.positions.size;
}

/**
 * Generate an organic ~5×5 grid shape.
 * Starts with a full square, removes a few corners/edges,
 * adds a few extensions, and verifies connectivity.
 */
export function generateOrganicShape(gridSize: number = 5): GridShape {
  for (let attempt = 0; attempt < 30; attempt++) {
    const positions = new Set<string>();

    // Start with full grid
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        positions.add(posKey(r, c));
      }
    }

    // Remove 2-4 corner/edge cells
    const corners = [
      posKey(0, 0),
      posKey(0, gridSize - 1),
      posKey(gridSize - 1, 0),
      posKey(gridSize - 1, gridSize - 1),
    ];
    const edgeCells: string[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (r === 0 || r === gridSize - 1 || c === 0 || c === gridSize - 1) {
          if (!corners.includes(posKey(r, c))) {
            edgeCells.push(posKey(r, c));
          }
        }
      }
    }

    const removable = [...corners, ...edgeCells];
    shuffle(removable);
    const removeCount = 2 + Math.floor(Math.random() * 3); // 2-4
    for (let i = 0; i < Math.min(removeCount, removable.length); i++) {
      positions.delete(removable[i]);
    }

    // Add 1-3 extension cells beyond the base grid boundary
    const extensionCount = 1 + Math.floor(Math.random() * 3);
    let added = 0;
    const boundary: string[] = [];
    for (const k of positions) {
      const [r, c] = parseKey(k);
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        const nk = posKey(nr, nc);
        if (!positions.has(nk)) {
          boundary.push(nk);
        }
      }
    }
    shuffle(boundary);
    for (const bk of boundary) {
      if (added >= extensionCount) break;
      positions.add(bk);
      added++;
    }

    // Compute bounds
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;
    for (const k of positions) {
      const [r, c] = parseKey(k);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
    }

    const shape: GridShape = { positions, minRow, maxRow, minCol, maxCol };
    if (isConnected(shape) && positions.size >= 18) {
      return shape;
    }
  }

  // Fallback: standard 5×5
  const positions = new Set<string>();
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      positions.add(posKey(r, c));
    }
  }
  return { positions, minRow: 0, maxRow: gridSize - 1, minCol: 0, maxCol: gridSize - 1 };
}

// ═══════════════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════════════

/**
 * Build a game state from a shape and config.
 * All cells start at state 0 (off).
 */
export function createGameState(
  shape: GridShape,
  config: LightsOutConfig,
  originX: number,
  originY: number,
): LightsOutState {
  const posToIndex = new Map<string, number>();
  const cells: Cell[] = [];

  // Create cells with screen positions
  for (const k of shape.positions) {
    const [r, c] = parseKey(k);
    const step = config.cellSize + config.cellGap;
    const x = originX + (c - shape.minCol) * step + config.cellSize / 2;
    const y = originY + (r - shape.minRow) * step + config.cellSize / 2;
    posToIndex.set(k, cells.length);
    cells.push({ row: r, col: c, state: 0, x, y, neighbors: [] });
  }

  // Build adjacency
  for (let i = 0; i < cells.length; i++) {
    const { row, col } = cells[i];
    for (const [dr, dc] of DIRS) {
      const nk = posKey(row + dr, col + dc);
      const ni = posToIndex.get(nk);
      if (ni !== undefined) {
        cells[i].neighbors.push(ni);
      }
    }
  }

  return { cells, config, shape, solved: true, moves: 0 };
}

/**
 * Recompute cell screen positions (e.g. after resize).
 */
export function layoutCells(
  state: LightsOutState,
  originX: number,
  originY: number,
): LightsOutState {
  const step = state.config.cellSize + state.config.cellGap;
  const cells = state.cells.map((c) => ({
    ...c,
    x: originX + (c.col - state.shape.minCol) * step + state.config.cellSize / 2,
    y: originY + (c.row - state.shape.minRow) * step + state.config.cellSize / 2,
  }));
  return { ...state, cells };
}

/** Dimensions of the grid in pixels. */
export function gridDimensions(state: LightsOutState): { w: number; h: number } {
  const { shape, config } = state;
  const step = config.cellSize + config.cellGap;
  const cols = shape.maxCol - shape.minCol + 1;
  const rows = shape.maxRow - shape.minRow + 1;
  return {
    w: cols * step - config.cellGap,
    h: rows * step - config.cellGap,
  };
}

// ═══════════════════════════════════════════════════════════════
//  TOGGLE & WIN
// ═══════════════════════════════════════════════════════════════

/**
 * Toggle a cell and its neighbours.
 * Returns new state with updated cells, moves, and solved flag.
 */
export function toggleCell(
  state: LightsOutState,
  cellIndex: number,
): LightsOutState {
  const mod = state.config.modulus;
  const cells = state.cells.map((c) => ({ ...c }));
  const affected = [cellIndex, ...cells[cellIndex].neighbors];
  for (const i of affected) {
    cells[i].state = (cells[i].state + 1) % mod;
  }
  const solved = cells.every((c) => c.state === 0);
  return { ...state, cells, solved, moves: state.moves + 1 };
}

export function isSolved(state: LightsOutState): boolean {
  return state.cells.every((c) => c.state === 0);
}

// ═══════════════════════════════════════════════════════════════
//  PUZZLE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a solvable puzzle by working backwards.
 * Starts from solved (all 0), applies random toggles.
 */
export function generatePuzzle(
  state: LightsOutState,
  minLit: number = 8,
): LightsOutState {
  let s = { ...state, cells: state.cells.map((c) => ({ ...c, state: 0 })), solved: true, moves: 0 };
  const mod = s.config.modulus;

  for (let attempt = 0; attempt < 50; attempt++) {
    // Reset
    for (const c of s.cells) c.state = 0;

    // Apply random toggles
    const numToggles = 6 + Math.floor(Math.random() * 8); // 6-13 random presses
    for (let t = 0; t < numToggles; t++) {
      const idx = Math.floor(Math.random() * s.cells.length);
      const times = mod === 2 ? 1 : 1 + Math.floor(Math.random() * (mod - 1));
      for (let k = 0; k < times; k++) {
        const affected = [idx, ...s.cells[idx].neighbors];
        for (const i of affected) {
          s.cells[i].state = (s.cells[i].state + 1) % mod;
        }
      }
    }

    const litCount = s.cells.filter((c) => c.state !== 0).length;
    if (litCount >= minLit) {
      s.solved = false;
      s.moves = 0;
      return s;
    }
  }

  // If we didn't get enough lit cells, return what we have
  s.solved = s.cells.every((c) => c.state === 0);
  s.moves = 0;
  return s;
}

// ═══════════════════════════════════════════════════════════════
//  HIT TESTING
// ═══════════════════════════════════════════════════════════════

export function hitTestCell(
  state: LightsOutState,
  px: number,
  py: number,
): number | null {
  const half = state.config.cellSize / 2;
  for (let i = 0; i < state.cells.length; i++) {
    const c = state.cells[i];
    if (Math.abs(px - c.x) <= half && Math.abs(py - c.y) <= half) {
      return i;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════════════════════

export function spawnConfetti(
  cx: number,
  cy: number,
  count: number,
  spread: number,
  colors: string[],
): ConfettiParticle[] {
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * spread;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 200, // upward bias
      angle: Math.random() * Math.PI * 2,
      angularVel: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: 4 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      life: 1.0,
    });
  }
  return particles;
}

/**
 * Step confetti particles. Returns count of particles still alive.
 */
export function stepConfetti(
  particles: ConfettiParticle[],
  dt: number,
  gravity: number,
): number {
  let alive = 0;
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += gravity * dt;
    p.vx *= 0.99; // air resistance
    p.angle += p.angularVel * dt;
    p.life -= dt * 0.5;
    if (p.life > 0) alive++;
  }
  return alive;
}

// ═══════════════════════════════════════════════════════════════
//  3-D SPIDER-WEB GRAPH
// ═══════════════════════════════════════════════════════════════

/**
 * Procedurally generate a random web-like graph in 3D.
 * Varies ring count, nodes per ring, positions, and connections.
 */
export function generateSpiderWebGraph(
  _rings?: number,
  _nodesPerRing?: number,
  radius: number = 120,
  zSpread: number = 40,
): { nodes: GraphNode[]; edges: GraphEdge[]; adjacency: number[][] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  function addEdge(a: number, b: number) {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (!edgeSet.has(key) && a !== b) {
      edgeSet.add(key);
      edges.push({ a, b });
    }
  }

  const rings = 2 + Math.floor(Math.random() * 3); // 2-4 rings
  const ringCounts: number[] = [];
  for (let i = 0; i < rings; i++) {
    ringCounts.push(5 + Math.floor(Math.random() * 5)); // 5-9 nodes per ring
  }

  const makeNode = (x: number, y: number, z: number): number => {
    const idx = nodes.length;
    // Add slight random perturbation
    const jitter = 8;
    nodes.push({
      pos: {
        x: x + (Math.random() - 0.5) * jitter,
        y: y + (Math.random() - 0.5) * jitter,
        z: z + (Math.random() - 0.5) * jitter,
      },
      state: 0, screenX: 0, screenY: 0, depth: 0,
    });
    return idx;
  };

  // Hub node
  makeNode(0, 0, 0);

  // Ring nodes
  const ringStarts: number[] = [];
  for (let ring = 0; ring < rings; ring++) {
    ringStarts.push(nodes.length);
    const count = ringCounts[ring];
    const r = ((ring + 1) / rings) * radius;
    const z = ((ring % 2 === 0 ? -1 : 1) * zSpread * (ring + 1)) / rings;
    const angleOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + angleOffset;
      makeNode(Math.cos(angle) * r, Math.sin(angle) * r, z);
    }
  }

  // Hub to inner ring
  for (let i = 0; i < ringCounts[0]; i++) {
    addEdge(0, ringStarts[0] + i);
  }

  // Within each ring (circular)
  for (let ring = 0; ring < rings; ring++) {
    const start = ringStarts[ring];
    const count = ringCounts[ring];
    for (let i = 0; i < count; i++) {
      addEdge(start + i, start + ((i + 1) % count));
    }
  }

  // Between adjacent rings — connect each node to nearest 1-2 in next ring
  for (let ring = 0; ring < rings - 1; ring++) {
    const startA = ringStarts[ring];
    const countA = ringCounts[ring];
    const startB = ringStarts[ring + 1];
    const countB = ringCounts[ring + 1];
    for (let i = 0; i < countA; i++) {
      const angleA = Math.atan2(nodes[startA + i].pos.y, nodes[startA + i].pos.x);
      // Find closest node in next ring
      let bestJ = 0;
      let bestDiff = Infinity;
      for (let j = 0; j < countB; j++) {
        const angleB = Math.atan2(nodes[startB + j].pos.y, nodes[startB + j].pos.x);
        let diff = Math.abs(angleA - angleB);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < bestDiff) { bestDiff = diff; bestJ = j; }
      }
      addEdge(startA + i, startB + bestJ);
      // Occasionally connect to a second neighbor
      if (Math.random() < 0.3) {
        const secondJ = (bestJ + 1) % countB;
        addEdge(startA + i, startB + secondJ);
      }
    }
  }

  // Random extra cross-connections for variety
  const extraEdges = 1 + Math.floor(Math.random() * 3);
  for (let e = 0; e < extraEdges; e++) {
    const a = Math.floor(Math.random() * nodes.length);
    const b = Math.floor(Math.random() * nodes.length);
    if (a !== b) addEdge(a, b);
  }

  // Build adjacency list
  const adjacency: number[][] = nodes.map(() => []);
  for (const e of edges) {
    adjacency[e.a].push(e.b);
    adjacency[e.b].push(e.a);
  }

  return { nodes, edges, adjacency };
}

export function rotateVec3(v: Vec3, rotX: number, rotY: number): Vec3 {
  // Rotate around Y
  let x = v.x * Math.cos(rotY) + v.z * Math.sin(rotY);
  const y1 = v.y;
  let z = -v.x * Math.sin(rotY) + v.z * Math.cos(rotY);

  // Rotate around X
  const y2 = y1 * Math.cos(rotX) - z * Math.sin(rotX);
  z = y1 * Math.sin(rotX) + z * Math.cos(rotX);

  return { x, y: y2, z };
}

export function projectNodes(
  nodes: GraphNode[],
  rotX: number,
  rotY: number,
  focalLength: number,
  centerX: number,
  centerY: number,
): void {
  for (const n of nodes) {
    const r = rotateVec3(n.pos, rotX, rotY);
    const scale = focalLength / (r.z + focalLength);
    n.screenX = centerX + r.x * scale;
    n.screenY = centerY + r.y * scale;
    n.depth = r.z;
  }
}

export function toggleGraphNode(
  state: Graph3DState,
  nodeIndex: number,
): Graph3DState {
  const nodes = state.nodes.map((n) => ({ ...n }));
  const affected = [nodeIndex, ...state.adjacency[nodeIndex]];
  for (const i of affected) {
    nodes[i].state = nodes[i].state === 0 ? 1 : 0;
  }
  const solved = nodes.every((n) => n.state === 0);
  return { ...state, nodes, solved, moves: state.moves + 1 };
}

export function hitTestGraphNode(
  nodes: GraphNode[],
  px: number,
  py: number,
  hitRadius: number,
): number | null {
  let bestIdx: number | null = null;
  let bestDepth = Infinity;
  let bestDist = Infinity;

  for (let i = 0; i < nodes.length; i++) {
    const dx = px - nodes[i].screenX;
    const dy = py - nodes[i].screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= hitRadius) {
      // Prefer front-most node (smallest depth), break ties by distance
      if (nodes[i].depth < bestDepth || (nodes[i].depth === bestDepth && dist < bestDist)) {
        bestIdx = i;
        bestDepth = nodes[i].depth;
        bestDist = dist;
      }
    }
  }
  return bestIdx;
}

export function generateGraph3DPuzzle(
  state: Graph3DState,
  minLit: number = 6,
): Graph3DState {
  const nodes = state.nodes.map((n) => ({ ...n, state: 0 }));
  let s = { ...state, nodes, solved: true, moves: 0 };

  for (let attempt = 0; attempt < 50; attempt++) {
    for (const n of s.nodes) n.state = 0;

    const numToggles = 4 + Math.floor(Math.random() * 6);
    for (let t = 0; t < numToggles; t++) {
      const idx = Math.floor(Math.random() * s.nodes.length);
      const affected = [idx, ...s.adjacency[idx]];
      for (const i of affected) {
        s.nodes[i].state = s.nodes[i].state === 0 ? 1 : 0;
      }
    }

    const litCount = s.nodes.filter((n) => n.state !== 0).length;
    if (litCount >= minLit) {
      s.solved = false;
      s.moves = 0;
      return s;
    }
  }

  s.solved = s.nodes.every((n) => n.state === 0);
  s.moves = 0;
  return s;
}

// ═══════════════════════════════════════════════════════════════
//  LINEAR ALGEBRA OVER GF(2) — educational, for the overlay
// ═══════════════════════════════════════════════════════════════

/**
 * Build the toggle matrix A where A[i][j] = 1 if pressing cell j toggles cell i.
 */
export function buildToggleMatrix(cells: Cell[]): number[][] {
  const n = cells.length;
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    A[j][j] = 1; // pressing j toggles itself
    for (const ni of cells[j].neighbors) {
      A[ni][j] = 1;
    }
  }
  return A;
}

/**
 * Gaussian elimination over GF(2). Returns rank.
 */
export function gaussianEliminationGF2(
  matrix: number[][],
): { rank: number; reduced: number[][] } {
  const m = matrix.length;
  if (m === 0) return { rank: 0, reduced: [] };
  const n = matrix[0].length;
  const M = matrix.map((row) => [...row]);

  let rank = 0;
  for (let col = 0; col < n && rank < m; col++) {
    // Find pivot
    let pivotRow = -1;
    for (let row = rank; row < m; row++) {
      if (M[row][col] === 1) {
        pivotRow = row;
        break;
      }
    }
    if (pivotRow === -1) continue;

    // Swap
    [M[rank], M[pivotRow]] = [M[pivotRow], M[rank]];

    // Eliminate
    for (let row = 0; row < m; row++) {
      if (row !== rank && M[row][col] === 1) {
        for (let c = 0; c < n; c++) {
          M[row][c] ^= M[rank][c];
        }
      }
    }
    rank++;
  }

  return { rank, reduced: M };
}

// ═══════════════════════════════════════════════════════════════
//  SOLVERS
// ═══════════════════════════════════════════════════════════════

function modInverse(a: number, mod: number): number | null {
  a = ((a % mod) + mod) % mod;
  let [old_r, r] = [a, mod];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1) return null;
  return ((old_s % mod) + mod) % mod;
}

/**
 * Solve Ax ≡ b (mod 2) via Gaussian elimination over GF(2).
 * Returns solution vector x (0 or 1 per cell), or null if unsolvable.
 */
function solveBinarySystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const cols = A[0]?.length ?? 0;
  const M = A.map((row, i) => [...row, b[i]]);

  const pivotCol: number[] = [];
  let rank = 0;
  for (let col = 0; col < cols && rank < n; col++) {
    let pivotRow = -1;
    for (let row = rank; row < n; row++) {
      if (M[row][col] === 1) { pivotRow = row; break; }
    }
    if (pivotRow === -1) continue;
    [M[rank], M[pivotRow]] = [M[pivotRow], M[rank]];
    pivotCol.push(col);
    for (let row = 0; row < n; row++) {
      if (row !== rank && M[row][col] === 1) {
        for (let c = 0; c <= cols; c++) M[row][c] ^= M[rank][c];
      }
    }
    rank++;
  }
  for (let row = rank; row < n; row++) {
    if (M[row][cols] !== 0) return null;
  }
  const x = new Array(cols).fill(0);
  for (let r = 0; r < rank; r++) x[pivotCol[r]] = M[r][cols];
  return x;
}

/**
 * Solve Ax ≡ target (mod K) via Gaussian elimination.
 * K should be prime for guaranteed correctness.
 * Returns solution vector (presses per cell), or null if unsolvable.
 */
function solveModKSystem(A: number[][], target: number[], K: number): number[] | null {
  const n = target.length;
  const cols = A[0]?.length ?? 0;
  const M = A.map((row, i) => [...row, ((target[i] % K) + K) % K]);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < cols; j++) {
      M[i][j] = ((M[i][j] % K) + K) % K;
    }
  }

  const pivotCol: number[] = [];
  let rank = 0;
  for (let col = 0; col < cols && rank < n; col++) {
    let pivotRow = -1;
    for (let row = rank; row < n; row++) {
      if (M[row][col] % K !== 0 && modInverse(M[row][col], K) !== null) {
        pivotRow = row; break;
      }
    }
    if (pivotRow === -1) continue;
    [M[rank], M[pivotRow]] = [M[pivotRow], M[rank]];
    pivotCol.push(col);
    const inv = modInverse(M[rank][col], K)!;
    for (let c = 0; c <= cols; c++) M[rank][c] = (M[rank][c] * inv) % K;
    for (let row = 0; row < n; row++) {
      if (row !== rank && M[row][col] % K !== 0) {
        const factor = M[row][col];
        for (let c = 0; c <= cols; c++) {
          M[row][c] = ((M[row][c] - factor * M[rank][c]) % K + K * K) % K;
        }
      }
    }
    rank++;
  }
  for (let row = rank; row < n; row++) {
    if (M[row][cols] % K !== 0) return null;
  }
  const x = new Array(cols).fill(0);
  for (let r = 0; r < rank; r++) x[pivotCol[r]] = ((M[r][cols] % K) + K) % K;
  return x;
}

/**
 * Solve the main grid game.
 * Returns press-count per cell, or null if unsolvable.
 */
export function solveLightsOutGrid(state: LightsOutState): number[] | null {
  const A = buildToggleMatrix(state.cells);
  const mod = state.config.modulus;
  if (mod === 2) {
    return solveBinarySystem(A, state.cells.map((c) => c.state));
  } else {
    const target = state.cells.map((c) => (mod - c.state) % mod);
    return solveModKSystem(A, target, mod);
  }
}

/**
 * Solve the 3D graph game (binary toggle).
 * Returns press-count per node, or null if unsolvable.
 */
export function solveGraph3D(state: Graph3DState): number[] | null {
  const n = state.nodes.length;
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    A[j][j] = 1;
    for (const ni of state.adjacency[j]) {
      A[ni][j] = 1;
    }
  }
  return solveBinarySystem(A, state.nodes.map((nd) => nd.state));
}

// ═══════════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════════

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
