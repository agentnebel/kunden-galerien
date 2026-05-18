interface Env {
  GALLERIES: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env, request }) => {
  const slug = params.slug as string;
  
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) {
    return new Response('<h1>Galerie nicht gefunden</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }
  
  const gallery = JSON.parse(data);
  
  // Prüfe Auth-Cookie
  const cookie = request.headers.get('Cookie') || '';
  const authMatch = cookie.match(/gallery_auth_([^=]+)=([^;]+)/);
  const isAuth = authMatch && authMatch[1] === slug;
  
  if (!isAuth) {
    return showLoginPage(gallery.customerName);
  }
  
  // Kunde ist eingeloggt - zeige die Galerie-Seite
  return showGalleryPage(gallery.customerName, gallery.adobeLink);
};

export const onRequestPost: PagesFunction<Env> = async ({ params, env, request }) => {
  const slug = params.slug as string;
  const body = await request.json() as { password?: string };
  
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  if (!data) return new Response(JSON.stringify({ error: 'Galerie nicht gefunden' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  
  const gallery = JSON.parse(data);
  
  const { verifyPassword } = await import('../_utils');
  const valid = await verifyPassword(body.password || '', gallery.password);
  if (!valid) return new Response(JSON.stringify({ error: 'Falsches Passwort' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `gallery_auth_${slug}=1; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/g/${slug}`
    }
  });
};

function showLoginPage(customerName: string): Response {
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
button{width:100%;padding:14px;border:none;border-radius:8px;background:#fff;color:#0f0f0f;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity 0.2s}
button:hover{opacity:0.9}
.error{color:#ff4444;font-size:0.85rem;margin-top:12px;display:none}
.footer{padding:12px;text-align:center;font-size:0.8rem;color:#555;border-top:1px solid #222}
</style>
</head>
<body>
<div class="header"><h1>KUNDENGALERIE</h1></div>
<div class="container">
<div class="password-box">
<h2>${escapeHtml(customerName)}</h2>
<p>Bitte gib das Passwort ein, um die Galerie zu oeffnen.</p>
<input type="password" id="password-input" placeholder="Passwort" autocomplete="off">
<button onclick="checkPassword()">Galerie oeffnen</button>
<div class="error" id="error-msg">Falsches Passwort</div>
</div>
</div>
<div class="footer">Geschuetzte Galerie</div>
<script>
async function checkPassword(){
  const pw=document.getElementById('password-input').value;
  const btn=document.querySelector('button');
  btn.textContent='Pruefe...';
  btn.disabled=true;
  try{
    const res=await fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
    if(res.ok){window.location.reload()}else{throw new Error('falsch')}
  }catch(e){
    document.getElementById('error-msg').style.display='block';
    document.getElementById('password-input').value='';
    btn.textContent='Galerie oeffnen';
    btn.disabled=false;
  }
}
document.getElementById('password-input').addEventListener('keypress',e=>{if(e.key==='Enter')checkPassword()});
</script>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function showGalleryPage(customerName: string, adobeLink: string): Response {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kunden-Galerie - ${escapeHtml(customerName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#fff;min-height:100vh;display:flex;flex-direction:column}
.header{padding:20px;text-align:center;border-bottom:1px solid #333}
.header h1{font-size:1.5rem;font-weight:300;letter-spacing:2px}
.container{flex:1;display:flex;justify-content:center;align-items:center;padding:20px}
.success-box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:500px;width:100%;text-align:center}
.success-box h2{font-size:1.4rem;margin-bottom:12px;color:#4ade80}
.success-box p{color:#aaa;font-size:0.95rem;margin-bottom:8px;line-height:1.6}
.success-box .link{color:#888;font-size:0.85rem;margin:20px 0;padding:12px;background:#0f0f0f;border-radius:6px;word-break:break-all}
button{width:100%;padding:14px;border:none;border-radius:8px;background:#fff;color:#0f0f0f;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity 0.2s;margin-top:20px}
button:hover{opacity:0.9}
.secondary-btn{background:transparent;color:#fff;border:1px solid #444}
.secondary-btn:hover{border-color:#fff}
.footer{padding:12px;text-align:center;font-size:0.8rem;color:#555;border-top:1px solid #222}
</style>
</head>
<body>
<div class="header"><h1>KUNDENGALERIE</h1></div>
<div class="container">
<div class="success-box">
<h2>Zugriff bestaetigt</h2>
<p>Willkommen, ${escapeHtml(customerName)}!</p>
<p>Deine Galerie ist bereit. Klicke auf den Button unten, um sie zu oeffnen.</p>
<div class="link">${escapeHtml(adobeLink)}</div>
<button onclick="openGallery()">Galerie oeffnen</button>
<button class="secondary-btn" onclick="logout()" style="margin-top:10px">Abmelden</button>
</div>
</div>
<div class="footer">Geschuetzte Galerie</div>
<script>
function openGallery(){
  window.open('${escapeHtml(adobeLink)}','_blank','noopener,noreferrer');
}
function logout(){
  fetch(window.location.pathname,{method:'DELETE'}).then(()=>window.location.reload());
}
</script>
</body>
</html>`;

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
