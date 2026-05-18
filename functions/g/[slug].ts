export const onRequestGet: PagesFunction = async () => {
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
.success{display:none}
.success h2{color:#4ade80;margin-bottom:12px}
.success p{color:#aaa;margin-bottom:20px}
.success a{color:#fff;text-decoration:underline}
.footer{padding:12px;text-align:center;font-size:0.8rem;color:#555;border-top:1px solid #222}
</style>
</head>
<body>
<div class="header"><h1 id="gallery-title">KUNDENGALERIE</h1></div>
<div class="container" id="password-container">
<div class="password-box">
<h2 id="customer-name">Kunde</h2>
<p>Bitte gib das Passwort ein, um die Galerie zu oeffnen.</p>
<input type="password" id="password-input" placeholder="Passwort" autocomplete="off">
<button onclick="checkPassword()">Galerie oeffnen</button>
<div class="error" id="error-msg">Falsches Passwort</div>
</div>
</div>
<div class="container success" id="success-container">
<div class="password-box">
<h2>Zugriff gewaehrt</h2>
<p id="success-text">Die Galerie wird in einem neuen Tab geoeffnet.</p>
<button onclick="openGallery()">Galerie jetzt oeffnen</button>
</div>
</div>
<div class="footer" id="footer">Geschuetzte Galerie</div>
<script>
const SLUG=location.pathname.split('/').pop();
let ADOBE_URL='';
async function loadGallery(){
  const res=await fetch('/api/gallery/'+SLUG);
  if(!res.ok){document.body.innerHTML='<div style="display:flex;justify-content:center;align-items:center;height:100vh;color:#888"><p>Galerie nicht gefunden</p></div>';return}
  const data=await res.json();
  ADOBE_URL=data.adobeLink;
  document.getElementById('customer-name').textContent=data.customerName||'Kunde';
  document.getElementById('gallery-title').textContent='GALERIE - '+(data.customerName||'Kunde').toUpperCase();
}
async function checkPassword(){
  const pw=document.getElementById('password-input').value;
  const res=await fetch('/api/gallery/'+SLUG+'/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  if(res.ok){
    document.getElementById('password-container').style.display='none';
    document.getElementById('success-container').style.display='flex';
    openGallery();
  }else{
    document.getElementById('error-msg').style.display='block';
    document.getElementById('password-input').value='';
  }
}
function openGallery(){
  if(ADOBE_URL) window.open(ADOBE_URL,'_blank');
}
document.getElementById('password-input').addEventListener('keypress',e=>{if(e.key==='Enter')checkPassword()});
loadGallery();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};
