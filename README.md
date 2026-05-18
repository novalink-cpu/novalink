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

1. Repo → **Settings** → **Pages**  
2. **Build and deployment** → Source: **GitHub Actions**  
3. **Settings** → **Secrets and variables** → **Actions** → **Variables**  
   - Name: `VITE_API_BASE_URL`  
   - Value: `https://u5-vpn-api.onrender.com` (သင့် Render API URL)  
4. `master` branch သို့ **push** လုပ်ပါ  

လင့်ခ်: **https://novalink-cpu.github.io/novalink/**

BotFather Web App URL ထဲလည်း ဒီ URL (သို့ Render static URL) ထည့်ပါ။

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
