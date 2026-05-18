import { json, checkAuth } from '../../../_utils';
import bcrypt from 'bcryptjs';

interface Env {
  GALLERIES: KVNamespace;
}

interface Gallery {
  id: string;
  slug: string;
  customerName: string;
  passwordHash: string;
  adobeLink: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env, request }) => {
  const admin = checkAuth(request);
  if (!admin || admin.role !== 'admin') return json({ error: 'Nicht autorisiert' }, 401);

  const slug = params.slug as string;
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) return json({ error: 'Nicht gefunden' }, 404);

  const gallery: Gallery = JSON.parse(data);
  return json(gallery);
};

export const onRequestPut: PagesFunction<Env> = async ({ params, env, request }) => {
  const admin = checkAuth(request);
  if (!admin || admin.role !== 'admin') return json({ error: 'Nicht autorisiert' }, 401);

  const slug = params.slug as string;
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) return json({ error: 'Nicht gefunden' }, 404);

  const gallery: Gallery = JSON.parse(data);
  const body = await request.json() as { customerName?: string; password?: string; adobeLink?: string; notes?: string };

  if (body.customerName) gallery.customerName = body.customerName;
  if (body.adobeLink) gallery.adobeLink = body.adobeLink;
  if (body.notes !== undefined) gallery.notes = body.notes;
  if (body.password) gallery.passwordHash = await bcrypt.hash(body.password, 10);
  gallery.updatedAt = new Date().toISOString();

  await env.GALLERIES.put(`gallery:${gallery.slug}`, JSON.stringify(gallery));
  return json({ success: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env, request }) => {
  const admin = checkAuth(request);
  if (!admin || admin.role !== 'admin') return json({ error: 'Nicht autorisiert' }, 401);

  const slug = params.slug as string;
  await env.GALLERIES.delete(`gallery:${slug}`);
  return json({ success: true });
};
