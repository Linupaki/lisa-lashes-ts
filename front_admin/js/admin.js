const API = '';
let allBookings = [];
let allUsers = [];
let allResources = [];
let allSalonServices = [];
let allOrders = [];
let allPromos = [];
let allReviews = [];
let allCourses = [];
let allCourseBookings = [];

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

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl = document.getElementById('greeting-text');
    if (greetEl) greetEl.textContent = `${greeting}, ${user.first_name}!`;

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

  // Revenue from orders (non-cancelled)
  const ordersRevenue = allOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);

  // Revenue from salon service bookings (completed/confirmed)
  const bookingsRevenue = allBookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => {
      const svc = allSalonServices.find(s => s.id === b.service_id);
      return sum + (svc ? Number(svc.price) : 0);
    }, 0);

  // Revenue from course bookings (non-cancelled)
  const courseRevenue = allCourseBookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => {
      const course = allCourses.find(c => c.id === b.course_id);
      return sum + (course ? Number(course.price) : 0);
    }, 0);

  const revenue = ordersRevenue + bookingsRevenue + courseRevenue;

  const ordersThisMonth = allOrders.filter(o => (o.created_at || '').startsWith(thisMonth)).length;
  const ordersLastMonth = allOrders.filter(o => (o.created_at || '').startsWith(lastMonth)).length;

  const ordersRevenueThisMonth = allOrders
    .filter(o => o.status !== 'cancelled' && (o.created_at || '').startsWith(thisMonth))
    .reduce((sum, o) => sum + Number(o.total), 0);

  const bookingsRevenueThisMonth = allBookings
    .filter(b => (b.status === 'completed' || b.status === 'confirmed') && extractDate(b.start_time).startsWith(thisMonth))
    .reduce((sum, b) => {
      const svc = allSalonServices.find(s => s.id === b.service_id);
      return sum + (svc ? Number(svc.price) : 0);
    }, 0);

  const courseRevenueThisMonth = allCourseBookings
    .filter(b => b.status !== 'cancelled' && (b.created_at || '').startsWith(thisMonth))
    .reduce((sum, b) => {
      const course = allCourses.find(c => c.id === b.course_id);
      return sum + (course ? Number(course.price) : 0);
    }, 0);

  const revenueThisMonth = ordersRevenueThisMonth + bookingsRevenueThisMonth + courseRevenueThisMonth;

  const totalPromosUsed = allPromos.reduce((sum, p) => sum + (p.usedCount || 0), 0);
  const activePromos = allPromos.filter(p => p.isActive && (p.usedCount || 0) > 0).length;

  document.getElementById('stat-orders').textContent = totalOrders;
  document.getElementById('stat-orders').classList.remove('stat-loading');
  const ordDiff = ordersThisMonth - ordersLastMonth;
  document.getElementById('stat-orders-change').textContent =
    (ordDiff >= 0 ? '↑ ' : '↓ ') + Math.abs(ordDiff) + ' vs last month';

  document.getElementById('stat-revenue').textContent = `€${revenue.toFixed(2)}`;
  document.getElementById('stat-revenue').classList.remove('stat-loading');
  document.getElementById('stat-revenue-change').textContent =
    `€${revenueThisMonth.toFixed(2)} this month · orders + bookings + courses`;

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

  const pillClass = { pending: 'pill-pending', completed: 'pill-completed', cancelled: 'pill-cancelled' };

  tbody.innerHTML = recent.map(o => {
    const customer = o.users
      ? escHtml(o.users.first_name + ' ' + (o.users.last_name || ''))
      : `#${o.user_id}`;
    const cls = pillClass[o.status] || 'pill-pending';
    return `
      <tr>
        <td style="font-weight:600;">#${o.id}</td>
        <td>${customer}</td>
        <td style="font-weight:600;">€${Number(o.total).toFixed(2)}</td>
        <td><span class="order-pill ${cls}">${escHtml(o.status)}</span></td>
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
    <div class="bar-item">
      <span class="bar-rank">${i + 1}</span>
      <div class="bar-info">
        <div class="bar-name">${escHtml(name)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((qty / max) * 100)}%;"></div>
        </div>
      </div>
      <span class="bar-count">${qty} sold</span>
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
      <div class="review-item-dash">
        <div style="min-width:0;flex:1;">
          <div style="font-size:13px;font-weight:500;">${name}</div>
          ${subject ? `<div style="font-size:11px;color:var(--text-muted);">${escHtml(subject)}</div>` : ''}
          <div style="font-size:12px;color:#999;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${escHtml(r.comment)}"</div>
        </div>
        <div class="review-stars-dash">${stars}</div>
      </div>`;
  }).join('');
}

