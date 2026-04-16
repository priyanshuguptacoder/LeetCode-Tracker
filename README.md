<div align="center">

<h1>⚡ Competitive Programming Tracker</h1>

<p><strong>A full-stack discipline engine for serious competitive programmers.</strong><br/>
Track LeetCode & Codeforces — streaks, revision, contests, analytics. All in one place.</p>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Visit%20App-6366f1?style=for-the-badge)](https://competativeprogrammingtrackerpriyanshu.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-LeetCode--Tracker-181717?style=for-the-badge&logo=github)](https://github.com/priyanshuguptacoder/LeetCode-Tracker)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

<br/>

[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://render.com)

</div>

---

## 🧠 What is this?

Most problem trackers answer *"how many have I solved?"*

This one answers the harder question:

> **"Am I actually improving — or just grinding randomly?"**

Built for competitive programmers who care about **consistency**, **revision discipline**, and **measurable progress** — not just problem count.

---

## ✨ Features

### 🔥 Streak & Consistency Engine
- Tracks **daily streaks** independently for LeetCode and Codeforces
- Calculates current streak, max streak, and total active days
- Platform-aware date fields — `solvedDate` for LC, `lastSubmittedAt` for CF
- No fake streaks from old data — only real, dated activity counts

### 📊 Smart Dashboard
- Total solved with platform split (LC vs CF)
- Weekly performance trends
- Daily average solving rate
- Active days heatmap-ready data

### 📅 Monthly Planner
- Problems solved vs. remaining this month
- Required pace per day to hit your goal
- Current pace per day — shows if you're on track or falling behind

### 🔁 Revision System *(Key differentiator)*
- Tracks **last revised date** and **revision frequency** per problem
- Flags forgotten problems and long revision gaps
- Surfaces: *"What should I revise today?"*

### 📚 Problem Management
- Full CRUD — add, update, delete problems
- Status: Done / Pending
- Difficulty tagging (Easy / Medium / Hard)
- Revision count per problem
- Filters by: Difficulty · Pattern · Status · Platform

### 🔢 Platform-Aware Problem IDs
- LeetCode → `#2235` (numeric)
- Codeforces → `1772A` (alphanumeric)
- Clean architecture — IDs stored directly, never parsed from titles

### 🏆 Contest Stats

| LeetCode | Codeforces |
|----------|-----------|
| Rating | Rating |
| Global rank | Max rating |
| Contest count | Rank (newbie → grandmaster) |

Visual rank highlighting included.

### 📈 Performance Analytics
- Weekly performance comparison (this week vs last week)
- Rolling focus tracking
- Consistency score
- Best day record

### 📦 Recent & Targeted Problems
- Recent activity feed
- "Target list" — curate problems to focus on next
- Focus-based solving workflow

---

## 🏗️ Project Structure

```
LeetCode-Tracker/
│
├── index.html                  # App entry point
├── script.js                   # Main React app (CDN-based)
├── style.css                   # Custom UI styling
├── api-config.js               # ← Set PRODUCTION_API_URL here
├── RevisionPanel.js            # Revision system component
├── StreakDashboard.js          # Streak engine component
├── netlify.toml                # Netlify deployment config
├── render.yaml                 # Render deployment config
├── vercel.json                 # Vercel deployment config
├── package.json
├── favicon.ico
│
└── backend/
    ├── server.js               # Express app + MongoDB connection
    ├── seed.js                 # Seed DB from local dataset
    ├── models/
    │   └── Problem.js          # Mongoose schema
    ├── routes/
    │   └── problems.js         # Route definitions
    ├── controllers/
    │   └── problemController.js # Business logic
    ├── .env.example            # Environment variable template
    └── package.json
```

---

## 🛠️ Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Frontend   | Vanilla JS + React (CDN), Custom CSS              |
| Backend    | Node.js, Express.js, REST API                     |
| Database   | MongoDB Atlas, Mongoose ODM                       |
| Hosting    | Vercel (frontend), Render (backend)               |
| Languages  | JavaScript 70.5% · CSS 29.3% · HTML 0.2%         |

---

## 📡 API Reference

**Base URL:** `https://<your-render-app>.onrender.com`

| Method     | Endpoint                  | Description              |
|------------|---------------------------|--------------------------|
| `GET`      | `/api/problems`           | Fetch all problems       |
| `GET`      | `/api/problems/:id`       | Fetch a single problem   |
| `GET`      | `/api/problems/stats`     | Aggregated stats         |
| `POST`     | `/api/problems`           | Add a new problem        |
| `PUT`      | `/api/problems/:id`       | Update a problem         |
| `DELETE`   | `/api/problems/:id`       | Delete a problem         |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Python 3 (for frontend dev server)

### 1. Clone the repo

```bash
git clone https://github.com/priyanshuguptacoder/LeetCode-Tracker.git
cd LeetCode-Tracker
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/leetcode-tracker
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:8000
```

```bash
npm install
npm run dev        # Starts on http://localhost:5001
```

### 3. Seed the database

```bash
# From /backend
npm run seed
```

### 4. Run the frontend

```bash
# From project root
python3 -m http.server 8000
# Open http://localhost:8000
```

---

## ☁️ Deployment

### Backend → Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** → `backend`
5. **Build command:** `npm install`
6. **Start command:** `npm start`
7. Set **Environment Variables:**

   | Key            | Value                                                 |
   |----------------|-------------------------------------------------------|
   | `MONGO_URI`    | Your MongoDB Atlas connection string                  |
   | `FRONTEND_URL` | Your Vercel URL (e.g. `https://your-app.vercel.app`)  |
   | `NODE_ENV`     | `production`                                          |

8. Deploy → copy the Render URL

### Frontend → Vercel

1. In `api-config.js`, update `PRODUCTION_API_URL` to your Render URL
2. Go to [vercel.com](https://vercel.com) → **New Project → Import from GitHub**
3. Deploy from project root 🎉

---

## 🍃 MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free **M0 cluster**
2. **Database Access** → Add a user with password
3. **Network Access** → Add IP `0.0.0.0/0` (allow all)
4. **Connect → Drivers** → Copy the connection string
5. Replace `<password>` and set DB name to `leetcode-tracker`

```
mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/leetcode-tracker?retryWrites=true&w=majority
```

---

## ⚠️ Engineering Challenges Solved

| Problem | Solution |
|---------|----------|
| Incorrect streak calculation | Platform-aware date fields (`solvedDate` vs `lastSubmittedAt`) |
| String-based sorting bugs | Numeric IDs stored directly — never parsed from titles |
| Data inconsistency across platforms | Unified schema with platform discriminator field |
| UI clutter and poor hierarchy | Component-level separation (`RevisionPanel`, `StreakDashboard`) |
| Mixed frontend/backend logic | Clean REST boundary — all business logic in controllers |

---

## 🧠 Key Learnings

- **Data integrity over UI** — wrong data makes good UI useless
- **Multi-platform data modelling** — unified schema with platform-aware logic
- **Derived data is dangerous** — never compute IDs or dates from display strings
- **Analytics-first design** — dashboard tells a story, not just numbers
- **Single source of truth** — MongoDB is the authority, frontend only renders

---

## 🚧 Roadmap

- [ ] GitHub-style activity heatmap
- [ ] Codeforces rating graph over time
- [ ] User authentication (multi-user support)
- [ ] Auto-sync via LeetCode & Codeforces APIs
- [ ] Mobile-responsive layout improvements
- [ ] Export progress to CSV / PDF

---

## 👨‍💻 Author

**Priyanshu Gupta** — CSE @ NIT Jalandhar

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-6366f1?style=flat-square)](https://competativeprogrammingtrackerpriyanshu.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-priyanshuguptacoder-181717?style=flat-square&logo=github)](https://github.com/priyanshuguptacoder)

---

## 📄 License

[MIT](./LICENSE) © Priyanshu Gupta

---

<div align="center">

**Most trackers count problems.**  
**This one tracks progress.**

⭐ If this helped you — drop a star. It genuinely motivates.

</div>
