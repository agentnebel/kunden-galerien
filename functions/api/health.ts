import { json, checkAuth } from '../_utils';

interface Env {
  GALLERIES: KVNamespace;
  ADMIN_PASSWORD_HASH: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const admin = checkAuth(request);
  let kvStatus = 'unknown';
  try {
    await env.GALLERIES.list({ limit: 1 });
    kvStatus = 'ok';
  } catch (e: any) {
    kvStatus = 'error: ' + e.message;
  }
  
  return json({
    ok: true,
    admin: admin ? { role: admin.role } : null,
    kv: kvStatus,
    secretSet: !!env.ADMIN_PASSWORD_HASH,
  });
};
