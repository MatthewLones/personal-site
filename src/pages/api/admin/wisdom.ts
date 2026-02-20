import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';
import { validateAdminSession } from '../../../lib/admin-auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  if (!(await validateAdminSession(request, db))) {
    return error('Unauthorized', 401);
  }

  const results = await db
    .prepare('SELECT id, message, read, created_at FROM wisdom ORDER BY created_at DESC LIMIT 100')
    .all();

  return json(results.results);
};

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  if (!(await validateAdminSession(request, db))) {
    return error('Unauthorized', 401);
  }

  const body = await request.json();
  const { action, id } = body;

  if (action === 'mark_read') {
    await db.prepare('UPDATE wisdom SET read = 1 WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (action === 'delete') {
    await db.prepare('DELETE FROM wisdom WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  return error('Unknown action');
};
