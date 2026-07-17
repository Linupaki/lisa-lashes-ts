const API = '';
let editingAddressId = null;
let cachedAddresses = [];
let cachedCards = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      window.location.href = 'login-mobile.html';
      return;
    }

    const user = await res.json();

    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
      adminLink.style.display = (user.role === 'admin' || user.role === 'master') ? 'block' : 'none';
    }

    initDeleteAccount();

    // Static UI bindings (no inline handlers)
    document.querySelectorAll('[data-action="logout"]').forEach((a) => {
      a.addEventListener('click', (e) => doLogout(e));
    });

    const pdSave = document.getElementById('pd-save');
    if (pdSave) pdSave.addEventListener('click', saveProfile);

    const pmSave = document.getElementById('pm-save');
    if (pmSave) pmSave.addEventListener('click', savePaymentPref);

    const pwSave = document.getElementById('pw-save');
    if (pwSave) pwSave.addEventListener('click', changePassword);

    const addAddrBtn = document.getElementById('addr-add-btn');
    if (addAddrBtn) addAddrBtn.addEventListener('click', openAddressModal);

    const cancelAddrBtn = document.getElementById('addr-cancel-btn');
    if (cancelAddrBtn) cancelAddrBtn.addEventListener('click', closeAddressModal);

    const saveAddrBtn = document.getElementById('ad-save');
    if (saveAddrBtn) saveAddrBtn.addEventListener('click', saveAddress);

    const addrModal = document.getElementById('addr-modal');
    if (addrModal) {
      addrModal.addEventListener('click', (e) => {
        if (e.target === addrModal) closeAddressModal();
      });
    }

    // Delegated actions: cards
    const cardsList = document.getElementById('cards-list');
    if (cardsList) {
      cardsList.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = Number(btn.getAttribute('data-id'));
        if (action === 'remove-card' && id) removeCard(id);
      });
    }

    // Delegated actions: addresses
    const addrList = document.getElementById('addr-list');
    if (addrList) {
      addrList.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = Number(btn.getAttribute('data-id'));
        if (!id) return;

        if (action === 'set-default-address') setDefaultAddress(id);
        if (action === 'delete-address') removeAddress(id);
        if (action === 'edit-address') {
          const a = (cachedAddresses || []).find((x) => Number(x.id) === id);
          if (a) editAddress(a);
        }
      });
    }

    await Promise.all([
      loadProfile(),
      loadAddresses(),
      loadPaymentMethods(),
    ]);
  } catch (e) {
    window.location.href = 'login-mobile.html';
  }
});

// ── PROFILE ─────────────────────────────────────────────────────────────────

async function loadProfile() {
  try {
    const res = await fetch(API + '/account/profile', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return;
    const p = await res.json();

    document.getElementById('pd-first').value = p.first_name || '';
    document.getElementById('pd-last').value = p.last_name || '';
    document.getElementById('pd-phone').value = p.phone || '';
    document.getElementById('pd-email').value = p.address || '';
    document.getElementById('pm-pref').value = p.default_payment_method || '';
  } catch (e) {
  }
}

async function saveProfile() {
  const btn = document.getElementById('pd-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(API + '/account/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: document.getElementById('pd-first').value.trim(),
        last_name: document.getElementById('pd-last').value.trim(),
        phone: document.getElementById('pd-phone').value.trim(),
        address: document.getElementById('pd-email').value.trim(),
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) return showMsg('pd-msg', data.message || 'Could not save.', false);
    showMsg('pd-msg', 'Details saved.', true);
  } catch (e) {
    showMsg('pd-msg', 'Network error.', false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ── PAYMENT PREFERENCE ──────────────────────────────────────────────────────

async function savePaymentPref() {
  const btn = document.getElementById('pm-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(API + '/account/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_payment_method: document.getElementById('pm-pref').value,
      }),
    });

    const data = await safeJson(res);
    if (!res.ok) return showMsg('pm-msg', data.message || 'Could not save.', false);
    showMsg('pm-msg', 'Preference saved.', true);
  } catch (e) {
    showMsg('pm-msg', 'Network error.', false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Preference';
  }
}

