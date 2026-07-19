const API = '';
const ADMIN_API = '';
let allCustomers = [];
let editingCustomerId = null;

/* ── Dynamic date ── */
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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

/* ════════════════════════════════════
   Helpers
════════════════════════════════════ */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function initials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
}

/* ════════════════════════════════════
   Load customers from API
════════════════════════════════════ */
async function loadCustomers() {
  try {
    const res = await fetch(API + '/user', {
      method: 'GET',
      credentials: 'include'
    });

    const data = await res.json();
    allCustomers = data || [];
    renderTable(allCustomers);
  } catch (e) {
    console.error('Failed to load customers:', e);
    document.getElementById('customers-tbody').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load customers.</td></tr>';
  }
}

/* ════════════════════════════════════
   Render table
════════════════════════════════════ */
function renderTable(customers) {
  const tbody = document.getElementById('customers-tbody');
  document.getElementById('customers-count').textContent = customers.length + ' client' + (customers.length !== 1 ? 's' : '') + ' total';

  if (!customers.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No customers found.</td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(u => `
      <tr>
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${escHtml(initials(u.first_name, u.last_name))}</div>
            <span class="td-name">${escHtml(u.first_name)} ${escHtml(u.last_name)}</span>
          </div>
        </td>
        <td style="color:var(--text-muted);">${escHtml(u.address || '—')}</td>
        <td style="color:var(--text-muted);">${escHtml(u.phone || '—')}</td>
        <td><strong>#${u.id}</strong></td>
        <td>
          <div class="action-menu-wrap">
            <button class="action-menu-btn" onclick="toggleMenu(this)">⋯</button>
            <div class="action-dropdown">
              <button class="action-dropdown-item" onclick="openEditCustomerModal(${u.id})"><span class="adi-icon">✎</span> Edit Customer</button>
              <div class="action-dropdown-divider"></div>
              <button class="action-dropdown-item danger" onclick="deleteCustomer(${u.id})"><span class="adi-icon">✕</span> Delete</button>
            </div>
          </div>
        </td>
      </tr>
    `).join('');
}

/* ════════════════════════════════════
   Search / filter (client-side)
════════════════════════════════════ */
document.querySelector('.search-box input').addEventListener('input', applyFilters);
document.querySelectorAll('.filter-select').forEach(s => s.addEventListener('change', applyFilters));

function applyFilters() {
  const query = document.querySelector('.search-box input').value.toLowerCase();
  const sort = document.querySelectorAll('.filter-select')[1]?.value || '';

  let filtered = allCustomers.filter(u => {
    const name = ((u.first_name || '') + ' ' + (u.last_name || '')).toLowerCase();
    return !query || name.includes(query) || (u.phone || '').includes(query) || (u.email || '').toLowerCase().includes(query);
  });

  if (sort.includes('Name')) {
    filtered = [...filtered].sort((a, b) =>
      ((a.first_name || '') + ' ' + (a.last_name || '')).localeCompare((b.first_name || '') + ' ' + (b.last_name || ''))
    );
  }

  renderTable(filtered);
}

/* ════════════════════════════════════
   Open Edit modal
════════════════════════════════════ */
function openEditCustomerModal(id) {
  const u = allCustomers.find(x => x.id === id);
  if (!u) return;
  editingCustomerId = id;

  document.getElementById('cm-title').textContent = `Edit — ${u.first_name} ${u.last_name}`;
  document.getElementById('cm-sub').textContent = `Customer #${u.id}`;
  document.getElementById('cm-d-id').textContent = u.id;
  document.getElementById('cm-d-name').textContent = `${u.first_name} ${u.last_name}`;
  document.getElementById('cm-d-phone').textContent = u.phone || '—';
  document.getElementById('cm-d-email').textContent = u.address || '—';

  document.getElementById('cm-first-name').value = u.first_name || '';
  document.getElementById('cm-last-name').value = u.last_name || '';
  document.getElementById('cm-phone').value = u.phone || '';
  document.getElementById('cm-email').value = u.address || '';
  document.getElementById('cm-role').value = u.role || 'user';

  closeMenu();
  openModal('modal-customer');
}

/* ════════════════════════════════════
   Save customer changes
════════════════════════════════════ */
async function saveCustomerChanges() {
  if (!editingCustomerId) return;
  const payload = {
    first_name: document.getElementById('cm-first-name').value.trim(),
    last_name: document.getElementById('cm-last-name').value.trim(),
    phone: document.getElementById('cm-phone').value.trim(),
    address: document.getElementById('cm-email').value.trim(),
  };
  try {
    const res = await fetch(`${ADMIN_API}/user/${editingCustomerId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { const e = await res.json(); alert('Error: ' + (e.message || res.status)); return; }
    closeModal('modal-customer');
    editingCustomerId = null;
    await loadCustomers();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   Delete customer
════════════════════════════════════ */
async function deleteCustomer(id) {
  const u = allCustomers.find(x => x.id === id);
  if (!u) return;
  if (!confirm(`Delete customer "${u.first_name} ${u.last_name}" (ID #${u.id})? This cannot be undone.`)) return;
  closeMenu();
  try {
    const res = await fetch(`${ADMIN_API}/user/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) { const e = await res.json(); alert('Error: ' + (e.message || res.status)); return; }
    await loadCustomers();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   Dropdown menus
════════════════════════════════════ */
function toggleMenu(btn) {
  const drop = btn.nextElementSibling;
  const isOpen = drop.classList.contains('open');
  closeMenu();
  if (!isOpen) drop.classList.add('open');
}
function closeMenu() {
  document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
}
document.addEventListener('click', e => {
  if (!e.target.closest('.action-menu-wrap')) closeMenu();
});

/* ════════════════════════════════════
   Modals
════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
  closeMenu();
}
function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

/* Escape closes modals */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
    closeMenu();
  }
});

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

/* ── Boot ── */
checkAdminAccess().then(user => { if (user) loadCustomers(); });
