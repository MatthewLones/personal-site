import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';
import { validateAdminSession } from '../../../lib/admin-auth';

/** GET: list all scores (including flagged) for admin review */
export const GET: APIRoute = async ({ request, url, locals }) => {
  const db = locals.runtime.env.DB;
  if (!(await validateAdminSession(request, db))) {
    return error('Unauthorized', 401);
  }

  const game = url.searchParams.get('game');
  let query: string;
  let bindings: string[] = [];

  if (game) {
    query = `SELECT id, game, player_name, time_ms, moves, tiles_clicked, used_hint, flagged, created_at, ip_hash
             FROM scores WHERE game = ? ORDER BY created_at DESC LIMIT 100`;
    bindings = [game];
  } else {
    query = `SELECT id, game, player_name, time_ms, moves, tiles_clicked, used_hint, flagged, created_at
             FROM scores ORDER BY created_at DESC LIMIT 100`;
  }

  const results = await db.prepare(query).bind(...bindings).all();
  return json(results.results);
};

/** POST: flag/unflag or seed a score */
export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  if (!(await validateAdminSession(request, db))) {
    return error('Unauthorized', 401);
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'flag') {
    const { id, flagged } = body;
    await db
      .prepare('UPDATE scores SET flagged = ? WHERE id = ?')
      .bind(flagged ? 1 : 0, id)
      .run();
    return json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = body;
    await db.prepare('DELETE FROM scores WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (action === 'seed') {
    const { game, playerName, timeMs, moves, tilesClicked } = body;
    await db
      .prepare(
        `INSERT INTO scores (game, player_name, time_ms, moves, tiles_clicked, session_token, ip_hash)
         VALUES (?, ?, ?, ?, ?, 'admin-seed', 'admin')`,
      )
      .bind(
        game,
        String(playerName).trim().slice(0, 20),
        timeMs,
        moves ?? null,
        tilesClicked ?? null,
      )
      .run();
    return json({ ok: true });
  }

  return error('Unknown action');
};
