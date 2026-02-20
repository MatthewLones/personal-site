import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';

const VALID_GAMES = ['lights_out', 'klondike', 'peg_solitaire', 'monotile_dash'];

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { game } = body;

  if (!game || !VALID_GAMES.includes(game)) {
    return error('Invalid game');
  }

  const token = crypto.randomUUID();
  const now = Date.now();

  const kv = locals.runtime.env.SESSIONS;
  await kv.put(
    token,
    JSON.stringify({ game, startTime: now, hintUsed: false }),
    { expirationTtl: 1800 },
  );

  return json({ token, startTime: now });
};
