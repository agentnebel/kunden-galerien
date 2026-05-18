// Skript zum Hashen eines Passworts fuer Cloudflare Pages
// Nutzung: node scripts/hash-password.js "dein-passwort"

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  
  const hash = Array.from(new Uint8Array(derived));
  return { salt, hash };
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node hash-password.js "dein-passwort"');
    process.exit(1);
  }
  
  const result = await hashPassword(password);
  console.log('JSON fuer wrangler.toml:');
  console.log(JSON.stringify(result));
  console.log('\nOder fuer Umgebungsvariable:');
  console.log(JSON.stringify(result).replace(/"/g, '\\"'));
}

main().catch(console.error);
