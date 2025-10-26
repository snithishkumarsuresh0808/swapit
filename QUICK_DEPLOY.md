# 🚀 Quick Deployment Guide - SwapIt

Deploy SwapIt to Render + Vercel in 10 minutes (100% FREE!)

## Prerequisites
- GitHub account
- Render account (sign up at https://render.com)
- Vercel account (sign up at https://vercel.com)

---

## Step 1: Push Code to GitHub (2 min)

```bash
cd d:\SwapIt
git add .
git commit -m "Ready for deployment"
git push origin main
```

---

## Step 2: Deploy Backend to Render (5 min)

### 2.1 Create PostgreSQL Database
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Settings:
   - **Name**: `swapit-db`
   - **Database**: `swapit`
   - **User**: `swapit`
   - **Region**: Choose closest to you
   - **Plan**: **Free**
4. Click **"Create Database"**
5. **Copy** the **"Internal Database URL"** (starts with `postgresql://`)

### 2.2 Create Redis (Optional but Recommended)
1. Go to https://upstash.com
2. Sign in with GitHub
3. Create **Redis Database**
4. **Copy** the Redis URL (starts with `redis://`)

### 2.3 Deploy Backend Web Service
1. Back in Render, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `https://github.com/snithishkumarsuresh0808/swapit`
3. Settings:
   - **Name**: `swapit-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
   - **Plan**: **Free**

4. Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | Click "Generate" or use https://djecrety.ir/ |
| `DEBUG` | `False` |
| `PYTHON_VERSION` | `3.12.0` |
| `DATABASE_URL` | Paste Internal Database URL from Step 2.1 |
| `REDIS_URL` | Paste Redis URL from Step 2.2 (optional) |
| `ALLOWED_HOSTS` | `swapit-backend.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` (we'll update this later) |

5. Click **"Create Web Service"**
6. Wait ~5 minutes for deployment
7. **Copy your backend URL**: `https://swapit-backend.onrender.com`

---

## Step 3: Deploy Frontend to Vercel (3 min)

### 3.1 Deploy to Vercel
1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. **Import** your GitHub repository: `swapit`
4. Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

5. Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://swapit-backend.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | `wss://swapit-backend.onrender.com` |

6. Click **"Deploy"**
7. Wait ~2 minutes
8. **Copy your frontend URL**: `https://swapit-xxxx.vercel.app`

### 3.2 Update Backend CORS
1. Go back to Render dashboard
2. Open your `swapit-backend` service
3. Go to **"Environment"**
4. Update `CORS_ALLOWED_ORIGINS`:
   ```
   https://swapit-xxxx.vercel.app,http://localhost:3000
   ```
5. Update `ALLOWED_HOSTS`:
   ```
   swapit-backend.onrender.com,localhost
   ```
6. Click **"Save Changes"** (auto-redeploys)

---

## Step 4: Create Superuser (Optional)

Access Render's Shell:
1. Go to Render dashboard → `swapit-backend`
2. Click **"Shell"** tab
3. Run:
```bash
python manage.py createsuperuser
```

---

## Step 5: Test Your Deployment

1. **Frontend**: Visit `https://swapit-xxxx.vercel.app`
2. **Sign up** for a new account
3. **Create a post** with your skills
4. **Test messaging** and **calling** features
5. **Admin panel**: `https://swapit-backend.onrender.com/admin`

---

## 🎉 You're Live!

Your SwapIt app is now deployed and accessible worldwide!

- **Frontend**: https://swapit-xxxx.vercel.app
- **Backend**: https://swapit-backend.onrender.com
- **Admin**: https://swapit-backend.onrender.com/admin

---

## Troubleshooting

### Backend Not Starting
Check Render logs:
1. Render Dashboard → swapit-backend → Logs
2. Look for errors

### Frontend Can't Connect to Backend
1. Check environment variables in Vercel
2. Ensure CORS is configured correctly
3. Use browser console (F12) to see errors

### WebSocket Not Working
1. Ensure you're using `wss://` (not `ws://`) in production
2. Check Redis connection
3. Verify Render is using Daphne (not Gunicorn)

### Static Files Not Loading
```bash
# Run in Render Shell
python manage.py collectstatic --no-input
```

---

## Free Tier Limits

| Service | Limit | What Happens After |
|---------|-------|-------------------|
| **Render Free** | 750 hours/month | Spins down after 15 min inactivity |
| **Vercel** | Unlimited | Always on |
| **PostgreSQL** | 1GB storage | Upgrade to paid |
| **Upstash Redis** | 10,000 commands/day | Upgrade to paid |

**Note**: Render free tier sleeps after 15 minutes of inactivity. First request will take ~30 seconds to wake up.

---

## Next Steps

1. **Custom Domain**:
   - Buy domain from Namecheap/GoDaddy
   - Add to Vercel: Settings → Domains
   - Add to Render: Settings → Custom Domain

2. **Email Service**:
   - Setup SendGrid/Mailgun for password reset emails

3. **Monitoring**:
   - Add Sentry for error tracking
   - Use UptimeRobot to keep Render awake

4. **Analytics**:
   - Add Google Analytics or Plausible

---

## Upgrade to Paid (Optional)

When you grow, consider:
- **Render**: $7/month (no sleep, more resources)
- **Vercel**: Free is usually enough
- **Railway**: $5/month (easier, all-in-one)

---

## Support

Issues? Check:
- Render Logs: Dashboard → Service → Logs
- Vercel Logs: Deployment → Function Logs
- Browser Console: F12 → Console tab

For help: https://github.com/snithishkumarsuresh0808/swapit/issues

---

**Deployed by**: Claude Code
**Time**: ~10 minutes
**Cost**: $0/month

🎉 **Congratulations! Your app is live!** 🎉
