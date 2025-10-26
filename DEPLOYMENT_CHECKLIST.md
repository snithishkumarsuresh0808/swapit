# ✅ Deployment Checklist

## Pre-Deployment ✅ DONE
- [x] Code pushed to GitHub
- [x] Production settings configured
- [x] Requirements.txt created
- [x] Environment variables documented
- [x] Build scripts ready
- [x] Deployment guides created

---

## Now Deploy in 3 Easy Steps:

### 📦 Step 1: Deploy Backend (5 min)
**Platform**: Render.com (FREE)

1. Go to: https://dashboard.render.com/register
2. Sign up with GitHub
3. Create PostgreSQL database:
   - Click "New +" → "PostgreSQL"
   - Name: `swapit-db`
   - Plan: Free
   - Create & copy URL

4. Deploy backend:
   - Click "New +" → "Web Service"
   - Connect repo: `snithishkumarsuresh0808/swapit`
   - Root Directory: `backend`
   - Build: `./build.sh`
   - Start: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
   - Add environment variables (see QUICK_DEPLOY.md)
   - Deploy!

**Result**: `https://swapit-backend.onrender.com`

---

### 🎨 Step 2: Deploy Frontend (3 min)
**Platform**: Vercel (FREE)

1. Go to: https://vercel.com/signup
2. Sign up with GitHub
3. Import project:
   - Click "Add New" → "Project"
   - Select `swapit` repo
   - Root Directory: `frontend`
   - Add env variables:
     ```
     NEXT_PUBLIC_API_URL=https://swapit-backend.onrender.com
     NEXT_PUBLIC_WS_URL=wss://swapit-backend.onrender.com
     ```
   - Deploy!

**Result**: `https://swapit-xxx.vercel.app`

---

### 🔗 Step 3: Connect Them (2 min)

1. Update Render backend CORS:
   - Go to Render → swapit-backend → Environment
   - Update `CORS_ALLOWED_ORIGINS`:
     ```
     https://your-vercel-url.vercel.app,http://localhost:3000
     ```
   - Save (auto-redeploys)

2. Test it:
   - Visit your Vercel URL
   - Sign up
   - Create post
   - Test messaging & calling

---

## 🎯 Your Deployment URLs

After deployment, update these:

```
Frontend: https://swapit-[YOUR-ID].vercel.app
Backend:  https://swapit-backend.onrender.com
Admin:    https://swapit-backend.onrender.com/admin
GitHub:   https://github.com/snithishkumarsuresh0808/swapit
```

---

## 📚 Documentation Files

- **QUICK_DEPLOY.md** - Step-by-step deployment (START HERE!)
- **DEPLOYMENT_GUIDE.md** - Detailed options & alternatives
- **README.md** - Project overview
- **backend/.env.example** - Backend environment template
- **frontend/.env.example** - Frontend environment template

---

## 🆓 100% Free Stack

| Service | What | Free Tier |
|---------|------|-----------|
| Render | Backend + Database | 750 hrs/month |
| Vercel | Frontend | Unlimited |
| Upstash | Redis | 10K req/day |
| GitHub | Code hosting | Unlimited |
| **Total** | **Full App** | **$0/month** |

---

## 🚀 Ready to Deploy?

1. Open **QUICK_DEPLOY.md**
2. Follow the 3 steps
3. Your app will be live in ~10 minutes!

---

## Need Help?

- **Deployment Issues**: Check QUICK_DEPLOY.md Troubleshooting section
- **Feature Questions**: See README.md
- **Advanced Setup**: See DEPLOYMENT_GUIDE.md
- **GitHub Issues**: https://github.com/snithishkumarsuresh0808/swapit/issues

---

**Status**: ✅ Ready to Deploy
**Estimated Time**: 10 minutes
**Cost**: FREE

🎉 **Let's get your app live!** Open `QUICK_DEPLOY.md` and start deploying!
