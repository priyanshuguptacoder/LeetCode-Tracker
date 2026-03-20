// StreakDashboard — fetches /api/analytics/streak and displays current streak
function StreakDashboard() {
  const [streak, setStreak] = React.useState(null);
  const [error, setError]   = React.useState(null);

  React.useEffect(() => {
    fetch('/api/analytics/streak')
      .then(r => r.json())
      .then(d => {
        if (d.success) setStreak(d.currentStreak);
        else setError('Failed to load streak');
      })
      .catch(() => setError('Network error'));
  }, []);

  if (error)          return React.createElement('div', { className: 'streak-error' }, error);
  if (streak === null) return React.createElement('div', { className: 'streak-loading' }, 'Loading streak…');

  return React.createElement(
    'div', { className: 'streak-dashboard' },
    React.createElement('span', { className: 'streak-flame' }, '🔥'),
    React.createElement('span', { className: 'streak-count' }, streak),
    React.createElement('span', { className: 'streak-label' }, streak === 1 ? 'day streak' : 'day streak'),
  );
}
