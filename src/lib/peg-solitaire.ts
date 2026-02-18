// ═══════════════════════════════════════════════════════════════
//  Peg Solitaire — English Board (33 holes, cross-shaped)
//  Jump pegs over adjacent pegs to remove them.
//  Goal: one peg remaining, ideally in the center.
// ═══════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────

export interface Pos {
  row: number;
  col: number;
}

export interface PegMove {
  from: Pos;
  over: Pos;
  to: Pos;
}

export interface PegState {
  board: boolean[][];
  selectedPeg: Pos | null;
  pegsRemaining: number;
  moves: number;
  moveHistory: PegMove[];
  solved: boolean;
}

// ─── Constants ────────────────────────────────────────────────

export const BOARD_SIZE = 7;
export const CENTER: Pos = { row: 3, col: 3 };

/** Cross-shaped valid cell mask */
export const VALID_CELLS: boolean[][] = [
  [false, false, true,  true,  true,  false, false],
  [false, false, true,  true,  true,  false, false],
  [true,  true,  true,  true,  true,  true,  true],
  [true,  true,  true,  true,  true,  true,  true],
  [true,  true,  true,  true,  true,  true,  true],
  [false, false, true,  true,  true,  false, false],
  [false, false, true,  true,  true,  false, false],
];

const DIRECTIONS: { dr: number; dc: number }[] = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────

export function isValidCell(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && VALID_CELLS[r][c];
}

function cloneBoard(board: boolean[][]): boolean[][] {
  return board.map((row) => [...row]);
}

// ─── State ────────────────────────────────────────────────────

export function createState(): PegState {
  const board: boolean[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(VALID_CELLS[r][c] && !(r === CENTER.row && c === CENTER.col));
    }
    board.push(row);
  }
  return {
    board,
    selectedPeg: null,
    pegsRemaining: 32,
    moves: 0,
    moveHistory: [],
    solved: false,
  };
}

// ─── Move Logic ───────────────────────────────────────────────

/** Get all valid moves for a specific peg */
export function getMovesForPeg(state: PegState, pos: Pos): PegMove[] {
  if (!state.board[pos.row][pos.col]) return [];

  const moves: PegMove[] = [];
  for (const { dr, dc } of DIRECTIONS) {
    const overR = pos.row + dr;
    const overC = pos.col + dc;
    const toR = pos.row + dr * 2;
    const toC = pos.col + dc * 2;

    if (
      isValidCell(toR, toC) &&
      state.board[overR][overC] &&
      !state.board[toR][toC]
    ) {
      moves.push({
        from: pos,
        over: { row: overR, col: overC },
        to: { row: toR, col: toC },
      });
    }
  }
  return moves;
}

/** Get all valid moves on the board */
export function getValidMoves(state: PegState): PegMove[] {
  const moves: PegMove[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (state.board[r][c]) {
        moves.push(...getMovesForPeg(state, { row: r, col: c }));
      }
    }
  }
  return moves;
}

/** Execute a move */
export function makeMove(state: PegState, move: PegMove): PegState {
  const board = cloneBoard(state.board);
  board[move.from.row][move.from.col] = false;
  board[move.over.row][move.over.col] = false;
  board[move.to.row][move.to.col] = true;

  const pegsRemaining = state.pegsRemaining - 1;

  return {
    board,
    selectedPeg: null,
    pegsRemaining,
    moves: state.moves + 1,
    moveHistory: [...state.moveHistory, move],
    solved: pegsRemaining === 1,
  };
}

/** Undo the last move */
export function undoMove(state: PegState): PegState {
  if (state.moveHistory.length === 0) return state;

  const history = [...state.moveHistory];
  const move = history.pop()!;

  const board = cloneBoard(state.board);
  board[move.from.row][move.from.col] = true;
  board[move.over.row][move.over.col] = true;
  board[move.to.row][move.to.col] = false;

  return {
    board,
    selectedPeg: null,
    pegsRemaining: state.pegsRemaining + 1,
    moves: state.moves - 1,
    moveHistory: history,
    solved: false,
  };
}

/** Check if undo is possible */
export function canUndo(state: PegState): boolean {
  return state.moveHistory.length > 0;
}

/** Reset to start */
export function resetPuzzle(): PegState {
  return createState();
}

/** Check if game is stuck (no moves but not solved) */
export function isStuck(state: PegState): boolean {
  return !state.solved && getValidMoves(state).length === 0;
}

// ─── Hit Testing ──────────────────────────────────────────────

/** Given pixel coords on the canvas, find which grid cell was clicked */
export function hitTestCell(
  px: number,
  py: number,
  cellSize: number,
  padding: number,
): Pos | null {
  const col = Math.floor((px - padding) / cellSize);
  const row = Math.floor((py - padding) / cellSize);
  if (!isValidCell(row, col)) return null;
  return { row, col };
}

