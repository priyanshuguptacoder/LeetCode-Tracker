const SubmissionLog = require('../models/SubmissionLog');

// Returns [{ date: "YYYY-MM-DD", count: N }] — unique problems accepted per day (IST)
async function getDailyActivityMap() {
  return SubmissionLog.aggregate([
    { $match: { status: 'accepted' } },
    {
      $group: {
        _id: {
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$submittedAt',
              timezone: 'Asia/Kolkata',
            },
          },
          problemId: '$problemId',
        },
      },
    },
    {
      $group: {
        _id: '$_id.day',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]).then(docs => docs.map(d => ({ date: d._id, count: d.count })));
}

// Returns current streak (consecutive days ending today, IST)
function calculateStreak(activityArray) {
  if (!activityArray.length) return 0;

  const dateSet = new Set(activityArray.map(a => a.date));

  // Today in IST
  const nowIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  const pad = n => String(n).padStart(2, '0');
  const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let streak = 0;
  const cursor = new Date(nowIST);

  while (true) {
    const key = toKey(cursor);
    if (!dateSet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

module.exports = { getDailyActivityMap, calculateStreak };
