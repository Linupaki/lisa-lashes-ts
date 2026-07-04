const API = '';
const ADMIN_API = '';
let allBookings = [];
let allUsers = [];
let allResources = [];
let allSalonServices = [];
let allOrders = [];
let allPromos = [];
let allReviews = [];

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

/* ── Booking + client stats ── */
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

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-total').classList.remove('stat-loading');
  document.getElementById('stat-total-change').textContent = `${total} appointments in total`;

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

  document.getElementById('stat-clients').textContent = clientCount;
  document.getElementById('stat-clients').classList.remove('stat-loading');
  document.getElementById('stat-clients-change').textContent = `${clientCount} registered client${clientCount !== 1 ? 's' : ''}`;

  document.getElementById('stat-today').textContent = todayCount;
  document.getElementById('stat-today').classList.remove('stat-loading');
  const diff = todayCount - yestCount;
  const todayEl = document.getElementById('stat-today-change');
  todayEl.textContent = (diff >= 0 ? '↑ ' : '↓ ') + Math.abs(diff) + ' from yesterday';
  todayEl.className = 'stat-change' + (diff < 0 ? ' down' : '');

  // ── Order stats ──
  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
  const revenue = allOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);

  const ordersThisMonth = allOrders.filter(o => (o.created_at || '').startsWith(thisMonth)).length;
  const ordersLastMonth = allOrders.filter(o => (o.created_at || '').startsWith(lastMonth)).length;
  const revenueThisMonth = allOrders
    .filter(o => o.status !== 'cancelled' && (o.created_at || '').startsWith(thisMonth))
    .reduce((sum, o) => sum + Number(o.total), 0);

  const totalPromosUsed = allPromos.reduce((sum, p) => sum + (p.usedCount || 0), 0);
  const activePromos = allPromos.filter(p => p.isActive && (p.usedCount || 0) > 0).length;

  document.getElementById('stat-orders').textContent = totalOrders;
  document.getElementById('stat-orders').classList.remove('stat-loading');
  const ordDiff = ordersThisMonth - ordersLastMonth;
  document.getElementById('stat-orders-change').textContent =
    (ordDiff >= 0 ? '↑ ' : '↓ ') + Math.abs(ordDiff) + ' vs last month';

  document.getElementById('stat-revenue').textContent = `€${revenue.toFixed(2)}`;
  document.getElementById('stat-revenue').classList.remove('stat-loading');
  document.getElementById('stat-revenue-change').textContent = `€${revenueThisMonth.toFixed(2)} this month`;

  document.getElementById('stat-pending').textContent = pendingOrders;
  document.getElementById('stat-pending').classList.remove('stat-loading');
  document.getElementById('stat-pending-change').textContent =
    pendingOrders === 0 ? 'All orders fulfilled' : `${pendingOrders} awaiting action`;

  document.getElementById('stat-promos').textContent = totalPromosUsed;
  document.getElementById('stat-promos').classList.remove('stat-loading');
  document.getElementById('stat-promos-change').textContent =
    `${activePromos} code${activePromos !== 1 ? 's' : ''} in use`;
}

