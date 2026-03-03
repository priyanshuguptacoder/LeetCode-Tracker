# 🚀 Render Manual Deployment Guide (Free Plan)

## Overview

Deploy backend and frontend separately to Render Free plan.

**No Blueprint. No Payment Required.**

---

## Step 1: Deploy Backend (Web Service)

### 1.1 Create Web Service

1. **Go to Render Dashboard**
   - https://render.com/dashboard
   - Sign in with GitHub

2. **Create New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Click **"Build and deploy from a Git repository"**
   - Click **"Next"**

3. **Connect Repository**
   - Select **"LeetCode-Tracker"** repository
   - Click **"Connect"**

### 1.2 Configure Backend

**Name:**
```
leetcode-tracker-backend
```

**Region:**
```
Oregon (US West)
```
(or choose closest to you)

**Branch:**
```
main
```

**Root Directory:**
```
backend
```

**Environment:**
```
Node
```

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```

**Plan:**
```
Free
```

### 1.3 Add Environment Variables (Optional)

Click **"Advanced"** → **"Add Environment Variable"**

```
NODE_ENV = production
```

(PORT is automatically set by Render)

### 1.4 Deploy Backend

1. Click **"Create Web Service"**
2. Wait 2-3 minutes for deployment
3. Backend will be live at: `https://leetcode-tracker-backend.onrender.com`

### 1.5 Test Backend

Open in browser or use curl:
```bash
curl https://leetcode-tracker-backend.onrender.com/api/problems
```

Should return 147 problems.

---

## Step 2: Deploy Frontend (Static Site)

### 2.1 Create Static Site

1. **Go to Render Dashboard**
   - https://render.com/dashboard

2. **Create New Static Site**
   - Click **"New +"** → **"Static Site"**
   - Click **"Build and deploy from a Git repository"**
   - Click **"Next"**

3. **Connect Repository**
   - Select **"LeetCode-Tracker"** repository
   - Click **"Connect"**

### 2.2 Configure Frontend

**Name:**
```
leetcode-tracker-frontend
```

**Branch:**
```
main
```

**Root Directory:**
```
(leave empty - use root)
```

**Build Command:**
```
(leave empty)
```

**Publish Directory:**
```
.
```
(dot means root directory)

**Plan:**
```
Free
```

### 2.3 Deploy Frontend

1. Click **"Create Static Site"**
2. Wait 1-2 minutes for deployment
3. Frontend will be live at: `https://leetcode-tracker-frontend.onrender.com`

### 2.4 Test Frontend

1. Open: `https://leetcode-tracker-frontend.onrender.com`
2. Should see your LeetCode tracker
3. 147 problems should load
4. Try adding/updating/deleting problems

---

## Configuration Summary

### Backend Configuration ✅

**File:** `backend/server.js`

```javascript
const PORT = process.env.PORT || 5001;  // ✅ Uses Render's PORT
app.use(cors());                         // ✅ Allows all origins
app.listen(PORT);                        // ✅ Always listens
```

**Folder Structure:**
```
backend/
├── server.js
├── package.json
├── problems.json
├── controllers/
└── routes/
```

**Build:** `npm install`  
**Start:** `npm start`  
**Port:** Automatically set by Render

### Frontend Configuration ✅

**File:** `api-config.js`

```javascript
const LOCAL_API_URL = 'http://localhost:5001/api';
const PRODUCTION_API_URL = 'https://leetcode-tracker-backend.onrender.com/api';

const API_BASE_URL = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;
```

**Files:**
```
index.html
script.js
style.css
api-config.js
favicon.ico
```

**Build:** None  
**Publish:** Root directory (.)

---

## Automatic Deployments

### How It Works

Every push to `main` branch triggers automatic redeployment:

```bash
git add .
git commit -m "Update feature"
git push origin main

# Render automatically:
✅ Detects push
✅ Rebuilds backend (if backend/ changed)
✅ Rebuilds frontend (if root files changed)
✅ Deploys updates
```

### Selective Deployment

- **Backend only:** Change files in `backend/` folder
- **Frontend only:** Change files in root (index.html, script.js, etc.)
- **Both:** Change files in both locations

---

## Free Tier Limits

### Backend (Web Service)
- **RAM:** 512 MB
- **CPU:** 0.1 CPU
- **Sleep:** After 15 minutes of inactivity
- **Cold Start:** ~30 seconds on first request
- **Hours:** 750 hours/month
- **Bandwidth:** 100 GB/month

### Frontend (Static Site)
- **Bandwidth:** 100 GB/month
- **Always On:** No sleep
- **CDN:** Global distribution
- **HTTPS:** Automatic

---

## Important Notes

### Backend Sleep Behavior

**Free tier spins down after 15 minutes of inactivity.**

**First request after sleep:**
- Takes ~30 seconds to wake up
- Subsequent requests are fast

**To keep backend always on:**
- Upgrade to Starter plan ($7/month)
- Or use a cron job to ping every 14 minutes

### CORS Configuration

Backend allows all origins:
```javascript
app.use(cors());
```

This is fine for this project. For production apps, restrict origins:
```javascript
app.use(cors({
  origin: 'https://leetcode-tracker-frontend.onrender.com'
}));
```

---

## Troubleshooting

### Backend Not Responding

**Issue:** First request takes 30 seconds

**Cause:** Free tier cold start

**Solution:** Wait 30 seconds, then it's fast

### CORS Errors

**Issue:** Frontend can't connect to backend

**Check:**
1. Backend is deployed and running
2. Backend URL in `api-config.js` is correct
3. CORS is enabled in `backend/server.js`

**Solution:** Already configured correctly!

### Build Fails

**Backend:**
- Check `backend/package.json` has all dependencies
- Check Node.js version compatibility
- View logs in Render dashboard

**Frontend:**
- Should not fail (no build process)
- If fails, check Render logs

---

## Monitoring

### View Logs

**Backend:**
1. Go to backend service in Render
2. Click **"Logs"** tab
3. See real-time API requests

**Frontend:**
1. Go to frontend service in Render
2. Click **"Logs"** tab
3. See deployment logs

### Check Status

**Dashboard:**
- Green dot = Running
- Yellow dot = Deploying
- Red dot = Failed

**Health Check:**
```bash
curl https://leetcode-tracker-backend.onrender.com/
```

Should return:
```json
{
  "success": true,
  "message": "LeetCode Tracker API is running",
  "version": "1.0.0"
}
```

---

## Updating Your App

### Update Backend

```bash
cd backend
vim server.js

git add backend/
git commit -m "Update backend"
git push origin main

# Render auto-deploys backend only
```

### Update Frontend

```bash
vim script.js

git add .
git commit -m "Update frontend"
git push origin main

# Render auto-deploys frontend only
```

---

## Cost

### Free Tier (Current Setup)
- Backend: Free (with sleep)
- Frontend: Free
- **Total: $0/month**

### Paid Tier (Optional)
- Backend Starter: $7/month (no sleep, always on)
- Frontend: Free
- **Total: $7/month**

---

## Summary

### What You Need to Do:

1. ✅ Code is ready (already configured)
2. ⏳ Deploy backend as Web Service
3. ⏳ Deploy frontend as Static Site
4. ⏳ Test your app
5. ✅ Done!

### Your URLs:

- **Backend:** https://leetcode-tracker-backend.onrender.com
- **Frontend:** https://leetcode-tracker-frontend.onrender.com
- **GitHub:** https://github.com/priyanshuguptacoder/LeetCode-Tracker

---

**Follow the steps above to deploy! No Blueprint needed!** 🚀
