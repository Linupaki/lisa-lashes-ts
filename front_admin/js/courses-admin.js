const API = '';
let allCourses = [];
let editingCourseId = null;

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkAdmin();
  if (ok) loadCourses();
});

// ── AUTH ──────────────────────────────────────────────────────────────────────

async function checkAdmin() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = '/account.html'; return false; }
    const user = await res.json();
    if (!(user.role === 'admin' || user.role === 'master')) { window.location.href = '/account.html'; return false; }
    document.getElementById('admin-name').textContent = user.first_name + ' ' + (user.last_name || '');
    document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
    return true;
  } catch (e) { window.location.href = '/account.html'; return false; }
}

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

// ── LOAD ──────────────────────────────────────────────────────────────────────

async function loadCourses() {
  try {
    const res = await fetch(`${API}/courses`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    allCourses = await res.json();
    applyFilters();
  } catch (e) {
    document.getElementById('courses-tbody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:red;padding:32px;">Failed to load courses.</td></tr>`;
  }
}

// ── FILTERS ───────────────────────────────────────────────────────────────────

function applyFilters() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  const status = document.getElementById('filter-status')?.value || 'all';

  const filtered = allCourses.filter(c => {
    const matchQ = !query || c.title.toLowerCase().includes(query) || (c.instructor || '').toLowerCase().includes(query);
    const matchS = status === 'all' || (status === 'active' ? c.is_active : !c.is_active);
    return matchQ && matchS;
  });

  renderTable(filtered);
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderTable(courses) {
  const tbody = document.getElementById('courses-tbody');

  if (!courses.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No courses found.</td></tr>';
    return;
  }

  tbody.innerHTML = courses.map(c => {
    const thumb = c.image_path
      ? `<img class="course-thumb" src="uploads/courses/${esc(c.image_path)}" alt="${esc(c.title)}">`
      : `<div class="course-thumb-placeholder">🎓</div>`;

    const dateStr = c.date
      ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    const statusHtml = c.is_active
      ? `<span class="badge badge-active">Active</span>`
      : `<span class="badge badge-out">Hidden</span>`;

    return `
      <tr>
        <td>${thumb}</td>
        <td class="td-name">
          <div>${esc(c.title)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${esc(c.instructor || '')}</div>
        </td>
        <td style="font-size:13px;">${dateStr}</td>
        <td style="font-weight:600;">€${Number(c.price).toFixed(2)}</td>
        <td>${c.spots ?? '—'}</td>
        <td>${statusHtml}</td>
        <td>
          <div class="action-menu-wrap">
            <button class="action-menu-btn" onclick="toggleMenu(this)">⋯</button>
            <div class="action-dropdown">
              <button class="action-dropdown-item" onclick="openEditModal(${c.id}); closeMenu()">
                <span class="adi-icon">✎</span> Edit
              </button>
              <div class="action-dropdown-divider"></div>
              <button class="action-dropdown-item danger" onclick="deleteCourse(${c.id}); closeMenu()">
                <span class="adi-icon">✕</span> Delete
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── ADD MODAL ─────────────────────────────────────────────────────────────────

function openAddModal() {
  editingCourseId = null;
  document.getElementById('modal-course-title').textContent = 'Add Course';
  document.getElementById('modal-course-sub').textContent = 'Fill in the course details';
  document.getElementById('modal-course-save').textContent = 'Save Course';

  document.getElementById('c-title').value = '';
  document.getElementById('c-desc').value = '';
  document.getElementById('c-instructor').value = '';
  document.getElementById('c-price').value = '';
  document.getElementById('c-date').value = '';
  document.getElementById('c-spots').value = '';
  document.getElementById('c-time-start').value = '';
  document.getElementById('c-time-end').value = '';
  document.getElementById('c-location').value = '';
  document.getElementById('c-certificate').checked = false;
  document.getElementById('c-active').checked = true;
  document.getElementById('c-image-preview').innerHTML = '';

  openModal('modal-course');
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────

function openEditModal(id) {
  const c = allCourses.find(x => x.id === id);
  if (!c) return;
  editingCourseId = id;

  document.getElementById('modal-course-title').textContent = 'Edit Course';
  document.getElementById('modal-course-sub').textContent = c.title;
  document.getElementById('modal-course-save').textContent = 'Save Changes';

  document.getElementById('c-title').value = c.title || '';
  document.getElementById('c-desc').value = c.description || '';
  document.getElementById('c-instructor').value = c.instructor || '';
  document.getElementById('c-price').value = c.price || '';
  document.getElementById('c-date').value = c.date ? c.date.split('T')[0] : '';
  document.getElementById('c-spots').value = c.spots ?? '';
  document.getElementById('c-time-start').value = c.time_start || '';
  document.getElementById('c-time-end').value = c.time_end || '';
  document.getElementById('c-location').value = c.location || '';
  document.getElementById('c-certificate').checked = !!c.certificate;
  document.getElementById('c-active').checked = !!c.is_active;

  const preview = document.getElementById('c-image-preview');
  preview.innerHTML = c.image_path
    ? `<img src="uploads/courses/${esc(c.image_path)}" style="height:80px;border-radius:6px;object-fit:cover;">`
    : '';

  openModal('modal-course');
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

async function saveCourse() {
  const title = document.getElementById('c-title').value.trim();
  const price = document.getElementById('c-price').value;
  if (!title || !price) { alert('Title and price are required.'); return; }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', document.getElementById('c-desc').value.trim());
  formData.append('instructor', document.getElementById('c-instructor').value.trim());
  formData.append('price', price);
  formData.append('date', document.getElementById('c-date').value);
  formData.append('spots', document.getElementById('c-spots').value);
  formData.append('time_start', document.getElementById('c-time-start').value);
  formData.append('time_end', document.getElementById('c-time-end').value);
  formData.append('location', document.getElementById('c-location').value.trim());
  formData.append('certificate', document.getElementById('c-certificate').checked ? 'true' : 'false');
  formData.append('is_active', document.getElementById('c-active').checked ? 'true' : 'false');

  const imageFile = document.getElementById('c-image').files[0];
  if (imageFile) formData.append('image', imageFile);

  const url = editingCourseId ? `${API}/courses/${editingCourseId}` : `${API}/courses`;
  const method = editingCourseId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, credentials: 'include', body: formData });
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Error: ' + (e.message || res.status)); return; }
    closeModal('modal-course');
    await loadCourses();
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteCourse(id) {
  const c = allCourses.find(x => x.id === id);
  if (!confirm(`Delete "${c?.title}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/courses/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { alert('Failed to delete course.'); return; }
    allCourses = allCourses.filter(x => x.id !== id);
    applyFilters();
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function handleOverlayClick(e, id) { if (e.target === e.currentTarget) closeModal(id); }
function toggleMenu(btn) {
  document.querySelectorAll('.action-dropdown.open').forEach(d => {
    if (d !== btn.nextElementSibling) d.classList.remove('open');
  });
  btn.nextElementSibling?.classList.toggle('open');
}
function closeMenu() { document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open')); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id)); closeMenu(); } });

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
