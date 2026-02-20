/**
 * Monotile Dash — Speed game on the hat tiling background.
 * 30-second timer. A random visible tile lights up. Click it.
 * Wrong tile = game over. Compete for most tiles clicked.
 */

export type DashPhase = 'idle' | 'countdown' | 'playing' | 'finished';

export interface DashState {
  phase: DashPhase;
  score: number;
  targetTile: number;          // index into the visible tiles array
  visibleTiles: number[];      // indices into the full tile array
  startTime: number;           // timestamp when playing phase began
  endTime: number;             // when game ended (timeout or misclick)
  duration: number;            // game duration in ms (30s default)
  countdownStart: number;      // timestamp when countdown began
  failedOnMisclick: boolean;
}

export function createDashState(): DashState {
  return {
    phase: 'idle',
    score: 0,
    targetTile: -1,
    visibleTiles: [],
    startTime: 0,
    endTime: 0,
    duration: 30000,
    countdownStart: 0,
    failedOnMisclick: false,
  };
}

export function startCountdown(state: DashState, visibleTiles: number[]): DashState {
  return {
    ...state,
    phase: 'countdown',
    score: 0,
    visibleTiles,
    countdownStart: performance.now(),
    failedOnMisclick: false,
  };
}

export function startPlaying(state: DashState): DashState {
  const newState = {
    ...state,
    phase: 'playing' as DashPhase,
    startTime: performance.now(),
  };
  return pickNextTarget(newState);
}

export function pickNextTarget(state: DashState): DashState {
  if (state.visibleTiles.length === 0) return state;
  // Pick a random visible tile that's different from current
  let next: number;
  do {
    next = Math.floor(Math.random() * state.visibleTiles.length);
  } while (next === state.targetTile && state.visibleTiles.length > 1);
  return { ...state, targetTile: next };
}

/** Returns the actual tile index (into the full tiles array) of the current target */
export function getTargetTileIndex(state: DashState): number {
  if (state.targetTile < 0 || state.targetTile >= state.visibleTiles.length) return -1;
  return state.visibleTiles[state.targetTile];
}

/** Handle a tile click during gameplay. Returns updated state. */
export function handleTileClick(state: DashState, clickedTileIndex: number): DashState {
  if (state.phase !== 'playing') return state;

  const targetIndex = getTargetTileIndex(state);
  if (clickedTileIndex === targetIndex) {
    // Correct! Score +1, pick new target
    const newState = { ...state, score: state.score + 1 };
    return pickNextTarget(newState);
  } else {
    // Wrong tile — game over
    return {
      ...state,
      phase: 'finished',
      endTime: performance.now(),
      failedOnMisclick: true,
    };
  }
}

/** Check if time is up. Call this each frame. */
export function checkTimeout(state: DashState): DashState {
  if (state.phase !== 'playing') return state;
  const elapsed = performance.now() - state.startTime;
  if (elapsed >= state.duration) {
    return {
      ...state,
      phase: 'finished',
      endTime: state.startTime + state.duration,
    };
  }
  return state;
}

/** Get remaining time in seconds */
export function getTimeRemaining(state: DashState): number {
  if (state.phase !== 'playing') return state.duration / 1000;
  const elapsed = performance.now() - state.startTime;
  return Math.max(0, (state.duration - elapsed) / 1000);
}

/** Get countdown number (3, 2, 1) or 0 if countdown is over */
export function getCountdownNumber(state: DashState): number {
  if (state.phase !== 'countdown') return 0;
  const elapsed = (performance.now() - state.countdownStart) / 1000;
  if (elapsed < 1) return 3;
  if (elapsed < 2) return 2;
  if (elapsed < 3) return 1;
  return 0;
}

/** Check if countdown is complete (3 seconds elapsed) */
export function isCountdownDone(state: DashState): boolean {
  if (state.phase !== 'countdown') return false;
  return (performance.now() - state.countdownStart) / 1000 >= 3;
}
