# 🚀 How to Deploy NexusDoc AI on Render

Here are the exact commands and settings for deploying **NexusDoc AI** on [Render.com](https://render.com).

---

## 🌟 FRONTEND DEPLOYMENT (Choose Option A or Option B)

### 🟢 OPTION A: Deploy as a "Static Site" on Render (Recommended — 100% Free Forever, No Server Sleep)
If you created a **Static Site** on Render (like in your dashboard):
1. **Name:** `nexusdoc-web` (or `nexusdoc-ai-1`)
2. **Branch:** `main`
3. **Build Command:**
   ```bash
   npm install && npm run build:web
   ```
4. **Publish Directory:**
   ```bash
   apps/web/out
   ```
   *(⚠️ Important: Do NOT put `npm run start` in the Publish Directory box! Put `apps/web/out` because Render asks for a folder path).*
5. Click **Save Changes** / **Manual Deploy** ➔ **Clear build cache & deploy**. It will build and go live instantly!

---

### 🔵 OPTION B: Deploy as a "Web Service" on Render
If you created a **Web Service** on Render:
1. **Name:** `nexusdoc-web`
2. **Runtime:** `Node`
3. **Branch:** `main`
4. **Build Command:**
   ```bash
   npm install && npm run build:web
   ```
5. **Start Command:**
   ```bash
   npm run start
   ```
6. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g. `https://nexusdoc-api.onrender.com`)
7. Click **Create Web Service**.

---

## ⚙️ BACKEND DEPLOYMENT (Web Service)
For the backend API & CRDT WebSockets:
1. Click **New +** ➔ **Web Service**
2. **Name:** `nexusdoc-api`
3. **Runtime:** `Node`
4. **Build Command:**
   ```bash
   npm install && npm run build:api
   ```
5. **Start Command:**
   ```bash
   npm run start:api
   ```
6. **Health Check Path:**
   ```bash
   /healthz
   ```
7. Click **Create Web Service**.