// ═══════════════════════════════════════════════════════════════
//  Conway's Soldiers — Pagoda Function Demo
//  Fill a half-plane with pegs below a line. Try to advance
//  a peg as far above the line as possible. Impossibility of
//  reaching row 5 proved via the golden ratio pagoda function.
// ═══════════════════════════════════════════════════════════════

export const PHI = (1 + Math.sqrt(5)) / 2;

export interface SoldiersState {
  board: boolean[][];
  cols: number;
  rows: number;
  lineRow: number;       // row index of the dividing line (pegs start below)
  targetRow: number;     // row we're trying to reach (0 = top)
  targetCol: number;     // column of the target
  selectedPeg: Pos | null;
  moveHistory: PegMove[];
  highestReached: number; // highest row a peg has reached above line
}

export function createSoldiersState(): SoldiersState {
  const cols = 11;
  const rows = 9;
  const lineRow = 4; // line between row 4 and 5
  const targetCol = Math.floor(cols / 2);

  const board: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      // Fill rows below the line (lineRow + 1 through end)
      row.push(r > lineRow);
    }
    board.push(row);
  }

  return {
    board,
    cols,
    rows,
    lineRow,
    targetRow: 0,
    targetCol,
    selectedPeg: null,
    moveHistory: [],
    highestReached: lineRow + 1,
  };
}

function soldiersInBounds(state: SoldiersState, r: number, c: number): boolean {
  return r >= 0 && r < state.rows && c >= 0 && c < state.cols;
}

export function getSoldiersMovesForPeg(state: SoldiersState, pos: Pos): PegMove[] {
  if (!state.board[pos.row][pos.col]) return [];

  const moves: PegMove[] = [];
  for (const { dr, dc } of DIRECTIONS) {
    const overR = pos.row + dr;
    const overC = pos.col + dc;
    const toR = pos.row + dr * 2;
    const toC = pos.col + dc * 2;

    if (
      soldiersInBounds(state, toR, toC) &&
      state.board[overR][overC] &&
      !state.board[toR][toC]
    ) {
      moves.push({
        from: pos,
        over: { row: overR, col: overC },
        to: { row: toR, col: toC },
      });
    }
  }
  return moves;
}

export function getSoldiersValidMoves(state: SoldiersState): PegMove[] {
  const moves: PegMove[] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.board[r][c]) {
        moves.push(...getSoldiersMovesForPeg(state, { row: r, col: c }));
      }
    }
  }
  return moves;
}

export function makeSoldiersMove(state: SoldiersState, move: PegMove): SoldiersState {
  const board = state.board.map((row) => [...row]);
  board[move.from.row][move.from.col] = false;
  board[move.over.row][move.over.col] = false;
  board[move.to.row][move.to.col] = true;

  const highestReached = Math.min(state.highestReached, move.to.row);

  return {
    ...state,
    board,
    selectedPeg: null,
    moveHistory: [...state.moveHistory, move],
    highestReached,
  };
}

export function undoSoldiersMove(state: SoldiersState): SoldiersState {
  if (state.moveHistory.length === 0) return state;

  const history = [...state.moveHistory];
  const move = history.pop()!;

  const board = state.board.map((row) => [...row]);
  board[move.from.row][move.from.col] = true;
  board[move.over.row][move.over.col] = true;
  board[move.to.row][move.to.col] = false;

  // Recompute highest reached from remaining history
  let highestReached = state.lineRow + 1;
  for (const m of history) {
    if (m.to.row < highestReached) highestReached = m.to.row;
  }

  return {
    ...state,
    board,
    selectedPeg: null,
    moveHistory: history,
    highestReached,
  };
}

/** Pagoda weight for a single cell relative to target */
export function cellWeight(
  row: number,
  col: number,
  targetRow: number,
  targetCol: number,
): number {
  const dist = Math.abs(row - targetRow) + Math.abs(col - targetCol);
  return Math.pow(PHI, -dist);
}

/** Total pagoda value of all pegs on the board */
export function boardPagodaTotal(state: SoldiersState): number {
  let total = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.board[r][c]) {
        total += cellWeight(r, c, state.targetRow, state.targetCol);
      }
    }
  }
  return total;
}

/** Hit test for soldiers board */
export function hitTestSoldiersCell(
  px: number,
  py: number,
  cellSize: number,
  padding: number,
  state: SoldiersState,
): Pos | null {
  const col = Math.floor((px - padding) / cellSize);
  const row = Math.floor((py - padding) / cellSize);
  if (!soldiersInBounds(state, row, col)) return null;
  return { row, col };
}
