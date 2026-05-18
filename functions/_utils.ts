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
