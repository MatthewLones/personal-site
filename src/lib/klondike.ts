// ═══════════════════════════════════════════════════════════════
//  Back From The Klondike — Sam Loyd's 1898 Jump Maze
//  Start at the heart (center). Each cell's number tells you
//  how many steps to jump in one of 8 directions. Escape by
//  landing exactly on a border cell.
// ═══════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────

export type CellKind = 'empty' | 'border' | 'number';

export interface Cell {
  kind: CellKind;
  value: number; // 1-9 for number cells, 0 otherwise
}

export interface Pos {
  row: number;
  col: number;
}

export interface Direction {
  dr: number;
  dc: number;
  label: string;
}

export interface ValidMove {
  dir: Direction;
  target: Pos;
}

export interface KlondikeState {
  grid: Cell[][];
  rows: number;
  cols: number;
  path: Pos[];
  currentPos: Pos;
  solved: boolean;
  moves: number;
}

// ─── Directions ───────────────────────────────────────────────

export const DIRECTIONS: Direction[] = [
  { dr: -1, dc: 0, label: 'N' },
  { dr: -1, dc: 1, label: 'NE' },
  { dr: 0, dc: 1, label: 'E' },
  { dr: 1, dc: 1, label: 'SE' },
  { dr: 1, dc: 0, label: 'S' },
  { dr: 1, dc: -1, label: 'SW' },
  { dr: 0, dc: -1, label: 'W' },
  { dr: -1, dc: -1, label: 'NW' },
];

// ─── Grid Data ────────────────────────────────────────────────
// Sam Loyd's original grid (with the corrected artist's error).
// Encoding: ' ' = empty, 'x' = border/exit, '1'-'9' = numbered cell.
// The grid is stored as an array of strings, one per row.
// Rows are padded to equal length with spaces.

const GRID_RAW: string[] = [
  '          xxx          ',
  '       xxx477xxx       ',
  '     xx544833463xx     ',
  '    x1451114517135x    ',
  '   x494967555876685x   ',
  '  x37298356739187585x  ',
  '  x14784292711822763x  ',
  ' x7218553113133428613x ',
  ' x4267252422543281773x ',
  ' x4165111914344319827x ',
  'x435232232425351135537x',
  'x271511315332423775427x',
  'x252261244634121265188x',
  ' x4375193445294195748x ',
  ' x4167834341312323624x ',
  ' x7326153923215758954x ',
  '  x16734811121228941x  ',
  '  x25478756135787293x  ',
  '   x656467252263474x   ',
  '    x2312333213211x    ',
  '     xx744573447xx     ',
  '       xxx334xxx       ',
  '          xxx          ',
];

// Start position: the heart in the center
export const START_ROW = 11;
export const START_COL = 11;

// ─── Grid Parsing ─────────────────────────────────────────────

function parseGrid(): { grid: Cell[][]; rows: number; cols: number } {
  const rows = GRID_RAW.length;
  const cols = Math.max(...GRID_RAW.map((r) => r.length));
  const grid: Cell[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    const line = GRID_RAW[r].padEnd(cols, ' ');
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      if (ch === 'x') {
        row.push({ kind: 'border', value: 0 });
      } else if (ch >= '1' && ch <= '9') {
        row.push({ kind: 'number', value: parseInt(ch, 10) });
      } else {
        row.push({ kind: 'empty', value: 0 });
      }
    }
    grid.push(row);
  }

  return { grid, rows, cols };
}

// ─── State ────────────────────────────────────────────────────

export function createState(): KlondikeState {
  const { grid, rows, cols } = parseGrid();
  const start: Pos = { row: START_ROW, col: START_COL };
  return {
    grid,
    rows,
    cols,
    path: [start],
    currentPos: start,
    solved: false,
    moves: 0,
  };
}

// ─── Game Logic ───────────────────────────────────────────────

function inBounds(state: KlondikeState, r: number, c: number): boolean {
  return r >= 0 && r < state.rows && c >= 0 && c < state.cols;
}

/** Get all valid moves from the current position */
export function getValidMoves(state: KlondikeState): ValidMove[] {
  if (state.solved) return [];

  const { row, col } = state.currentPos;
  const cell = state.grid[row][col];
  if (cell.kind !== 'number') return [];

  const steps = cell.value;
  const moves: ValidMove[] = [];

  for (const dir of DIRECTIONS) {
    const tr = row + dir.dr * steps;
    const tc = col + dir.dc * steps;

    if (!inBounds(state, tr, tc)) continue;

    const target = state.grid[tr][tc];
    // Can land on a numbered cell or a border cell (win)
    if (target.kind === 'number' || target.kind === 'border') {
      moves.push({ dir, target: { row: tr, col: tc } });
    }
  }

  return moves;
}

/** Make a move in the given direction. Returns new state. */
export function makeMove(state: KlondikeState, dir: Direction): KlondikeState {
  const { row, col } = state.currentPos;
  const cell = state.grid[row][col];
  if (cell.kind !== 'number') return state;

  const steps = cell.value;
  const tr = row + dir.dr * steps;
  const tc = col + dir.dc * steps;

  if (!inBounds(state, tr, tc)) return state;

  const target = state.grid[tr][tc];
  if (target.kind === 'empty') return state;

  const newPos: Pos = { row: tr, col: tc };
  const solved = target.kind === 'border';

  return {
    ...state,
    path: [...state.path, newPos],
    currentPos: newPos,
    solved,
    moves: state.moves + 1,
  };
}

/** Undo the last move */
export function undoMove(state: KlondikeState): KlondikeState {
  if (state.path.length <= 1) return state;

  const newPath = state.path.slice(0, -1);
  return {
    ...state,
    path: newPath,
    currentPos: newPath[newPath.length - 1],
    solved: false,
    moves: state.moves - 1,
  };
}

/** Reset to start */
export function resetPuzzle(): KlondikeState {
  return createState();
}

/** Check if undo is possible */
export function canUndo(state: KlondikeState): boolean {
  return state.path.length > 1;
}

// ─── Hit Testing ──────────────────────────────────────────────

/** Given pixel coords on the canvas, find which grid cell was clicked */
export function hitTestCell(
  px: number,
  py: number,
  cellSize: number,
  padding: number,
  rows: number,
  cols: number,
): Pos | null {
  const col = Math.floor((px - padding) / cellSize);
  const row = Math.floor((py - padding) / cellSize);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}

// ─── Solver (DFS) ─────────────────────────────────────────────
// Finds solution paths from start to any border cell.
// Returns up to `maxSolutions` paths as arrays of Directions.

export function solve(
  maxSolutions: number = 1,
): Direction[][] {
  const { grid, rows, cols } = parseGrid();
  const solutions: Direction[][] = [];
  const visited = new Set<string>();

  function key(r: number, c: number): string {
    return `${r},${c}`;
  }

  function dfs(r: number, c: number, path: Direction[]): void {
    if (solutions.length >= maxSolutions) return;

    const cell = grid[r][c];
    if (cell.kind !== 'number') return;

    const steps = cell.value;
    visited.add(key(r, c));

    for (const dir of DIRECTIONS) {
      if (solutions.length >= maxSolutions) break;

      const tr = r + dir.dr * steps;
      const tc = c + dir.dc * steps;

      if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) continue;

      const target = grid[tr][tc];
      if (target.kind === 'empty') continue;

      if (target.kind === 'border') {
        solutions.push([...path, dir]);
        continue;
      }

      if (!visited.has(key(tr, tc))) {
        dfs(tr, tc, [...path, dir]);
      }
    }

    visited.delete(key(r, c));
  }

  dfs(START_ROW, START_COL, []);
  return solutions;
}
