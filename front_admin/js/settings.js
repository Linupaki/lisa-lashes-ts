const API = '';

let allSalonServices = [];
let allResources = [];
let editingSvcId = null;
let editingArtistId = null;
let allEmployees = [];
let editingEmployeeId = null;
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

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
//
// Working Hours
//
function toggleSalonDayRow(wd, isClosed) {
  const startInput = document.getElementById(`bh-start-${wd}`);
  const endInput = document.getElementById(`bh-end-${wd}`);

  if (isClosed) {
    startInput.disabled = true;
    endInput.disabled = true;
    startInput.style.opacity = '0.4';
    endInput.style.opacity = '0.4';
  } else {
    startInput.disabled = false;
    endInput.disabled = false;
    startInput.style.opacity = '1';
    endInput.style.opacity = '1';
  }
}

// Fetch baseline hours from database (using a universal target like resource_id=0 or dedicated global ID)
async function loadSalonBusinessHours() {
  try {
    // Resource ID 0 or a fixed global reference ID represents the master business baseline hours
    const res = await fetch(`${API}/schedule?resource_id=0`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to download business hours catalog parameters.');

    const data = await res.json();
    const hoursArray = data.days || [];

    // Map downloaded settings across the grid inputs (0..6)
    for (let wd = 0; wd <= 6; wd++) {
      const d = hoursArray.find(x => x.weekday === wd);

      const startInput = document.getElementById(`bh-start-${wd}`);
      const endInput = document.getElementById(`bh-end-${wd}`);
      const closedCheckbox = document.getElementById(`bh-closed-${wd}`);

      if (d) {
        startInput.value = d.start || '09:00';
        endInput.value = d.end || '18:00';
        closedCheckbox.checked = !d.working; // If working is false, closed is checked true
      } else {
        // Defaults if day record doesn't exist yet
        startInput.value = '09:00';
        endInput.value = '18:00';
        closedCheckbox.checked = (wd === 0); // Default to close Sundays
      }

      // Render initial visual disabled state
      toggleSalonDayRow(wd, closedCheckbox.checked);
    }
  } catch (err) {
    console.error("Error loading master business hours:", err);
  }
}

// Push modified form states up to the server
async function saveSalonBusinessHours(event) {
  if (event) event.preventDefault();

  const days = [];
  for (let wd = 0; wd <= 6; wd++) {
    const isClosed = document.getElementById(`bh-closed-${wd}`).checked;
    days.push({
      weekday: wd,
      working: !isClosed, // working is true if closed is false
      start: document.getElementById(`bh-start-${wd}`).value,
      end: document.getElementById(`bh-end-${wd}`).value
    });
  }

  try {
    const res = await fetch(`${API}/schedule?resource_id=0`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days })
    });

    if (!res.ok) {
      alert('Failed to save business hours. Server status code: ' + res.status);
      return;
    }

    alert('Business hours successfully updated!');
    await loadSalonBusinessHours();
  } catch (err) {
    alert('Network transmission error encountered: ' + err.message);
  }
}
/* ════════════════════════════════════
   SERVICE CATALOG
════════════════════════════════════ */
function renderSalonServices() {
  const list = document.getElementById('services-list');
  if (!allSalonServices.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">No services yet.</div>';
    return;
  }
  list.innerHTML = allSalonServices.map(s => {
    const isActive = s.active === 'true' || s.active === true;
    // Add subtle visual styling to dim inactive elements so you know they are off
    const rowStyle = isActive ? '' : 'opacity: 0.65; background: var(--border);';

    return `
        <div style="display:grid;grid-template-columns:1fr 120px 120px 80px auto;gap:12px;align-items:center;padding:14px 16px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border); ${rowStyle}">
          <div style="font-weight:600;font-size:14px;">${escHtml(s.name)}</div>
          <div style="font-size:13px;color:var(--text-muted);">${s.duration_minutes ? `${s.duration_minutes} min` : '—'}</div>
          <div style="font-size:13px;color:var(--text-muted);">${s.price ? `€${s.price}` : '—'}</div>
          <div><span class="badge ${isActive ? 'badge-active' : 'badge-cancelled'}">${isActive ? 'Active' : 'Inactive'}</span></div>
          <div class="actions">
            <button class="btn-icon" title="Edit" onclick="openEditService(${s.id})">✎</button>
            <button class="btn-icon delete" title="Delete" onclick="deleteSalonService(${s.id}, '${escHtml(s.name)}')">✕</button>
          </div>
        </div>`;
  }).join('');
}
async function loadSalonServices() {
  try {
    const res = await fetch(API + `/services`, {
      method: 'GET',
      credentials: 'include'
    });

    allSalonServices = await res.json();
    renderSalonServices();
  } catch (e) {
    document.getElementById('services-list').innerHTML =
      '<div style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load services.</div>';
  }
}

