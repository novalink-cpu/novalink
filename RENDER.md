# Render — deploy လမ်းညွှန်

Mini App (Static Site) + API/Bot (Web Service) + PostgreSQL

## Flow

1. User က Mini App မှာ screenshot + reference တင်ပြမယ်  
2. API က PostgreSQL သိမ်း + **Admin Telegram** ဆီ ဓာတ်ပုံ + ✅ Approve / ❌ Reject  
3. Admin Approve → VPN key ထုတ် → ဝယ်သူ bot chat + Mini App Orders/Active Keys  

---

## ၁) Blueprint (မရရင် အောက်က လက်ဖြင့် လုပ်ပါ)

Blueprint သုံးမယ်ဆိုရင်:

1. `render.yaml` က **GitHub repo root** မှာ ရှိရမည်  
2. **commit + push** လုပ်ထားရမည် (`main` branch)  
3. Render → **New → Blueprint** → repo ရွေး  

| Service | အမျိုးအစား |
|---------|-------------|
| `u5-vpn-api` | Web Service (Node, `server/`) |
| `u5-vpn-app` | Static Site (`dist/`) |
| `u5-vpn-db` | PostgreSQL |

Blueprint မပေါ် / error ဆိုရင် → **၂ လက်ဖြင့် deploy** သုံးပါ (အကြံပြု)။

---

## ၂) လက်ဖြင့် deploy (Blueprint မလိုပါ)

### အဆင့် ၁ — PostgreSQL

1. Render Dashboard → **New +** → **PostgreSQL**  
2. Name: `u5-vpn-db` · Region: **Singapore** · Plan: Free (ရှိရင်)  
3. Create ပြီး **Internal Database URL** ကို copy (Web Service နဲ့ တူသော region)

### အဆင့် ၂ — Web Service (API + Bot)

**New +** → **Web Service** → GitHub repo `NovalinkVPN` ချိတ်

| Field | Value |
|--------|--------|
| Name | `u5-vpn-api` |
| Language | **Node** |
| Region | Singapore |
| Branch | `main` |
| **Root Directory** | **`server`** |
| Build Command | `npm install` |
| Start Command | `npm start` |

**Environment** (Environment Variables):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | PostgreSQL Internal URL (အဆင့် ၁ က copy) |
| `NODE_VERSION` | `20` |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_ADMIN_CHAT_IDS` | သင့် numeric chat id |
| `TELEGRAM_WEBHOOK_URL` | deploy ပြီးရင် `https://u5-vpn-api.onrender.com` |
| `PUBLIC_API_URL` | `https://u5-vpn-api.onrender.com` |
| `CORS_ORIGINS` | Static site URL (အဆင့် ၃ ပြီးမှ ထည့်) |
| `VPN_DEMO_MODE` | `1` |

**Create Web Service** → URL ဥပမာ `https://u5-vpn-api.onrender.com`  
Browser: `/health` → `{"ok":true}`

Deploy ပြီးရင် **Environment** မှာ `TELEGRAM_WEBHOOK_URL` နဲ့ `PUBLIC_API_URL` ကို အမှန် URL နဲ့ ပြင်ပြီး **Manual Deploy** တစ်ကြိမ်။

### အဆင့် ၃ — Static Site (Mini App)

**New +** → **Static Site** (Web Service မဟုတ်)

| Field | Value |
|--------|--------|
| Name | `u5-vpn-app` |
| Branch | `main` |
| Root Directory | *(ဗလာ — repo root)* |
| Build Command | `npm install && npm run build` |
| Publish Directory | **`dist`** |

**Environment:**

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://u5-vpn-api.onrender.com` |

Create → **Manual Deploy** (env build အချိန်မှ ထည့်သွင်းသည်)

### အဆင့် ၄ — CORS ပြန်ပြင်

`u5-vpn-api` → Environment → `CORS_ORIGINS` =  
`https://u5-vpn-app.onrender.com` (သင့် static URL)  
→ Save → **Manual Deploy**

### အဆင့် ၅ — Telegram

- BotFather → Menu Button → Web App URL: `https://u5-vpn-app.onrender.com`  
- Admin bot မှာ `/start`

---

## ၂) Environment variables

### `u5-vpn-api`

| Key | မှတ်ချက် |
|-----|----------|
| `DATABASE_URL` | Blueprint auto |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `TELEGRAM_ADMIN_CHAT_IDS` | Admin chat id(s), comma-separated |
| `TELEGRAM_WEBHOOK_URL` | `https://u5-vpn-api.onrender.com` |
| `PUBLIC_API_URL` | same as API URL |
| `CORS_ORIGINS` | `https://u5-vpn-app.onrender.com` |
| `VPN_DEMO_MODE` | `1` = demo key until X-UI wired |

### `u5-vpn-app`

| Key | ဥပမာ |
|-----|--------|
| `VITE_API_BASE_URL` | `https://u5-vpn-api.onrender.com` |

Env ပြောင်းပြီး **Manual Deploy** ပြန်လုပ်ပါ။

---

## ၃) Telegram

1. BotFather → Web App URL: `https://u5-vpn-app.onrender.com`  
2. Admin + users: bot မှာ `/start`  

---

## ၄) Local dev

```bash
cd server && cp .env.example .env   # DATABASE_URL, TELEGRAM_* ဖြည့်ပါ
npm install && npm run dev

# project root
# .env: VITE_API_BASE_URL=http://localhost:3000
npm install && npm run dev
```

---

## ၅) X-UI panel

`server/src/vpn.js` — set `VPN_DEMO_MODE=0` and `XUI_*` env when ready.
