import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';
import { setAdminCookie } from '../../../lib/admin-auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  const { password } = body;

  const adminPassword = locals.runtime.env.ADMIN_PASSWORD;
  if (!password || password !== adminPassword) {
    return error('Invalid password', 401);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const db = locals.runtime.env.DB;
  await db
    .prepare('INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)')
    .bind(token, expiresAt)
    .run();

  // Clean up expired sessions
  await db
    .prepare('DELETE FROM admin_sessions WHERE expires_at < datetime(?)')
    .bind(new Date().toISOString())
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setAdminCookie(token),
    },
  });
};
