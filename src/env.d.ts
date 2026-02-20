/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;
type KVNamespace = import('@cloudflare/workers-types').KVNamespace;

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB: D1Database;
  SESSIONS: KVNamespace;
  ADMIN_PASSWORD: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
