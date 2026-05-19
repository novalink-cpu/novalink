# NovaLink MM — Telegram Mini App + Outline VPN

VPN key ဝယ်ယူမှု (Telegram Mini App) + Admin Approve + **Outline VPN** (Tokyo / Sydney) on **Vultr**.

## Production

### Render + GitHub (အကြံပြု — လွယ်ပါတယ်)

**Deploy guide:** [RENDER.md](./RENDER.md)  
Repo: https://github.com/novalink-cpu/novalink → Render Blueprint (`render.yaml`)

| Service | URL (example) |
|---------|---------------|
| `novalink-app` | Mini App (BotFather Web App) |
| `novalink-api` | API + webhook + `ssconf` JSON |

Outline VPN servers: Vultr (Tokyo/Sydney) — env `OUTLINE_JP_*`, `OUTLINE_AU_*`

### Vultr + custom domain (optional)

**Developer handoff:** [DEVELOPER_HANDOFF.docx](./DEVELOPER_HANDOFF.docx)  
**Server:** [deploy/nginx/novalink.conf](./deploy/nginx/novalink.conf)

| URL | အသုံးပြုမှု |
|-----|-------------|
| `https://domain.com` | Telegram Mini App |
| `https://api.domain.com` | Backend API + Telegram webhook |

## Quick start (local)

**လိုအပ်သည်:** Node 20+, **PostgreSQL** (Docker သို့မဟုတ် install)

### 1) Database

**Docker Desktop ရှိရင်:**

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
```

**သို့မဟုတ်** PostgreSQL install — DB `novalink`, user/pass `novalink`

### 2) Env

```bash
cd server
copy .env.local.example .env    # Windows
# cp .env.local.example .env    # Mac/Linux

cd ..
echo VITE_API_BASE_URL=http://localhost:3000 > .env
npm install
cd server && npm install
```

### 3) Run (terminal ၂ ခု)

```bash
# Terminal 1 — API (http://localhost:3000)
cd server && npm run dev

# Terminal 2 — Mini App (http://localhost:5173)
npm run dev
```

ဘရောက်ဇာမှာ **http://localhost:5173** ဖွင့်ပါ။  
`VPN_DEMO_MODE=1` — Outline မလိုဘဲ demo key ထုတ်မည်။  
Telegram bot စမ်းချင်ရင် `server/.env` ထဲ `TELEGRAM_BOT_TOKEN` + `TELEGRAM_USE_POLLING=1` ထည့်ပါ။

**Docker မလိုဘဲ local ssconf စမ်း:**
```bash
npm run test:local-ssconf    # auto E2E (DB+API+approve+JSON)
npm run dev:api-demo         # terminal 1 — embedded Postgres + API demo
npm run dev                  # terminal 2 — Mini App (uses .env.development.local)
node scripts/local-approve-url.mjs 1   # browser approve link
```

## Build (production)

```bash
# .env: VITE_API_BASE_URL=https://api.domain.com
npm run build:prod
```

Output: `dist/` → nginx `root /var/www/novalink/dist`

## Stack

- **Frontend:** React + Vite (`frontend/`)
- **API:** Node + Express + PostgreSQL (`server/`)
- **VPN:** Outline Management API per region (`server/src/outline.js`)

## Regions

`data/config.ts` — Tokyo (`jp`), Sydney (`au`)

## ssconf subscription (Qito-style)

On approve, NovaLink creates Outline keys on **all configured regions** (jp + au) and sends one link:

`ssconf://api.domain.com/vpn/c/TOKEN.json#NovaLink-Order-42`

Outline app fetches `GET /vpn/c/:token.json` for the server list. Set `VPN_USE_SSCONF=1` and `PUBLIC_API_URL` (default on).
