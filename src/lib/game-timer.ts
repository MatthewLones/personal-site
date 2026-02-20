/**
 * Shared game timer & session management for competitive leaderboards.
 * Each game creates a server-side session on start, and submits the
 * score on win. The server calculates the actual elapsed time.
 */

export interface GameSession {
  game: string;
  token: string;
  startTime: number;
  hintUsed: boolean;
  running: boolean;
}

export async function startSession(game: string): Promise<GameSession> {
  try {
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game }),
    });
    if (!res.ok) throw new Error('Session start failed');
    const { token, startTime } = await res.json();
    return { game, token, startTime, hintUsed: false, running: true };
  } catch {
    // Fallback: client-only session (no leaderboard, but game still works)
    return {
      game,
      token: '',
      startTime: Date.now(),
      hintUsed: false,
      running: true,
    };
  }
}

export function getElapsed(session: GameSession): number {
  return Date.now() - session.startTime;
}

export function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const frac = Math.floor((ms % 1000) / 100);
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}.${frac}`;
  return `${s}.${frac}`;
}

export async function markHintUsed(session: GameSession): Promise<void> {
  session.hintUsed = true;
  if (!session.token) return;
  try {
    await fetch('/api/session/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session.token }),
    });
  } catch {
    // Non-critical — hint flag is also tracked client-side
  }
}

export interface ScoreResult {
  rank: number;
  timeMs: number;
  hintUsed: boolean;
}

export async function submitScore(
  session: GameSession,
  playerName: string,
  extras: { moves?: number; tilesClicked?: number } = {},
): Promise<ScoreResult | null> {
  if (!session.token) return null;
  session.running = false;
  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: session.token,
        playerName,
        game: session.game,
        ...extras,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface LeaderboardEntry {
  player_name: string;
  time_ms: number;
  moves?: number;
  tiles_clicked?: number;
  created_at: string;
}

export async function fetchLeaderboard(game: string): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/scores/${game}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
