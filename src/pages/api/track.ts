import type { APIRoute } from 'astro';
import { json } from '../../lib/api-helpers';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const path = String(body.path || '/').slice(0, 200);
    const referrer = body.referrer ? String(body.referrer).slice(0, 500) : null;

    const db = locals.runtime.env.DB;
    await db
      .prepare('INSERT INTO page_views (path, referrer) VALUES (?, ?)')
      .bind(path, referrer)
      .run();
  } catch {
    // Silently fail — analytics should never break the user experience
  }

  return json({ ok: true });
};