/* ── Recent Bookings table ── */
function renderRecent() {
  const tbody = document.getElementById('recent-tbody');
  const recent = [...allBookings]
    .sort((a, b) => (b.start_time || '').localeCompare(a.start_time || ''))
    .slice(0, 8);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(b => {
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

/* ── Recent Orders ── */
function renderRecentOrders() {
  const tbody = document.getElementById('recent-orders-tbody');
  const recent = [...allOrders]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 6);

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px;">No orders yet.</td></tr>';
    return;
  }

  const statusStyle = {
    pending: 'background:#fff8e8;color:#c9a84c;',
    completed: 'background:#edfaf1;color:#27ae60;',
    cancelled: 'background:#fdecea;color:#e74c3c;',
  };

  tbody.innerHTML = recent.map(o => {
    const customer = o.users
      ? escHtml(o.users.first_name + ' ' + (o.users.last_name || ''))
      : `#${o.user_id}`;
    const style = statusStyle[o.status] || 'background:#f0f0f0;color:#888;';
    return `
      <tr>
        <td style="font-weight:600;">#${o.id}</td>
        <td>${customer}</td>
        <td style="font-weight:600;">€${Number(o.total).toFixed(2)}</td>
        <td><span style="display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;${style}">${escHtml(o.status)}</span></td>
      </tr>`;
  }).join('');
}

/* ── Top Products ── */
function renderTopProducts() {
  const container = document.getElementById('top-products-list');
  const counts = {};
  allOrders
    .filter(o => o.status !== 'cancelled')
    .forEach(o => {
      (o.order_items || []).forEach(item => {
        const name = item.products?.name || `Product #${item.product_id}`;
        counts[name] = (counts[name] || 0) + item.quantity;
      });
    });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (!sorted.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;">No sales data yet.</div>';
    return;
  }

  const max = sorted[0][1];
  container.innerHTML = sorted.map(([name, qty], i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:12px;font-weight:700;color:var(--text-muted);width:18px;">${i + 1}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(name)}</div>
        <div style="height:4px;background:var(--border);border-radius:2px;margin-top:4px;">
          <div style="height:4px;background:var(--gold);border-radius:2px;width:${Math.round((qty / max) * 100)}%;"></div>
        </div>
      </div>
      <span style="font-size:13px;font-weight:600;color:var(--gold);flex-shrink:0;">${qty} sold</span>
    </div>
  `).join('');
}

/* ── Promo Usage ── */
function renderPromoUsage() {
  const tbody = document.getElementById('promo-usage-tbody');
  const used = allPromos
    .filter(p => (p.usedCount || 0) > 0)
    .sort((a, b) => b.usedCount - a.usedCount);

  if (!used.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px;">No promo codes used yet.</td></tr>';
    return;
  }

  tbody.innerHTML = used.map(p => `
    <tr>
      <td style="font-weight:600;letter-spacing:0.5px;">${escHtml(p.code)}</td>
      <td style="font-size:12px;color:var(--text-muted);">
        ${p.discountType === 'percent' ? `${p.discountValue}%` : `€${p.discountValue}`}
      </td>
      <td style="font-weight:600;color:var(--gold);">${p.usedCount}</td>
      <td style="color:var(--text-muted);">${p.maxUses ?? '∞'}</td>
    </tr>
  `).join('');
}

/* ── Pending Reviews ── */
function renderPendingReviews() {
  const container = document.getElementById('pending-reviews-list');
  const pending = allReviews.filter(r => r.status === 'pending').slice(0, 5);

  if (!pending.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;">No pending reviews. ✓</div>';
    return;
  }

  container.innerHTML = pending.map(r => {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const name = r.user
      ? escHtml(r.user.first_name + ' ' + (r.user.last_name?.[0] || '') + '.')
      : 'Anonymous';
    const subject = r.product?.name || r.service?.name || '';
    return `
      <div style="padding:12px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:13px;font-weight:500;">${name}</div>
          ${subject ? `<div style="font-size:11px;color:var(--text-muted);">${escHtml(subject)}</div>` : ''}
          <div style="font-size:12px;color:#999;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${escHtml(r.comment)}"</div>
        </div>
        <div style="flex-shrink:0;color:var(--gold);font-size:13px;">${stars}</div>
      </div>`;
  }).join('');
}

/* ── Delete booking ── */
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
    const [bRes, uRes, rRes, sRes, oRes, pRes, rvRes] = await Promise.all([
      fetch(`${ADMIN_API}/booking`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${ADMIN_API}/user`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/resources`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/services`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/orders`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/promo`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${ADMIN_API}/admin/reviews`, { credentials: 'include', cache: 'no-store' }),
    ]);

    const bData = await bRes.json();
    const uData = await uRes.json();
    const rData = await rRes.json();
    const sData = await sRes.json();
    const oData = oRes.ok ? await oRes.json() : [];
    const pData = pRes.ok ? await pRes.json() : [];
    const rvData = rvRes.ok ? await rvRes.json() : [];

    allBookings = bData.bookings || (Array.isArray(bData) ? bData : []);
    allUsers = uData.users || (Array.isArray(uData) ? uData : []);
    allResources = rData.resources || (Array.isArray(rData) ? rData : []);
    allSalonServices = sData.services || (Array.isArray(sData) ? sData : []);
    allOrders = Array.isArray(oData) ? oData : [];
    allPromos = Array.isArray(pData) ? pData : [];
    allReviews = Array.isArray(rvData) ? rvData : (rvData.reviews || []);

    allBookings = allBookings.map(b => ({
      ...b,
      start_time: b.start_time || b.booking_date || (b.date && b.start ? `${b.date}T${b.start}` : '')
    }));

    renderStats();
    renderRecent();
    renderRecentOrders();
    renderTopProducts();
    renderPromoUsage();
    renderPendingReviews();
  } catch (e) {
    console.error('Dashboard load error:', e);
    document.getElementById('recent-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load data.</td></tr>';
  }
}

loadDashboard();
