# SwapIt Deployment Guide

Complete guide to deploy SwapIt (Django + Next.js + WebRTC) to production.

## Table of Contents
1. [Free Deployment Options](#free-deployment-options)
2. [Option 1: Deploy to Render + Vercel (Recommended)](#option-1-render--vercel)
3. [Option 2: Deploy to Railway](#option-2-railway)
4. [Option 3: Deploy to Your Own VPS](#option-3-vps-deployment)
5. [Environment Setup](#environment-setup)
6. [Post-Deployment Steps](#post-deployment-steps)

---

## Free Deployment Options

### Best Free Options:
- **Backend (Django)**: Render.com (Free tier with WebSocket support)
- **Frontend (Next.js)**: Vercel (Free with unlimited bandwidth)
- **Database**: PostgreSQL on Render or Railway
- **Redis**: Redis Cloud (Free 30MB) or Upstash
- **Media Files**: Cloudinary (Free 25GB storage)

---

## Option 1: Render + Vercel (Recommended)

### Step 1: Prepare Backend for Deployment

#### 1.1 Install Production Dependencies
```bash
cd backend
pip install gunicorn psycopg2-binary dj-database-url whitenoise python-decouple cloudinary
pip freeze > requirements.txt
```

#### 1.2 Create `backend/.env.production` file
```env
SECRET_KEY=your-super-secret-key-here-generate-new-one
DEBUG=False
ALLOWED_HOSTS=your-app-name.onrender.com,localhost
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://default:password@host:6379

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### 1.3 Update `config/settings.py`
Add this at the top:
```python
from decouple import config
import dj_database_url

SECRET_KEY = config('SECRET_KEY', default='your-secret-key')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3'),
        conn_max_age=600
    )
}

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Cloudinary for media files
import cloudinary
import cloudinary.uploader
import cloudinary.api

cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default=''),
    api_key=config('CLOUDINARY_API_KEY', default=''),
    api_secret=config('CLOUDINARY_API_SECRET', default=''),
)

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# CORS
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000').split(',')

# Channel Layers (use Redis in production)
if config('REDIS_URL', default=''):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [config('REDIS_URL')],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer'
        }
    }
```

#### 1.4 Add Whitenoise to Middleware
In `config/settings.py`, update MIDDLEWARE:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this line
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    # ... rest of middleware
]
```

#### 1.5 Create `backend/Procfile`
```
web: daphne -b 0.0.0.0 -p $PORT config.asgi:application
```

#### 1.6 Create `backend/render.yaml`
```yaml
services:
  - type: web
    name: swapit-backend
    env: python
    buildCommand: "pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate"
    startCommand: "daphne -b 0.0.0.0 -p $PORT config.asgi:application"
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
      - key: PYTHON_VERSION
        value: 3.12.0

databases:
  - name: swapit-db
    databaseName: swapit
    user: swapit_user
```

### Step 2: Deploy Backend to Render

1. **Create Render Account**: Go to https://render.com and sign up
2. **Create PostgreSQL Database**:
   - Click "New +" → "PostgreSQL"
   - Name it "swapit-db"
   - Choose Free plan
   - Copy the "Internal Database URL" and "External Database URL"

3. **Create Redis Instance** (Optional but recommended):
   - Go to https://redis.com/try-free/ or https://upstash.com
   - Create free Redis database
   - Copy Redis URL

4. **Deploy Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the backend folder
   - Use these settings:
     - **Name**: swapit-backend
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`
     - **Start Command**: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`

5. **Add Environment Variables**:
   - SECRET_KEY: (generate at https://djecrety.ir/)
   - DEBUG: False
   - ALLOWED_HOSTS: your-app-name.onrender.com
   - DATABASE_URL: (paste Internal Database URL)
   - REDIS_URL: (paste Redis URL)
   - CORS_ALLOWED_ORIGINS: https://your-frontend.vercel.app

6. **Deploy**: Click "Create Web Service"

### Step 3: Deploy Frontend to Vercel

#### 3.1 Update Frontend Environment Variables

Create `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

#### 3.2 Update API URLs in Frontend

Replace all `http://localhost:8000` with `process.env.NEXT_PUBLIC_API_URL`:

Example in `frontend/app/page.tsx`:
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/all/`, {
  headers: {
    'Authorization': `Token ${token}`,
  },
});
```

Update WebSocket URL in `WebRTCCall.tsx`:
```typescript
const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/call/${currentUserId}/`);
```

#### 3.3 Deploy to Vercel

1. **Create Vercel Account**: Go to https://vercel.com and sign up
2. **Import Project**:
   - Click "Add New..." → "Project"
   - Connect your GitHub repository
   - Select the frontend folder
   - Framework Preset: Next.js

3. **Configure**:
   - Root Directory: `frontend`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Add Environment Variables**:
   - NEXT_PUBLIC_API_URL: `https://your-backend.onrender.com`
   - NEXT_PUBLIC_WS_URL: `wss://your-backend.onrender.com`

5. **Deploy**: Click "Deploy"

6. **Update Backend CORS**:
   - Go back to Render
   - Update CORS_ALLOWED_ORIGINS to include your Vercel URL
   - Example: `https://swapit.vercel.app,http://localhost:3000`

---

## Option 2: Railway (All-in-One)

Railway provides simple deployment for both frontend and backend.

### Step 1: Deploy Backend to Railway

1. **Sign up**: https://railway.app
2. **Create New Project** → "Deploy from GitHub repo"
3. **Add PostgreSQL**: Click "+" → "Database" → "PostgreSQL"
4. **Add Redis**: Click "+" → "Database" → "Redis"
5. **Deploy Django**:
   - Click "+" → "GitHub Repo" → Select backend
   - Add environment variables (same as Render)
   - Railway auto-detects Python and runs migrations

