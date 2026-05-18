import { json } from '../../_utils';

interface Env {
  GALLERIES: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const slug = params.slug as string;
  
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) return json({ error: 'Galerie nicht gefunden' }, 404);
  
  const gallery = JSON.parse(data);
  return json({
    customerName: gallery.customerName,
    slug: gallery.slug,
    adobeLink: gallery.adobeLink,
  });
};