function openAddService() {
  editingSvcId = null;
  document.getElementById('sm-title').textContent = 'Add Service';
  document.getElementById('sm-save-btn').textContent = 'Add Service';
  document.getElementById('sm-name').value = '';
  document.getElementById('sm-duration').value = '';
  document.getElementById('sm-price').value = '';
  document.getElementById('sm-active').value = 'true';
  document.getElementById('sm-active-group').style.display = 'none'; // Keep hidden for new items
  document.getElementById('modal-service').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function openEditService(id) {
  const s = allSalonServices.find(x => x.id === id);
  if (!s) return;
  editingSvcId = id;
  document.getElementById('sm-title').textContent = 'Edit Service';
  document.getElementById('sm-save-btn').textContent = 'Save Changes';
  document.getElementById('sm-name').value = s.name;
  document.getElementById('sm-duration').value = s.duration_minutes;
  document.getElementById('sm-price').value = s.price;
  document.getElementById('sm-active').value = (s.active === 'true' || s.active === true) ? 'true' : 'false';
  document.getElementById('sm-active-group').style.display = '';
  document.getElementById('modal-service').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeServiceModal() {
  document.getElementById('modal-service').classList.remove('open');
  document.body.style.overflow = '';
}
async function saveService() {
  // FIX 1: Removed 'if (!editingSvcId) return;' which blocked additions completely!
  const payload = {
    name: document.getElementById('sm-name').value.trim(),
    duration_minutes: Number(document.getElementById('sm-duration').value.trim()),
    price: document.getElementById('sm-price').value.trim(),
    active: document.getElementById('sm-active').value === 'true'
  };
  if (!payload.name) { alert('Name is required.'); return; }
  try {
    let res;
    if (editingSvcId) {
      res = await fetch(`${API}/services/${editingSvcId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API}/services`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // FIX 2: Dropped the extra "{ payload }" wrapper context mismatching REST standards
        body: JSON.stringify(payload)
      });
    }
    if (!res.ok) { alert('Error: ' + res.status); return; }
    closeServiceModal();
    await loadAll();
  } catch (e) { alert('Network error: ' + e.message); }
}
async function deleteSalonService(id, name) {
  if (!confirm(`Delete service "${name}"? Artists assigned to it will lose this service.`)) return;
  try {
    const res = await fetch(`${API}/services/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { alert('Delete failed: ' + res.status); return; }
    await loadAll();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   ARTISTS
════════════════════════════════════ */
function svcChips(services) {
  if (!services || !services.length)
    return '<span style="font-size:12px;color:var(--text-muted);">No services</span>';
  return services.map(s =>
    `<span style="display:inline-block;font-size:11px;background:rgba(160,130,80,0.12);color:#9a7d3f;border:1px solid rgba(160,130,80,0.3);border-radius:999px;padding:2px 9px;margin:2px 2px 0 0;">${escHtml(s.name)}</span>`
  ).join('');
}

function renderArtists() {
  const list = document.getElementById('artists-list');
  if (!allResources.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:32px;">No artists yet.</div>';
    return;
  }
  list.innerHTML = allResources.map(r => {
    const isActive = r.active === 'true' || r.active === true;
    return `
        <div style="display:grid;grid-template-columns:auto 1fr auto auto auto auto;gap:16px;align-items:center;padding:14px 16px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">
          <div class="customer-avatar" style="width:38px;height:38px;font-size:13px;">${escHtml(initials(r.name))}</div>
          <div>
            <div style="font-weight:600;font-size:14px;">${escHtml(r.name)}</div>
            <div style="margin-top:4px;">${svcChips(r.services)}</div>
          </div>
          <span class="badge ${isActive ? 'badge-active' : 'badge-cancelled'}">${isActive ? 'Active' : 'Inactive'}</span>
          <button class="btn btn-outline btn-sm" style="font-size:12px;padding:4px 10px;" title="Manage schedule" onclick="openSchedule(${r.id},'${escHtml(r.name)}')">🗓 Schedule</button>
          <button class="btn-icon" title="Edit" onclick="openEditArtist(${r.id})">✎</button>
          <button class="btn-icon delete" title="Delete" onclick="deleteArtist(${r.id}, '${escHtml(r.name)}')">✕</button>
        </div>`;
  }).join('');
}

async function loadArtists() {
  try {
    const res = await fetch(API + '/resources', {
      method: 'GET',
      credentials: 'include',
    });

    allResources = await res.json();
    renderArtists();
  } catch (e) {
    document.getElementById('artists-list').innerHTML =
      '<div style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load artists.</div>';
  }
}

function renderArtistServiceCheckboxes(selectedIds) {
  const box = document.getElementById('am-svc-checks');
  if (!allSalonServices.length) {
    box.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">No services configured yet.</span>';
    return;
  }
  box.innerHTML = allSalonServices
    .map(s => {
      const checked = selectedIds.includes(s.id) ? 'checked' : '';
      const isActive = s.active === 'true' || s.active === true;

      // Label modification to signal if it's currently turned off system-wide
      const statusLabel = isActive ? '' : ' <span style="color:var(--text-cancelled); font-size:11px;">(Inactive)</span>';
      const labelStyle = isActive ? '' : 'opacity: 0.7; font-style: italic;';

      return `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px; ${labelStyle}">
            <input type="checkbox" value="${s.id}" ${checked} style="width:15px;height:15px;accent-color:var(--gold);">
            <span>${escHtml(s.name)}${statusLabel}${s.duration_minutes ? ` <span style="color:var(--text-muted);">(${escHtml(s.duration_minutes)} min)</span>` : ''}</span>
          </label>`;
    }).join('');
}
function openAddArtist() {
  editingArtistId = null;
  document.getElementById('am-title').textContent = 'Add Artist';
  document.getElementById('am-save-btn').textContent = 'Add Artist';
  document.getElementById('am-name').value = '';
  document.getElementById('am-active').value = 'true';
  document.getElementById('am-active-group').style.display = 'none';
  renderArtistServiceCheckboxes([]);
  document.getElementById('modal-artist').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function openEditArtist(id) {
  const r = allResources.find(x => x.id === id);
  if (!r) return;
  editingArtistId = id;
  document.getElementById('am-title').textContent = 'Edit Artist';
  document.getElementById('am-save-btn').textContent = 'Save Changes';
  document.getElementById('am-name').value = r.name;
  document.getElementById('am-active').value = (r.active === 'true' || r.active === true) ? 'true' : 'false';
  document.getElementById('am-active-group').style.display = '';
  renderArtistServiceCheckboxes((r.services || []).map(s => s.id));
  document.getElementById('modal-artist').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeArtistModal() {
  document.getElementById('modal-artist').classList.remove('open');
  document.body.style.overflow = '';
}
function getCheckedServiceIds() {
  return [...document.querySelectorAll('#am-svc-checks input[type=checkbox]:checked')]
    .map(el => parseInt(el.value, 10));
}
async function saveArtist() {
  const name = document.getElementById('am-name').value.trim();
  const active = document.getElementById('am-active').value === 'true';
  const serviceIds = getCheckedServiceIds();
  if (!name) { alert('Name is required.'); return; }
  try {
    let resourceId;
    if (editingArtistId) {
      resourceId = editingArtistId;
      const res = await fetch(`${API}/resources/${resourceId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, active })
      });
      if (!res.ok) { alert('Error updating artist: ' + res.status); return; }
    } else {
      const res = await fetch(`${API}/resources`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) { alert('Error creating artist: ' + res.status); return; }
      const data = await res.json();
      resourceId = data.id;
    }
    // Update service assignments
    const assignRes = await fetch(`${API}/resources/${resourceId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_ids: serviceIds })
    });
    if (!assignRes.ok) { alert('Error assigning services: ' + assignRes.status); return; }
    closeArtistModal();
    await loadAll();
  } catch (e) { alert('Network error: ' + e.message); }
}
async function deleteArtist(id, name) {
  if (!confirm(`Delete artist "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/resources/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) { alert('Delete failed: ' + res.status); return; }
    await loadAll();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   LOAD ALL + TAB SWITCHER
════════════════════════════════════ */
async function loadAll() {
  await Promise.all([loadSalonServices(), loadArtists()]);
}

function switchTab(tabId, clickedBtn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  clickedBtn.classList.add('active');

  if (tabId === 'services') loadAll();
  if (tabId === 'hours') loadSalonBusinessHours();
}  /* Boot */
loadAll();
/* ════════════════════════════════════
   SCHEDULE MODAL
════════════════════════════════════ */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let scheduleResourceId = null;
let scheduleWeeklyData = []; // [{weekday,working,start,end}]
let scheduleOverridesData = [];

function openSchedule(resourceId, name) {
  scheduleResourceId = resourceId;
  document.getElementById('sch-title').textContent = name + ' — Schedule';
  switchScheduleTab('weekly', document.getElementById('sch-tab-weekly-btn'));
  loadWeeklySchedule();
  document.getElementById('modal-schedule').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeScheduleModal() {
  document.getElementById('modal-schedule').classList.remove('open');
  document.body.style.overflow = '';
}

function switchScheduleTab(tab, btn) {
  document.getElementById('sch-panel-weekly').style.display = tab === 'weekly' ? '' : 'none';
  document.getElementById('sch-panel-exceptions').style.display = tab === 'exceptions' ? '' : 'none';
  document.querySelectorAll('#modal-schedule .tab-btn').forEach(b => {
    b.style.borderBottomColor = 'transparent';
    b.style.color = 'var(--text-muted)';
  });
  btn.style.borderBottomColor = 'var(--gold)';
  btn.style.color = 'var(--gold)';
  if (tab === 'exceptions') loadExceptions();
}

/* ── Weekly hours ── */
async function loadWeeklySchedule() {
  try {
    const res = await fetch(`${API}/schedule?resource_id=${scheduleResourceId}`, { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    scheduleWeeklyData = data.days || [];
    renderWeeklyGrid();
  } catch (e) { console.error(e); }
}

function renderWeeklyGrid() {
  const grid = document.getElementById('sch-weekly-grid');
  // Show Mon–Sun order (1..6, then 0)
  const order = [1, 2, 3, 4, 5, 6, 0];
  grid.innerHTML = order.map(wd => {
    const d = scheduleWeeklyData.find(x => x.weekday === wd) || { weekday: wd, working: false, start: '09:00', end: '18:00' };
    return `
        <div style="display:grid;grid-template-columns:130px 60px 1fr 1fr;gap:12px;align-items:center;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);" id="sch-row-${wd}">
          <div style="font-weight:600;font-size:13px;">${DAYS[wd]}</div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="sch-working-${wd}" ${d.working ? 'checked' : ''}
              onchange="toggleDayRow(${wd},this.checked)"
              style="accent-color:var(--gold);width:15px;height:15px;">
            <span style="color:var(--text-muted);">On</span>
          </label>
          <div class="sch-times-${wd}" style="${d.working ? '' : 'opacity:.35;pointer-events:none;'}">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px;">Start</label>
            <input type="time" class="form-input" id="sch-start-${wd}" value="${escHtml(d.start)}" style="font-size:13px;">
          </div>
          <div class="sch-times-${wd}" style="${d.working ? '' : 'opacity:.35;pointer-events:none;'}">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:2px;">End</label>
            <input type="time" class="form-input" id="sch-end-${wd}" value="${escHtml(d.end)}" style="font-size:13px;">
          </div>
        </div>`;
  }).join('');
}

function toggleDayRow(wd, on) {
  document.querySelectorAll(`.sch-times-${wd}`).forEach(el => {
    el.style.opacity = on ? '' : '.35';
    el.style.pointerEvents = on ? '' : 'none';
  });
}

async function saveWeeklySchedule() {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.map(wd => ({
    weekday: wd,
    working: document.getElementById(`sch-working-${wd}`).checked,
    start: document.getElementById(`sch-start-${wd}`).value,
    end: document.getElementById(`sch-end-${wd}`).value
  }));
  try {
    const res = await fetch(`${API}/schedule?resource_id=${scheduleResourceId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days })
    });
    if (!res.ok) { alert('Save failed: ' + res.status); return; }
    alert('Schedule saved!');
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ── Exceptions ── */
function toggleExcTimeInputs() {
  const isCustom = document.getElementById('sch-exc-type').value === 'custom';
  document.getElementById('sch-exc-times').style.display = isCustom ? 'grid' : 'none';
  document.getElementById('sch-exc-times-placeholder').style.display = isCustom ? 'none' : '';
}

async function loadExceptions() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth() + 1;
  try {
    const res = await fetch(
      `${API}/schedule-overrides?resource_id=${scheduleResourceId}&year=${year}&month=${month}`,
      { credentials: 'include', cache: 'no-store' }
    );
    const data = await res.json();
    scheduleOverridesData = data.overrides || [];
    renderExceptions();
  } catch (e) { console.error(e); }
}

function renderExceptions() {
  const list = document.getElementById('sch-exc-list');
  if (!scheduleOverridesData.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px;">No exceptions this month.</div>';
    return;
  }
  list.innerHTML = scheduleOverridesData.map(o => {
    const d = new Date(o.date + 'T12:00:00');
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
    const detail = o.working
      ? `<span style="color:#2e7d50;font-weight:600;">Custom: ${o.start} – ${o.end}</span>`
      : `<span style="color:#c0392b;font-weight:600;">Day Off</span>`;
    return `
        <div style="display:flex;align-items:center;gap:16px;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);">
          <div style="flex:1;font-size:13px;font-weight:600;">${escHtml(label)}</div>
          <div style="font-size:13px;">${detail}</div>
          ${o.note ? `<div style="font-size:12px;color:var(--text-muted);font-style:italic;">${escHtml(o.note)}</div>` : ''}
          <button class="btn-icon delete" title="Remove exception" onclick="removeException('${escHtml(o.date)}')">✕</button>
        </div>`;
  }).join('');
}

async function addException() {
  const date = document.getElementById('sch-exc-date').value;
  const isDay = document.getElementById('sch-exc-type').value === 'off';
  const start = isDay ? '' : document.getElementById('sch-exc-start').value;
  const end = isDay ? '' : document.getElementById('sch-exc-end').value;
  if (!date) { alert('Please pick a date.'); return; }
  try {
    const res = await fetch(`${API}/schedule-overrides?resource_id=${scheduleResourceId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, working: !isDay, start, end, note: '' })
    });
    if (!res.ok) { alert('Error: ' + res.status); return; }
    document.getElementById('sch-exc-date').value = '';
    await loadExceptions();
  } catch (e) { alert('Network error: ' + e.message); }
}

async function removeException(date) {
  try {
    await fetch(
      `${API}/schedule-overrides?resource_id=${scheduleResourceId}&date=${encodeURIComponent(date)}`,
      { method: 'DELETE', credentials: 'include' }
    );
    await loadExceptions();
  } catch (e) { alert('Network error: ' + e.message); }
}

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}
// 1. Fetch Master and Admin accounts from the server
async function loadEmployeesTabData() {
  try {
    // Hits the method pulling your filtered masters & admins list
    const res = await fetch(API + '/user/employees', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('Could not download system employee records.');

    allEmployees = await res.json();
    renderEmployeesTab();
  } catch (err) {
    document.getElementById('employees-list').innerHTML =
      `<div style="text-align:center; color:var(--text-cancelled); padding:32px;">Error fetching user directory: ${err.message}</div>`;
  }
}

// 2. Build and render individual interactive management cards
function renderEmployeesTab() {
  const container = document.getElementById('employees-list');
  if (!allEmployees.length) {
    container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:32px;">No operational staff found.</div>';
    return;
  }

  container.innerHTML = allEmployees.map(emp => {
    // Generate menu listing all potential artist mapping targets[cite: 6]
    const artistOptions = allResources.map(artist => {
      // Pre-select if this specific artist resource is bound to this user ID[cite: 6]
      const isLinked = Number(artist.user_id) === Number(emp.id);
      return `<option value="${artist.id}" ${isLinked ? 'selected' : ''}>${escHtml(artist.name)}</option>`;
    }).join('');

    return `
  <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px; display:flex; flex-direction:column; gap:16px;">
    <div style="display:flex; align-items:center; gap:12px;">
      <div class="customer-avatar" style="width:42px; height:42px; font-size:14px; background:rgba(160,130,80,0.1); color:var(--gold); border:1px solid rgba(160,130,80,0.2); font-weight:600;">
        ${escHtml(initials(emp.first_name + ' ' + (emp.last_name || '')))}
      </div>
      <div>
        <div style="font-weight:600; font-size:14px; display:flex; align-items:center; gap:8px;">
          ${escHtml(emp.first_name)} ${escHtml(emp.last_name || '')}
          <span class="badge badge-active" style="font-size:10px; padding:2px 6px;">${escHtml(emp.role)}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${escHtml(emp.email)}</div>
      </div>
    </div>
    
    <div style="border-top:1px solid var(--border); padding-top:14px; display:flex; flex-direction:column; gap:12px;">
      <div>
        <label style="font-size:10.5px; font-weight:700; text-transform:uppercase; color:var(--text-muted); display:block; margin-bottom:6px; letter-spacing:0.5px;">
          Linked Booking Profile (Artist)
        </label>
        <select class="form-select" style="width:100%; font-size:13px; padding:8px;" onchange="updateEmployeeArtistLink(${emp.id}, this.value)">
          <option value="">-- No Account Linked (View Only) --</option>
          ${artistOptions}
        </select>
      </div>

      <!-- NEW: Manage button positioned cleanly below the dropdown selector -->
      <button class="btn btn-outline btn-sm" style="width:100%; font-size:12px; padding:6px 12px; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="openManageEmployeeModal(${emp.id})">
        <span>⚙️</span> Manage Account Details
      </button>
    </div>
  </div>
`;
  }).join('');
}

// 3. Process changes and save updates back to the database
async function updateEmployeeArtistLink(employeeId, selectedArtistId) {
  try {
    // Step A: Clear this user_id from any other artist profile first to keep the relationship 1-to-1
    const oldLinkedArtist = allResources.find(a => Number(a.user_id) === Number(employeeId));
    if (oldLinkedArtist && String(oldLinkedArtist.id) !== String(selectedArtistId)) {
      await fetch(`${API}/resources/${oldLinkedArtist.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: null }) // Unlink old mapping
      });
    }

    // Step B: Connect to the newly selected artist if one is chosen
    if (selectedArtistId) {
      const res = await fetch(`${API}/resources/${selectedArtistId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: employeeId }) // Assign link mapping
      });

      if (!res.ok) throw new Error('Failed to save connection payload upstream.');
    }

    // Step C: Silent state data synchronization across UI components[cite: 6]
    await loadArtists();
    await loadEmployeesTabData();
  } catch (err) {
    alert('Error updating configuration link: ' + err.message);
  }
}

