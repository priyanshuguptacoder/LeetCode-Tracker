# 🚀 LeetCode Performance Engine

> A premium SaaS-style analytics dashboard for tracking your competitive programming journey

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Data Structure](#data-structure)
- [Customization](#customization)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

LeetCode Performance Engine is an intelligent, self-validating problem tracking system designed for serious competitive programmers. It transforms your LeetCode journey into actionable insights with real-time analytics, pattern mastery tracking, and personalized difficulty ratings.

### Why This Dashboard?

- ✅ **Accurate Analytics** - Real pattern mastery calculations (not fake 100%)
- ✅ **Dual Difficulty System** - Track both LeetCode and your personal ratings
- ✅ **Smart Auto-Detection** - AI-powered pattern categorization
- ✅ **Fully Dynamic** - Auto-expands with new patterns and problems
- ✅ **Premium UI/UX** - Looks like a professional SaaS product
- ✅ **Zero Backend** - Pure frontend, works offline

---

## ✨ Features

### 📊 Advanced Analytics

#### Pattern Mastery
- **Real Calculations**: Shows actual progress (e.g., 75% = 155/200)
- **Dynamic Updates**: Recalculates when problems are added/solved
- **Color-Coded**: Green (80%+), Amber (50-79%), Red (<50%)
- **Mastery Badges**: ✓ Mastered badge at 100%
- **Auto-Expanding**: New patterns appear automatically

#### Dual Difficulty Distribution
- **LeetCode Difficulty**: Official problem ratings
- **User Difficulty**: Your personal experience ratings
- **Independent Tracking**: Rate problems by YOUR experience
- **Real-Time Updates**: Changes reflect instantly

#### Performance Metrics
- Total Solved / Remaining / Completion %
- Difficulty breakdown (Easy/Medium/Hard)
- Progress tracking toward goals
- Animated progress bars

### 🧠 Smart Features

#### Auto-Pattern Detection
- Analyzes problem titles with 100+ keywords
- Detects 20+ pattern categories automatically
- Works for new problems and target problems
- Fallback to "Miscellaneous" for unknown patterns

#### Duplicate Prevention
- Validates problem numbers across all datasets
- Shows alerts for existing problems
- Auto-scrolls to duplicates with highlight animation
- Prevents data corruption

#### Non-Destructive Data Management
- Original datasets remain untouched
- Changes stored in localStorage
- Status and difficulty overrides
- Safe delete (hides instead of removing)

### 🎨 Premium UI/UX

#### Modern Design
- Dark mode (default) with light mode support
- Glassmorphism effects with backdrop blur
- Smooth gradients and shadows
- Micro-interactions throughout
- Animated progress bars with shimmer

#### Color System
- Primary: `#00C896` (Emerald)
- Accent: `#6366F1` (Indigo)
- Warning: `#F59E0B` (Amber)
- Danger: `#EF4444` (Red)

#### Responsive Layout
- Mobile-optimized
- Flexible grid systems
- Touch-friendly controls
- Horizontal scroll for tables

---

## 📸 Screenshots

### Dashboard Overview
```
┌─────────────────────────────────────────────────────────┐
│  Priyanshu Gupta | LeetCode Performance Engine          │
│  Competitive Programming Intelligence Engine            │
├─────────────────────────────────────────────────────────┤
│  🎯 155        📊 45         ⚡ 77%        📚 200       │
│  Solved        Remaining     Completion    Total        │
├─────────────────────────────────────────────────────────┤
│  Mission 200 Progress                    [+ Add Problem]│
│  ████████████████░░░░░░░░░░ 77%                        │
├─────────────────────────────────────────────────────────┤
│  LeetCode Difficulty    │  User Difficulty              │
│  Easy:    67/67  100%   │  Easy:    70/72   97%        │
│  Medium:  77/122  63%   │  Medium:  75/115  65%        │
│  Hard:    11/11  100%   │  Hard:    10/13   77%        │
├─────────────────────────────────────────────────────────┤
│  Pattern Mastery                                        │
│  #1 Arrays        155/200  77%  [████████░░]           │
│  #2 Tree           45/75   60%  [██████░░░░]           │
│  #3 Graph          20/50   40%  [████░░░░░░]           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools required
- No npm/node installation needed

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/leetcode-performance-engine.git
   cd leetcode-performance-engine
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   open index.html
   # or
   double-click index.html
   ```

3. **That's it!** 🎉

### File Structure
```
leetcode-performance-engine/
├── index.html                    # Main HTML file
├── script.js                     # React application logic
├── style.css                     # Premium styling
├── leetcode_full_dataset.js      # Your problem dataset
├── README.md                     # This file
├── UPGRADE_SUMMARY.md            # Feature documentation
├── PATTERN_DETECTION_FEATURES.md # Pattern detection guide
└── QUICK_START_GUIDE.md          # Quick reference
```

---

## 📖 Usage

### Adding Problems

1. Click the **"+ Add Problem"** button
2. Fill in the form:
   - **Problem Number**: LeetCode problem number (e.g., 1)
   - **Title**: Problem name (e.g., "Two Sum")
   - **Difficulty**: Easy / Medium / Hard
   - **Type**: Solved / Target
   - **Pattern**: (Optional - auto-detected from title)
3. Click **"Add Problem"**

### Changing User Difficulty

1. Find any problem in the table
2. Locate the **"User Difficulty"** column
3. Click the dropdown
4. Select: Easy / Medium / Hard
5. Watch analytics update instantly!

### Tracking Progress

- **Pattern Mastery**: Shows real progress for each pattern
- **Difficulty Distribution**: Compare LeetCode vs your ratings
- **Progress Bar**: Visual tracking toward 200 problems
- **Stats Cards**: Quick overview of key metrics

### Managing Problems

- **Change Status**: Use dropdown in "Status" column
- **Delete Problem**: Click 🗑️ button (hides from view)
- **Search**: Use search bar to filter by number or title
- **Filter**: Filter by difficulty, pattern, or status

---

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18 (via CDN)
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: Pure CSS with CSS Variables
- **Storage**: localStorage for persistence
- **Build**: None required (pure HTML/CSS/JS)

### Data Flow

```
┌─────────────────┐
│  Base Datasets  │ (Read-Only)
│  - solvedProblems
│  - targetProblems
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  State Layer    │ (localStorage)
│  - statusOverrides
│  - userDifficultyOverrides
│  - customProblems
│  - deletedProblems
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Merge Logic    │ (Map-based deduplication)
│  - getAllProblems()
│  - Apply overrides
│  - Sort by number
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analytics      │ (Dynamic calculations)
│  - Pattern mastery
│  - Difficulty distribution
│  - Progress metrics
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UI Rendering   │ (React components)
│  - Stats cards
│  - Analytics grid
│  - Problem table
└─────────────────┘
```

### Key Functions

#### Pattern Detection
```javascript
detectPattern(title) {
  // Analyzes title with 100+ keywords
  // Returns pattern category
  // Fallback: "Miscellaneous"
}
```

#### Pattern Mastery Calculation
```javascript
// CORRECT: Solved / Total (Solved + Target)
patternStats[pattern].total++;
if (status === 'Done') {
  patternStats[pattern].solved++;
}
percentage = (solved / total) * 100;
```

#### Data Merge
```javascript
getAllProblems() {
  // 1. Insert solvedProblems
  // 2. Insert targetProblems (no duplicates)
  // 3. Insert customProblems (no duplicates)
  // 4. Apply status overrides
  // 5. Apply userDifficulty overrides
  // 6. Sort by number
}
```

---

## 📊 Data Structure

### Problem Object
```javascript
{
  number: 1,                    // LeetCode problem number
  title: "Two Sum",             // Problem name
  difficulty: "Easy",           // LeetCode official rating
  userDifficulty: "Easy",       // Your personal rating
  pattern: "Arrays",            // Problem category
  status: "Done",               // Not Started / In Progress / Done
  link: "https://...",          // LeetCode URL
  type: "Solved",               // Solved / Target
  autoDetected: false,          // Pattern auto-detected?
  isBase: true,                 // From base dataset?
  isCustom: false               // User-added?
}
```

### State Object
```javascript
{
  statusOverrides: {            // Problem status changes
    1: "Done",
    2: "In Progress"
  },
  userDifficultyOverrides: {    // User difficulty changes
    1: "Medium",
    4: "Hard"
  },
  customProblems: [],           // User-added problems
  deletedProblems: [3, 5],      // Hidden problem numbers
  todayCount: 0,                // Problems solved today
  weeklyCount: 0,               // Problems solved this week
  lastUpdate: "2024-01-01"      // Last update date
}
```

---

## 🎨 Customization

### Changing Colors

Edit `style.css`:
```css
:root {
    --primary: #00C896;      /* Change primary color */
    --accent: #6366F1;       /* Change accent color */
    --warning: #F59E0B;      /* Change warning color */
    --danger: #EF4444;       /* Change danger color */
}
```

### Adding New Patterns

Edit `script.js` - `detectPattern()` function:
```javascript
const patterns = {
  'Your New Pattern': ['keyword1', 'keyword2', 'keyword3'],
  // ... existing patterns
};
```

### Modifying Dataset

Edit `leetcode_full_dataset.js`:
```javascript
const solvedProblems = [
  { number: 1, title: "Two Sum", difficulty: "Easy", pattern: "Arrays", link: "..." },
  // Add more problems
];

const targetProblems = [
  { number: 100, title: "Same Tree", difficulty: "Easy", pattern: "Tree", link: "..." },
  // Add target problems
];
```

### Changing Goal

Edit `script.js` - Analytics section:
```javascript
const remaining = Math.max(300 - totalSolved, 0);  // Change 200 to 300
const progressPercentage = Math.min(Math.round((totalSolved / 300) * 100), 100);
```

---

## 🔧 Advanced Features

### Pattern Detection Keywords

The system recognizes these patterns:
- **Arrays**: array, sum, product, rotate, duplicate
- **Tree**: tree, binary tree, bst, inorder, preorder
- **Graph**: graph, connected, island, course, network
- **Sliding Window**: substring, subarray, window, consecutive
- **Dynamic Programming**: dp, maximum, minimum, ways, count
- **Binary Search**: search, sorted, find, median, kth
- **Stack**: stack, parentheses, valid, bracket
- **Linked List**: linked list, list, node, cycle
- **Two Pointers**: two pointer, palindrome, reverse
- **Heap**: heap, kth, priority, median
- **Backtracking**: combination, permutation, generate
- **Strings**: string, character, word, anagram
- **Greedy**: greedy, interval, meeting, jump
- **Trie**: trie, prefix, word search
- **Bit Manipulation**: bit, xor, binary
- **Design**: design, implement, lru, lfu
- **Math**: math, digit, number, factorial
- **Prefix Sum**: prefix, subarray sum, range sum
- **Matrix**: matrix, grid, 2d array, board
- **Queue**: queue, circular, deque

### Keyboard Shortcuts

- `Ctrl/Cmd + F`: Focus search bar
- `Esc`: Close modal
- `Enter`: Submit form (when modal open)

### Data Export

To export your data:
```javascript
// Open browser console (F12)
const data = localStorage.getItem('priyanshu-leetcode-state');
console.log(JSON.parse(data));
// Copy and save to file
```

### Data Import

To import data:
```javascript
// Open browser console (F12)
const data = { /* your data */ };
localStorage.setItem('priyanshu-leetcode-state', JSON.stringify(data));
location.reload();
```

---

## 🐛 Troubleshooting

### Pattern shows 100% but not all solved
**Fixed!** The system now correctly calculates from total problems (solved + target).

### User Difficulty not saving
Clear browser cache and try again. Make sure localStorage is enabled.

### Patterns not appearing
All patterns auto-display. If missing, add a problem with that pattern.

### Duplicate problems
The system prevents duplicates. If you see one, it's from the base dataset.

### Analytics not updating
Refresh the page. All calculations are dynamic and should update instantly.

---

## 📝 Best Practices

1. **Rate Honestly**: User Difficulty helps track YOUR growth
2. **Update Regularly**: Mark problems as solved when completed
3. **Focus on Weak Patterns**: Target red/amber patterns
4. **Add Target Problems**: Helps with pattern mastery tracking
5. **Review Progress**: Check analytics weekly

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Maintain the existing code style
- Test all changes thoroughly
- Update documentation as needed
- Keep the UI/UX consistent
- Ensure mobile responsiveness

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Priyanshu Gupta**

- LeetCode: [@priyanshuguptacoder](https://leetcode.com/u/priyanshuguptacoder/)
- GitHub: [@yourusername](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- React team for the amazing library
- LeetCode for the platform
- Inter font family for beautiful typography
- The competitive programming community

---

## 📚 Additional Resources

- [UPGRADE_SUMMARY.md](UPGRADE_SUMMARY.md) - Detailed feature documentation
- [PATTERN_DETECTION_FEATURES.md](PATTERN_DETECTION_FEATURES.md) - Pattern detection guide
- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - Quick reference guide
- [FINAL_UPGRADES_SUMMARY.md](FINAL_UPGRADES_SUMMARY.md) - Latest updates

---

## 🎉 Version History

### v2.0.0 (Current)
- ✅ Fixed Pattern Mastery calculation
- ✅ Added User Difficulty system
- ✅ Dual Difficulty Distribution
- ✅ Fully dynamic pattern rendering
- ✅ Smart auto-detection
- ✅ Premium UI/UX redesign

### v1.0.0
- Initial release
- Basic problem tracking
- Simple analytics

---

<div align="center">

**Made with ❤️ for competitive programmers**

[⬆ Back to Top](#-leetcode-performance-engine)

</div>
