const crypto  = require('crypto');
const axios   = require('axios');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Verify GitHub webhook signature (HMAC-SHA256)
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true; // skip if not configured (dev mode)
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const digest = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
}

// Fetch file content from GitHub via REST API
async function fetchFileFromGitHub(owner, repo, path, ref) {
  const token = process.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await axios.get(url, { headers, params: { ref } });
  // GitHub returns base64-encoded content
  const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
  return JSON.parse(content);
}

// Validate meta.json structure
function validateMeta(meta) {
  const required = ['id', 'title', 'difficulty', 'dateSolved'];
  for (const field of required) {
    if (meta[field] == null) throw new Error(`Missing required field: ${field}`);
  }
  if (!['Easy', 'Medium', 'Hard'].includes(meta.difficulty)) {
    throw new Error(`Invalid difficulty: ${meta.difficulty}`);
  }
  if (!['solved', 'revisited'].includes(meta.status)) {
    meta.status = 'solved'; // default
  }
  return meta;
}

// SM-2 spaced repetition update
// quality: 0–5 (we derive from attempts: 1→5, 2→3, 3+→1)
function sm2Update(current, quality) {
  let { easeFactor = 2.5, interval = 1, reviewCount = 0 } = current;

  if (quality >= 3) {
    if (reviewCount === 0)      interval = 1;
    else if (reviewCount === 1) interval = 3;
    else                        interval = Math.round(interval * easeFactor);
  } else {
    interval = 1; // reset on failure
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  reviewCount += 1;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor: parseFloat(easeFactor.toFixed(2)), interval, reviewCount, nextReviewAt };
}

// Derive SM-2 quality score from attempts
function qualityFromAttempts(attempts) {
  if (attempts === 1) return 5;
  if (attempts === 2) return 3;
  return 1;
}

// Extract changed problem slugs from push payload
// Looks for files matching: leetcode/{slug}/meta.json
function extractChangedSlugs(commits) {
  const slugs = new Set();
  const metaPattern = /^leetcode\/([^/]+)\/meta\.json$/;

  for (const commit of commits) {
    const files = [
      ...(commit.added    || []),
      ...(commit.modified || []),
    ];
    for (const file of files) {
      const match = file.match(metaPattern);
      if (match) slugs.add(match[1]);
    }
  }
  return [...slugs];
}

