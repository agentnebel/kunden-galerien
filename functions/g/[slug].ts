export const onRequestGet: PagesFunction<Env> = async ({ params, env, request }) => {
  const slug = params.slug as string;
  
  // Hole Galerie aus KV
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) {
    return new Response('<h1>Galerie nicht gefunden</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }
  
  const gallery = JSON.parse(data);
  
  // Prüfe Auth-Cookie
  const cookie = request.headers.get('Cookie') || '';
  const authMatch = cookie.match(/gallery_auth_([^=]+)=([^;]+)/);
  
  if (!authMatch || authMatch[1] !== slug) {
    // Zeige Login-Seite
    return showLoginPage(gallery.customerName, slug);
  }
  
  // Proxy die Adobe-Seite
  return proxyAdobe(gallery.adobeLink, request, slug);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, env, request }) => {
  const slug = params.slug as string;
  const body = await request.json() as { password?: string };
  
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) return json({ error: 'Galerie nicht gefunden' }, 404);
  
  const gallery = JSON.parse(data);
  
  const { verifyPassword } = await import('../../_utils');
  const valid = await verifyPassword(body.password || '', gallery.password);
  if (!valid) return json({ error: 'Falsches Passwort' }, 401);
  
  // Setze Auth-Cookie
  return json({ success: true }, 200, {
    'Set-Cookie': `gallery_auth_${slug}=1; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/g/${slug}`
  });
};

async function proxyAdobe(adobeUrl: string, request: Request, slug: string): Promise<Response> {
  const url = new URL(request.url);
  const adobeBase = new URL(adobeUrl);
  
  // Baue Ziel-URL
  let targetPath = url.pathname.replace(`/g/${slug}`, '');
  if (!targetPath || targetPath === '/') targetPath = adobeBase.pathname;
  
  const targetUrl = `${adobeBase.origin}${targetPath}${url.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': request.headers.get('Accept') || '*/*',
        'Accept-Language': request.headers.get('Accept-Language') || 'de,en;q=0.9',
      },
      redirect: 'manual'
    });
    
    // Wenn Redirect, folge ihm
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        return Response.redirect(location, response.status);
      }
    }
    
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('text/html')) {
      let body = await response.text();
      
      // Ersetze absolute URLs
      body = body.replace(new RegExp(adobeBase.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      body = body.replace(/href="\//g, `href="/g/${slug}/`);
      body = body.replace(/src="\//g, `src="/g/${slug}/`);
      body = body.replace(/url\(\//g, `url(/g/${slug}/`);
      
      return new Response(body, {
        status: response.status,
        headers: { 'Content-Type': contentType }
      });
    }
    
    // Für Bilder/Assets: Proxy raw
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (e) {
    return new Response(`Proxy-Fehler: ${e.message}`, { status: 502 });
  }
}

function showLoginPage(customerName: string, slug: string): Response {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kunden-Galerie</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#fff;min-height:100vh;display:flex;flex-direction:column}
.header{padding:20px;text-align:center;border-bottom:1px solid #333}
.header h1{font-size:1.5rem;font-weight:300;letter-spacing:2px}
.container{flex:1;display:flex;justify-content:center;align-items:center;padding:20px}
.password-box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:400px;width:100%;text-align:center}
.password-box h2{font-size:1.2rem;margin-bottom:8px;color:#e0e0e0}
.password-box p{color:#888;font-size:0.9rem;margin-bottom:24px}
input[type="password"]{width:100%;padding:14px 16px;border:1px solid #444;border-radius:8px;background:#0f0f0f;color:#fff;font-size:1rem;margin-bottom:16px;outline:none}
input[type="password"]:focus{border-color:#fff}
button{width:100%;padding:14px;border:none;border-radius:8px;background:#fff;color:#0f0f0f;font-size:1rem;font-weight:600;cursor:pointer}
button:hover{opacity:0.9}
.error{color:#ff4444;font-size:0.85rem;margin-top:12px;display:none}
.footer{padding:12px;text-align:center;font-size:0.8rem;color:#555;border-top:1px solid #222}
</style>
</head>
<body>
<div class="header"><h1>KUNDENGALERIE</h1></div>
<div class="container">
<div class="password-box">
<h2>${customerName}</h2>
<p>Bitte gib das Passwort ein.</p>
<input type="password" id="password-input" placeholder="Passwort" autocomplete="off">
<button onclick="checkPassword()">Galerie oeffnen</button>
<div class="error" id="error-msg">Falsches Passwort</div>
</div>
</div>
<div class="footer">Geschuetzte Galerie</div>
<script>
async function checkPassword(){
  const pw=document.getElementById('password-input').value;
  const res=await fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  if(res.ok){window.location.reload()}else{document.getElementById('error-msg').style.display='block';document.getElementById('password-input').value=''}
}
document.getElementById('password-input').addEventListener('keypress',e=>{if(e.key==='Enter')checkPassword()});
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function json(body: object, status = 200, extraHeaders = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}
