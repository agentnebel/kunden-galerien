import bcrypt from 'bcryptjs';

export interface Env {
  GALLERIES: KVNamespace;
  ADMIN_PASSWORD_HASH: string;
  JWT_SECRET: string;
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

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateId(): string {
  return crypto.randomUUID();
}

function createResponse(body: string | object, status = 200, headers?: Record<string, string>): Response {
  const h = { ...headers, 'Content-Type': 'application/json' };
  const b = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(b, { status, headers: h });
}

function createHTMLResponse(html: string, status = 200): Response {
  return new Response(html, { 
    status, 
    headers: { 'Content-Type': 'text/html; charset=utf-8' } 
  });
}

async function getGallery(env: Env, slug: string): Promise<Gallery | null> {
  const data = await env.GALLERIES.get(`gallery:${slug}`);
  return data ? JSON.parse(data) : null;
}

async function saveGallery(env: Env, gallery: Gallery): Promise<void> {
  await env.GALLERIES.put(`gallery:${gallery.slug}`, JSON.stringify(gallery));
}

async function deleteGallery(env: Env, slug: string): Promise<void> {
  await env.GALLERIES.delete(`gallery:${slug}`);
}

async function listGalleries(env: Env): Promise<Gallery[]> {
  const list = await env.GALLERIES.list({ prefix: 'gallery:' });
  const galleries: Gallery[] = [];
  for (const key of list.keys) {
    const data = await env.GALLERIES.get(key.name);
    if (data) galleries.push(JSON.parse(data));
  }
  return galleries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function createToken(env: Env, payload: object): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  return btoa(String.fromCharCode(...data));
}

function verifyToken(env: Env, token: string): object | null {
  try {
    const decoder = new TextDecoder();
    const data = new Uint8Array([...atob(token)].map(c => c.charCodeAt(0)));
    return JSON.parse(decoder.decode(data));
  } catch {
    return null;
  }
}

// HTML Templates
const galleryHTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kunden-Galerie</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f; 
      color: #fff; 
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #333;
    }
    .header h1 { font-size: 1.5rem; font-weight: 300; letter-spacing: 2px; }
    .container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .password-box {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .password-box h2 { 
      font-size: 1.2rem; 
      margin-bottom: 8px; 
      color: #e0e0e0; 
    }
    .password-box p { 
      color: #888; 
      font-size: 0.9rem; 
      margin-bottom: 24px; 
    }
    input[type="password"] {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #0f0f0f;
      color: #fff;
      font-size: 1rem;
      margin-bottom: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="password"]:focus { border-color: #fff; }
    button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      background: #fff;
      color: #0f0f0f;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .error {
      color: #ff4444;
      font-size: 0.85rem;
      margin-top: 12px;
      display: none;
    }
    .gallery-frame {
      width: 100%;
      height: 100vh;
      border: none;
      display: none;
    }
    .gallery-container {
      width: 100%;
      height: calc(100vh - 60px);
      display: none;
    }
    .footer {
      padding: 12px;
      text-align: center;
      font-size: 0.8rem;
      color: #555;
      border-top: 1px solid #222;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 id="gallery-title">KUNDENGALERIE</h1>
  </div>
  
  <div class="container" id="password-container">
    <div class="password-box">
      <h2 id="customer-name">Kundenname</h2>
      <p>Bitte gib das Passwort ein, um die Galerie zu öffnen.</p>
      <input type="password" id="password-input" placeholder="Passwort" autocomplete="off">
      <button onclick="checkPassword()">Galerie öffnen</button>
      <div class="error" id="error-msg">Falsches Passwort</div>
    </div>
  </div>
  
  <div class="gallery-container" id="gallery-container">
    <iframe class="gallery-frame" id="gallery-frame" allowfullscreen></iframe>
  </div>
  
  <div class="footer" id="footer">
    Geschützte Galerie
  </div>

  <script>
    const SLUG = location.pathname.split('/').pop();
    let GALLERY_DATA = null;
    
    async function loadGallery() {
      const res = await fetch('/api/gallery/' + SLUG);
      if (!res.ok) {
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;color:#888;"><p>Galerie nicht gefunden</p></div>';
        return;
      }
      GALLERY_DATA = await res.json();
      document.getElementById('customer-name').textContent = GALLERY_DATA.customerName || 'Kunde';
      document.getElementById('gallery-title').textContent = 'GALERIE - ' + (GALLERY_DATA.customerName || 'Kunde').toUpperCase();
    }
    
    async function checkPassword() {
      const pw = document.getElementById('password-input').value;
      const res = await fetch('/api/gallery/' + SLUG + '/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      
      if (res.ok) {
        const data = await res.json();
        document.getElementById('password-container').style.display = 'none';
        document.getElementById('footer').style.display = 'none';
        document.querySelector('.header').style.display = 'none';
        const frame = document.getElementById('gallery-frame');
        frame.src = GALLERY_DATA.adobeLink;
        document.getElementById('gallery-container').style.display = 'block';
        frame.style.display = 'block';
      } else {
        document.getElementById('error-msg').style.display = 'block';
        document.getElementById('password-input').value = '';
      }
    }
    
    document.getElementById('password-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkPassword();
    });
    
    loadGallery();
  </script>
</body>
</html>`;

const adminHTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Kunden-Galerien</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f; 
      color: #e0e0e0; 
      min-height: 100vh;
    }
    .header {
      padding: 20px 40px;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 1.3rem; font-weight: 300; letter-spacing: 1px; }
    .btn {
      padding: 10px 20px;
      border: 1px solid #444;
      border-radius: 6px;
      background: transparent;
      color: #e0e0e0;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .btn:hover { border-color: #fff; color: #fff; }
    .btn-primary { background: #fff; color: #0f0f0f; border-color: #fff; }
    .btn-primary:hover { opacity: 0.9; }
    .container { padding: 40px; max-width: 1200px; margin: 0 auto; }
    .login-box {
      max-width: 400px;
      margin: 100px auto;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
    }
    .login-box h2 { margin-bottom: 24px; font-weight: 300; }
    input[type="password"], input[type="text"], input[type="url"] {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #0f0f0f;
      color: #fff;
      font-size: 0.95rem;
      margin-bottom: 16px;
      outline: none;
    }
    input:focus { border-color: #fff; }
    .gallery-list { margin-top: 30px; }
    .gallery-item {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gallery-info h3 { font-size: 1.1rem; margin-bottom: 4px; }
    .gallery-info p { color: #888; font-size: 0.85rem; }
    .gallery-actions { display: flex; gap: 8px; }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
    }
    .modal h2 { margin-bottom: 20px; font-weight: 300; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; color: #aaa; }
    .form-group input { margin-bottom: 0; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; padding: 60px; color: #666; }
    .slug-preview { font-size: 0.8rem; color: #666; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>KUNDEN-GALERIEN</h1>
    <button class="btn" id="logout-btn" style="display:none" onclick="logout()">Abmelden</button>
  </div>
  
  <div class="container">
    <div id="login-view">
      <div class="login-box">
        <h2>Admin Login</h2>
        <input type="password" id="admin-password" placeholder="Admin-Passwort">
        <button class="btn btn-primary" onclick="login()" style="width:100%">Anmelden</button>
        <div id="login-error" style="color:#ff4444;margin-top:12px;font-size:0.85rem;display:none">Falsches Passwort</div>
      </div>
    </div>
    
    <div id="admin-view" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>Galerien</h2>
        <button class="btn btn-primary" onclick="openModal()">+ Neue Galerie</button>
      </div>
      <div class="gallery-list" id="gallery-list"></div>
    </div>
  </div>
  
  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h2 id="modal-title">Neue Galerie</h2>
      <div class="form-group">
        <label>Kundenname</label>
        <input type="text" id="form-customer" placeholder="z.B. Max Mustermann">
      </div>
      <div class="form-group">
        <label>URL-Slug (eindeutig)</label>
        <input type="text" id="form-slug" placeholder="z.B. mustermann-hochzeit">
        <div class="slug-preview" id="slug-preview"></div>
      </div>
      <div class="form-group">
        <label>Passwort</label>
        <input type="text" id="form-password" placeholder="Kundenpasswort">
      </div>
      <div class="form-group">
        <label>Adobe Lightroom Link</label>
        <input type="url" id="form-adobe" placeholder="https://adobe.ly/...">
      </div>
      <div class="form-group">
        <label>Notizen (optional)</label>
        <input type="text" id="form-notes" placeholder="Interne Notizen">
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="saveGallery()">Speichern</button>
      </div>
    </div>
  </div>

  <script>
    let AUTH_TOKEN = localStorage.getItem('kg_admin_token');
    let EDIT_SLUG = null;
    
    document.getElementById('form-slug').addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      e.target.value = val;
      document.getElementById('slug-preview').textContent = val ? 'URL: /g/' + val : '';
    });
    
    async function login() {
      const pw = document.getElementById('admin-password').value;
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
      if (res.ok) {
        const data = await res.json();
        AUTH_TOKEN = data.token;
        localStorage.setItem('kg_admin_token', AUTH_TOKEN);
        showAdmin();
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    }
    
    function logout() {
      AUTH_TOKEN = null;
      localStorage.removeItem('kg_admin_token');
      showLogin();
    }
    
    function showLogin() {
      document.getElementById('login-view').style.display = 'block';
      document.getElementById('admin-view').style.display = 'none';
      document.getElementById('logout-btn').style.display = 'none';
    }
    
    function showAdmin() {
      document.getElementById('login-view').style.display = 'none';
      document.getElementById('admin-view').style.display = 'block';
      document.getElementById('logout-btn').style.display = 'block';
      loadGalleries();
    }
    
    async function loadGalleries() {
      const res = await fetch('/api/admin/galleries', {
        headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN }
      });
      if (!res.ok) { logout(); return; }
      const galleries = await res.json();
      const list = document.getElementById('gallery-list');
      if (!galleries.length) {
        list.innerHTML = '<div class="empty-state">Noch keine Galerien vorhanden.</div>';
        return;
      }
      list.innerHTML = galleries.map(g => \`
        <div class="gallery-item">
          <div class="gallery-info">
            <h3>\${g.customerName}</h3>
            <p>/g/\${g.slug} · \${g.adobeLink ? 'Adobe-Link vorhanden' : 'Kein Link'} · Erstellt: \${new Date(g.createdAt).toLocaleDateString('de-DE')}</p>
          </div>
          <div class="gallery-actions">
            <button class="btn" onclick="editGallery('\${g.slug}')">Bearbeiten</button>
            <button class="btn" onclick="deleteGallery('\${g.slug}')" style="border-color:#ff4444;color:#ff4444">Löschen</button>
          </div>
        </div>
      \`).join('');
    }
    
    function openModal(slug = null) {
      EDIT_SLUG = slug;
      document.getElementById('modal-title').textContent = slug ? 'Galerie bearbeiten' : 'Neue Galerie';
      document.getElementById('form-customer').value = '';
      document.getElementById('form-slug').value = '';
      document.getElementById('form-password').value = '';
      document.getElementById('form-adobe').value = '';
      document.getElementById('form-notes').value = '';
      document.getElementById('slug-preview').textContent = '';
      document.getElementById('modal').style.display = 'flex';
      
      if (slug) {
        fetch('/api/admin/galleries/' + slug, { headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN }})
          .then(r => r.json())
          .then(g => {
            document.getElementById('form-customer').value = g.customerName || '';
            document.getElementById('form-slug').value = g.slug || '';
            document.getElementById('form-adobe').value = g.adobeLink || '';
            document.getElementById('form-notes').value = g.notes || '';
            document.getElementById('slug-preview').textContent = '/g/' + g.slug;
          });
      }
    }
    
    function closeModal() {
      document.getElementById('modal').style.display = 'none';
      EDIT_SLUG = null;
    }
    
    async function saveGallery() {
      const data = {
        customerName: document.getElementById('form-customer').value,
        slug: document.getElementById('form-slug').value,
        password: document.getElementById('form-password').value,
        adobeLink: document.getElementById('form-adobe').value,
        notes: document.getElementById('form-notes').value,
      };
      
      if (!data.customerName || !data.slug || (!data.password && !EDIT_SLUG)) {
        alert('Bitte fülle alle Pflichtfelder aus.');
        return;
      }
      
      const url = EDIT_SLUG ? '/api/admin/galleries/' + EDIT_SLUG : '/api/admin/galleries';
      const method = EDIT_SLUG ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH_TOKEN },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        closeModal();
        loadGalleries();
      } else {
        const err = await res.text();
        alert('Fehler: ' + err);
      }
    }
    
    async function deleteGallery(slug) {
      if (!confirm('Galerie wirklich löschen?')) return;
      const res = await fetch('/api/admin/galleries/' + slug, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN }
      });
      if (res.ok) loadGalleries();
    }
    
    function editGallery(slug) {
      openModal(slug);
    }
    
    // Auto-login if token exists
    if (AUTH_TOKEN) showAdmin();
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Gallery page
    if (path.startsWith('/g/')) {
      const slug = path.replace('/g/', '');
      const gallery = await getGallery(env, slug);
      if (!gallery) {
        return createHTMLResponse(`
          <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nicht gefunden</title>
          <style>body{background:#0f0f0f;color:#888;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;}</style>
          </head><body><p>Galerie nicht gefunden</p></body></html>
        `, 404);
      }
      return createHTMLResponse(galleryHTML);
    }
    
    // Admin page
    if (path === '/admin') {
      return createHTMLResponse(adminHTML);
    }
    
    // API Routes
    if (path.startsWith('/api/')) {
      // Gallery info (public)
      if (path.startsWith('/api/gallery/') && method === 'GET') {
        const slug = path.replace('/api/gallery/', '');
        const gallery = await getGallery(env, slug);
        if (!gallery) return createResponse({ error: 'Galerie nicht gefunden' }, 404, corsHeaders);
        return createResponse({
          customerName: gallery.customerName,
          slug: gallery.slug,
          adobeLink: gallery.adobeLink,
        }, 200, corsHeaders);
      }
      
      // Gallery auth
      if (path.startsWith('/api/gallery/') && path.endsWith('/auth') && method === 'POST') {
        const slug = path.replace('/api/gallery/', '').replace('/auth', '');
        const gallery = await getGallery(env, slug);
        if (!gallery) return createResponse({ error: 'Galerie nicht gefunden' }, 404, corsHeaders);
        
        const body = await request.json() as { password?: string };
        const valid = await verifyPassword(body.password || '', gallery.passwordHash);
        if (!valid) return createResponse({ error: 'Falsches Passwort' }, 401, corsHeaders);
        
        return createResponse({ success: true }, 200, corsHeaders);
      }
      
      // Admin login
      if (path === '/api/admin/login' && method === 'POST') {
        const body = await request.json() as { password?: string };
        const valid = await verifyPassword(body.password || '', env.ADMIN_PASSWORD_HASH);
        if (!valid) return createResponse({ error: 'Falsches Passwort' }, 401, corsHeaders);
        
        const token = createToken(env, { role: 'admin', iat: Date.now() });
        return createResponse({ token }, 200, corsHeaders);
      }
      
      // Admin middleware
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createResponse({ error: 'Nicht autorisiert' }, 401, corsHeaders);
      }
      const token = authHeader.replace('Bearer ', '');
      const payload = verifyToken(env, token);
      if (!payload || (payload as any).role !== 'admin') {
        return createResponse({ error: 'Nicht autorisiert' }, 401, corsHeaders);
      }
      
      // List galleries
      if (path === '/api/admin/galleries' && method === 'GET') {
        const galleries = await listGalleries(env);
        return createResponse(galleries.map(g => ({
          id: g.id,
          slug: g.slug,
          customerName: g.customerName,
          adobeLink: g.adobeLink,
          notes: g.notes,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        })), 200, corsHeaders);
      }
      
      // Get single gallery
      if (path.startsWith('/api/admin/galleries/') && method === 'GET') {
        const slug = path.replace('/api/admin/galleries/', '');
        const gallery = await getGallery(env, slug);
        if (!gallery) return createResponse({ error: 'Nicht gefunden' }, 404, corsHeaders);
        return createResponse(gallery, 200, corsHeaders);
      }
      
      // Create gallery
      if (path === '/api/admin/galleries' && method === 'POST') {
        const body = await request.json() as { customerName: string; slug: string; password: string; adobeLink: string; notes?: string };
        
        if (!body.customerName || !body.slug || !body.password || !body.adobeLink) {
          return createResponse({ error: 'Pflichtfelder fehlen' }, 400, corsHeaders);
        }
        
        const existing = await getGallery(env, body.slug);
        if (existing) return createResponse({ error: 'Slug existiert bereits' }, 409, corsHeaders);
        
        const gallery: Gallery = {
          id: generateId(),
          slug: body.slug,
          customerName: body.customerName,
          passwordHash: await hashPassword(body.password),
          adobeLink: body.adobeLink,
          notes: body.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await saveGallery(env, gallery);
        return createResponse({ success: true, slug: gallery.slug }, 201, corsHeaders);
      }
      
      // Update gallery
      if (path.startsWith('/api/admin/galleries/') && method === 'PUT') {
        const slug = path.replace('/api/admin/galleries/', '');
        const gallery = await getGallery(env, slug);
        if (!gallery) return createResponse({ error: 'Nicht gefunden' }, 404, corsHeaders);
        
        const body = await request.json() as { customerName?: string; password?: string; adobeLink?: string; notes?: string };
        
        if (body.customerName) gallery.customerName = body.customerName;
        if (body.adobeLink) gallery.adobeLink = body.adobeLink;
        if (body.notes !== undefined) gallery.notes = body.notes;
        if (body.password) gallery.passwordHash = await hashPassword(body.password);
        gallery.updatedAt = new Date().toISOString();
        
        await saveGallery(env, gallery);
        return createResponse({ success: true }, 200, corsHeaders);
      }
      
      // Delete gallery
      if (path.startsWith('/api/admin/galleries/') && method === 'DELETE') {
        const slug = path.replace('/api/admin/galleries/', '');
        await deleteGallery(env, slug);
        return createResponse({ success: true }, 200, corsHeaders);
      }
    }
    
    return createResponse({ error: 'Nicht gefunden' }, 404, corsHeaders);
  },
};