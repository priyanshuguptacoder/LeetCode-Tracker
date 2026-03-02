# LeetCode Tracker - Full Stack Application

A full-stack LeetCode problem tracking application with React frontend and Node.js backend, deployed on Vercel.

## Features

- 📊 Track 147+ LeetCode problems
- ✅ Mark problems as Done/In Progress/Not Started
- 🎯 Filter by difficulty, pattern, and status
- 📈 View statistics and progress
- 🔥 Track streaks and consistency
- 🌓 Dark/Light mode
- 💾 JSON file storage (no database required)
- 🚀 Deployed on Vercel

## Tech Stack

**Frontend:**
- React (in-browser Babel)
- Vanilla CSS
- Fetch API

**Backend:**
- Node.js
- Express.js
- JSON file storage
- Vercel Serverless Functions

## Quick Start (Local Development)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/leetcode-tracker.git
cd leetcode-tracker
```

### 2. Install Dependencies

```bash
cd backend
npm install
cd ..
```

### 3. Start Backend

```bash
cd backend
npm start
```

Backend runs on `http://localhost:5001`

### 4. Start Frontend

```bash
# From project root
python3 -m http.server 8000
```

Frontend runs on `http://localhost:8000`

### 5. Open Application

```
http://localhost:8000
```

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/leetcode-tracker)

### Manual Deploy

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
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

### Deploy via GitHub

1. Push code to GitHub
2. Go to https://vercel.com
3. Click "Import Project"
4. Select your GitHub repository
5. Click "Deploy"

That's it! Vercel will automatically:
- Build and deploy your app
- Set up serverless functions for the backend
- Provide a production URL
- Enable automatic deployments on push

## Project Structure

```
.
├── backend/
│   ├── controllers/
│   │   └── problemController.js
│   ├── routes/
│   │   └── problemRoutes.js
│   ├── server.js              # Express server
│   ├── problems.json          # Database (147 problems)
│   └── package.json
├── index.html                 # Main page
├── script.js                  # React app
├── style.css                  # Styles
├── api-config.js              # API configuration
├── vercel.json                # Vercel configuration
└── package.json
```

## API Endpoints

- `GET /api/problems` - Get all problems
- `GET /api/stats` - Get statistics
- `POST /api/problems` - Create new problem
- `PUT /api/problems/:number` - Update problem
- `DELETE /api/problems/:number` - Delete problem

## Environment Variables

No environment variables needed! The app works out of the box.

For custom configuration, create `backend/.env`:

```env
PORT=5001
NODE_ENV=development
```

## Features

✅ Track 147+ LeetCode problems  
✅ Add/Update/Delete problems  
✅ Filter by difficulty/pattern/status  
✅ Search problems  
✅ View statistics  
✅ Track streaks  
✅ Dark/Light mode  
✅ Responsive design  
✅ Multi-device sync  
✅ Serverless deployment  

## How It Works

### Local Development
- Backend runs on Express server (port 5001)
- Frontend served via Python HTTP server (port 8000)
- API calls go to `http://localhost:5001/api`

### Production (Vercel)
- Backend runs as Vercel Serverless Functions
- Frontend served via Vercel CDN
- API calls go to same domain `/api`
- Automatic HTTPS
- Global CDN distribution

## Vercel Configuration

The `vercel.json` file configures:
- Backend as serverless function
- Frontend as static site
- API routes to `/api/*`
- Automatic routing

## Troubleshooting

### Local Development

**Backend not starting:**
```bash
cd backend
npm install
npm start
```

**Frontend not loading:**
```bash
python3 -m http.server 8000
```

### Vercel Deployment

**Build fails:**
- Check `vercel.json` configuration
- Verify `backend/package.json` has all dependencies
- Check Vercel build logs

**API not working:**
- Verify routes in `vercel.json`
- Check serverless function logs in Vercel dashboard
- Ensure `backend/server.js` exports the app

**CORS errors:**
- CORS is configured to allow all Vercel domains
- Check browser console for specific errors

## License

MIT License

## Author

Priyanshu Gupta

## Contributing

Pull requests are welcome! For major changes, please open an issue first.