/* ── Rating Distribution Chart ── */
let ratingsChartInstance = null;

function renderRatingChart() {
  const approved = allReviews.filter(r => r.status === 'approved');
  const total = approved.length;
  const counts = [1, 2, 3, 4, 5].map(star =>
    approved.filter(r => r.rating === star).length
  );
  const avg = total
    ? (approved.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
    : null;

  const badge = document.getElementById('rating-avg-badge');
  if (badge && avg) {
    badge.textContent = `★ ${avg} avg · ${total} review${total !== 1 ? 's' : ''}`;
    badge.style.display = 'inline';
  }

  const breakdown = document.getElementById('rating-breakdown');
  if (breakdown) {
    if (!total) {
      breakdown.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;">No approved reviews yet.</div>';
    } else {
      const maxCount = Math.max(...counts);
      breakdown.innerHTML = [5, 4, 3, 2, 1].map(star => {
        const count = counts[star - 1];
        const pct = maxCount ? Math.round((count / maxCount) * 100) : 0;
        const share = total ? Math.round((count / total) * 100) : 0;
        return `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="font-size:13px;font-weight:600;color:var(--text-muted);width:20px;text-align:right;">${star}★</span>
            <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
              <div style="height:8px;width:${pct}%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:4px;transition:width 0.6s ease;"></div>
            </div>
            <span style="font-size:12px;color:var(--text-muted);width:36px;text-align:right;">${share}%</span>
            <span style="font-size:12px;font-weight:600;width:24px;text-align:right;">${count}</span>
          </div>`;
      }).join('');
    }
  }

  const canvas = document.getElementById('ratings-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (ratingsChartInstance) { ratingsChartInstance.destroy(); ratingsChartInstance = null; }

  ratingsChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
      datasets: [{
        label: 'Reviews',
        data: counts,
        backgroundColor: [
          'rgba(198,168,107,0.20)',
          'rgba(198,168,107,0.38)',
          'rgba(198,168,107,0.55)',
          'rgba(198,168,107,0.75)',
          'rgba(198,168,107,1.00)',
        ],
        borderColor: 'rgba(168,136,63,0.3)',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} review${ctx.parsed.y !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#7a7269', font: { size: 12 } },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#7a7269', font: { size: 11 }, stepSize: 1, precision: 0 },
          grid: { color: 'rgba(226,220,212,0.6)' },
        },
      },
    },
  });
}