async function loadPaymentMethods() {
  try {
    const res = await fetch(API + '/account/payment-methods', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return;

    const cards = await safeJson(res);
    cachedCards = Array.isArray(cards) ? cards : [];
    const list = document.getElementById('cards-list');

    if (!Array.isArray(cachedCards) || !cachedCards.length) {
      list.innerHTML = '<div class="empty">No saved cards.</div>';
      return;
    }

    list.innerHTML = cachedCards.map(c => `
      <div class="addr-card ${c.is_default ? 'is-default' : ''}">
        <div class="addr-body">
          <div class="addr-label">
            ${esc(c.brand || 'Card')} •••• ${esc(c.last4 || '____')}
            ${c.is_default ? '<span class="default-tag">DEFAULT</span>' : ''}
          </div>
          <div class="addr-lines">Expires ${c.exp_month || '--'}/${c.exp_year || '----'}</div>
        </div>
        <div class="addr-actions" style="grid-template-columns: 1fr;">
          <button class="btn-ghost danger" type="button" data-action="remove-card" data-id="${c.id}">Remove</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
  }
}

async function removeCard(id) {
  if (!confirm('Remove this card?')) return;
  try {
    const res = await fetch(`${API}/account/payment-methods/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadPaymentMethods();
  } catch (e) {
  }
}

// ── PASSWORD ────────────────────────────────────────────────────────────────

async function changePassword() {
  const current = document.getElementById('pw-current').value;
  const next = document.getElementById('pw-new').value;
  const confirmPw = document.getElementById('pw-confirm').value;

  if (!current || !next) return showMsg('pw-msg', 'Fill in all password fields.', false);
  if (next.length < 6) return showMsg('pw-msg', 'New password must be at least 6 characters.', false);
  if (next !== confirmPw) return showMsg('pw-msg', 'New passwords do not match.', false);

  const btn = document.getElementById('pw-save');
  btn.disabled = true;
  btn.textContent = 'Updating…';

  try {
    const res = await fetch(API + '/account/password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: next }),
    });

    const data = await safeJson(res);
    if (!res.ok) return showMsg('pw-msg', data.message || 'Could not update.', false);

    showMsg('pw-msg', 'Password updated.', true);
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } catch (e) {
    showMsg('pw-msg', 'Network error.', false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

// ── ADDRESSES ───────────────────────────────────────────────────────────────

async function loadAddresses() {
  const list = document.getElementById('addr-list');

  try {
    const res = await fetch(API + '/account/addresses', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      list.innerHTML = '<div class="empty">Could not load addresses.</div>';
      return;
    }

    const addrs = await safeJson(res);
    cachedAddresses = Array.isArray(addrs) ? addrs : [];

    if (!Array.isArray(cachedAddresses) || !cachedAddresses.length) {
      list.innerHTML = '<div class="empty">No saved addresses yet.</div>';
      return;
    }

    list.innerHTML = cachedAddresses.map(a => `
      <div class="addr-card ${a.is_default ? 'is-default' : ''}">
        <div class="addr-body">
          <div class="addr-label">
            ${esc(a.label || (a.first_name + ' ' + a.last_name))}
            ${a.is_default ? '<span class="default-tag">DEFAULT</span>' : ''}
          </div>
          <div class="addr-lines">
            ${esc(a.first_name)} ${esc(a.last_name)} · ${esc(a.phone)}<br>
            ${esc(a.address1)}${a.address2 ? ', ' + esc(a.address2) : ''}<br>
            ${esc(a.city)}${a.eircode ? ', ' + esc(a.eircode) : ''}
          </div>
        </div>
        <div class="addr-actions">
          ${a.is_default ? '' : `<button class="btn-ghost" type="button" data-action="set-default-address" data-id="${a.id}">Set default</button>`}
          <button class="btn-ghost" type="button" data-action="edit-address" data-id="${a.id}">Edit</button>
          <button class="btn-ghost danger" type="button" data-action="delete-address" data-id="${a.id}">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="empty">Could not load addresses.</div>';
  }
}

function openAddressModal() {
  editingAddressId = null;
  document.getElementById('addr-modal-title').textContent = 'Add Address';

  ['ad-label', 'ad-first', 'ad-last', 'ad-phone', 'ad-addr1', 'ad-addr2', 'ad-city', 'ad-eircode'].forEach(id => {
    document.getElementById(id).value = '';
  });

  document.getElementById('ad-default').checked = false;
  hideMsg('ad-msg');

  document.getElementById('addr-modal').classList.add('open');
}

function editAddress(a) {
  editingAddressId = a.id;
  document.getElementById('addr-modal-title').textContent = 'Edit Address';
  document.getElementById('ad-label').value = a.label || '';
  document.getElementById('ad-first').value = a.first_name || '';
  document.getElementById('ad-last').value = a.last_name || '';
  document.getElementById('ad-phone').value = a.phone || '';
  document.getElementById('ad-addr1').value = a.address1 || '';
  document.getElementById('ad-addr2').value = a.address2 || '';
  document.getElementById('ad-city').value = a.city || '';
  document.getElementById('ad-eircode').value = a.eircode || '';
  document.getElementById('ad-default').checked = !!a.is_default;
  hideMsg('ad-msg');

  document.getElementById('addr-modal').classList.add('open');
}

function closeAddressModal() {
  document.getElementById('addr-modal').classList.remove('open');
}

async function saveAddress() {
  const payload = {
    label: document.getElementById('ad-label').value.trim(),
    first_name: document.getElementById('ad-first').value.trim(),
    last_name: document.getElementById('ad-last').value.trim(),
    phone: document.getElementById('ad-phone').value.trim(),
    address1: document.getElementById('ad-addr1').value.trim(),
    address2: document.getElementById('ad-addr2').value.trim(),
    city: document.getElementById('ad-city').value.trim(),
    eircode: document.getElementById('ad-eircode').value.trim(),
    is_default: document.getElementById('ad-default').checked,
  };

  if (!payload.first_name || !payload.last_name || !payload.phone || !payload.address1 || !payload.city) {
    return showMsg('ad-msg', 'Please fill in all required fields.', false);
  }

  const btn = document.getElementById('ad-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const url = editingAddressId ? `${API}/account/addresses/${editingAddressId}` : `${API}/account/addresses`;
  const method = editingAddressId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);
    if (!res.ok) return showMsg('ad-msg', data.message || 'Could not save.', false);

    closeAddressModal();
    loadAddresses();
  } catch (e) {
    showMsg('ad-msg', 'Network error.', false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Address';
  }
}

async function setDefaultAddress(id) {
  try {
    const res = await fetch(`${API}/account/addresses/${id}/default`, { method: 'PUT', credentials: 'include' });
    if (res.ok) loadAddresses();
  } catch (e) {
  }
}

async function removeAddress(id) {
  if (!confirm('Delete this address?')) return;
  try {
    const res = await fetch(`${API}/account/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadAddresses();
  } catch (e) {
  }
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function showMsg(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
  el.style.display = 'block';

  if (ok) setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function hideMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
}

async function doLogout(e) {
  if (e) e.preventDefault();
  try {
    await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (e2) {
  }
  window.location.href = 'login-mobile.html';
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (_) {
    return {};
  }
}

// ── ACCOUNT DELETION ────────────────────────────────────────────────────────

function initDeleteAccount() {
  const showModalBtn = document.getElementById('show-delete-modal-btn');
  const cancelBtn = document.getElementById('cancel-delete-btn');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const deleteModal = document.getElementById('delete-account-modal');
  const passwordInput = document.getElementById('delete-confirm-password');

  if (!showModalBtn || !deleteModal || !cancelBtn || !confirmBtn || !passwordInput) return;

  showModalBtn.addEventListener('click', () => {
    passwordInput.value = '';
    deleteModal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.style.display = 'none';
  });

  confirmBtn.addEventListener('click', async () => {
    const password = passwordInput.value.trim();

    if (!password) {
      alert('Password is required to confirm deletion.');
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Deleting...';

    try {
      const response = await fetch(API + '/account', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await safeJson(response);

      if (!response.ok) throw new Error(data.message || 'Failed to delete account.');

      alert(data.message || 'Your account has been permanently deleted.');
      window.location.href = 'login-mobile.html';
    } catch (error) {
      alert(error.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Permanently Delete';
    }
  });
}
