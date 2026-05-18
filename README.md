# NovaLink MM — Telegram Mini App

VPN key ဝယ်ယူမှု Mini App (React + Vite) + Render backend API.

## Repo ဖွဲ့စည်းမှု

| Path | အကြောင်းအရာ |
|------|----------------|
| `frontend/index.html` | Mini App HTML template (source) |
| `frontend/src/` | React pages & UI |
| `server/` | Node API + Telegram bot webhook |
| `data/` | Config & `appStore` |
| `dist/` | Build output (**git မတင်** — CI မှာ ထုတ်) |

GitHub မှာ root တွင် `index.html` မရှိရန် ပုံမှန်ဖြစ်သည် — **`frontend/index.html`** ကြည့်ပါ။

## GitHub Pages (Mini App host)

### ⚠️ Link မှာ README စာသား ပဲပြနေရင် (ပုံ ၂ လို)

**အကြောင်းရင်း:** Pages က **branch ထဲ README.md** ကို ပြနေသည် — **React app build (`dist/`) မဟုတ်**။

**ဖြေရှင်း:**

1. Repo → **Settings** → **Pages**  
2. **Build and deployment** → Source က **`GitHub Actions`** ဖြစ်ရမည် (**Deploy from a branch မဟုတ်**)  
3. **Actions** tab → **Deploy GitHub Pages** → အစိမ်းရင် အောင်မြင် စောင့်ပါ  
4. မိနစ် ၁–၂ အကြာမှာ **https://novalink-cpu.github.io/novalink/** ပြန်ဖွင့်ပါ → ပုံ ၁ လို စိမ်းခလုတ်များ ပေါ်ရမည်  

### စတင် setup

1. **Settings** → **Pages** → Source: **GitHub Actions**  
2. **Settings** → **Secrets and variables** → **Actions** → **Variables**  
   - `VITE_API_BASE_URL` = `https://u5-vpn-api.onrender.com`  
3. `master` သို့ **push** (`.github/workflows/deploy-pages.yml` ပါရမည်)  

လင့်ခ်: **https://novalink-cpu.github.io/novalink/**

BotFather Web App URL ထဲလည်း ဒီ URL ထည့်ပါ။

## Render (API + optional static host)

လမ်းညွှန်: [RENDER.md](./RENDER.md)

## Local dev

```bash
npm install
# .env: VITE_API_BASE_URL=http://localhost:3000
npm run dev
```

API (`server/`):

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

## Build

```bash
npm run build          # Render / local (base /)
npm run build:pages    # GitHub Pages (base /novalink/)
```
