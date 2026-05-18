import { json } from '../../../_utils';
import bcrypt from 'bcryptjs';

interface Env {
  GALLERIES: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, env, request }) => {
  const slug = params.slug as string;
  
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) return json({ error: 'Galerie nicht gefunden' }, 404);
  
  const gallery = JSON.parse(data);
  const body = await request.json() as { password?: string };
  
  const valid = await bcrypt.compare(body.password || '', gallery.passwordHash);
  if (!valid) return json({ error: 'Falsches Passwort' }, 401);
  
  return json({ success: true });
};
