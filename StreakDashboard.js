// StreakDashboard — fetches /api/analytics/streak and displays streak stats
function StreakDashboard() {
  const [data, setData]   = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/analytics/streak')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(d => {
        if (d.success && d.data) setData(d.data);
        else setError('Failed to load streak');
      })
      .catch(() => setError('Network error'));
  }, []);

  if (error) return React.createElement('div', { className: 'streak-error' }, error);
  if (!data)  return React.createElement('div', { className: 'streak-loading' }, 'Loading streak…');

  return React.createElement(
    'div', { className: 'streak-dashboard' },
    React.createElement('span', { className: 'streak-flame' }, '🔥'),
    React.createElement('span', { className: 'streak-count' }, data.global?.currentStreak ?? 0),
    React.createElement('span', { className: 'streak-label' }, data.global?.currentStreak === 1 ? 'day streak' : 'day streak'),
  );
}
