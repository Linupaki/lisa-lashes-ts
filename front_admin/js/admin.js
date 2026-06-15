const API = '';
const ADMIN_API = '';
let allBookings = [];
let allUsers = [];
let allResources = [];
let allSalonServices = [];

/* ── Extract "YYYY-MM-DD" from an ISO string ── */
function extractDate(isoString) {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

/* ── Extract "HH:MM" from an ISO string ── */
function extractTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ── Formatter to turn YYYY-MM-DD into DD MMM YYYY ── */
function formatDateLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Session guard ── */
async function checkAdmin() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = '/login.html'; return false; }
    const user = await res.json();
    if (!(user.role === 'admin' || user.role === 'master')) { window.location.href = '/account.html'; return false; }
    document.getElementById('admin-name').textContent = user.first_name + ' ' + (user.last_name || '');
    document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
    return true;
  } catch (e) { window.location.href = '/login.html'; return false; }
}

/* ── Logout ── */
async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

/* ── Topbar date ── */
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* ── Helpers ── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function statusBadge(s) {
  const map = { confirmed: 'badge-confirmed', pending: 'badge-pending', cancelled: 'badge-cancelled' };
  const cls = map[s?.toLowerCase()] || 'badge-pending';
  const lbl = s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function resourceLabel(resource_id, service_id) {
  const r = allResources.find(x => x.id === resource_id);
  if (!r) return `Resource #${resource_id}`;
  if (service_id) {
    const s = allSalonServices.find(x => x.id === service_id);
    return s ? `${r.name} — ${s.name}` : r.name;
  }
  return r.name;
}

/* ── Stats ── */
function renderStats() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const total = allBookings.length;

  const thisMonthCount = allBookings.filter(b => extractDate(b.start_time).startsWith(thisMonth)).length;
  const lastMonthCount = allBookings.filter(b => extractDate(b.start_time).startsWith(lastMonth)).length;
  const todayCount = allBookings.filter(b => extractDate(b.start_time) === today).length;
  const yestCount = allBookings.filter(b => extractDate(b.start_time) === yesterday).length;
  const clientCount = allUsers.length;

  // Total bookings
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-total').classList.remove('stat-loading');
  document.getElementById('stat-total-change').textContent = `${total} appointments in total`;

  // This month vs last month
  document.getElementById('stat-month').textContent = thisMonthCount;
  document.getElementById('stat-month').classList.remove('stat-loading');
  if (lastMonthCount > 0) {
    const pct = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
    const el = document.getElementById('stat-month-change');
    el.textContent = (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct) + '% from last month';
    el.className = 'stat-change' + (pct < 0 ? ' down' : '');
  } else {
    document.getElementById('stat-month-change').textContent = lastMonthCount + ' last month';
  }

  // Clients
  document.getElementById('stat-clients').textContent = clientCount;
  document.getElementById('stat-clients').classList.remove('stat-loading');
  document.getElementById('stat-clients-change').textContent = `${clientCount} registered client${clientCount !== 1 ? 's' : ''}`;

  // Today vs yesterday
  document.getElementById('stat-today').textContent = todayCount;
  document.getElementById('stat-today').classList.remove('stat-loading');
  const diff = todayCount - yestCount;
  const todayEl = document.getElementById('stat-today-change');
  todayEl.textContent = (diff >= 0 ? '↑ ' : '↓ ') + Math.abs(diff) + ' from yesterday';
  todayEl.className = 'stat-change' + (diff < 0 ? ' down' : '');
}

/* ── Recent Bookings table ── */
function renderRecent() {
  const tbody = document.getElementById('recent-tbody');

  // Sort safely by your backend's ISO start_time strings in descending order
  const recent = [...allBookings]
    .sort((a, b) => {
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      return timeB.localeCompare(timeA); // Newest bookings at the top
    })
    .slice(0, 8);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(b => {
    // Parse values natively out of the start_time ISO timestamp
    const bDate = extractDate(b.start_time);
    const bStart = extractTime(b.start_time);
    const dateStr = formatDateLabel(bDate);

    return `
        <tr>
          <td class="td-name">${escHtml(b.customer_name || '—')}</td>
          <td>${escHtml(resourceLabel(b.resource_id, b.service_id))}</td>
          <td>${escHtml(dateStr)}</td>
          <td>${escHtml(bStart)}</td>
          <td>${statusBadge(b.status)}</td>
          <td>
            <div class="actions">
              <button class="btn-icon" title="View Booking" onclick="openBooking(${b.id})">✎</button>
              <button class="btn-icon delete" title="Delete" onclick="deleteBooking(${b.id}, '${escHtml(b.customer_name || '')}')">✕</button>
            </div>
          </td>
        </tr>`;
  }).join('');
}

/* ── Delete ── */
async function deleteBooking(id, name) {
  if (!confirm(`Delete booking for "${name || 'this customer'}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${ADMIN_API}/booking/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { alert('Delete failed: ' + res.status); return; }
    allBookings = allBookings.filter(b => b.id !== id);
    renderStats();
    renderRecent();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ── Navigate to booking modal ── */
function openBooking(id) {
  sessionStorage.setItem('openBookingId', id);
  window.location.href = 'bookings.html';
}


/* ── Boot ── */
async function loadDashboard() {
  const ok = await checkAdmin();
  if (!ok) return;
  try {
    const [bRes, uRes, rRes, sRes] = await Promise.all([
      fetch(`${ADMIN_API}/booking`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${ADMIN_API}/user`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/resources`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/services`, { credentials: 'include', cache: 'no-store' })
    ]);

    const bData = await bRes.json();
    const uData = await uRes.json();
    const rData = await rRes.json();
    const sData = await sRes.json();

    // DEBUG LOG: Look at your browser console (F12) to see exactly what your server sent!
    console.log("SERVER BOOKINGS PAYLOAD:", bData);

    // Smart extraction: extract array whether it's wrapped in an object property or a raw array
    allBookings = bData.bookings || (Array.isArray(bData) ? bData : []);
    allUsers = uData.users || (Array.isArray(uData) ? uData : []);
    allResources = rData.resources || (Array.isArray(rData) ? rData : []);
    allSalonServices = sData.services || (Array.isArray(sData) ? sData : []);

    // Safety pass: Map fields dynamically if your backend sent a different naming format
    allBookings = allBookings.map(b => ({
      ...b,
      // If start_time doesn't exist, try falling back to b.date / b.start structures
      start_time: b.start_time || b.booking_date || (b.date && b.start ? `${b.date}T${b.start}` : '')
    }));

    renderStats();
    renderRecent();
  } catch (e) {
    console.error('Dashboard load error:', e);
    document.getElementById('recent-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load data.</td></tr>';
  }
}
loadDashboard();

