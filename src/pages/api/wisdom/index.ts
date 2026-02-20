import type { APIRoute } from 'astro';
import { json, error, getIpHash, checkRateLimit } from '../../../lib/api-helpers';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== 'string') {
    return error('Message required');
  }

  const text = message.trim().slice(0, 500);
  if (!text) return error('Message required');

  // Rate limiting: max 3 per IP per hour
  const kv = locals.runtime.env.SESSIONS;
  const ipHash = await getIpHash(request);
  const allowed = await checkRateLimit(kv, `rl:wisdom:${ipHash}`, 3, 3600);
  if (!allowed) return error('Too many messages', 429);

  const db = locals.runtime.env.DB;
  await db
    .prepare('INSERT INTO wisdom (message, ip_hash) VALUES (?, ?)')
    .bind(text, ipHash)
    .run();

  return json({ ok: true });
};
