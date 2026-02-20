/** Admin authentication helpers */

export async function validateAdminSession(
  request: Request,
  db: D1Database,
): Promise<boolean> {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return false;

  const token = match[1];
  const row = await db
    .prepare('SELECT token FROM admin_sessions WHERE token = ? AND expires_at > datetime(?)')
    .bind(token, new Date().toISOString())
    .first();

  return !!row;
}

export function setAdminCookie(token: string): string {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  return `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${expires}`;
}
