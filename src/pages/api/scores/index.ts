import type { APIRoute } from 'astro';
import { json, error, getIpHash, checkRateLimit } from '../../../lib/api-helpers';

const MIN_TIMES: Record<string, number> = {
  lights_out: 8000,
  klondike: 5000,
  peg_solitaire: 30000,
  monotile_dash: 1000,
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { token, playerName, game, moves, tilesClicked } = body;

  if (!token || !playerName || !game) {
    return error('Missing required fields');
  }

  // Validate session token
  const kv = locals.runtime.env.SESSIONS;
  const raw = await kv.get(token);
  if (!raw) return error('Invalid or expired session', 403);

  const session = JSON.parse(raw);
  if (session.game !== game) return error('Game mismatch');

  // Server-side time calculation
  const timeMs = Date.now() - session.startTime;
  if (timeMs < (MIN_TIMES[game] || 0)) {
    return error('Suspiciously fast');
  }

  // Sanitize name
  const name = String(playerName).trim().slice(0, 20);
  if (!name) return error('Name required');

  // Rate limiting: max 10 submissions per IP per hour
  const ipHash = await getIpHash(request);
  const allowed = await checkRateLimit(kv, `rl:score:${ipHash}`, 10, 3600);
  if (!allowed) return error('Too many submissions', 429);

  // Insert score
  const db = locals.runtime.env.DB;
  await db
    .prepare(
      `INSERT INTO scores (game, player_name, time_ms, moves, tiles_clicked, used_hint, session_token, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      game,
      name,
      timeMs,
      moves ?? null,
      tilesClicked ?? null,
      session.hintUsed ? 1 : 0,
      token,
      ipHash,
    )
    .run();

  // Consume token (one-time use)
  await kv.delete(token);

  // Calculate rank
  let rankQuery: string;
  let rankBindings: unknown[];
  if (game === 'monotile_dash') {
    rankQuery = `SELECT COUNT(*) as rank FROM scores WHERE game = ? AND flagged = 0 AND tiles_clicked > ?`;
    rankBindings = [game, tilesClicked ?? 0];
  } else {
    const hintClause = game === 'lights_out' ? ' AND used_hint = 0' : '';
    rankQuery = `SELECT COUNT(*) as rank FROM scores WHERE game = ? AND flagged = 0${hintClause} AND time_ms < ?`;
    rankBindings = [game, timeMs];
  }

  const rankResult = await db.prepare(rankQuery).bind(...rankBindings).first<{ rank: number }>();
  const rank = (rankResult?.rank ?? 0) + 1;

  return json({ rank, timeMs, hintUsed: session.hintUsed });
};
