# 🚀 Deployment Guide: Neeti AI

This guide contains the "proper" process to deploy Neeti AI to production using **Railway** (Backend/Worker) and **Vercel** (Frontend).

## 1. Prerequisites
- [GitHub](https://github.com/) account with the project uploaded.
- [Railway.app](https://railway.app/) account.
- [Vercel.com](https://vercel.com/) account.
- [Supabase.com](https://supabase.com/) account (for PostgreSQL).

---

## 2. Infrastructure Setup

### A. Database (Supabase)
1. Create a new project on Supabase.
2. Go to `Project Settings` > `Database`.
3. Locate the **Connection Pooler** section.
4. Select **Transaction** mode and **IPv4**.
5. Copy the **URI** connection string (it should use port **6543**, e.g., `postgresql://postgres.[ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`).
   > [!IMPORTANT]
   > Do NOT use the Direct Connection (Port 5432) value in Railway, as it uses IPv6 and will cause "Network is unreachable" errors.

### B. Redis (Railway)
1. Log in to Railway and create a new project.
2. Click **New** > **Database** > **Redis**.
3. Railway will provide a `REDIS_URL`. You will use this in the backend settings.

---

## 3. Backend Deployment (Railway)

### Service 1: API Server
1. Click **New** > **GitHub Repo** > Select your repo.
2. Go to **Settings** > **General**.
   - **Root Directory**: Leave empty (root).
3. Go to **Variables** and add:
   - `ENVIRONMENT`: `production`
   - `DATABASE_URL`: (Your Supabase URI)
   - `REDIS_URL`: `${{Redis.REDIS_URL}}`
   - `SUPABASE_URL`: (From Supabase API settings)
   - `SUPABASE_ANON_KEY`: (From Supabase API settings)
   - `OPENAI_API_KEY`: (Your OpenAI or Gemini API Key)
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app` (Update after Vercel deployment)
   - `USE_OLLAMA`: `False` (Recommended for production)

### Service 2: Celery Worker
1. In the same Railway project, click **New** > **GitHub Repo** > Select the same repo.
2. Rename it to `neeti-worker`.
3. Go to **Settings** > **Deploy**.
   - **Dockerfile Path**: `Dockerfile.worker`
4. Go to **Variables** > **Reference variables from API Server** (to sync all keys).

---

## 4. Frontend Deployment (Vercel)

1. Log in to Vercel and click **Add New** > **Project**.
2. Import your GitHub repository.
3. **Framework Preset**: Vite.
4. **Root Directory**: `frontend`.
5. **Environment Variables**:
   - `VITE_API_URL`: `https://your-api-service.up.railway.app` (Copy from Railway API service settings).
   - `VITE_SUPABASE_URL`: (Your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
6. Click **Deploy**.

---

## 5. Post-Deployment (Crucial)

1. **Update Backend CORS**:
   - Once your Vercel site is live, copy its URL.
   - Go back to Railway > API Service > Variables.
   - Update `CORS_ORIGINS` to include your Vercel URL.
2. **Verify Health**:
   - Visit `https://your-api.up.railway.app/health`.
   - It should return `{"status": "healthy", ...}`.

---

## 💡 Production Tips
- **AI Cost**: By setting `USE_OLLAMA=False`, the app will use OpenAI/Gemini. Ensure you have credits in your AI provider account.
- **Monitoring**: Railway provides a "Logs" tab. Watch for any "Connection Refused" errors in the worker.
- **Scaling**: If you get many concurrent interviews, increase the `WORKERS` variable in Railway to `4` or `8`.
