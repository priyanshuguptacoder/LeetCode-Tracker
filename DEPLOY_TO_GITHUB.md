# 🚀 Deploy to GitHub Guide

## Step-by-Step Instructions

### 1. Initialize Git Repository (if not already done)
```bash
git init
```

### 2. Add All Files
```bash
git add .
```

### 3. Create Initial Commit
```bash
git commit -m "Initial commit: LeetCode Performance Engine v2.0"
```

### 4. Add Remote Repository
```bash
git remote add origin https://github.com/priyanshuguptacoder/LeetCode-Tracker.git
```

### 5. Verify Remote
```bash
git remote -v
```

### 6. Push to GitHub
```bash
git branch -M main
git push -u origin main
```

---

## If Repository Already Exists

If you get an error that the repository already has content:

### Option 1: Force Push (Overwrites remote)
```bash
git push -u origin main --force
```

### Option 2: Pull First, Then Push
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## Common Issues & Solutions

### Issue: "fatal: remote origin already exists"
**Solution:**
```bash
git remote remove origin
git remote add origin https://github.com/priyanshuguptacoder/LeetCode-Tracker.git
```

### Issue: Authentication Failed
**Solution:**
Use Personal Access Token instead of password:
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token with `repo` permissions
3. Use token as password when prompted

Or use SSH:
```bash
git remote set-url origin git@github.com:priyanshuguptacoder/LeetCode-Tracker.git
```

### Issue: "Updates were rejected"
**Solution:**
```bash
git pull origin main --rebase
git push -u origin main
```

---

## Complete Fresh Start Commands

Run these commands in your project directory:

```bash
# 1. Initialize git
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "feat: LeetCode Performance Engine v2.0 - Premium SaaS Dashboard

Features:
- Smart pattern detection with auto-categorization
- Dual difficulty system (LeetCode + User ratings)
- Real-time analytics and progress tracking
- Non-destructive data management
- Premium UI/UX with dark mode
- Fully responsive design
- Zero backend required"

# 4. Set main branch
git branch -M main

# 5. Add remote
git remote add origin https://github.com/priyanshuguptacoder/LeetCode-Tracker.git

# 6. Push to GitHub
git push -u origin main
```

---

## After Successful Push

### Enable GitHub Pages (Optional)
1. Go to repository Settings
2. Navigate to "Pages" section
3. Source: Deploy from branch
4. Branch: `main` / `root`
5. Save

Your site will be live at:
`https://priyanshuguptacoder.github.io/LeetCode-Tracker/`

---

## Future Updates

After initial push, use these commands for updates:

```bash
# 1. Check status
git status

# 2. Add changes
git add .

# 3. Commit with message
git commit -m "feat: add new feature"
# or
git commit -m "fix: fix bug description"
# or
git commit -m "docs: update documentation"

# 4. Push to GitHub
git push
```

---

## Commit Message Guidelines

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```bash
git commit -m "feat: add weekly goal tracking"
git commit -m "fix: correct pattern mastery calculation"
git commit -m "docs: update README with new features"
git commit -m "style: improve button hover effects"
```

---

## Verify Your Push

After pushing, verify at:
https://github.com/priyanshuguptacoder/LeetCode-Tracker

You should see:
- ✅ All your files
- ✅ README.md displayed
- ✅ Commit history
- ✅ .gitignore working (no node_modules, .DS_Store, etc.)

---

## Quick Reference

```bash
# Clone repository
git clone https://github.com/priyanshuguptacoder/LeetCode-Tracker.git

# Check status
git status

# Add files
git add .
git add filename.js

# Commit
git commit -m "message"

# Push
git push

# Pull latest changes
git pull

# View commit history
git log --oneline

# Create new branch
git checkout -b feature-name

# Switch branch
git checkout main

# Merge branch
git merge feature-name
```

---

**Good luck with your deployment! 🚀**
