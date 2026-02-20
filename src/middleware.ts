import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(({ request, redirect }, next) => {
  const url = new URL(request.url);

  // Redirect bare domain to www
  if (url.hostname === 'mattlones.com') {
    url.hostname = 'www.mattlones.com';
    return redirect(url.toString(), 301);
  }

  return next();
});
