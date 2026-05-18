import { json, checkAuth } from '../../_utils';
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

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const admin = checkAuth(request);
  if (!admin || admin.role !== 'admin') return json({ error: 'Nicht autorisiert' }, 401);

  const list = await env.GALLERIES.list({ prefix: 'gallery:' });
  const galleries: Gallery[] = [];
  for (const key of list.keys) {
    const data = await env.GALLERIES.get(key.name);
    if (data) galleries.push(JSON.parse(data));
  }
  galleries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return json(galleries.map(g => ({
    id: g.id,
    slug: g.slug,
    customerName: g.customerName,
    adobeLink: g.adobeLink,
    notes: g.notes,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  })));
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const admin = checkAuth(request);
  if (!admin || admin.role !== 'admin') return json({ error: 'Nicht autorisiert' }, 401);

  const body = await request.json() as { customerName: string; slug: string; password: string; adobeLink: string; notes?: string };
  if (!body.customerName || !body.slug || !body.password || !body.adobeLink) {
    return json({ error: 'Pflichtfelder fehlen' }, 400);
  }

  const existing = await env.GALLERIES.get(`gallery:${body.slug}`);
  if (existing) return json({ error: 'Slug existiert bereits' }, 409);

  const gallery: Gallery = {
    id: crypto.randomUUID(),
    slug: body.slug,
    customerName: body.customerName,
    passwordHash: await bcrypt.hash(body.password, 10),
    adobeLink: body.adobeLink,
    notes: body.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await env.GALLERIES.put(`gallery:${gallery.slug}`, JSON.stringify(gallery));
  return json({ success: true, slug: gallery.slug }, 201);
};
