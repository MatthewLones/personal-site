/**
 * Hat Monotile Tiling Generator
 *
 * Implements the "hat" aperiodic monotile discovered in 2023 by
 * David Smith, Joseph Samuel Myers, Craig S. Kaplan, and Chaim Goodman-Strauss.
 *
 * Based on Craig Kaplan's reference implementation (BSD 3-clause):
 * https://github.com/isohedral/hatviz
 *
 * The algorithm uses a substitution system with four metatile types (H, T, P, F)
 * that inflate into larger arrangements of themselves, producing an aperiodic tiling
 * of the plane using a single tile shape.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

// Affine 2×3 matrix stored as [a, b, tx, c, d, ty]
// Transforms point (x,y) → (a*x + b*y + tx, c*x + d*y + ty)
type Transform = [number, number, number, number, number, number];

interface TileGeometry {
  type: 'hat';
  label: string;
  shape: Point[];
}

interface MetaTileGeometry {
  type: 'meta';
  shape: Point[];
  width: number;
  children: { T: Transform; geom: TileGeometry | MetaTileGeometry }[];
}

type Geometry = TileGeometry | MetaTileGeometry;

// ─── Constants ──────────────────────────────────────────────────────────────

const HR3 = Math.sqrt(3) / 2; // ≈ 0.866
const IDENT: Transform = [1, 0, 0, 0, 1, 0];

// ─── Geometry Helpers ───────────────────────────────────────────────────────

function pt(x: number, y: number): Point {
  return { x, y };
}

function hexPt(x: number, y: number): Point {
  return pt(x + 0.5 * y, HR3 * y);
}

function padd(p: Point, q: Point): Point {
  return { x: p.x + q.x, y: p.y + q.y };
}

function psub(p: Point, q: Point): Point {
  return { x: p.x - q.x, y: p.y - q.y };
}

function inv(T: Transform): Transform {
  const det = T[0] * T[4] - T[1] * T[3];
  return [
    T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det,
    -T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det,
  ];
}

function mul(A: Transform, B: Transform): Transform {
  return [
    A[0] * B[0] + A[1] * B[3],
    A[0] * B[1] + A[1] * B[4],
    A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3],
    A[3] * B[1] + A[4] * B[4],
    A[3] * B[2] + A[4] * B[5] + A[5],
  ];
}

function transPt(M: Transform, P: Point): Point {
  return pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]);
}

function ttrans(tx: number, ty: number): Transform {
  return [1, 0, tx, 0, 1, ty];
}

function trot(ang: number): Transform {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [c, -s, 0, s, c, 0];
}

function rotAbout(p: Point, ang: number): Transform {
  return mul(ttrans(p.x, p.y), mul(trot(ang), ttrans(-p.x, -p.y)));
}

function matchSeg(p: Point, q: Point): Transform {
  return [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
}

function matchTwo(p1: Point, q1: Point, p2: Point, q2: Point): Transform {
  return mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
}

function intersect(p1: Point, q1: Point, p2: Point, q2: Point): Point {
  const d = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y);
  const uA = ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) / d;
  return pt(p1.x + uA * (q1.x - p1.x), p1.y + uA * (q1.y - p1.y));
}

// ─── Hat Tile Outline ───────────────────────────────────────────────────────

const HAT_OUTLINE: Point[] = [
  hexPt(0, 0), hexPt(-1, -1), hexPt(0, -2), hexPt(2, -2),
  hexPt(2, -1), hexPt(4, -2), hexPt(5, -1), hexPt(4, 0),
  hexPt(3, 0), hexPt(2, 2), hexPt(0, 3), hexPt(0, 2),
  hexPt(-1, 2),
];

// ─── Tile/MetaTile Constructors ─────────────────────────────────────────────

function makeHatTile(label: string): TileGeometry {
  return { type: 'hat', label, shape: HAT_OUTLINE };
}

function makeMetaTile(shape: Point[], width: number): MetaTileGeometry {
  return { type: 'meta', shape, width, children: [] };
}

function addChild(meta: MetaTileGeometry, T: Transform, geom: Geometry): void {
  meta.children.push({ T, geom });
}

function evalChild(meta: MetaTileGeometry, n: number, i: number): Point {
  const child = meta.children[n];
  return transPt(child.T, (child.geom as MetaTileGeometry).shape[i]);
}

function recentre(meta: MetaTileGeometry): void {
  let cx = 0;
  let cy = 0;
  for (const p of meta.shape) {
    cx += p.x;
    cy += p.y;
  }
  cx /= meta.shape.length;
  cy /= meta.shape.length;
  const tr = pt(-cx, -cy);

  for (let i = 0; i < meta.shape.length; i++) {
    meta.shape[i] = padd(meta.shape[i], tr);
  }

  const M = ttrans(-cx, -cy);
  for (const ch of meta.children) {
    ch.T = mul(M, ch.T);
  }
}

// ─── Initial Metatiles ──────────────────────────────────────────────────────

const H1_hat = makeHatTile('H1');
const H_hat = makeHatTile('H');
const T_hat = makeHatTile('T');
const P_hat = makeHatTile('P');
const F_hat = makeHatTile('F');

function createInitH(): MetaTileGeometry {
  const outline = [
    pt(0, 0), pt(4, 0), pt(4.5, HR3),
    pt(2.5, 5 * HR3), pt(1.5, 5 * HR3), pt(-0.5, HR3),
  ];
  const meta = makeMetaTile(outline, 2);

  addChild(meta, matchTwo(HAT_OUTLINE[5], HAT_OUTLINE[7], outline[5], outline[0]), H_hat);
  addChild(meta, matchTwo(HAT_OUTLINE[9], HAT_OUTLINE[11], outline[1], outline[2]), H_hat);
  addChild(meta, matchTwo(HAT_OUTLINE[5], HAT_OUTLINE[7], outline[3], outline[4]), H_hat);
  addChild(meta,
    mul(ttrans(2.5, HR3), mul([-0.5, -HR3, 0, HR3, -0.5, 0] as Transform, [0.5, 0, 0, 0, -0.5, 0] as Transform)),
    H1_hat);

  return meta;
}

function createInitT(): MetaTileGeometry {
  const outline = [pt(0, 0), pt(3, 0), pt(1.5, 3 * HR3)];
  const meta = makeMetaTile(outline, 2);
  addChild(meta, [0.5, 0, 0.5, 0, 0.5, HR3] as Transform, T_hat);
  return meta;
}

function createInitP(): MetaTileGeometry {
  const outline = [pt(0, 0), pt(4, 0), pt(3, 2 * HR3), pt(-1, 2 * HR3)];
  const meta = makeMetaTile(outline, 2);
  addChild(meta, [0.5, 0, 1.5, 0, 0.5, HR3] as Transform, P_hat);
  addChild(meta,
    mul(ttrans(0, 2 * HR3), mul([0.5, HR3, 0, -HR3, 0.5, 0] as Transform, [0.5, 0, 0, 0, 0.5, 0] as Transform)),
    P_hat);
  return meta;
}

function createInitF(): MetaTileGeometry {
  const outline = [
    pt(0, 0), pt(3, 0), pt(3.5, HR3), pt(3, 2 * HR3), pt(-1, 2 * HR3),
  ];
  const meta = makeMetaTile(outline, 2);
  addChild(meta, [0.5, 0, 1.5, 0, 0.5, HR3] as Transform, F_hat);
  addChild(meta,
    mul(ttrans(0, 2 * HR3), mul([0.5, HR3, 0, -HR3, 0.5, 0] as Transform, [0.5, 0, 0, 0, 0.5, 0] as Transform)),
    F_hat);
  return meta;
}

// ─── Patch Construction (Substitution Rules) ────────────────────────────────

type Rule = [string] | [number, number, string, number] | [number, number, number, number, string, number];

function constructPatch(
  H: MetaTileGeometry, T: MetaTileGeometry, P: MetaTileGeometry, F: MetaTileGeometry
): MetaTileGeometry {
  const rules: Rule[] = [
    ['H'],
    [0, 0, 'P', 2],
    [1, 0, 'H', 2],
    [2, 0, 'P', 2],
    [3, 0, 'H', 2],
    [4, 4, 'P', 2],
    [0, 4, 'F', 3],
    [2, 4, 'F', 3],
    [4, 1, 3, 2, 'F', 0],
    [8, 3, 'H', 0],
    [9, 2, 'P', 0],
    [10, 2, 'H', 0],
    [11, 4, 'P', 2],
    [12, 0, 'H', 2],
    [13, 0, 'F', 3],
    [14, 2, 'F', 1],
    [15, 3, 'H', 4],
    [8, 2, 'F', 1],
    [17, 3, 'H', 0],
    [18, 2, 'P', 0],
    [19, 2, 'H', 2],
    [20, 4, 'F', 3],
    [20, 0, 'P', 2],
    [22, 0, 'H', 2],
    [23, 4, 'F', 3],
    [23, 0, 'F', 3],
    [16, 0, 'P', 2],
    [9, 4, 0, 2, 'T', 2],
    [4, 0, 'F', 3],
  ];

  const shapes: Record<string, MetaTileGeometry> = { H, T, P, F };
  const ret = makeMetaTile([], H.width);

  for (const r of rules) {
    if (r.length === 1) {
      addChild(ret, IDENT, shapes[r[0] as string]);
    } else if (r.length === 4) {
      const [idx, vertIdx, tileType, matchIdx] = r as [number, number, string, number];
      const poly = ret.children[idx].geom.shape;
      const T_mat = ret.children[idx].T;
      const P_pt = transPt(T_mat, poly[(vertIdx + 1) % poly.length]);
      const Q_pt = transPt(T_mat, poly[vertIdx]);
      const nshp = shapes[tileType];
      const npoly = nshp.shape;
      addChild(ret, matchTwo(npoly[matchIdx], npoly[(matchIdx + 1) % npoly.length], P_pt, Q_pt), nshp);
    } else {
      const [idx1, v1, idx2, v2, tileType, matchIdx] = r as [number, number, number, number, string, number];
      const chP = ret.children[idx1];
      const chQ = ret.children[idx2];
      const P_pt = transPt(chQ.T, chQ.geom.shape[v2]);
      const Q_pt = transPt(chP.T, chP.geom.shape[v1]);
      const nshp = shapes[tileType];
      const npoly = nshp.shape;
      addChild(ret, matchTwo(npoly[matchIdx], npoly[(matchIdx + 1) % npoly.length], P_pt, Q_pt), nshp);
    }
  }

  return ret;
}

// ─── Metatile Extraction ────────────────────────────────────────────────────

function constructMetatiles(
  patch: MetaTileGeometry
): [MetaTileGeometry, MetaTileGeometry, MetaTileGeometry, MetaTileGeometry] {
  const bps1 = evalChild(patch, 8, 2);
  const bps2 = evalChild(patch, 21, 2);
  const rbps = transPt(rotAbout(bps1, -2.0 * Math.PI / 3.0), bps2);

  const p72 = evalChild(patch, 7, 2);
  const p252 = evalChild(patch, 25, 2);

  const llc = intersect(bps1, rbps, evalChild(patch, 6, 2), p72);
  let w = psub(evalChild(patch, 6, 2), llc);

  const newHOutline: Point[] = [llc, bps1];
  w = transPt(trot(-Math.PI / 3), w);
  newHOutline.push(padd(newHOutline[1], w));
  newHOutline.push(evalChild(patch, 14, 2));
  w = transPt(trot(-Math.PI / 3), w);
  newHOutline.push(psub(newHOutline[3], w));
  newHOutline.push(evalChild(patch, 6, 2));

  const newH = makeMetaTile(newHOutline, patch.width * 2);
  for (const ch of [0, 9, 16, 27, 26, 6, 1, 8, 10, 15]) {
    addChild(newH, patch.children[ch].T, patch.children[ch].geom);
  }

  const newPOutline = [p72, padd(p72, psub(bps1, llc)), bps1, llc];
  const newP = makeMetaTile(newPOutline, patch.width * 2);
  for (const ch of [7, 2, 3, 4, 28]) {
    addChild(newP, patch.children[ch].T, patch.children[ch].geom);
  }

  const newFOutline = [
    bps2, evalChild(patch, 24, 2), evalChild(patch, 25, 0),
    p252, padd(p252, psub(llc, bps1)),
  ];
  const newF = makeMetaTile(newFOutline, patch.width * 2);
  for (const ch of [21, 20, 22, 23, 24, 25]) {
    addChild(newF, patch.children[ch].T, patch.children[ch].geom);
  }

  const AAA = newHOutline[2];
  const BBB = padd(newHOutline[1], psub(newHOutline[4], newHOutline[5]));
  const CCC = transPt(rotAbout(BBB, -Math.PI / 3), AAA);
  const newTOutline = [BBB, CCC, AAA];
  const newT = makeMetaTile(newTOutline, patch.width * 2);
  addChild(newT, patch.children[11].T, patch.children[11].geom);

  recentre(newH);
  recentre(newP);
  recentre(newF);
  recentre(newT);

  return [newH, newT, newP, newF];
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface HatTileResult {
  /** Polygon vertices in world coordinates */
  vertices: Point[];
  /** Centroid of the tile (for hover detection) */
  centroid: Point;
  /** Tile label (H, H1, T, P, F) */
  label: string;
}

