import { json } from '../../_utils';
import { verifyPassword } from '../../_utils';

interface Env {
  ADMIN_PASSWORD_HASH: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as { password?: string };

  const stored = JSON.parse(env.ADMIN_PASSWORD_HASH);
  const valid = await verifyPassword(body.password || '', stored);
  if (!valid) return json({ error: 'Falsches Passwort' }, 401);

  const payload = btoa(JSON.stringify({ role: 'admin', iat: Date.now() }));

  return json({ token: payload });
};