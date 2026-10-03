# 🚀 How to Deploy NexusDoc AI on Render (Step-by-Step)

This guide walks you through deploying **NexusDoc AI** on [Render.com](https://render.com) in just a few minutes.

You have two simple options:
- **Method 1: 1-Click Blueprint (Recommended)** — Automatically creates both services using `render.yaml`.
- **Method 2: Manual Setup via Render Web UI** — Step-by-step creation of the Backend and Frontend web services.

---

## Method 1: 1-Click Blueprint (Fastest)

1. Push your code to your GitHub repository (already done!).
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click the **"New +"** button in the top right and select **"Blueprint"**.
4. Connect your GitHub account and select your repository: **`NexusDoc-AI`**.
5. Render will automatically read `render.yaml` and show:
   - `nexusdoc-api` (Backend Web Service)
   - `nexusdoc-web` (Frontend Web Service)
6. Click **"Apply"**.
7. Once `nexusdoc-api` is deployed, copy its URL (e.g. `https://nexusdoc-api.onrender.com`).
8. Go to `nexusdoc-web` ➔ **Environment** ➔ Add/Edit `NEXT_PUBLIC_API_URL` with that URL, and click **Save Changes** (this will trigger a fast rebuild with your backend connected).

---

## Method 2: Manual Setup via Render Web UI (Free Tier)

### Step 1: Deploy the Backend API (`nexusdoc-api`)
1. On your Render dashboard, click **"New +"** ➔ **"Web Service"**.
2. Connect your GitHub repository: `NexusDoc-AI`.
3. Configure the settings:
   - **Name:** `nexusdoc-api`
   - **Language / Runtime:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build:api`
   - **Start Command:** `npm run start:api`
   - **Instance Type:** `Free`
4. Under **Health Check Path**, enter: `/healthz`
5. *(Optional)* Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `OPENAI_API_KEY`: *(Your key, optional — runs built-in vector engine if omitted)*
   - `DATABASE_URL`: *(Your PostgreSQL URL, optional — runs in-memory mode if omitted)*
   - `REDIS_URL`: *(Your Redis URL, optional)*
6. Click **"Create Web Service"**.
7. Wait 1-2 minutes for it to deploy. Copy your live backend URL (e.g., `https://nexusdoc-api.onrender.com`).

---

### Step 2: Deploy the Frontend Canvas (`nexusdoc-web`)
1. On your Render dashboard, click **"New +"** ➔ **"Web Service"**.
2. Select your repository: `NexusDoc-AI`.
3. Configure the settings:
   - **Name:** `nexusdoc-web`
   - **Language / Runtime:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build:web`
   - **Start Command:** `npm run start:web`
   - **Instance Type:** `Free`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_API_URL`: Paste your backend URL from Step 1 (e.g. `https://nexusdoc-api.onrender.com`)
5. Click **"Create Web Service"**.
6. Render will build and deploy your Next.js application! Once complete, click your live frontend link (e.g. `https://nexusdoc-web.onrender.com`) to open your collaborative workspace.

---

## 💡 Real-Time WebSockets Note on Render
* Render natively supports WebSockets without any extra setup.
* Because your backend uses HTTPS (`https://nexusdoc-api.onrender.com`), NexusDoc AI automatically upgrades WebSocket connections to secure WebSockets (`wss://nexusdoc-api.onrender.com`), ensuring seamless CRDT sync across all devices.

## 🗄️ Optional: Connecting a Free Database
If you want persistent storage on the free tier:
* **PostgreSQL with pgvector:** Create a free project on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) and paste the connection string into `DATABASE_URL` in `nexusdoc-api`.
* **Redis:** Create a free Redis database on [Upstash](https://upstash.com) and paste into `REDIS_URL`.
