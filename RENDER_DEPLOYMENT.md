# 🚀 Render Deployment Guide - Frontend + Backend

## Overview

Deploy both frontend and backend to Render using a single configuration file.

---

## Option 1: Deploy Using render.yaml (Recommended)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Configure for Render deployment"
git push origin main
```

### Step 2: Connect to Render

1. **Go to Render**
   - Visit: https://render.com
   - Sign in with GitHub

2. **Create New Blueprint**
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub account
   - Select repository: **"LeetCode-Tracker"**
   - Render will detect `render.yaml`

3. **Review Services**
   - **Backend**: Node.js web service
   - **Frontend**: Static site
   - Click **"Apply"**

4. **Wait for Deployment**
   - Backend deploys first (~2-3 minutes)
   - Frontend deploys next (~1-2 minutes)
   - Total: ~5 minutes

5. **Get Your URLs**
   - Backend: `https://leetcode-tracker-backend.onrender.com`
   - Frontend: `https://leetcode-tracker-frontend.onrender.com`

---

## Option 2: Deploy Manually (Two Services)

### Step 1: Deploy Backend

1. **Create Web Service**
   - Go to https://render.com/dashboard
   - Click **"New +"** → **"Web Service"**
   - Connect GitHub repository

2. **Configure Backend**
   - **Name**: `leetcode-tracker-backend`
   - **Environment**: Node
   - **Region**: Oregon (or closest to you)
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

3. **Add Environment Variables**
   - `PORT` = `5001`
   - `NODE_ENV` = `production`

4. **Deploy**
   - Click **"Create Web Service"**
   - Wait 2-3 minutes
   - Copy backend URL: `https://leetcode-tracker-backend.onrender.com`

### Step 2: Deploy Frontend

1. **Create Static Site**
   - Click **"New +"** → **"Static Site"**
   - Connect same GitHub repository

2. **Configure Frontend**
   - **Name**: `leetcode-tracker-frontend`
   - **Branch**: main
   - **Root Directory**: `.` (root)
   - **Build Command**: (leave empty)
   - **Publish Directory**: `.` (root)

3. **Deploy**
   - Click **"Create Static Site"**
   - Wait 1-2 minutes
   - Copy frontend URL: `https://leetcode-tracker-frontend.onrender.com`

---

## Configuration Files

### render.yaml (Already Created)

```yaml
services:
  # Backend API
  - type: web
    name: leetcode-tracker-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5001
    healthCheckPath: /

  # Frontend Static Site
  - type: web
    name: leetcode-tracker-frontend
    env: static
    region: oregon
    plan: free
    buildCommand: echo "No build needed"
    staticPublishPath: .
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### api-config.js (Already Updated)

```javascript
const PRODUCTION_API_URL = 'https://leetcode-tracker-backend.onrender.com/api';
```

---

## After Deployment

### 1. Verify Backend

```bash
curl https://leetcode-tracker-backend.onrender.com/api/problems
```

Should return 147 problems.

### 2. Test Frontend

1. Open: `https://leetcode-tracker-frontend.onrender.com`
2. Check browser console (F12)
3. Should see: `🔧 API Configuration: { environment: 'PRODUCTION', ... }`
4. Problems should load

### 3. Test Features

- ✅ 147 problems display
- ✅ Add problem works
- ✅ Update status works
- ✅ Delete problem works
- ✅ Data persists

---

## Render Free Tier

### Backend (Web Service)
- **Specs**: 512 MB RAM, 0.1 CPU
- **Sleep**: Spins down after 15 minutes of inactivity
- **Cold Start**: ~30 seconds on first request
- **Hours**: 750 hours/month free

### Frontend (Static Site)
- **Bandwidth**: 100 GB/month
- **Always On**: No sleep
- **CDN**: Global distribution
- **HTTPS**: Automatic

---

## Automatic Deployments

### How It Works

Every push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Update feature"
git push origin main

