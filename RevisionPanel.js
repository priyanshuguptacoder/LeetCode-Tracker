// RevisionPanel — shows due problems and handles easy/medium/hard feedback
function RevisionPanel() {
  const [problems, setProblems] = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [updating, setUpdating] = React.useState(null); // problemId being updated

  const fetchDue = () => {
    setLoading(true);
    fetch('/api/revision/due')
      .then(r => r.json())
      .then(d => { if (d.success) setProblems(d.data); })
      .finally(() => setLoading(false));
  };

  React.useEffect(fetchDue, []);

  const handleFeedback = async (problemId, feedback) => {
    if (updating) return;
    setUpdating(problemId);
    try {
      const res = await fetch('/api/revision/update', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ problemId, feedback }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.success) {
        setProblems(prev => prev.filter(p => p.id !== problemId));
      } else {
        console.error('Revision update failed:', data.error);
      }
    } catch (err) {
      console.error('Revision update error:', err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return React.createElement('div', { className: 'rp-loading' }, 'Loading revision queue…');

  if (problems.length === 0)
    return React.createElement('div', { className: 'rp-empty' }, '✅ No revisions due right now');

  return React.createElement(
    'div', { className: 'revision-panel' },
    React.createElement('h3', { className: 'rp-title' }, `📚 Due for Revision (${problems.length})`),
    React.createElement(
      'ul', { className: 'rp-list' },
      problems.map(p =>
        React.createElement(
          'li', { key: p.id, className: 'rp-item' },
          React.createElement(
            'div', { className: 'rp-problem-info' },
            React.createElement('span', { className: 'rp-num' }, `#${p.id}`),
            React.createElement('span', { className: 'rp-title-text' }, p.title),
            React.createElement('span', { className: `rp-diff rp-diff-${(p.difficulty||'').toLowerCase()}` }, p.difficulty),
          ),
          React.createElement(
            'div', { className: 'rp-actions' },
            ['easy', 'medium', 'hard'].map(fb =>
              React.createElement(
                'button', {
                  key: fb,
                  className: `rp-btn rp-btn-${fb}`,
                  disabled: updating === p.id,
                  onClick: () => handleFeedback(p.id, fb),
                },
                fb.charAt(0).toUpperCase() + fb.slice(1),
              )
            ),
          ),
        )
      ),
    ),
  );
}
