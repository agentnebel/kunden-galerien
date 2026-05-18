import { json, verifyPassword } from '../../_utils';

interface Env {
  ADMIN_PASSWORD_HASH: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as { password?: string };
  const password = body.password || '';

  try {
    const stored = JSON.parse(env.ADMIN_PASSWORD_HASH.trim());
    const valid = await verifyPassword(password, stored);
    if (valid) {
      const payload = btoa(JSON.stringify({ role: 'admin', iat: Date.now() }));
      return json({ token: payload });
    }
  } catch (e) {
    // Secret nicht korrekt gesetzt
  }

  return json({ error: 'Falsches Passwort' }, 401);
};
