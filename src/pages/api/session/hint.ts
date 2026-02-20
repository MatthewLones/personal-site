import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';

export const POST: APIRoute = async ({ request, locals }) => {
  const { token } = await request.json();
  if (!token) return error('Token required');

  const kv = locals.runtime.env.SESSIONS;
  const raw = await kv.get(token);
  if (!raw) return error('Invalid session', 403);

  const session = JSON.parse(raw);
  session.hintUsed = true;
  await kv.put(token, JSON.stringify(session), { expirationTtl: 1800 });

  return json({ ok: true });
};
