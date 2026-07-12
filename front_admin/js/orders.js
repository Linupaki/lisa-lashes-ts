const API = '';
let allOrders = [];
let viewingOrderId = null;

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthorized = await checkAdmin();
  if (isAuthorized) {
    await loadOrders();
    setupFilters();
  }
});

// ── AUTH ──────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function checkAdmin() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = '/login.html'; return false; }
    const user = await res.json();
    if (!(user.role === 'admin' || user.role === 'master')) { window.location.href = '/account.html'; return false; }
    document.getElementById('admin-name').textContent = user.first_name + ' ' + (user.last_name || '');
    document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
    return true;
  } catch (e) {
    window.location.href = '/login.html';
    return false;
  }
}

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

// ── LOAD & RENDER ─────────────────────────────────────────────────────────────

async function loadOrders() {
  try {
    const res = await fetch(`${API}/orders/all`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    allOrders = Array.isArray(data) ? data : [];
    renderStats(allOrders);
    renderTable(allOrders);
  } catch (e) {
    console.error('Failed to load orders:', e);
    document.getElementById('orders-tbody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:red;padding:32px;">Failed to load orders.</td></tr>';
  }
}

function renderStats(orders) {
  const total = orders.length;
  const revenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);
  document.getElementById('orders-stats').textContent =
    `${total} order${total !== 1 ? 's' : ''} · €${revenue.toFixed(2)} revenue`;
}

function renderTable(orders) {
  const tbody = document.getElementById('orders-tbody');

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No orders found.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const customer = order.users
      ? `${escapeHtml(order.users.first_name)} ${escapeHtml(order.users.last_name || '')}`
      : `#${order.user_id}`;

    const itemCount = (order.order_items || []).length;

    const date = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    const statusStyle = {
      pending: 'background:#fff8e8;color:#c9a84c;',
      completed: 'background:#edfaf1;color:#27ae60;',
      cancelled: 'background:#fdecea;color:#e74c3c;',
    }[order.status] || 'background:#f0f0f0;color:#888;';

    return `
      <tr>
        <td style="font-weight:600;color:var(--text-primary);">#${order.id}</td>
        <td>
          <div style="font-weight:500;">${customer}</div>
          <div style="font-size:11px;color:var(--text-muted);">${escapeHtml(order.users?.phone || '')}</div>
        </td>
        <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
        <td style="font-weight:600;">€${Number(order.total).toFixed(2)}</td>
        <td style="color:var(--text-muted);font-size:13px;">${date}</td>
        <td>
          <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;${statusStyle}">
            ${escapeHtml(order.status)}
          </span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openOrderModal(${order.id})">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── FILTERS ───────────────────────────────────────────────────────────────────

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');

  const apply = () => {
    const query = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;

    let results = allOrders;

    if (query) {
      results = results.filter(o => {
        const name = ((o.users?.first_name || '') + ' ' + (o.users?.last_name || '')).toLowerCase();
        const phone = (o.users?.phone || '').toLowerCase();
        const id = String(o.id);
        return name.includes(query) || phone.includes(query) || id.includes(query);
      });
    }

    if (status !== 'all') {
      results = results.filter(o => o.status === status);
    }

    renderStats(results);
    renderTable(results);
  };

  searchInput.addEventListener('input', apply);
  statusFilter.addEventListener('change', apply);
}

// ── ORDER MODAL ───────────────────────────────────────────────────────────────

function openOrderModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  viewingOrderId = orderId;

  const customer = order.users
    ? `${escapeHtml(order.users.first_name)} ${escapeHtml(order.users.last_name || '')}`
    : `User #${order.user_id}`;

  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  document.getElementById('modal-order-title').textContent = `Order #${order.id}`;
  document.getElementById('modal-order-subtitle').textContent = `Placed on ${date}`;

  document.getElementById('modal-customer-info').innerHTML = `
    <div><strong>${customer}</strong></div>
    ${order.users?.phone ? `<div>📞 ${escapeHtml(order.users.phone)}</div>` : ''}
  `;

  document.getElementById('modal-items-list').innerHTML = (order.order_items || []).map(item => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
      <img src="../front_admin/uploads/products/${escapeHtml(item.products?.path || '')}"
        style="width:44px;height:44px;object-fit:cover;border-radius:6px;background:#f0f0f0;flex-shrink:0;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;">${escapeHtml(item.products?.name || 'Product')}</div>
        <div style="font-size:12px;color:var(--text-muted);">
          ${item.quantity} × €${Number(item.price_at_purchase).toFixed(2)}
        </div>
      </div>
      <div style="font-size:13px;font-weight:600;">
        €${(Number(item.price_at_purchase) * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  document.getElementById('modal-total').textContent = `€${Number(order.total).toFixed(2)}`;

  openModal('modal-order');

  const receiptLink = document.getElementById('modal-receipt-link');
  if (receiptLink) receiptLink.href = `${API}/admin/orders/${orderId}/receipt`;
}

async function updateOrderStatus(newStatus) {
  if (!viewingOrderId) return;

  try {
    const res = await fetch(`${API}/orders/${viewingOrderId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Could not update order status.');
      return;
    }

    // Update local data
    const idx = allOrders.findIndex(o => o.id === viewingOrderId);
    if (idx !== -1) allOrders[idx].status = newStatus;

    closeModal('modal-order');
    renderStats(allOrders);
    renderTable(allOrders);

  } catch (e) {
    alert('Network error. Please try again.');
  }
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function handleOverlayClick(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});
