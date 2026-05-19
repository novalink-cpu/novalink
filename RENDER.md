# NovaLink MM — GitHub + Render Deploy

## Architecture on Render

| Service | URL (example) | Role |
|---------|---------------|------|
| **novalink-api** | `https://novalink-api.onrender.com` | API, Telegram webhook, `ssconf` JSON |
| **novalink-app** | `https://novalink-app.onrender.com` | Telegram Mini App (static) |
| **novalink-db** | (internal) | PostgreSQL |

Outline VPN servers (Tokyo/Sydney) stay on **Vultr** — Render မှာ API + DB + Mini App သာ။

---

## ၁) GitHub သို့ push

```bash
git add render.yaml RENDER.md server/ package.json ...
git commit -m "Add Render blueprint and ssconf deployment"
git push origin master
```

Repo: https://github.com/novalink-cpu/novalink

---

## ၂) Render Blueprint (အလွယ်ဆုံး)

1. https://dashboard.render.com → **New** → **Blueprint**
2. Connect **novalink-cpu/novalink** → branch **master**
3. `render.yaml` ကို အတည်ပြု → **Apply**
4. Services ၃ ခု create ဖြစ်မယ် (api, app, db)

ပထမဆုံး deploy ပြီးရင် URLs ကို မှတ်ပါ:

- API: `https://novalink-api.onrender.com`
- App: `https://novalink-app.onrender.com`

---

## ၃) Environment variables (Render Dashboard)

### novalink-api → Environment

| Key | Value |
|-----|--------|
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_ADMIN_CHAT_IDS` | သင့် Telegram user/chat ID |
| `OUTLINE_JP_API_URL` | Tokyo Outline Manager API URL |
| `OUTLINE_JP_CERT_SHA256` | Tokyo cert fingerprint |
| `OUTLINE_AU_API_URL` | Sydney (optional) |
| `OUTLINE_AU_CERT_SHA256` | Sydney fingerprint |
| `VPN_DEMO_MODE` | `0` (production keys) |
| `VPN_USE_SSCONF` | `1` |

`PUBLIC_API_URL`, `TELEGRAM_WEBHOOK_URL`, `CORS_ORIGINS`, `APP_PUBLIC_URL` — blueprint က service URL များနဲ့ ချိတ်ပေးထားပါတယ်။

### novalink-app → Environment

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://novalink-api.onrender.com` (blueprint auto) |

Deploy ပြီးရင် **Manual Deploy → Clear build cache & deploy** (env ပြောင်းလျှင် frontend rebuild လိုတတ်ပါတယ်)

---

## ၄) Telegram BotFather

1. **Bot Settings → Menu Button → Web App**  
   URL: `https://novalink-app.onrender.com`

2. Webhook — API start လျှင် အလိုအလျောက် `setWebhook` ခေါ်ပါတယ်  
   URL: `https://novalink-api.onrender.com/telegram/webhook`

3. `TELEGRAM_USE_POLLING` — **မထားပါ** (Render မှာ 409 Conflict)

---

## ၅) စမ်းသပ်မှု

```text
GET https://novalink-api.onrender.com/health
```

မျှော်မှန်းချက်: `"ok": true`, `"vpnUseSsconf": true`

Mini App → order → screenshot → admin **Approve** → user ကို `ssconf://novalink-api.onrender.com/vpn/c/....json` ရမယ်

---

## ၆) GitHub Pages (optional)

Render static app အစား (သို့မဟုတ် အပြင်) GitHub Pages သုံးချင်ရင်:

1. Repo → **Settings → Pages → Source: GitHub Actions**
2. Variable: `VITE_API_BASE_URL` = `https://novalink-api.onrender.com`
3. `master` push လျှင် workflow deploy လုပ်မယ်

URL: `https://novalink-cpu.github.io/novalink/`

BotFather Web App URL ကို အဲဒီ URL သို့ ပြောင်းနိုင်ပါတယ်။

---

## Troubleshooting

| ပြဿနာ | ဖြေရှင်း |
|--------|----------|
| Mini App API မရ | `VITE_API_BASE_URL` မှန် + app **redeploy** |
| CORS error | `CORS_ORIGINS` မှာ app URL ပါမပါ စစ် |
| Approve ခလုတ် မလုပ် | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_IDS`, webhook HTTPS |
| ssconf မရ | `PUBLIC_API_URL` = API URL, `VPN_USE_SSCONF=1` |
| DB error | `novalink-db` linked, `DATABASE_URL` auto |
| Free tier sleep | ပထမ request နှေးနိုင်သည် — normal |

---

## Custom domain (နောက်မှ)

- `app.yourdomain.com` → novalink-app  
- `api.yourdomain.com` → novalink-api  

Env များကို custom URL များနဲ့ ပြန်ညှိပြီး app ကို rebuild လုပ်ပါ။