/**
 * Collect all hat tiles from the geometry tree, applying transforms.
 */
function collectTiles(geom: Geometry, T: Transform, out: HatTileResult[]): void {
  if (geom.type === 'hat') {
    const vertices = HAT_OUTLINE.map(p => transPt(T, p));
    const cx = vertices.reduce((s, p) => s + p.x, 0) / vertices.length;
    const cy = vertices.reduce((s, p) => s + p.y, 0) / vertices.length;
    out.push({ vertices, centroid: { x: cx, y: cy }, label: geom.label });
  } else {
    for (const child of geom.children) {
      collectTiles(child.geom, mul(T, child.T), out);
    }
  }
}

/**
 * Generate a hat monotile tiling.
 *
 * @param levels Number of substitution levels (3-4 recommended).
 *               More levels = more tiles = covers larger area.
 * @returns Array of hat tile polygons with their centroids.
 */
export function generateHatTiling(levels: number = 3): HatTileResult[] {
  let tiles: [MetaTileGeometry, MetaTileGeometry, MetaTileGeometry, MetaTileGeometry] = [
    createInitH(),
    createInitT(),
    createInitP(),
    createInitF(),
  ];

  for (let i = 0; i < levels; i++) {
    const patch = constructPatch(...tiles);
    tiles = constructMetatiles(patch);
  }

  const result: HatTileResult[] = [];
  // Use H metatile (index 0) as the primary tiling source
  collectTiles(tiles[0], IDENT, result);
  return result;
}

/**
 * Check if a point is inside a polygon (ray-casting algorithm).
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
