const API = '';

let allPromocodes = [];
let editingPromoId = null;

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.addEventListener('DOMContentLoaded', async () => {
  const isAuthorized = await checkAdmin();
  if (isAuthorized) {
    const searchInput = document.getElementById('promo-search');
    if (searchInput) searchInput.addEventListener('input', applyPromoFilters);
    await loadPromocodes();
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escHtml(str) { return escapeHtml(str); }

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

function handleOverlayClick(event, id) {
  if (event.target && event.target.id === id) closeModal(id);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  if (id === 'modal-promo') editingPromoId = null;
}

function openPromoModal() {
  editingPromoId = null;
  document.querySelector('#modal-promo .modal-title').textContent = 'Create Promo Code';
  document.querySelector('#modal-promo .modal-subtitle').textContent = 'Generate a discount code for clients';
  document.querySelector('#modal-promo .btn-gold').textContent = 'Create Code';
  document.getElementById('promo-code-input').value = '';
  document.getElementById('promo-type').value = 'percentage';
  document.getElementById('promo-value').value = '';
  document.getElementById('promo-max-uses').value = '';
  document.getElementById('promo-expires').value = '';
  document.getElementById('promo-single-use').checked = false;
  const activeEl = document.getElementById('promo-active');
  if (activeEl) activeEl.checked = true;
  openModal('modal-promo');
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('promo-code-input').value = code;
}

async function loadPromocodes() {
  try {
    const res = await fetch(API + '/promo', { method: 'GET', credentials: 'include' });
    const data = await res.json();
    allPromocodes = data || [];
    applyPromoFilters();
  } catch (e) {
    console.error('Failed to load promocodes:', e);
    const tbody = document.getElementById('promocodes-tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load promocodes.</td></tr>';
    }
  }
}

function applyPromoFilters() {
  const query = (document.getElementById('promo-search')?.value || '').toLowerCase().trim();
  const filtered = !query
    ? allPromocodes
    : allPromocodes.filter(promo => {
        const code = String(promo.code || '').toLowerCase();
        const type = promo.discountType === 'percent' ? 'percentage' : 'fixed amount';
        const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
        const status = promo.isActive === false ? 'disabled' : (isExpired ? 'expired' : 'active');
        return code.includes(query) || type.includes(query) || status.includes(query);
      });

  renderPromoTable(filtered);
}

function renderPromoTable(promocodes) {
  const tbody = document.getElementById('promocodes-tbody');
  if (!tbody) return;

  if (!promocodes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No promo codes found.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = promocodes.map(promo => {
    const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
    const isDisabled = promo.isActive === false;

    const statusHtml = isDisabled
      ? '<span class="badge badge-pending">Disabled</span>'
      : (isExpired ? '<span class="badge badge-out">Expired</span>' : '<span class="badge badge-active">Active</span>');

    return `
      <tr>
        <td><span class="promo-code-pill">${escHtml(promo.code)}</span></td>
        <td>${promo.discountType === 'percent' ? `${promo.discountValue}%` : `€${promo.discountValue}`}</td>
        <td>${promo.discountType === 'percent' ? 'Percentage (%)' : 'Fixed Amount (€)'}</td>
        <td>${promo.usedCount || 0}${promo.maxUses ? ` / ${promo.maxUses}` : ''}</td>
        <td>${promo.singleUsePerUser ? '<span class="badge badge-active">Yes</span>' : '<span style="color:var(--text-muted);font-size:12px;">No</span>'}</td>
        <td>${promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('en-GB') : 'Never'}</td>
        <td>${statusHtml}</td>
        <td>
          <div class="action-menu-wrap">
            <button class="action-menu-btn" onclick="toggleMenu(this)">⋯</button>
            <div class="action-dropdown">
              <button class="action-dropdown-item" onclick="openEditPromoModal(${promo.id})"><span class="adi-icon">✎</span> Edit</button>
              <div class="action-dropdown-divider"></div>
              <button class="action-dropdown-item danger" onclick="deletePromo(${promo.id})"><span class="adi-icon">✕</span> Delete</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openEditPromoModal(id) {
  const promo = allPromocodes.find(p => p.id === id);
  if (!promo) return;

  editingPromoId = id;
  document.getElementById('promo-code-input').value = promo.code;
  document.getElementById('promo-value').value = promo.discountValue;
  document.getElementById('promo-max-uses').value = promo.maxUses ?? '';
  document.getElementById('promo-expires').value = promo.expiresAt ? promo.expiresAt.slice(0, 10) : '';
  document.getElementById('promo-type').value = promo.discountType === 'percent' ? 'percentage' : 'fixed';
  document.getElementById('promo-single-use').checked = promo.singleUsePerUser ?? false;
  const activeEl = document.getElementById('promo-active');
  if (activeEl) activeEl.checked = promo.isActive !== false;

  document.querySelector('#modal-promo .modal-title').textContent = 'Edit Promo Code';
  document.querySelector('#modal-promo .modal-subtitle').textContent = 'Update the promo code settings';
  document.querySelector('#modal-promo .btn-gold').textContent = 'Save Changes';
  openModal('modal-promo');
}

async function submitCreatePromo() {
  const code = document.getElementById('promo-code-input').value.trim();
  const type = document.getElementById('promo-type').value;
  const value = parseFloat(document.getElementById('promo-value').value);
  const maxUsesInput = document.getElementById('promo-max-uses').value;
  const expiresOn = document.getElementById('promo-expires').value;

  if (!code || isNaN(value)) {
    alert('Promo code and discount value are required.');
    return;
  }

  const payload = {
    code: code.toUpperCase(),
    discountType: type,
    discountValue: value,
    maxUses: maxUsesInput ? parseInt(maxUsesInput, 10) : null,
    expiresAt: expiresOn ? new Date(expiresOn).toISOString() : null,
    singleUsePerUser: document.getElementById('promo-single-use').checked,
    isActive: document.getElementById('promo-active')?.checked ?? true,
  };

  const res = await fetch(`${API}/promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Server error');
  }

  closeModal('modal-promo');
  await loadPromocodes();
}

async function updatePromo() {
  const payload = {
    code: document.getElementById('promo-code-input').value.trim().toUpperCase(),
    discountType: document.getElementById('promo-type').value,
    discountValue: Number(document.getElementById('promo-value').value),
    maxUses: document.getElementById('promo-max-uses').value ? Number(document.getElementById('promo-max-uses').value) : null,
    expiresAt: document.getElementById('promo-expires').value || null,
    singleUsePerUser: document.getElementById('promo-single-use').checked,
    isActive: document.getElementById('promo-active')?.checked ?? true,
  };

  const res = await fetch(`${API}/promo/${editingPromoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error('Failed to update promo');

  closeModal('modal-promo');
  editingPromoId = null;
  await loadPromocodes();
}

async function savePromo() {
  try {
    if (editingPromoId) {
      await updatePromo();
    } else {
      await submitCreatePromo();
    }
  } catch (e) {
    alert('Failed to save promo code: ' + e.message);
  }
}

async function deletePromo(id) {
  if (!confirm('Delete this promo code?')) return;

  try {
    const res = await fetch(`${API}/promo/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error('Failed to delete promo');
    await loadPromocodes();
  } catch (err) {
    console.error(err);
    alert('Failed to delete promo code');
  }
}

function toggleMenu(button) {
  const dropdown = button.nextElementSibling;
  const isOpen = dropdown.classList.contains('open');
  closeMenu();
  if (!isOpen) dropdown.classList.add('open');
}

function closeMenu() {
  document.querySelectorAll('.action-dropdown.open').forEach(item => item.classList.remove('open'));
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.action-menu-wrap')) closeMenu();
});