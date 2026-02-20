import type { APIRoute } from 'astro';
import { json, error } from '../../../lib/api-helpers';
import { validateAdminSession } from '../../../lib/admin-auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;
  if (!(await validateAdminSession(request, db))) {
    return error('Unauthorized', 401);
  }

  // Aggregate stats
  const [totalViews, todayViews, topReferrers, scoreCount, wisdomCount] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM page_views').first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM page_views WHERE created_at > datetime('now', '-1 day')")
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT referrer, COUNT(*) as count FROM page_views
         WHERE referrer IS NOT NULL AND referrer != ''
         GROUP BY referrer ORDER BY count DESC LIMIT 10`,
      )
      .all(),
    db.prepare('SELECT COUNT(*) as count FROM scores').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM wisdom WHERE read = 0').first<{ count: number }>(),
  ]);

  return json({
    totalViews: totalViews?.count ?? 0,
    todayViews: todayViews?.count ?? 0,
    topReferrers: topReferrers.results,
    totalScores: scoreCount?.count ?? 0,
    unreadWisdom: wisdomCount?.count ?? 0,
  });
};