// ─── POST /api/github-sync ────────────────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  // 1. Verify signature
  if (!verifySignature(req)) {
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
  }

  // 2. Only handle push events
  const event = req.headers['x-github-event'];
  if (event !== 'push') {
    return res.json({ success: true, message: `Ignored event: ${event}` });
  }

  const { repository, commits, head_commit, ref } = req.body;
  if (!repository || !commits?.length) {
    return res.json({ success: true, message: 'No commits to process' });
  }

  const owner    = repository.owner?.login || repository.full_name.split('/')[0];
  const repoName = repository.name;
  const commitSha = head_commit?.id || null;
  const branch   = ref?.replace('refs/heads/', '') || 'main';

  console.log(`[github-sync] Push to ${owner}/${repoName}@${branch} — ${commits.length} commit(s)`);

  // 3. Find changed meta.json files
  const slugs = extractChangedSlugs(commits);
  if (slugs.length === 0) {
    return res.json({ success: true, message: 'No problem folders changed' });
  }

  console.log(`[github-sync] Changed slugs: ${slugs.join(', ')}`);

  const results = { synced: [], skipped: [], errors: [] };

  // 4. Process each slug
  for (const slug of slugs) {
    const metaPath = `leetcode/${slug}/meta.json`;
    try {
      // Fetch meta.json from GitHub
      const raw = await fetchFileFromGitHub(owner, repoName, metaPath, commitSha || branch);
      const meta = validateMeta(raw);

      const dateSolved = new Date(meta.dateSolved);
      const quality    = qualityFromAttempts(meta.attempts || 1);

      // Get existing submission for SM-2 continuity
      const existing = await Submission.findOne({ problemId: meta.id });
      const sr = sm2Update(existing || {}, quality);

      // Upsert submission
      const submission = await Submission.findOneAndUpdate(
        { problemId: meta.id },
        {
          $set: {
            slug,
            title:      meta.title,
            difficulty: meta.difficulty,
            tags:       meta.tags || [],
            dateSolved,
            timeTaken:  meta.timeTaken || null,
            attempts:   meta.attempts || 1,
            status:     meta.status || 'solved',
            notes:      meta.notes || '',
            commitSha,
            repoName,
            easeFactor:   sr.easeFactor,
            interval:     sr.interval,
            reviewCount:  sr.reviewCount,
            nextReviewAt: sr.nextReviewAt,
          }
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Also upsert into the main Problem collection (keep tracker in sync)
      const now = new Date();
      const nextRevisionAt = new Date(now);
      nextRevisionAt.setDate(nextRevisionAt.getDate() + 1);

      await Problem.findOneAndUpdate(
        { id: meta.id },
        {
          $set: {
            title:       meta.title,
            difficulty:  meta.difficulty,
            topics:      meta.tags || [],
            solved:      true,
            solvedDate:  dateSolved,
            submittedAt: now,
            nextRevisionAt,
            notes:       meta.notes || '',
            leetcodeLink: `https://leetcode.com/problems/${slug}/`,
          },
          $setOnInsert: {
            revisionCount: 0,
            confidence:    3,
          }
        },
        { upsert: true, new: true }
      );

      results.synced.push({ slug, id: meta.id, title: meta.title });
      console.log(`[github-sync] ✅ Synced: #${meta.id} ${meta.title}`);

    } catch (err) {
      if (err.response?.status === 404) {
        results.skipped.push({ slug, reason: 'meta.json not found' });
        console.log(`[github-sync] ⏭ Skipped ${slug}: no meta.json`);
      } else {
        results.errors.push({ slug, error: err.message });
        console.error(`[github-sync] ❌ Error ${slug}:`, err.message);
      }
    }
  }

  return res.json({
    success: true,
    message: `Processed ${slugs.length} problem(s)`,
    results,
  });
};

// ─── POST /api/github-sync/manual ────────────────────────────────────────────
// Manually trigger a full sync of the entire repo (no webhook needed)
exports.manualSync = async (req, res) => {
  const { owner, repo, branch = 'main' } = req.body;
  if (!owner || !repo) {
    return res.status(400).json({ success: false, error: 'owner and repo are required' });
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Get the tree recursively
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}`,
      { headers, params: { recursive: 1 } }
    );

    // Find all meta.json files under leetcode/
    const metaFiles = treeRes.data.tree.filter(
      f => f.type === 'blob' && /^leetcode\/[^/]+\/meta\.json$/.test(f.path)
    );

    console.log(`[github-sync] Manual sync: found ${metaFiles.length} meta.json files`);

    const results = { synced: [], skipped: [], errors: [] };

    for (const file of metaFiles) {
      const slug = file.path.split('/')[1];
      try {
        const raw = await fetchFileFromGitHub(owner, repo, file.path, branch);
        const meta = validateMeta(raw);
        const dateSolved = new Date(meta.dateSolved);
        const quality    = qualityFromAttempts(meta.attempts || 1);
        const existing   = await Submission.findOne({ problemId: meta.id });
        const sr         = sm2Update(existing || {}, quality);

        await Submission.findOneAndUpdate(
          { problemId: meta.id },
          {
            $set: {
              slug, title: meta.title, difficulty: meta.difficulty,
              tags: meta.tags || [], dateSolved,
              timeTaken: meta.timeTaken || null, attempts: meta.attempts || 1,
              status: meta.status || 'solved', notes: meta.notes || '',
              repoName: repo,
              easeFactor: sr.easeFactor, interval: sr.interval,
              reviewCount: sr.reviewCount, nextReviewAt: sr.nextReviewAt,
            }
          },
          { upsert: true, new: true, runValidators: true }
        );

        const now = new Date();
        const nextRevisionAt = new Date(now);
        nextRevisionAt.setDate(nextRevisionAt.getDate() + 1);

        await Problem.findOneAndUpdate(
          { id: meta.id },
          {
            $set: {
              title: meta.title, difficulty: meta.difficulty,
              topics: meta.tags || [], solved: true,
              solvedDate: dateSolved, submittedAt: now,
              nextRevisionAt, notes: meta.notes || '',
              leetcodeLink: `https://leetcode.com/problems/${slug}/`,
            },
            $setOnInsert: { revisionCount: 0, confidence: 3 }
          },
          { upsert: true, new: true }
        );

        results.synced.push({ slug, id: meta.id, title: meta.title });
      } catch (err) {
        results.errors.push({ slug, error: err.message });
      }
    }

    return res.json({ success: true, total: metaFiles.length, results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/github-sync/problems ───────────────────────────────────────────
exports.getProblems = async (req, res) => {
  try {
    const { difficulty, tag, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (tag)        filter.tags = tag;
    if (status)     filter.status = status;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Submission.countDocuments(filter);
    const data  = await Submission.find(filter)
      .sort({ dateSolved: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/github-sync/revision ───────────────────────────────────────────
// Problems due for review: nextReviewAt <= now, sorted by nextReviewAt ASC
exports.getRevision = async (req, res) => {
  try {
    const now = new Date();
    const due = await Submission.find({ nextReviewAt: { $lte: now } })
      .sort({ nextReviewAt: 1 });

    const upcoming = await Submission.find({ nextReviewAt: { $gt: now } })
      .sort({ nextReviewAt: 1 })
      .limit(10);

    res.json({
      success: true,
      dueNow:   { count: due.length,      data: due },
      upcoming: { count: upcoming.length, data: upcoming },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
