#!/bin/bash

# LeetCode Tracker - Cache Fix Script
# This script helps diagnose and fix the browser cache issue

echo "🔍 LeetCode Tracker - Cache Issue Diagnosis"
echo "==========================================="
echo ""

# Check if backend is running
echo "1️⃣ Checking Backend (port 5001)..."
if curl -s http://localhost:5001/ > /dev/null 2>&1; then
    echo "   ✅ Backend is running"
    BACKEND_MSG=$(curl -s http://localhost:5001/ | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    echo "   📊 Message: $BACKEND_MSG"
else
    echo "   ❌ Backend is NOT running"
    echo "   💡 Start it with: cd backend && npm start"
    exit 1
fi

# Check if frontend is running
echo ""
echo "2️⃣ Checking Frontend (port 8000)..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running"
else
    echo "   ❌ Frontend is NOT running"
    echo "   💡 Start it with: python3 -m http.server 8000"
    exit 1
fi

# Check API endpoint
echo ""
echo "3️⃣ Checking API Endpoint..."
PROBLEM_COUNT=$(curl -s http://localhost:5001/api/problems | grep -o '"count":[0-9]*' | cut -d':' -f2)
if [ ! -z "$PROBLEM_COUNT" ]; then
    echo "   ✅ API is working"
    echo "   📊 Problems in database: $PROBLEM_COUNT"
else
    echo "   ❌ API is not responding correctly"
    exit 1
fi

# Check if files exist
echo ""
echo "4️⃣ Checking Configuration Files..."
if [ -f "api-config.js" ]; then
    echo "   ✅ api-config.js exists"
else
    echo "   ❌ api-config.js is missing"
    exit 1
fi

if [ -f "index.html" ]; then
    echo "   ✅ index.html exists"
else
    echo "   ❌ index.html is missing"
    exit 1
fi

# All checks passed
echo ""
echo "✅ ALL SYSTEMS OPERATIONAL"
echo "==========================================="
echo ""
echo "🔧 THE ISSUE IS BROWSER CACHE"
echo ""
echo "📋 FIX OPTIONS:"
echo ""
echo "Option 1: Hard Refresh (Fastest)"
echo "  1. Open: http://localhost:8000"
echo "  2. Press: Cmd + Shift + R (Mac) or Ctrl + Shift + R (Windows)"
echo ""
echo "Option 2: Use Cache Check Tool"
echo "  1. Open: http://localhost:8000/check-cache.html"
echo "  2. Follow the instructions"
echo ""
echo "Option 3: Use Incognito/Private Window"
echo "  1. Open a new Incognito/Private window"
echo "  2. Go to: http://localhost:8000"
echo ""
echo "✨ After clearing cache, you should see:"
echo "   '🔧 API Configuration: { environment: LOCAL, ... }'"
echo "   in the browser console"
echo ""