### Step 2: Deploy Frontend to Railway

1. In same project, click "+" → "GitHub Repo" → Select frontend
2. Add environment variables
3. Railway auto-detects Next.js

**Cost**: $5/month after free tier

---

## Option 3: VPS Deployment (DigitalOcean, Linode, AWS EC2)

### Requirements
- Ubuntu 22.04 server
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3-pip python3-venv postgresql postgresql-contrib nginx redis-server -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Setup PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE swapit;
CREATE USER swapit_user WITH PASSWORD 'your_password';
ALTER ROLE swapit_user SET client_encoding TO 'utf8';
ALTER ROLE swapit_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE swapit_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE swapit TO swapit_user;
\q
```

### Step 3: Deploy Backend

```bash
# Clone repository
cd /home
sudo git clone https://github.com/yourusername/swapit.git
cd swapit/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt gunicorn

# Setup environment variables
nano .env
# Add production settings

# Run migrations
python manage.py migrate
python manage.py collectstatic --no-input

# Create superuser
python manage.py createsuperuser
```

### Step 4: Setup Gunicorn & Daphne

Create `/etc/systemd/system/swapit.service`:
```ini
[Unit]
Description=SwapIt Gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/home/swapit/backend
ExecStart=/home/swapit/backend/venv/bin/daphne -b 0.0.0.0 -p 8000 config.asgi:application

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl start swapit
sudo systemctl enable swapit
```

### Step 5: Setup Nginx

Create `/etc/nginx/sites-available/swapit`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/swapit/backend/staticfiles/;
    }

    location /media/ {
        alias /home/swapit/backend/media/;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/swapit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Setup SSL

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### Step 7: Deploy Frontend

```bash
cd /home/swapit/frontend

# Install dependencies
npm install

# Build
npm run build

# Install PM2
sudo npm install -g pm2

# Start Next.js
pm2 start npm --name "swapit-frontend" -- start

# Save PM2 config
pm2 save
pm2 startup
```

### Step 8: Setup Nginx for Frontend

Create `/etc/nginx/sites-available/swapit-frontend`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/swapit-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Setup

### Backend Environment Variables

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,api.your-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (for Channels)
REDIS_URL=redis://default:password@host:6379

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://yourdomain.com

# Cloudinary (for media files)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

---

## Post-Deployment Steps

### 1. Test WebSocket Connection
```javascript
// Open browser console on your deployed site
const ws = new WebSocket('wss://api.yourdomain.com/ws/call/1/');
ws.onopen = () => console.log('WebSocket Connected!');
```

### 2. Test API Endpoints
```bash
curl https://api.yourdomain.com/api/posts/all/
```

### 3. Monitor Logs

**Render**:
- Go to Dashboard → Your Service → Logs

**Railway**:
- Click on service → View Logs

**VPS**:
```bash
sudo journalctl -u swapit -f
pm2 logs swapit-frontend
```

### 4. Setup Monitoring (Optional)
- Use Sentry for error tracking: https://sentry.io
- Use UptimeRobot for uptime monitoring: https://uptimerobot.com

---

## Cost Comparison

| Platform | Backend | Frontend | Database | Total/Month |
|----------|---------|----------|----------|-------------|
| Render + Vercel | Free | Free | Free | **$0** |
| Railway | $5 | $5 | Included | **$10** |
| VPS (DigitalOcean) | $6 | Included | Included | **$6** |
| Heroku | $7 | $0 | $5 | **$12** |

**Recommended**: Start with Render + Vercel (free), upgrade to VPS when you grow.

---

## Troubleshooting

### WebSocket Connection Issues
1. Make sure you're using `wss://` (not `ws://`) in production
2. Check CORS settings include your frontend domain
3. Verify Redis is running and connected
4. Check Nginx/proxy configuration for WebSocket upgrade headers

### Static Files Not Loading
1. Run `python manage.py collectstatic`
2. Check STATIC_ROOT and STATIC_URL settings
3. Verify Nginx is serving static files correctly

### Database Connection Errors
1. Verify DATABASE_URL is correct
2. Check database credentials
3. Ensure database migrations ran: `python manage.py migrate`

### CORS Errors
1. Add frontend domain to CORS_ALLOWED_ORIGINS
2. Restart backend service after updating CORS settings
3. Clear browser cache

---

## Security Checklist

- [ ] Change SECRET_KEY to a new random value
- [ ] Set DEBUG=False in production
- [ ] Use HTTPS/WSS everywhere
- [ ] Enable CSRF protection
- [ ] Set secure cookie flags
- [ ] Use environment variables for sensitive data
- [ ] Regular security updates
- [ ] Setup backup for database
- [ ] Use strong passwords
- [ ] Enable rate limiting

---

## Useful Commands

### Backend
```bash
# Check service status
sudo systemctl status swapit

# Restart service
sudo systemctl restart swapit

# View logs
sudo journalctl -u swapit -f

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Frontend
```bash
# Check PM2 status
pm2 status

# Restart frontend
pm2 restart swapit-frontend

# View logs
pm2 logs swapit-frontend
```

---

## Next Steps

1. **Setup Custom Domain**: Point your domain to deployment
2. **Add Analytics**: Google Analytics or Plausible
3. **Setup Email**: Use SendGrid or AWS SES for password reset emails
4. **Add Monitoring**: Sentry for error tracking
5. **Setup Backups**: Automated database backups
6. **CDN**: Use Cloudflare for static assets

---

## Support

Need help? Check:
- Render Documentation: https://render.com/docs
- Vercel Documentation: https://vercel.com/docs
- Django Channels: https://channels.readthedocs.io
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Happy Deploying! 🚀**
