# 🚀 Deploy to Render - Quick Start

## ✅ Everything is Ready!

Your code is configured and pushed to GitHub. Now deploy to Render in 3 steps:

---

## Step 1: Go to Render

Visit: **https://render.com**

Click **"Get Started"** or **"Sign In"**

Sign in with **GitHub**

---

## Step 2: Create Blueprint

1. Click **"New +"** button (top right)

2. Select **"Blueprint"**

3. **Connect GitHub** (if not already connected)

4. **Select Repository**: `LeetCode-Tracker`

5. Render will detect `render.yaml` automatically

6. Click **"Apply"**

---

## Step 3: Wait for Deployment

Render will deploy both services:

1. **Backend** (Node.js)
   - Building... (~2 minutes)
   - Starting... (~30 seconds)
   - ✅ Live!

2. **Frontend** (Static Site)
   - Building... (~1 minute)
   - Deploying... (~30 seconds)
   - ✅ Live!

**Total Time: ~5 minutes**

---

## Your URLs

After deployment completes:

**Backend:**
```
https://leetcode-tracker-backend.onrender.com
```

**Frontend:**
```
https://leetcode-tracker-frontend.onrender.com
```

---

## Test Your App

### 1. Test Backend

Open in browser or use curl:
```bash
curl https://leetcode-tracker-backend.onrender.com/api/problems
```

Should return 147 problems.

### 2. Test Frontend

1. Open: `https://leetcode-tracker-frontend.onrender.com`
2. Should see your LeetCode tracker
3. 147 problems should load
4. Try adding/updating/deleting problems

---

## What Render Deployed

### Backend Service
- **Name**: leetcode-tracker-backend
- **Type**: Web Service (Node.js)
- **Plan**: Free
- **Features**:
  - Express API
  - JSON file storage
  - Auto-deploy on push
  - 750 hours/month free

### Frontend Service
- **Name**: leetcode-tracker-frontend
- **Type**: Static Site
- **Plan**: Free
- **Features**:
  - HTML/CSS/JS
  - Global CDN
  - Auto-deploy on push
  - Always on (no sleep)

---

## Automatic Updates

Every time you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render automatically:
1. Detects the push
2. Rebuilds changed services
3. Deploys updates
4. Takes 2-5 minutes

---

## Free Tier Limits

### Backend
- **RAM**: 512 MB
- **CPU**: 0.1 CPU
- **Sleep**: After 15 minutes of inactivity
- **Cold Start**: ~30 seconds
- **Hours**: 750 hours/month

### Frontend
- **Bandwidth**: 100 GB/month
- **Always On**: No sleep
- **CDN**: Global
- **HTTPS**: Automatic

---

## If You Need Help

### Check Deployment Status

1. Go to Render Dashboard
2. Click on each service
3. Check **"Logs"** tab for errors

### Common Issues

**Backend sleeping:**
- First request takes 30 seconds
- This is normal on free tier
- Upgrade to $7/month for always-on

**CORS errors:**
- Update backend CORS settings
- See RENDER_DEPLOYMENT.md for details

---

## Upgrade to Paid (Optional)

If you want backend always-on:

1. Go to backend service
2. Click **"Settings"**
3. Change plan to **"Starter"** ($7/month)
4. Backend never sleeps
5. Instant response times

---

## Summary

### What You Need to Do:

1. ✅ Code is ready (already pushed)
2. ⏳ Go to https://render.com
3. ⏳ Sign in with GitHub
4. ⏳ Create Blueprint
5. ⏳ Select LeetCode-Tracker repo
6. ⏳ Click "Apply"
7. ⏳ Wait 5 minutes
8. ✅ Your app is live!

---

## Your Links

- **Render Dashboard**: https://render.com/dashboard
- **GitHub Repo**: https://github.com/priyanshuguptacoder/LeetCode-Tracker
- **Documentation**: See RENDER_DEPLOYMENT.md

---

**Go to Render now and deploy! It's super easy!** 🚀

## Quick Link

👉 **https://render.com/new/blueprint** 👈

Select your repository and click Apply!
