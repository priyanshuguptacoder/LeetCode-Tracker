# LeetCode Tracker — MERN Stack

A full-stack DSA problem tracker with MongoDB, Express, vanilla JS frontend.

## Stack

- **Frontend:** Vanilla JS + React (CDN) — deployed on Netlify
- **Backend:** Node.js + Express + Mongoose — deployed on Render
- **Database:** MongoDB Atlas

## Project Structure

```
.
├── index.html              # Frontend entry
├── script.js               # React app
├── style.css               # Styles
├── api-config.js           # API URL config (update PRODUCTION_API_URL here)
├── leetcode_full_dataset.js # Source dataset
├── netlify.toml            # Netlify config
├── render.yaml             # Render config
└── backend/
    ├── server.js           # Express + MongoDB
    ├── seed.js             # Seed DB from dataset
    ├── models/Problem.js   # Mongoose schema
    ├── routes/problems.js  # REST routes
    ├── controllers/problemController.js
    ├── .env.example        # Env template
    └── package.json
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/problems | All problems |
| GET | /api/problems/:id | Single problem |
| GET | /api/problems/stats | Aggregated stats |
| POST | /api/problems | Add problem |
| PUT | /api/problems/:id | Update problem |
| DELETE | /api/problems/:id | Delete problem |

---

## Local Development

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in MONGO_URI
npm install
npm run dev            # runs on http://localhost:5001
```

### 2. Seed Database

```bash
cd backend
npm run seed
```

### 3. Frontend

```bash
# from project root
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Deploy — Backend (Render)

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set **Root Directory** to `backend`
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `FRONTEND_URL` — your Netlify URL (e.g. `https://your-app.netlify.app`)
   - `NODE_ENV` — `production`
8. Deploy — copy the Render URL (e.g. `https://leetcode-tracker-xxxx.onrender.com`)

---

## Deploy — Frontend (Netlify)

1. Update `PRODUCTION_API_URL` in `api-config.js` with your Render URL
2. Go to [netlify.com](https://netlify.com) → Add new site → Import from GitHub
3. Set **Publish directory** to `.` (root)
4. Deploy

---

## MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free M0 cluster
2. Database Access → Add user with password
3. Network Access → Allow `0.0.0.0/0`
4. Connect → Drivers → copy connection string
5. Replace `<password>` and set database name to `leetcode-tracker`
