export function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export function verifyToken(token: string): { role: string } | null {
  try {
    const data = atob(token);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function checkAuth(request: Request): { role: string } | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.replace('Bearer ', ''));
}

// PBKDF2 Passwort-Hashing mit Web Crypto API
export async function hashPassword(password: string): Promise<{ salt: number[]; hash: number[] }> {
  const encoder = new TextEncoder();
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return { salt, hash: Array.from(new Uint8Array(derived)) };
}

export async function verifyPassword(password: string, stored: { salt: number[]; hash: number[] }): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(stored.salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const derivedArray = Array.from(new Uint8Array(derived));
  if (derivedArray.length !== stored.hash.length) return false;
  return derivedArray.every((b, i) => b === stored.hash[i]);
}
