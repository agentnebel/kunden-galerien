# Kunden-Galerien

Passwort-geschützte Galerie-Links für Adobe Lightroom Cloud-Galerien.

## Funktionen

- **Kunden-Galerien** mit individuellem Passwort-Schutz
- **Admin-Panel** unter `/admin` zum Verwalten aller Galerien
- **Gehashte Passwörter** (bcrypt) für maximale Sicherheit
- **iframe-Einbettung** - Kunde sieht nur deine Domain, nicht den Adobe-Link
- **Cloudflare Worker** - weltweit schnell, DDoS-geschützt

## URLs

- Kunden-Galerie: `https://deine-domain.de/g/[slug]`
- Admin-Panel: `https://deine-domain.de/admin`

## Setup

### 1. Cloudflare KV anlegen

```bash
wrangler kv:namespace create "GALLERIES"
```

Die ID in `wrangler.toml` eintragen.

### 2. Admin-Passwort setzen

```bash
# Passwort hashen (lokal)
node -e "console.log(require('bcryptjs').hashSync('dein-passwort', 10))"

# In wrangler.toml eintragen
# Oder als Secret:
wrangler secret put ADMIN_PASSWORD_HASH
```

### 3. JWT Secret setzen

```bash
wrangler secret put JWT_SECRET
```

### 4. Deploy

```bash
npm install
wrangler deploy
```

Oder via GitHub Actions (automatisch bei Push auf main).

## GitHub Secrets

In den Repo-Einstellungen unter **Settings -> Secrets and variables -> Actions**:

- `CF_API_TOKEN` - Cloudflare API Token
- `CF_ACCOUNT_ID` - Cloudflare Account ID

## Nutzung

### Neue Galerie anlegen

1. Admin-Panel öffnen: `https://deine-domain.de/admin`
2. Mit Admin-Passwort anmelden
3. "+ Neue Galerie" klicken
4. Daten eingeben:
   - Kundenname
   - URL-Slug (z.B. `mueller-hochzeit`)
   - Passwort für den Kunden
   - Adobe Lightroom Link
5. Speichern

### Kunden-Link

`https://deine-domain.de/g/mueller-hochzeit`

Der Kunde gibt sein Passwort ein und sieht die Galerie in einem iframe. Der Originallink ist nicht sichtbar.

## Technik

- Cloudflare Worker (TypeScript)
- KV Storage für Daten
- bcrypt für Passwort-Hashing
- JWT für Admin-Auth
- iframe für Adobe-Galerie-Einbettung

## Lizenz

MIT
