const API = '';
let allItems     = [];
let editingId    = null;
let pendingFile  = null;

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAdminAccess();
  if (!user) return;
  document.getElementById('admin-name').textContent   = user.first_name + ' ' + (user.last_name || '');
  document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
  await loadGallery();
});

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
  window.location.href = '/index.html';
}

// ── LOAD ──────────────────────────────────────────────────────────────────────

async function loadGallery() {
  const container = document.getElementById('gallery-container');
  try {
    const res = await fetch(`${API}/gallery/admin`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    allItems = await res.json();
    renderGallery();
  } catch (e) {
    container.innerHTML = '<div style="text-align:center;color:#c0392b;padding:60px;">Failed to load gallery.</div>';
  }
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderGallery() {
  const container = document.getElementById('gallery-container');

  if (!allItems.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;">
        <div style="font-size:36px;margin-bottom:12px;">🖼️</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px;">No images yet</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Add your first catalogue image to get started.</div>
        <button class="btn btn-gold" onclick="openAddModal()">+ Add Image</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="gallery-grid">` + allItems.map((item, i) => `
    <div class="gallery-card${item.is_active ? '' : ' inactive'}">
      ${item.is_active ? '' : '<span class="hidden-tag">HIDDEN</span>'}
      <img class="gallery-card-img" src="uploads/gallery/${esc(item.image_path)}" alt="${esc(item.title)}">
      <div class="gallery-card-body">
        <div class="gallery-card-title">${esc(item.title)}</div>
        <div class="gallery-card-actions">
          <button class="gc-btn" onclick="moveItem(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="Move left">←</button>
          <button class="gc-btn" onclick="moveItem(${i},  1)" ${i === allItems.length - 1 ? 'disabled' : ''} title="Move right">→</button>
          <button class="gc-btn" onclick="openEditModal(${item.id})" title="Edit">✎</button>
          <button class="gc-btn danger" onclick="deleteItem(${item.id})" title="Delete">✕</button>
        </div>
      </div>
    </div>`).join('') + `</div>`;
}

// ── REORDER ───────────────────────────────────────────────────────────────────

async function moveItem(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= allItems.length) return;

  [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
  renderGallery();

  try {
    await fetch(`${API}/gallery/admin/reorder`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: allItems.map(item => item.id) }),
    });
  } catch (e) {
    alert('Failed to save new order.');
    await loadGallery();
  }
}

// ── MODAL ─────────────────────────────────────────────────────────────────────

function openAddModal() {
  editingId   = null;
  pendingFile = null;

  document.getElementById('gallery-modal-title').textContent = 'Add Image';
  document.getElementById('gallery-modal-sub').textContent   = 'Upload a new catalogue image';
  document.getElementById('g-title').value    = '';
  document.getElementById('g-active').checked = true;
  document.getElementById('g-image').value    = '';
  document.getElementById('g-image-required').style.display  = 'inline';
  document.getElementById('g-image-preview').style.display   = 'none';
  document.getElementById('g-image-placeholder').style.display = 'block';
  document.getElementById('gallery-error').style.display     = 'none';

  openModal('modal-gallery');
}

function openEditModal(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) return;

  editingId   = id;
  pendingFile = null;

  document.getElementById('gallery-modal-title').textContent = 'Edit Image';
  document.getElementById('gallery-modal-sub').textContent   = item.title;
  document.getElementById('g-title').value    = item.title;
  document.getElementById('g-active').checked = item.is_active;
  document.getElementById('g-image').value    = '';
  document.getElementById('g-image-required').style.display = 'none';
  document.getElementById('gallery-error').style.display    = 'none';

  const preview = document.getElementById('g-image-preview');
  preview.src           = `uploads/gallery/${item.image_path}`;
  preview.style.display = 'block';
  document.getElementById('g-image-placeholder').style.display = 'none';

  openModal('modal-gallery');
}

function previewGalleryImage(input) {
  const file = input.files[0];
  if (!file) return;
  pendingFile = file;

  const preview = document.getElementById('g-image-preview');
  preview.src           = URL.createObjectURL(file);
  preview.style.display = 'block';
  document.getElementById('g-image-placeholder').style.display = 'none';
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

async function saveGalleryItem() {
  const title  = document.getElementById('g-title').value.trim();
  const active = document.getElementById('g-active').checked;
  const errEl  = document.getElementById('gallery-error');
  const btn    = document.getElementById('g-save-btn');

  errEl.style.display = 'none';

  if (!title) {
    errEl.textContent   = 'Title is required.';
    errEl.style.display = 'block';
    return;
  }
  if (!editingId && !pendingFile) {
    errEl.textContent   = 'Please choose an image.';
    errEl.style.display = 'block';
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('is_active', active ? 'true' : 'false');
  if (pendingFile) formData.append('image', pendingFile);

  const url    = editingId ? `${API}/gallery/admin/${editingId}` : `${API}/gallery/admin`;
  const method = editingId ? 'PUT' : 'POST';

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(url, { method, credentials: 'include', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent   = err.message || 'Save failed.';
      errEl.style.display = 'block';
      return;
    }
    closeModal('modal-gallery');
    await loadGallery();
  } catch (e) {
    errEl.textContent   = 'Network error: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save';
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteItem(id) {
  const item = allItems.find(x => x.id === id);
  if (!confirm(`Delete "${item?.title}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/gallery/admin/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { alert('Failed to delete image.'); return; }
    allItems = allItems.filter(x => x.id !== id);
    renderGallery();
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function handleOverlayClick(e, id) { if (e.target === e.currentTarget) closeModal(id); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