// 4. Update your main routing tab listener switch[cite: 6]
function switchTab(tabId, clickedBtn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  clickedBtn.classList.add('active');

  if (tabId === 'services') loadAll();
  if (tabId === 'hours') loadSalonBusinessHours();

  // Triggers when selecting your newly operational view
  if (tabId === 'employees') {
    loadArtists().then(() => loadEmployeesTabData());
  }
}
function openManageEmployeeModal(id) {
  const emp = allEmployees.find(x => x.id === id);
  if (!emp) return;

  editingEmployeeId = id;

  // Set UI input values mapping structural data fields
  document.getElementById('em-title').textContent = `Manage — ${emp.first_name} ${emp.last_name || ''}`;
  document.getElementById('em-first-name').value = emp.first_name || '';
  document.getElementById('em-last-name').value = emp.last_name || '';
  document.getElementById('em-phone').value = emp.phone || '';
  document.getElementById('em-role').value = emp.role || 'admin';

  document.getElementById('modal-employee').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEmployeeModal() {
  document.getElementById('modal-employee').classList.remove('open');
  document.body.style.overflow = '';
  editingEmployeeId = null;
}

async function saveEmployeeModalChanges() {
  if (!editingEmployeeId) return;

  const payload = {
    first_name: document.getElementById('em-first-name').value.trim(),
    last_name: document.getElementById('em-last-name').value.trim(),
    phone: document.getElementById('em-phone').value.trim(),
    role: document.getElementById('em-role').value
  };

  try {
    const res = await fetch(`${API}/user/${editingEmployeeId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Server error modifying user account.');
    }

    closeEmployeeModal();
    // Re-trigger dashboard load to refresh views instantly!
    await loadEmployeesTabData();
  } catch (e) {
    alert('Failed to update employee details: ' + e.message);
  }
}

/* ── Boot ── */
checkAdmin().then(ok => { if (ok) loadSalonServices(); });
