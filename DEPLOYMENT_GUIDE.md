# Multi-Platform Upgrade: Deployment Guide

## Overview

This guide covers the safe deployment of the multi-platform upgrade (LeetCode + Codeforces) with **zero downtime** and **no data loss**.

---

## Pre-Deployment Checklist

- [ ] Backup MongoDB database
- [ ] Set `CF_HANDLE` environment variable on Render
- [ ] Verify frontend builds successfully
- [ ] Test migration script in dry-run mode

---

## Environment Variables

### Backend (Render)

Add these to your Render environment:

```bash
# Existing
MONGO_URI=mongodb+srv://...
LEETCODE_SESSION=...
LEETCODE_CSRF=...
LEETCODE_USERNAME=...

# NEW - Codeforces Support
CF_HANDLE=your_codeforces_handle
```

### Frontend (Vercel)

No changes needed. The frontend auto-detects local vs production.

---

## Step-by-Step Deployment

### Step 1: Backup Database

```bash
# Export your MongoDB data
mongodump --uri="your_mongo_uri" --out=./backup_$(date +%Y%m%d)
```

### Step 2: Run Migration (Dry Run)

```bash
cd backend
npm install
DRY_RUN=true node migrations/migrateToMultiPlatform.js
```

Verify the output shows expected changes.

### Step 3: Run Migration (Live)

```bash
# This updates your database schema
DRY_RUN=false node migrations/migrateToMultiPlatform.js
```

### Step 4: Deploy Backend

```bash
# Commit and push to trigger Render deployment
git add .
git commit -m "feat: multi-platform support (LeetCode + Codeforces)"
git push origin main
```

**Render will auto-deploy.**

### Step 5: Verify Backend

Test these endpoints:

```bash
# Test platform filter
curl https://your-backend.onrender.com/api/problems?platform=ALL
curl https://your-backend.onrender.com/api/problems?platform=LC
curl https://your-backend.onrender.com/api/problems?platform=CF

# Test Codeforces sync (if CF_HANDLE is set)
curl -X POST https://your-backend.onrender.com/api/codeforces/sync

# Check Codeforces stats
curl https://your-backend.onrender.com/api/codeforces/stats
```

### Step 6: Deploy Frontend to Vercel

**Why move from Netlify to Vercel?**
- Better React SPA support
- Faster global CDN
- Native Git integration
- Better env var management

**Steps:**

1. Import project in Vercel dashboard
2. Set framework preset to "Other" (vanilla JS)
3. Build command: leave empty
4. Output directory: `./`
5. Deploy

### Step 7: Configure Custom Domain (Optional)

In Vercel project settings:
- Add your custom domain
- Update DNS records as instructed

### Step 8: Verify End-to-End

1. Open deployed frontend
2. Click "Codeforces" tab - should show empty or synced problems
3. Click "Sync Codeforces" button (or wait for auto-sync)
4. Verify problems appear in the list

---

## Data Flow Reference

### LeetCode Flow
```
LeetCode API → Filter accepted → Normalize → Store as platform='LC'
```

### Codeforces Flow
```
Codeforces API → Filter verdict="OK" → Deduplicate (contestId+index) → Normalize → Store as platform='CF'
```

### Frontend Flow
```
Fetch /api/problems?platform=ALL → Filter in React → Render unified list
```

---

## API Reference

### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/problems?platform=ALL` | GET | All problems |
| `/api/problems?platform=LC` | GET | LeetCode only |
| `/api/problems?platform=CF` | GET | Codeforces only |
| `/api/codeforces/sync` | POST | Sync CF submissions |
| `/api/codeforces/info` | GET | CF user info |
| `/api/codeforces/stats` | GET | CF stats from DB |

---

## Troubleshooting

### Migration Errors

**Problem:** `id` conflicts during migration
**Solution:** Check for duplicate IDs before migration:
```javascript
db.problems.aggregate([{$group:{_id:"$id",count:{$sum:1}}},{$match:{count:{$gt:1}}}])
```

### CORS Issues

**Problem:** Frontend can't connect to backend
**Solution:** Verify `FRONTEND_URL` env var on Render includes your Vercel domain.

### Missing CF Problems

**Problem:** Codeforces sync returns 0 problems
**Solution:** 
1. Verify `CF_HANDLE` env var is set
2. Check handle has public submissions on codeforces.com
3. Check Render logs for API errors

---

## Rollback Plan

If issues occur:

1. **Frontend:** Revert to previous commit in Vercel (instant rollback)
2. **Backend:** Revert Render deployment to previous version
3. **Database:** Restore from backup if needed (last resort)

---

## Post-Deployment Monitoring

Check these metrics for 24 hours:
- API response times
- Error rates in Render logs
- Database connection stability
- CF auto-sync logs (runs every 12 hours)

---

## Schema Reference

### Problem Document (Updated)

```javascript
{
  id: String,              // "LC-1" or "CF-123A"
  platform: String,        // "LC" | "CF"
  title: String,
  difficulty: String,      // "Easy" | "Medium" | "Hard"
  rawDifficulty: Mixed,    // String for LC, Number (rating) for CF
  difficultyRating: Number, // Normalized 1-5
  tags: [String],
  solved: Boolean,
  solvedDate: Date,
  platformLink: String,    // Primary link
  leetcodeLink: String,    // Legacy compatibility
  providerTitle: String,   // "LeetCode" | "Codeforces"
  // ... other fields unchanged
}
```

---

## Migration Script Reference

**Location:** `backend/migrations/migrateToMultiPlatform.js`

**What it does:**
1. Converts `id` from Number → String (e.g., `1` → `"LC-1"`)
2. Adds `platform: 'LC'` to existing documents
3. Sets `providerTitle: 'LeetCode'`
4. Copies `leetcodeLink` → `platformLink`
5. Calculates `difficultyRating` from `difficulty`

**Safe to re-run:** Yes, idempotent

---

## Support

For issues, check:
1. Render logs (backend errors)
2. Browser DevTools Network tab (API calls)
3. MongoDB Atlas logs (DB errors)