/* ── Course Stats ── */
function renderCourseStats() {
  const container = document.getElementById('course-stats');
  if (!container) return;

  if (!allCourses.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px;">No courses yet.</div>';
    return;
  }

  const now = new Date();

  // Build per-course booking count
  const bookingsByCourse = {};
  allCourseBookings.forEach(b => {
    if (b.status === 'cancelled') return;
    bookingsByCourse[b.course_id] = (bookingsByCourse[b.course_id] || 0) + 1;
  });

  const totalRevenue = allCourses.reduce((sum, c) => {
    const booked = bookingsByCourse[c.id] || 0;
    return sum + Number(c.price) * booked;
  }, 0);

  const totalBooked = Object.values(bookingsByCourse).reduce((s, n) => s + n, 0);
  const upcoming = allCourses.filter(c => c.date && new Date(c.date) > now && c.is_active);

  // Summary row
  const summaryHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:22px;font-weight:700;font-family:'Playfair Display',serif;color:var(--gold);">${allCourses.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Total Courses</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:22px;font-weight:700;font-family:'Playfair Display',serif;color:var(--gold);">${totalBooked}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Total Bookings</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
        <div style="font-size:22px;font-weight:700;font-family:'Playfair Display',serif;color:var(--gold);">€${totalRevenue.toFixed(0)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Course Revenue</div>
      </div>
    </div>`;

  // Per-course breakdown
  const coursesHtml = allCourses.map(c => {
    const booked = bookingsByCourse[c.id] || 0;
    const spots = c.spots ?? '∞';
    const pct = c.spots ? Math.round((booked / c.spots) * 100) : 0;
    const isPast = c.date && new Date(c.date) < now;
    const dateStr = c.date
      ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const statusColor = isPast ? '#aaa' : booked >= c.spots ? '#e74c3c' : '#27ae60';
    const statusText = isPast ? 'Past' : booked >= c.spots ? 'Full' : 'Open';

    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:13px;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(c.title)}</div>
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${statusColor}22;color:${statusColor};margin-left:8px;flex-shrink:0;">${statusText}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
            <div style="height:5px;width:${pct}%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:3px;"></div>
          </div>
          <span style="font-size:11px;color:var(--text-muted);flex-shrink:0;">${booked}/${spots} · ${dateStr}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = summaryHtml + coursesHtml;
}

/* ── Export Revenue CSV ── */
function exportRevenueCSV() {
  const rows = [['Date', 'Type', 'Reference', 'Description', 'Amount (€)', 'Status']];

  // Orders
  allOrders.forEach(o => {
    const customer = o.users
      ? `${o.users.first_name || ''} ${o.users.last_name || ''}`.trim()
      : `User #${o.user_id}`;
    rows.push([
      (o.created_at || '').split('T')[0],
      'Order',
      `#${o.id}`,
      customer,
      Number(o.total).toFixed(2),
      o.status,
    ]);
  });

  // Salon bookings
  allBookings.forEach(b => {
    const svc = allSalonServices.find(s => s.id === b.service_id);
    if (!svc) return;
    rows.push([
      extractDate(b.start_time),
      'Booking',
      `#${b.id}`,
      `${b.customer_name || 'Customer'} — ${svc.name}`,
      Number(svc.price).toFixed(2),
      b.status,
    ]);
  });

  // Course bookings
  allCourseBookings.forEach(b => {
    const course = allCourses.find(c => c.id === b.course_id);
    if (!course) return;
    const user = b.user
      ? `${b.user.first_name || ''} ${b.user.last_name || ''}`.trim()
      : `User #${b.user_id}`;
    rows.push([
      (b.created_at || '').split('T')[0],
      'Course',
      `#${b.id}`,
      `${user} — ${course.title}`,
      Number(course.price).toFixed(2),
      b.status,
    ]);
  });

  // Sort by date descending
  const header = rows[0];
  const data = rows.slice(1).sort((a, b) => b[0].localeCompare(a[0]));

  const csv = [header, ...data]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revenue-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Delete booking ── */
async function deleteBooking(id, name) {
  if (!confirm(`Delete booking for "${name || 'this customer'}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/booking/${id}`, { method: 'DELETE', credentials: 'include' });
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
    const [bRes, uRes, rRes, sRes, oRes, pRes, rvRes, cRes, cbRes] = await Promise.all([
      fetch(`${API}/booking`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/user`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/resources`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/services`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/orders/all`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/promo`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/admin/reviews`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/admin/courses`, { credentials: 'include', cache: 'no-store' }),
      fetch(`${API}/admin/course-bookings`, { credentials: 'include', cache: 'no-store' }),
    ]);

    const bData = await bRes.json();
    const uData = await uRes.json();
    const rData = await rRes.json();
    const sData = await sRes.json();
    const oData = oRes.ok ? await oRes.json() : [];
    const pData = pRes.ok ? await pRes.json() : [];
    const rvData = rvRes.ok ? await rvRes.json() : [];
    const cData = cRes.ok ? await cRes.json() : [];
    const cbData = cbRes.ok ? await cbRes.json() : [];

    allBookings = bData.bookings || (Array.isArray(bData) ? bData : []);
    allUsers = uData.users || (Array.isArray(uData) ? uData : []);
    allResources = rData.resources || (Array.isArray(rData) ? rData : []);
    allSalonServices = sData.services || (Array.isArray(sData) ? sData : []);
    allOrders = Array.isArray(oData) ? oData : [];
    allPromos = Array.isArray(pData) ? pData : [];
    allReviews = Array.isArray(rvData) ? rvData : (rvData.reviews || []);
    allCourses = Array.isArray(cData) ? cData : [];
    allCourseBookings = Array.isArray(cbData) ? cbData : [];

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
    renderRatingChart();
    renderCourseStats();
  } catch (e) {
    console.error('Dashboard load error:', e);
    document.getElementById('recent-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load data.</td></tr>';
  }
}

loadDashboard();
