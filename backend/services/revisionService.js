// SM-2 inspired revision update
// feedback: 'easy' | 'medium' | 'hard'
async function updateRevision(problem, feedback) {
  let { easeFactor = 2.5, interval = 1 } = problem;

  if (feedback === 'easy') {
    easeFactor += 0.1;
    interval = Math.round(interval * easeFactor);
  } else if (feedback === 'medium') {
    interval = Math.round(interval * 1.5);
  } else {
    // hard
    interval = 1;
    easeFactor -= 0.2;
  }

  // Enforce constraints
  if (interval < 1) interval = 1;
  if (easeFactor < 1.3) easeFactor = 1.3;

  const now = new Date();
  const nextRevisionDate = new Date(now);
  nextRevisionDate.setDate(nextRevisionDate.getDate() + interval);

  problem.easeFactor       = easeFactor;
  problem.interval         = interval;
  problem.nextRevisionDate = nextRevisionDate;
  problem.revisionCount    = (problem.revisionCount || 0) + 1;
  problem.lastRevisedAt    = now;

  await problem.save();
  return problem;
}

module.exports = { updateRevision };
