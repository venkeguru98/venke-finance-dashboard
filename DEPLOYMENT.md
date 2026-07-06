# VENKE Finance Dashboard — Deployment Guide

## Quick Links
- 🚀 [Render.com (Recommended)](#1-render-free-easiest)
- 🚂 [Railway](#2-railway)
- 🐳 [Docker (VPS / DigitalOcean)](#3-docker-any-vps)
- 🗄️ [PostgreSQL Setup](#database-setup-postgresql)
- ☁️ [Cloudinary Setup](#cloudinary-cloud-file-storage)
- 🔐 [Environment Variables Reference](#environment-variables)

---

## Prerequisites

You need a **GitHub account** and your project code pushed to a public or private repository.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/venke-finance-dashboard.git
git push -u origin main
```

---

## 1. Render (Free, Easiest)

### Step 1 — Create Render Account
Go to [render.com](https://render.com) and sign up with your GitHub account.

### Step 2 — Create PostgreSQL Database
1. Dashboard → **New** → **PostgreSQL**
2. Name: `venke-finance-db`
3. Plan: **Free** (sufficient for personal use)
4. Region: **Singapore** (closest to India)
5. Click **Create Database**
6. Copy the **Internal Database URL** — you'll need it in Step 4

### Step 3 — Deploy the App
1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml` — click **Apply**

OR manually configure:
- **Build Command**: `npm install --prefix server && npm install --prefix client && npm run build --prefix client && npm run build --prefix server`
- **Start Command**: `node server/dist/server.js`
- **Instance Type**: Free

### Step 4 — Set Environment Variables
In Render dashboard → your service → **Environment**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (click "Generate" for a random value) |
| `JWT_EXPIRES_IN` | `7d` |
| `DATABASE_URL` | (paste Internal Database URL from Step 2) |
| `ALLOWED_ORIGINS` | `https://your-service.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | (from Cloudinary dashboard) |
| `CLOUDINARY_API_KEY` | (from Cloudinary dashboard) |
| `CLOUDINARY_API_SECRET` | (from Cloudinary dashboard) |

### Step 5 — Deploy
Click **Deploy Latest Commit**. Your app will be live at:
```
https://venke-finance-dashboard.onrender.com
```

> **Note**: Free tier apps sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds. Upgrade to Starter ($7/month) for always-on.

---

## 2. Railway

### Step 1 — Create Railway Account
Go to [railway.app](https://railway.app) and sign up.

### Step 2 — New Project
1. **New Project** → **Deploy from GitHub Repo**
2. Select your repository

### Step 3 — Add PostgreSQL
1. In your project → **+ New** → **Database** → **PostgreSQL**
2. Railway automatically injects `DATABASE_URL` into your service

### Step 4 — Configure Service
In your service settings:
- **Build Command**: `npm install --prefix server && npm install --prefix client && npm run build --prefix client && npm run build --prefix server`
- **Start Command**: `node server/dist/server.js`

### Step 5 — Environment Variables
Add same variables as Render (Step 4 above) in Railway's **Variables** tab.

---

## 3. Docker (Any VPS)

### Option A: Local / DigitalOcean / AWS EC2

**Step 1** — Copy files to your server, then:

```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env
nano .env

# Build and run
docker compose up -d

# Check logs
docker compose logs -f app
```

App runs at `http://YOUR_SERVER_IP:5000`

**Step 2** — Set up HTTPS with Nginx + Certbot:

```nginx
server {
    listen 80;
    server_name myfinance.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name myfinance.example.com;
    
    ssl_certificate /etc/letsencrypt/live/myfinance.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myfinance.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Get free SSL certificate
sudo certbot --nginx -d myfinance.example.com
```

---

## Database Setup (PostgreSQL)

### Free Cloud Options

| Provider | Free Tier | Notes |
|---|---|---|
| **Neon** ([neon.tech](https://neon.tech)) | 512 MB | Best free tier, serverless |
| **Supabase** ([supabase.com](https://supabase.com)) | 500 MB | Includes auth + storage |
| **Render Postgres** | 256 MB | Integrated with Render hosting |
| **Railway** | $5 credit/month | Automatically linked |

### Neon Setup (Recommended Free Option)
1. Sign up at [neon.tech](https://neon.tech)
2. Create project → Copy the **Connection String**
3. It looks like: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
4. Set this as `DATABASE_URL` in your deployment platform

---

## Cloudinary (Cloud File Storage)

Cloudinary stores your uploaded receipts, PDFs, and documents in the cloud.

### Setup
1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier: 25 GB storage)
2. Dashboard → copy **Cloud Name**, **API Key**, **API Secret**
3. Set these three values in your environment variables

### Free Tier
- 25 GB storage
- 25 GB bandwidth/month
- Sufficient for hundreds of receipts and documents

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | Set to `production` |
| `PORT` | ✅ | Server port (Render/Railway auto-set) |
| `JWT_SECRET` | ✅ | Random 64+ char string. **Generate with**: `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | ✅ | Token lifetime: `7d`, `30d`, `1h` |
| `DATABASE_URL` | Optional | PostgreSQL URL. If blank, uses SQLite |
| `DATABASE_SSL` | Optional | Set to `false` only for local Postgres |
| `ALLOWED_ORIGINS` | ✅ | Your app's public URL(s), comma separated |
| `CLOUDINARY_CLOUD_NAME` | Optional | If blank, uses local disk storage |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary credential |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary credential |

---

## After Deployment

### Register Your Account
1. Open your app URL in any browser
2. Click **Register**
3. Enter your email and a strong password (min 8 characters)
4. You're logged in — all your data is isolated to your account

### Access from Mobile
Open the same URL in your phone's browser. Tap **Add to Home Screen** (Safari on iOS / Chrome on Android) for a native app-like experience.

### Security Notes
- ✅ All connections use HTTPS (provided by Render/Railway automatically)
- ✅ Passwords are hashed with bcrypt (12 rounds)
- ✅ JWT tokens expire after 7 days
- ✅ Rate limiting: max 15 login attempts per 15 minutes
- ✅ Each user's data is completely isolated

---

## Monitoring

Check your app health at any time:
```
GET https://your-app.onrender.com/api/health
```
Returns:
```json
{
  "status": "ok",
  "environment": "production",
  "uptime": "3600s",
  "timestamp": "2026-07-07T03:00:00.000Z"
}
```
