# 🚀 Vercel Deployment Guide

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Go to Vercel**
   - Visit https://vercel.com
   - Sign in with GitHub

3. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

4. **Configure (Auto-detected)**
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: (auto)
   - Output Directory: (auto)

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your app is live! 🎉

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

---

## How It Works

### Architecture

```
Your Vercel App
├── Frontend (Static Site)
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── Served via Vercel CDN
│
└── Backend (Serverless Functions)
    ├── /api/problems
    ├── /api/stats
    └── Runs on Vercel Serverless
```

### API Routes

- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-app.vercel.app/api/*`

All on the same domain - no CORS issues!

---

## Configuration

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

This configuration:
- Builds backend as serverless function
- Serves frontend as static site
- Routes `/api/*` to backend
- Routes everything else to frontend

---

## Environment Variables

No environment variables needed! The app works out of the box.

If you need custom configuration:

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5001` (optional)

---

## Automatic Deployments

Once connected to GitHub, Vercel automatically:

- ✅ Deploys on every push to `main`
- ✅ Creates preview deployments for PRs
- ✅ Runs builds and tests
- ✅ Updates your production URL

### Workflow

```
git add .
git commit -m "Update feature"
git push origin main
↓
Vercel detects push
↓
Builds and deploys automatically
↓
Live in 1-2 minutes!
```

---

## Custom Domain

### Add Your Domain

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your domain (e.g., `leetcode.yourdomain.com`)
5. Follow DNS configuration instructions
6. Wait for DNS propagation (5-10 minutes)

### DNS Configuration

Add these records to your domain:

```
Type: CNAME
Name: leetcode (or @)
Value: cname.vercel-dns.com
```

---

## Monitoring

### View Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click on a deployment
4. View "Functions" tab for API logs
5. View "Build Logs" for build errors

### Analytics

Vercel provides:
- Page views
- Top pages
- Visitor locations
- Performance metrics

Access via Dashboard → Analytics

---

## Troubleshooting

### Build Fails

**Check build logs:**
1. Go to Vercel Dashboard
2. Click on failed deployment
3. View "Build Logs"

**Common issues:**
- Missing dependencies in `backend/package.json`
- Syntax errors in code
- Invalid `vercel.json`

**Solution:**
```bash
# Test locally first
cd backend
npm install
npm start

# If works locally, push again
git add .
git commit -m "Fix build"
git push origin main
```

### API Not Working

**Check function logs:**
1. Go to Vercel Dashboard
2. Click on deployment
3. View "Functions" tab
4. Check for errors

**Common issues:**
- Routes not configured in `vercel.json`
- Backend not exporting app: `module.exports = app`
- CORS issues (should be auto-handled)

**Solution:**
- Verify `backend/server.js` exports app
- Check `vercel.json` routes configuration
- View function logs for specific errors

### Data Not Persisting

**Important:** Vercel serverless functions are stateless!

**Issue:** `problems.json` changes don't persist between deployments.

**Solutions:**

1. **Use Vercel KV (Recommended)**
   - Vercel's key-value storage
   - Persistent across deployments
   - Free tier available

2. **Use External Database**
   - MongoDB Atlas (free tier)
   - PostgreSQL (Vercel Postgres)
   - Firebase Realtime Database

3. **Keep JSON File (Current)**
   - Works for demo/testing
   - Resets on each deployment
   - Good for portfolio projects

### CORS Errors

**Should not happen** - backend and frontend on same domain.

If you see CORS errors:
1. Check browser console
2. Verify API calls use relative paths: `/api/problems`
3. Check `api-config.js` uses `window.location.origin`

---

## Performance

### Optimization

Vercel automatically provides:
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Gzip compression
- ✅ Image optimization
- ✅ Edge caching

### Speed

- Frontend: ~100ms (CDN)
- API: ~200-500ms (serverless cold start)
- API: ~50-100ms (warm)

### Limits (Free Tier)

- Bandwidth: 100GB/month
- Serverless executions: 100GB-hours
- Build time: 6000 minutes/month
- Deployments: Unlimited

More than enough for personal projects!

---

## Updating Your App

### Make Changes

```bash
# Edit files
vim script.js

# Test locally
python3 -m http.server 8000

# Commit and push
git add .
git commit -m "Update feature"
git push origin main
```

Vercel automatically deploys in 1-2 minutes!

### Rollback

If something breaks:

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments"
4. Find previous working deployment
5. Click "..." → "Promote to Production"

Instant rollback!

---

## Cost

### Free Tier (Perfect for this project)

- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Preview deployments
- ✅ Analytics

**Cost: $0/month**

### Pro Tier ($20/month)

Only needed for:
- High traffic (>100GB/month)
- Team collaboration
- Advanced analytics
- Priority support

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy to Vercel
3. ✅ Test your live app
4. ✅ Share with others!

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Discord:** https://vercel.com/discord
- **GitHub Issues:** Create an issue in your repo

---

**Ready to deploy? Just push to GitHub and import to Vercel!** 🚀
