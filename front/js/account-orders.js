const API = '';

document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
});

async function checkSession() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = 'account.html'; return; }
    const user = await res.json();
    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('profile-section').style.display = 'flex';
    if (user.role === 'admin' || user.role === 'master') {
      document.getElementById('admin-link').style.display = 'block';
    }
    await loadOrders();
  } catch (e) {
    window.location.href = 'account.html';
  }
}

async function loadOrders() {
  const container = document.getElementById('orders-container');
  try {
    const res = await fetch(API + '/orders', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error();
    const orders = await res.json();
    renderOrders(orders);
  } catch (e) {
    container.innerHTML = '<div style="color:#c0392b;text-align:center;padding:40px;">Could not load orders.</div>';
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  if (!orders.length) {
    container.innerHTML = `
        <div class="empty-orders">
          <div style="font-size:40px;margin-bottom:16px;">🛍️</div>
          <div>You haven't placed any orders yet.</div>
          <div style="margin-top:10px;"><a href="shop.html">Browse the shop</a></div>
        </div>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    const date = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const statusClass = {
      pending: 'status-pending',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
    }[order.status] || 'status-default';

    const itemsHtml = (order.order_items || []).map(item => {
      const paid = Number(item.price_at_purchase);
      const orig = Number(item.products?.price || paid);
      const wasDisc = paid < orig - 0.001; // allow for floating point

      const priceHtml = wasDisc
        ? `<div class="order-item-price">
             <span style="text-decoration:line-through;color:#aaa;font-size:12px;">€${(orig * item.quantity).toFixed(2)}</span>
             <span style="color:#c0392b;font-weight:700;margin-left:4px;">€${(paid * item.quantity).toFixed(2)}</span>
           </div>`
        : `<div class="order-item-price">€${(paid * item.quantity).toFixed(2)}</div>`;

      return `
        <div class="order-item">
          <img class="order-item-img"
            src="${item.products?.path ? `/front_admin/uploads/products/${esc(item.products.path)}` : 'assets/logo/logo.png'}"
            alt="${esc(item.products?.name || '')}">
          <div class="order-item-info">
            <div class="order-item-name">${esc(item.products?.name || 'Product')}</div>
            <div class="order-item-qty">
              Qty: ${item.quantity} × €${paid.toFixed(2)}
              ${wasDisc ? `<span style="font-size:10px;background:#fff3cd;color:#856404;padding:1px 5px;border-radius:8px;margin-left:4px;">Sale</span>` : ''}
            </div>
          </div>
          ${priceHtml}
        </div>
      `;
    }).join('');

    return `
        <div class="order-card">
          <div class="order-header">
            <div>
              <div class="order-id">Order #${order.id}</div>
              <div class="order-date">${date}</div>
            </div>
            <span class="order-status ${statusClass}">${esc(order.status)}</span>
          </div>
          <div class="order-items">${itemsHtml}</div>
          <div class="order-footer">
            <span class="order-total-label">${order.order_items?.length || 0} item${order.order_items?.length !== 1 ? 's' : ''}</span>
            <span class="order-total-value">€${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      `;
  }).join('');
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function doLogout(event) {
  if (event) event.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = 'account.html';
}
