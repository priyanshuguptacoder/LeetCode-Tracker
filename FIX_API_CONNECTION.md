# 🔧 Fix "Failed to Connect to API" Error

## Quick Fix Steps

### Step 1: Clear Browser Cache

**Press:** `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

This forces the browser to reload all JavaScript files.

---

### Step 2: Verify Backend is Running

**Check Terminal:**
```bash
# Should see:
🚀 Server running on port 5001
📊 API: http://localhost:5001/api
🏥 Health: http://localhost:5001/
```

**If not running:**
```bash
cd backend
npm start
```

---

### Step 3: Test Backend Directly

**Open in browser:**
```
http://localhost:5001/api/problems
```

**Or use curl:**
```bash
curl http://localhost:5001/api/problems
```

**Should return:** JSON with 147 problems

---

### Step 4: Test API Connection

**Open test page:**
```
http://localhost:8000/test-api-connection.html
```

This will:
- Show your API configuration
- Test backend connection
- Test fetching problems
- Show detailed error messages

---

### Step 5: Check Browser Console

1. Open browser console: `F12` or `Cmd + Option + I`
2. Go to **Console** tab
3. Look for:
   ```
   🔧 API Configuration: {
     environment: 'LOCAL',
     baseURL: 'http://localhost:5001/api',
     hostname: 'localhost'
   }
   ```

4. Check for errors:
   - ❌ CORS errors
   - ❌ Network errors
   - ❌ 404 errors

---

## Common Issues & Solutions

### Issue 1: Backend Not Running

**Error:** `Failed to fetch`

**Solution:**
```bash
cd backend
npm start
```

Wait for:
```
🚀 Server running on port 5001
```

---

### Issue 2: Port Already in Use

**Error:** `Port 5001 is already in use`

**Solution:**
```bash
# Find process using port 5001
lsof -ti:5001

# Kill the process
kill -9 $(lsof -ti:5001)

# Start backend again
cd backend
npm start
```

---

### Issue 3: CORS Error

**Error:** `Access-Control-Allow-Origin`

**Check:** `backend/server.js` should have:
```javascript
app.use(cors());
```

**If missing:**
```bash
cd backend
# Edit server.js and add: app.use(cors());
npm start
```

---

### Issue 4: Wrong API URL

**Check:** Browser console should show:
```
baseURL: 'http://localhost:5001/api'
```

**If showing production URL:**
- Clear browser cache: `Cmd + Shift + R`
- Reload page

---

### Issue 5: Old JavaScript Cached

**Symptoms:**
- Old code running
- Changes not appearing
- Wrong API URL

**Solution:**
1. Clear browser cache: `Cmd + Shift + R`
2. Or open in Incognito/Private mode
3. Or clear all browser data

---

## Verification Checklist

### Backend
- [ ] Backend is running on port 5001
- [ ] Can access: `http://localhost:5001/`
- [ ] Can access: `http://localhost:5001/api/problems`
- [ ] Returns 147 problems

### Frontend
- [ ] Frontend is running on port 8000
- [ ] Can access: `http://localhost:8000`
- [ ] Browser console shows correct API URL
- [ ] No CORS errors in console

### API Configuration
- [ ] `api-config.js` exists
- [ ] LOCAL_API_URL = `http://localhost:5001/api`
- [ ] Environment detected as 'LOCAL'
- [ ] API_BASE_URL = `http://localhost:5001/api`

---

## Test Commands

### Test Backend Health
```bash
curl http://localhost:5001/
```

**Expected:**
```json
{
  "success": true,
  "message": "LeetCode Tracker API is running",
  "version": "1.0.0"
}
```

### Test Get Problems
```bash
curl http://localhost:5001/api/problems | jq '.count'
```

**Expected:** `147`

### Test Get Stats
```bash
curl http://localhost:5001/api/stats
```

**Expected:** JSON with statistics

---

## Still Not Working?

### 1. Restart Everything

**Stop all servers:**
```bash
# Press Ctrl+C in both terminals
```

**Start backend:**
```bash
cd backend
npm install  # Reinstall dependencies
npm start
```

**Start frontend (new terminal):**
```bash
python3 -m http.server 8000
```

**Open browser:**
```
http://localhost:8000
```

**Clear cache:** `Cmd + Shift + R`

---

### 2. Check Ports

**Backend should be on 5001:**
```bash
lsof -i:5001
```

**Frontend should be on 8000:**
```bash
lsof -i:8000
```

---

### 3. Check Files

**Verify api-config.js:**
```bash
cat api-config.js | grep LOCAL_API_URL
```

**Should show:**
```javascript
const LOCAL_API_URL = 'http://localhost:5001/api';
```

**Verify backend server.js:**
```bash
cat backend/server.js | grep "app.use(cors"
```

**Should show:**
```javascript
app.use(cors());
```

---

## Quick Test Script

Run this to test everything:

```bash
#!/bin/bash

echo "Testing Backend..."
curl -s http://localhost:5001/ | jq .

echo -e "\nTesting API..."
curl -s http://localhost:5001/api/problems | jq '.count'

echo -e "\nTesting Frontend..."
curl -s http://localhost:8000/ | head -5

echo -e "\nDone!"
```

---

## Summary

**Most Common Fix:**
1. Clear browser cache: `Cmd + Shift + R`
2. Verify backend is running
3. Test: `http://localhost:8000/test-api-connection.html`

**If still failing:**
- Check browser console for errors
- Verify ports 5001 and 8000 are correct
- Restart both servers
- Try incognito mode

---

**Need more help? Share the exact error from browser console!** 🚀
