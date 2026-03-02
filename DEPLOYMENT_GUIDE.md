# 🚀 Deployment Guide - Two Separate Deployments

## Overview

Your LeetCode Tracker needs TWO separate deployments:

1. **Frontend** → Vercel (Static Site)
2. **Backend** → Render or Railway (Node.js API)

This is the recommended approach to avoid Vercel's `builds` configuration warnings.

---

## Option 1: Frontend on Vercel + Backend on Render (Recommended)

### Step 1: Deploy Backend to Render

1. **Go to Render**
   - Visit: https://render.com
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `leetcode-tracker-backend`
     - **Environment**: Node
     - **Root Directory**: `backend`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Add Environment Variables**
   - `PORT` = `5001`
   - `NODE_ENV` = `production`

4. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes
   - Copy your backend URL: `https://leetcode-tracker-backend.onrender.com`

### Step 2: Update Frontend API Configuration

Edit `api-config.js`:

```javascript
// For Vercel deployment - use your Render backend URL
const PRODUCTION_API_URL = 'https://leetcode-tracker-backend.onrender.com/api';
```

### Step 3: Deploy Frontend to Vercel

1. **Commit Changes**
   ```bash
   git add api-config.js
   git commit -m "Update API URL for production"
   git push origin main
   ```

2. **Go to Vercel**
   - Visit: https://vercel.com
   - Sign in with GitHub

3. **Import Project**
   - Click "Add New..." → "Project"
   - Select "LeetCode-Tracker"
   - Click "Import"

4. **Configure**
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: (leave empty)

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your frontend is live!

---

## Option 2: Both on Vercel (Advanced)

If you want both on Vercel, you need to use Vercel's API routes feature.

### Restructure Required:

```
leetcode-tracker/
├── api/
│   └── [...all backend files as serverless functions]
├── public/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── api-config.js
└── vercel.json (with proper serverless config)
```

This is more complex and not recommended for this project.

---

## Current Configuration (Static Only)

Your current `vercel.json` is configured for static deployment only:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

This means:
- ✅ No build warnings
- ✅ Fast deployments
- ✅ Automatic deploys on push
- ❌ No backend API (deploy separately)

---

## Files in Root (Ready for Vercel)

```
✅ index.html
✅ script.js
✅ style.css
✅ api-config.js
✅ favicon.ico
✅ vercel.json (minimal config)
```

---

## Deployment Checklist

### Backend (Render)
- [ ] Deploy to Render
- [ ] Copy backend URL
- [ ] Verify API endpoints work

### Frontend (Vercel)
- [ ] Update `api-config.js` with backend URL
- [ ] Commit and push to GitHub
- [ ] Import to Vercel
- [ ] Configure as static site
- [ ] Deploy
- [ ] Test all features

---

## Testing After Deployment

### Test Backend (Render)
```bash
curl https://your-backend.onrender.com/api/problems
```

Should return 147 problems.

### Test Frontend (Vercel)
1. Open your Vercel URL
2. Check browser console (F12)
3. Verify:
   - ✅ No 404 errors
   - ✅ API calls to Render backend
   - ✅ 147 problems load
   - ✅ Add/Update/Delete works

---

## Automatic Deployments

### Backend (Render)
- Auto-deploys on push to `main`
- Monitors `backend/` directory

### Frontend (Vercel)
- Auto-deploys on push to `main`
- Monitors root directory
- No build warnings with minimal config

---

## Troubleshooting

### Vercel Build Warnings

If you see: "WARN! Due to `builds` existing..."

**Solution:** Use the minimal `vercel.json` provided above.

### CORS Errors

If frontend can't connect to backend:

**Solution:** Update `backend/server.js` CORS to allow your Vercel domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:8000',
    'https://your-app.vercel.app'
  ]
}));
```

### Backend Sleeping (Render Free Tier)

Render free tier spins down after 15 minutes of inactivity.

**Solution:**
- First request takes ~30 seconds (cold start)
- Upgrade to paid tier ($7/month) for always-on

---

## Cost Breakdown

### Free Tier
- **Render Backend**: Free (with sleep)
- **Vercel Frontend**: Free
- **Total**: $0/month

### Paid Tier
- **Render Backend**: $7/month (no sleep)
- **Vercel Frontend**: Free
- **Total**: $7/month

---

## Alternative: Backend on Railway

Railway offers $5 free credit per month.

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select repository
4. Set root directory: `backend`
5. Add env vars: `PORT=5001`
6. Deploy
7. Copy URL and update `api-config.js`

---

## Summary

**Recommended Setup:**
- Frontend: Vercel (static, no builds config)
- Backend: Render (Node.js API)
- Cost: Free
- Deployment: Automatic on push

**Current Status:**
- ✅ `vercel.json` minimal config (no warnings)
- ✅ All files in root (ready for Vercel)
- ⏳ Need to deploy backend separately
- ⏳ Need to update `api-config.js` with backend URL

---

**Next Steps:**
1. Deploy backend to Render
2. Update `api-config.js` with backend URL
3. Push to GitHub
4. Deploy frontend to Vercel
5. Test and enjoy!
