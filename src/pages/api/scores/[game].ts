import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';

const VALID_GAMES = ['lights_out', 'klondike', 'peg_solitaire', 'monotile_dash'];

export const GET: APIRoute = async ({ params, locals }) => {
  const { game } = params;
  if (!game || !VALID_GAMES.includes(game)) {
    return error('Invalid game');
  }

  const db = locals.runtime.env.DB;
  let query: string;

  if (game === 'monotile_dash') {
    query = `SELECT player_name, time_ms, tiles_clicked, created_at
             FROM scores WHERE game = ? AND flagged = 0
             ORDER BY tiles_clicked DESC LIMIT 20`;
  } else {
    const hintClause = game === 'lights_out' ? ' AND used_hint = 0' : '';
    query = `SELECT player_name, time_ms, moves, created_at
             FROM scores WHERE game = ? AND flagged = 0${hintClause}
             ORDER BY time_ms ASC LIMIT 20`;
  }

  const results = await db.prepare(query).bind(game).all();
  return json(results.results);
};

export const prerender = false;
