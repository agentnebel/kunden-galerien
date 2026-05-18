import { json } from '../../_utils';
import bcrypt from 'bcryptjs';

interface Env {
  ADMIN_PASSWORD_HASH: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as { password?: string };
  
  const valid = await bcrypt.compare(body.password || '', env.ADMIN_PASSWORD_HASH);
  if (!valid) return json({ error: 'Falsches Passwort' }, 401);
  
  const payload = btoa(JSON.stringify({ role: 'admin', iat: Date.now() }));
  
  return json({ token: payload });
};