# Render automatically:
✅ Detects push
✅ Rebuilds backend (if backend/ changed)
✅ Rebuilds frontend (if root files changed)
✅ Deploys updates
✅ Takes 2-5 minutes
```

---

## Custom Domain (Optional)

### Add Your Domain

1. **Go to Service Settings**
   - Select your frontend service
   - Go to **"Settings"** → **"Custom Domains"**

2. **Add Domain**
   - Enter your domain: `leetcode.yourdomain.com`
   - Follow DNS instructions

3. **Update DNS**
   - Add CNAME record:
   ```
   Type: CNAME
   Name: leetcode
   Value: leetcode-tracker-frontend.onrender.com
   ```

4. **Wait for Verification**
   - Takes 5-10 minutes
   - HTTPS automatically enabled

---

## Monitoring

### View Logs

**Backend Logs:**
1. Go to backend service
2. Click **"Logs"** tab
3. See real-time API requests

**Frontend Logs:**
1. Go to frontend service
2. Click **"Logs"** tab
3. See deployment logs

### Check Status

**Dashboard:**
- Green = Running
- Yellow = Deploying
- Red = Failed

**Health Check:**
- Backend: `https://leetcode-tracker-backend.onrender.com/`
- Should return: `{"success": true, "message": "LeetCode Tracker API is running"}`

---

## Troubleshooting

### Backend Not Responding

**Issue:** First request takes 30 seconds

**Cause:** Free tier spins down after 15 minutes

**Solution:** Wait 30 seconds for cold start, then it's fast

### CORS Errors

**Issue:** Frontend can't connect to backend

**Solution:** Update `backend/server.js` CORS:

```javascript
app.use(cors({
  origin: [
    'http://localhost:8000',
    'https://leetcode-tracker-frontend.onrender.com'
  ]
}));
```

Then redeploy backend.

### Build Fails

**Check:**
1. Build logs in Render dashboard
2. Verify `backend/package.json` has all dependencies
3. Check Node.js version compatibility

---

## Updating Your App

### Update Backend

```bash
# Make changes to backend/
vim backend/server.js

# Commit and push
git add backend/
git commit -m "Update backend"
git push origin main

# Render auto-deploys backend only
```

### Update Frontend

```bash
# Make changes to frontend files
vim script.js

# Commit and push
git add .
git commit -m "Update frontend"
git push origin main

# Render auto-deploys frontend only
```

---

## Cost

### Free Tier (Current)
- Backend: Free (with sleep)
- Frontend: Free
- **Total: $0/month**

### Paid Tier (Optional)
- Backend: $7/month (no sleep, always on)
- Frontend: Free
- **Total: $7/month**

---

## Comparison: Render vs Vercel

| Feature | Render | Vercel |
|---------|--------|--------|
| Backend | ✅ Native Node.js | ⚠️ Serverless only |
| Frontend | ✅ Static site | ✅ Static site |
| Setup | ✅ Simple | ❌ Complex |
| Free Tier | ✅ 750 hrs/month | ✅ Unlimited |
| Sleep | ⚠️ Yes (15 min) | ❌ No |
| Configuration | ✅ One file | ❌ Multiple files |

**Render is better for full-stack apps!**

---

## Summary

### What You Get:

1. **Backend on Render**
   - URL: `https://leetcode-tracker-backend.onrender.com`
   - Node.js + Express
   - JSON file storage
   - Auto-deploy on push

2. **Frontend on Render**
   - URL: `https://leetcode-tracker-frontend.onrender.com`
   - Static HTML/CSS/JS
   - Global CDN
   - Auto-deploy on push

3. **Single Configuration**
   - One `render.yaml` file
   - Deploy both services together
   - Easy to manage

---

## Next Steps

1. ✅ Configuration files created
2. ⏳ Push to GitHub
3. ⏳ Connect to Render
4. ⏳ Deploy using Blueprint
5. ⏳ Test your app
6. ✅ Enjoy!

---

**Ready to deploy! Follow the steps above.** 🚀
