const fs = require('fs');
const path = require('path');

const PROBLEMS_FILE = path.join(__dirname, 'problems.json');

// Read current data
const data = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));

// Generate random date within last 40 days
const generateRandomDate = () => {
  const today = new Date();
  const daysAgo = Math.floor(Math.random() * 40); // 0-39 days ago
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Generate dates with realistic distribution
const generateRealisticDates = (problemCount) => {
  const dates = [];
  const today = new Date();
  
  // Create 40 active days
  const activeDays = [];
  for (let i = 0; i < 40; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    activeDays.push(date.toISOString().split('T')[0]);
  }
  
  // Distribute problems across these days
  // Some days have more problems (2-6 per day)
  let problemsAssigned = 0;
  let dayIndex = 0;
  
  while (problemsAssigned < problemCount && dayIndex < activeDays.length) {
    // Random problems per day: 2-6, weighted towards 3-4
    const problemsPerDay = Math.floor(Math.random() * 5) + 2; // 2-6
    
    for (let i = 0; i < problemsPerDay && problemsAssigned < problemCount; i++) {
      dates.push(activeDays[dayIndex]);
      problemsAssigned++;
    }
    
    dayIndex++;
  }
  
  // Shuffle dates for randomness
  for (let i = dates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dates[i], dates[j]] = [dates[j], dates[i]];
  }
  
  return dates;
};

// Count problems with status "Done"
const doneProblems = data.problems.filter(p => p.status === 'Done');
console.log(`Found ${doneProblems.length} problems with status "Done"`);

// Generate realistic dates
const randomDates = generateRealisticDates(doneProblems.length);

// Update problems with random dates
let dateIndex = 0;
data.problems.forEach(problem => {
  if (problem.status === 'Done') {
    problem.solvedDate = randomDates[dateIndex];
    problem.updatedAt = new Date().toISOString();
    dateIndex++;
  }
});

// Write back to file
fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(data, null, 2));

console.log('✅ Updated solved dates for all "Done" problems');
console.log(`📊 Dates distributed across 40 days`);
console.log(`📅 Date range: ${randomDates[randomDates.length - 1]} to ${randomDates[0]}`);

// Show distribution
const dateCount = {};
randomDates.forEach(date => {
  dateCount[date] = (dateCount[date] || 0) + 1;
});

console.log('\n📈 Problems per day distribution:');
Object.entries(dateCount)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 10)
  .forEach(([date, count]) => {
    console.log(`  ${date}: ${count} problems`);
  });
