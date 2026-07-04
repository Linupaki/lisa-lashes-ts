
const API = '';
let currentUser = null;
let selectedRating = 0;
let photoFiles = [];
let activeTab = 'products';
let selectedItem = null; // {type: 'product'|'service', id, name }

document.addEventListener('DOMContentLoaded', async () => {
  await checkLogin();
});

async function checkLogin() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      document.getElementById('login-prompt').style.display = 'block';
      return;
    }
    currentUser = await res.json();
    document.getElementById('review-page-content').style.display = 'block';
    await loadProducts();
    setupStars();
  } catch (e) {
    document.getElementById('login-prompt').style.display = 'block';
  }
}

// ── TABS ──────────────────────────────────────────────────────────────────────

async function switchTab(tab) {
  activeTab = tab;
  selectedItem = null;
  document.getElementById('review-form-panel').classList.remove('visible');

  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'products') || (i === 1 && tab === 'services'));
  });

  document.getElementById('tab-products').style.display = tab === 'products' ? 'block' : 'none';
  document.getElementById('tab-services').style.display = tab === 'services' ? 'block' : 'none';

  if (tab === 'products') await loadProducts();
  else await loadServices();
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

async function loadProducts() {
  const container = document.getElementById('products-list');
  container.innerHTML = '<div style="color:#aaa;font-size:13px;grid-column:1/-1;">Loading…</div>';
  try {
    const res = await fetch(API + '/reviews/history/products', { credentials: 'include' });
    if (!res.ok) throw new Error();
    const products = await res.json();
    if (!products.length) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No purchased products found. <a href="shop.html" style="color:#c0a060;">Visit the shop</a></div>`;
      return;
    }
    container.innerHTML = products.map(p => `
  <div class="item-card ${p.already_reviewed ? 'reviewed' : ''}"
    onclick="${p.already_reviewed ? '' : `selectItem('product', ${p.id}, '${escJs(p.name)}')`}">
    <img class="item-thumb" src="${p.path ? `./front_admin/uploads/products/${p.path}` : 'assets/logo/logo.png'}" alt="">
      <div>
        <div class="item-name">${esc(p.name)}</div>
        ${p.already_reviewed ? '<span class="already-badge">Already reviewed</span>' : '<div class="item-sub">Tap to review</div>'}
      </div>
  </div>
  `).join('');
  } catch (e) {
    container.innerHTML = '<div style="color:#c0392b;font-size:13px;grid-column:1/-1;">Could not load products.</div>';
  }
}

// ── SERVICES ──────────────────────────────────────────────────────────────────

async function loadServices() {
  const container = document.getElementById('services-list');
  container.innerHTML = '<div style="color:#aaa;font-size:13px;grid-column:1/-1;">Loading…</div>';
  try {
    const res = await fetch(API + '/reviews/history/services', { credentials: 'include' });
    if (!res.ok) throw new Error();
    const services = await res.json();
    if (!services.length) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No booked services found. <a href="index.html#booking-section" style="color:#c0a060;">Book a service</a></div>`;
      return;
    }
    container.innerHTML = services.map(s => `
  <div class="item-card ${s.already_reviewed ? 'reviewed' : ''}"
    onclick="${s.already_reviewed ? '' : `selectItem('service', ${s.id}, '${escJs(s.name)}')`}">
    <div class="item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:#f5f0e8;">✂️</div>
    <div>
      <div class="item-name">${esc(s.name)}</div>
      <div class="item-sub">€${Number(s.price).toFixed(2)}</div>
      ${s.already_reviewed ? '<span class="already-badge">Already reviewed</span>' : '<div class="item-sub">Tap to review</div>'}
    </div>
  </div>
  `).join('');
  } catch (e) {
    container.innerHTML = '<div style="color:#c0392b;font-size:13px;grid-column:1/-1;">Could not load services.</div>';
  }
}

// ── SELECT ITEM ───────────────────────────────────────────────────────────────

function selectItem(type, id, name) {
  selectedItem = { type, id, name };

  // Highlight selected card
  document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  // Reset form
  selectedRating = 0;
  updateStars(0);
  document.getElementById('star-label').textContent = 'Tap to rate';
  document.getElementById('review-comment').value = '';
  photoFiles = [];
  renderPhotoPreviews();
  document.getElementById('submit-status').textContent = '';
  document.getElementById('reviewing-label').textContent = name;
  document.getElementById('review-form-panel').classList.add('visible');
  document.getElementById('review-form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── STARS ─────────────────────────────────────────────────────────────────────

function setupStars() {
  document.querySelectorAll('.star-pick').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.val);
      updateStars(selectedRating);
      const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
      document.getElementById('star-label').textContent = labels[selectedRating];
    });
    star.addEventListener('mouseenter', () => updateStars(parseInt(star.dataset.val)));
    star.addEventListener('mouseleave', () => updateStars(selectedRating));
  });
}

function updateStars(val) {
  document.querySelectorAll('.star-pick').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

// ── PHOTOS ────────────────────────────────────────────────────────────────────

function handlePhotoPick(input) {
  if (!input.files) return;
  const remaining = 5 - photoFiles.length;
  Array.from(input.files).slice(0, remaining).forEach(file => {
    if (file.size > 4 * 1024 * 1024) { alert(`"${file.name}" exceeds 4 MB.`); return; }
    const reader = new FileReader();
    reader.onload = e => {
      photoFiles.push({ file, previewUrl: e.target.result });
      renderPhotoPreviews();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderPhotoPreviews() {
  document.getElementById('photo-preview').innerHTML = photoFiles.map((item, idx) => `
      <div class="photo-thumb">
        <img src="${item.previewUrl}" alt="">
        <button type="button" class="photo-remove" onclick="removePhoto(${idx})">✕</button>
      </div>
    `).join('');
}

function removePhoto(idx) {
  photoFiles.splice(idx, 1);
  renderPhotoPreviews();
}

// ── SUBMIT ────────────────────────────────────────────────────────────────────

async function submitReview() {
  if (!selectedItem) return;
  const comment = document.getElementById('review-comment').value.trim();
  const statusEl = document.getElementById('submit-status');
  const btn = document.getElementById('submit-btn');

  if (!selectedRating) { statusEl.textContent = 'Please select a star rating.'; statusEl.style.color = '#c0392b'; return; }
  if (!comment) { statusEl.textContent = 'Please write a comment.'; statusEl.style.color = '#c0392b'; return; }

  btn.disabled = true;
  statusEl.textContent = 'Submitting…';
  statusEl.style.color = '#aaa';

  try {
    const formData = new FormData();
    formData.append('rating', selectedRating);
    formData.append('comment', comment);
    photoFiles.forEach(item => formData.append('photos', item.file));

    const endpoint = selectedItem.type === 'product'
      ? `${API}/reviews/product/${selectedItem.id}`
      : `${API}/reviews/service/${selectedItem.id}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      statusEl.textContent = err.message || 'Could not submit review.';
      statusEl.style.color = '#c0392b';
      btn.disabled = false;
      return;
    }

    statusEl.textContent = '✓ Thank you! Your review is pending approval.';
    statusEl.style.color = '#4caf50';
    btn.disabled = true;

    // Refresh the list so the item shows "Already reviewed"
    if (activeTab === 'products') await loadProducts();
    else await loadServices();

    document.getElementById('review-form-panel').classList.remove('visible');
    selectedItem = null;

  } catch (e) {
    statusEl.textContent = 'Network error. Please try again.';
    statusEl.style.color = '#c0392b';
    btn.disabled = false;
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escJs(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

