const API = '';
let allLogs = [];
let paused = false;
let pollInterval = null;

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  await poll();
  pollInterval = setInterval(poll, 3000);
});

// ── AUTH ──────────────────────────────────────────────────────────────────────

async function checkAdmin() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = '/account.html'; return; }
    const user = await res.json();
    if (!(user.role === 'admin' || user.role === 'master')) { window.location.href = '/account.html'; return; }
    document.getElementById('admin-name').textContent = user.first_name + ' ' + (user.last_name || '');
    document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
  } catch (e) {
    window.location.href = '/account.html';
  }
}

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

// ── POLL ──────────────────────────────────────────────────────────────────────

async function poll() {
  try {
    const res = await fetch(API + '/admin/health', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();

    renderStats(data);

    if (!paused) {
      allLogs = data.logs || [];
      renderLogs();
    }
  } catch (e) {
    console.error('Health poll error:', e);
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

function renderStats(data) {
  // Uptime
  const up = data.uptime || 0;
  const h = Math.floor(up / 3600);
  const m = Math.floor((up % 3600) / 60);
  const s = up % 60;
  document.getElementById('stat-uptime').textContent =
    h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  document.getElementById('stat-uptime-sub').textContent =
    new Date(data.timestamp).toLocaleTimeString('en-GB');

  // DB
  const dbOk = data.db?.status === 'ok';
  const dbEl = document.getElementById('stat-db');
  dbEl.textContent = dbOk ? '● Online' : '✕ Error';
  dbEl.className = 'health-stat-value ' + (dbOk ? 'status-ok' : 'status-err');
  document.getElementById('stat-db-sub').textContent =
    dbOk ? `${data.db.latency}ms latency` : 'Cannot reach DB';

  // Heap
  const heap = data.memory?.heapUsed || 0;
  const heapTotal = data.memory?.heapTotal || 0;
  document.getElementById('stat-heap').textContent = `${heap} MB`;
  document.getElementById('stat-heap-sub').textContent =
    `of ${heapTotal} MB allocated`;

  // RSS
  const rss = data.memory?.rss || 0;
  document.getElementById('stat-rss').textContent = `${rss} MB`;
  document.getElementById('stat-rss-sub').textContent = 'total process memory';
}

// ── LOGS ──────────────────────────────────────────────────────────────────────

function renderLogs() {
  const body = document.getElementById('terminal-body');
  const filter = document.getElementById('level-filter').value;

  const levelPriority = { error: 0, warn: 1, log: 2, debug: 3, verbose: 4 };
  const minPriority = {
    all: 99,
    error: 0,
    warn: 1,
    log: 2,
  }[filter] ?? 99;

  const filtered = allLogs.filter(entry => {
    const p = levelPriority[entry.level] ?? 99;
    return p <= minPriority;
  });

  if (!filtered.length) {
    body.innerHTML = '<div class="terminal-empty">No log entries yet.</div>';
    return;
  }

  const wasAtBottom = body.scrollHeight - body.scrollTop <= body.clientHeight + 40;

  body.innerHTML = filtered.map(entry => {
    const ts = new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour12: false });
    const lvl = (entry.level || 'log').toLowerCase();
    const ctx = entry.context ? `[${esc(entry.context)}]` : '';
    const msg = esc(entry.message);

    return `
      <div class="log-line">
        <span class="log-ts">${ts}</span>
        <span class="log-level level-${lvl}">${lvl.toUpperCase()}</span>
        <span class="log-ctx">${ctx}</span>
        <span class="log-msg">${msg}</span>
      </div>
    `;
  }).join('');

  if (wasAtBottom) scrollToBottom();
}

function scrollToBottom() {
  const body = document.getElementById('terminal-body');
  body.scrollTop = body.scrollHeight;
}

// ── CONTROLS ──────────────────────────────────────────────────────────────────

async function clearLogs() {
  if (!confirm('Clear all server logs? This cannot be undone.')) return;
  try {
    await fetch(API + '/admin/health/logs', {
      method: 'DELETE',
      credentials: 'include',
    });
    allLogs = [];
    renderLogs();
  } catch (e) {
    alert('Failed to clear logs.');
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
