const API = '';

let allBookings = [];
let allResources = [];
let allSalonServices = [];
let editingBookingId = null;
let selectedDate = new Date().toISOString().split('T')[0];
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

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
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}
function statusBadge(status) {
  const map = { confirmed: 'badge-confirmed', pending: 'badge-pending', cancelled: 'badge-cancelled' };
  const cls = map[status?.toLowerCase()] || 'badge-pending';
  return `<span class="badge ${cls}">${capitalize(status)}</span>`;
}
function formatDateLabel(dateStr) {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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
function serviceLabel(service_id) {
  const s = allSalonServices.find(x => x.id === service_id);
  return s ? s.name : '';
}
function getServiceDurationMinutes(service) {
  if (!service) return 60;
  if (Number.isFinite(service.duration_minutes)) return Number(service.duration_minutes);
  if (Number.isFinite(service.durationMinutes)) return Number(service.durationMinutes);
  const durationStr = service.duration;
  if (!durationStr) return 60;
  const hourMin = String(durationStr).match(/(\d+)\s*h(?:r|our)?s?\s*(?:(\d+)\s*min)?/i);
  if (hourMin) return parseInt(hourMin[1]) * 60 + (hourMin[2] ? parseInt(hourMin[2]) : 0);
  const minOnly = String(durationStr).match(/(\d+)\s*min/i);
  if (minOnly) return parseInt(minOnly[1]);
  return 60;
}

/* ── Manual-mode end-time auto-calc (used only when manual toggle is on) ── */
function autoCalcEndTimeManual() {
  if (document.getElementById('nb-end-override').checked) return;
  const startVal = document.getElementById('nb-start-manual').value;
  if (!startVal) return;
  const serviceId = parseInt(document.getElementById('nb-service').value) || 0;
  const service = allSalonServices.find(s => s.id === serviceId);
  const mins = getServiceDurationMinutes(service);
  const [h, m] = startVal.split(':').map(Number);
  const total = h * 60 + m + mins;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const val = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  document.getElementById('nb-end-manual').value = val;
  document.getElementById('nb-start').value = startVal;
  document.getElementById('nb-end').value = val;
}

function toggleEndOverride(checked) {
  const endInput = document.getElementById('nb-end-manual');
  const badge = document.getElementById('nb-end-auto-badge');
  if (checked) {
    endInput.removeAttribute('readonly');
    endInput.style.background = '';
    endInput.style.cursor = '';
    badge.style.display = 'none';
  } else {
    endInput.setAttribute('readonly', true);
    endInput.style.background = 'var(--bg-secondary)';
    endInput.style.cursor = 'default';
    badge.style.display = '';
    autoCalcEndTimeManual();
  }
}

/* ── Slot picker ── */
let manualMode = false;
let selectedSlot = null; // "HH:MM"

function toggleManualTime() {
  manualMode = !manualMode;
  document.getElementById('nb-slots-section').style.display = manualMode ? 'none' : '';
  document.getElementById('nb-manual-start-group').style.display = manualMode ? '' : 'none';
  document.getElementById('nb-manual-end-group').style.display = manualMode ? '' : 'none';
  document.getElementById('nb-manual-toggle').textContent = manualMode ? 'use slot picker' : 'type manually';
  if (manualMode) {
    // sync manual inputs from hidden values
    const s = document.getElementById('nb-start').value;
    const e = document.getElementById('nb-end').value;
    if (s) document.getElementById('nb-start-manual').value = s;
    if (e) document.getElementById('nb-end-manual').value = e;
  }
}

async function loadSlots() {
  const serviceId = parseInt(document.getElementById('nb-service').value) || 0;
  const resourceId = parseInt(document.getElementById('nb-resource').value) || 0;
  const date = document.getElementById('nb-date').value;
  const grid = document.getElementById('nb-slots-grid');

  if (!serviceId || !resourceId || !date) {
    grid.innerHTML = '<span style="font-size:13px;color:var(--text-muted);">Select service, artist and date first</span>';
    document.getElementById('nb-start').value = '';
    document.getElementById('nb-end').value = '';
    selectedSlot = null;
    return;
  }

  grid.innerHTML = '<span style="font-size:13px;color:var(--text-muted);">Loading…</span>';
  document.getElementById('nb-slots-section').style.display = '';

  try {
    const res = await fetch(
      `${API}/booking/availability?date=${date}&resourceId=${resourceId}&serviceId=${serviceId}`,
      { credentials: 'include', cache: 'no-store' }
    );
    if (!res.ok) {
      grid.innerHTML = '<span style="font-size:13px;color:var(--text-muted);">Failed to load slots.</span>';
      return;
    }
    const data = await res.json();
    const slots = Array.isArray(data) ? data : (data.slots || []);

    if (!slots.length) {
      grid.innerHTML = '<span style="font-size:13px;color:var(--text-muted);">Artist not working this day.</span>';
      return;
    }

    grid.innerHTML = slots.map(start => {
      const startVal = String(start);
      const isSelected = selectedSlot === startVal;
      return `<button onclick="selectSlot('${startVal}')"
          id="slot-btn-${startVal.replace(':', '')}"
          style="padding:7px 13px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;
            border:1.5px solid ${isSelected ? 'var(--gold)' : 'var(--border)'};
            background:${isSelected ? 'var(--gold)' : 'transparent'};
            color:${isSelected ? '#fff' : 'var(--text)'};"
        >${startVal}</button>`;
    }).join('');

  } catch (e) {
    grid.innerHTML = '<span style="font-size:13px;color:var(--text-muted);">Failed to load slots.</span>';
    console.error(e);
  }
}

function selectSlot(start) {
  selectedSlot = start;
  document.getElementById('nb-start').value = start;
  document.getElementById('nb-end').value = '';
  // Update button styles
  document.querySelectorAll('#nb-slots-grid button').forEach(btn => {
    const isThis = btn.textContent.trim() === start;
    btn.style.background = isThis ? 'var(--gold)' : 'transparent';
    btn.style.borderColor = isThis ? 'var(--gold)' : 'var(--border)';
    btn.style.color = isThis ? '#fff' : 'var(--text)';
  });
}

function onServiceChange(serviceId) {
  populateResourceSelects(serviceId);
  if (!manualMode) loadSlots();
}

function onArtistOrDateChange() {
  if (!manualMode) loadSlots();
}

function populateResourceSelects(serviceId, selectedId) {
  let active = allResources.filter(r => r.active === 'true' || r.active === true);
  if (serviceId) {
    active = active.filter(r => r.services && r.services.some(s => s.id === serviceId));
  }
  const opts = active
    .map(r => `<option value="${r.id}"${r.id === selectedId ? ' selected' : ''}>${escHtml(r.name)}</option>`)
    .join('');
  document.getElementById('nb-resource').innerHTML = opts || '<option value="">No artists for this service</option>';
}

/* ════════════════════════════════════
   Load resources from API
════════════════════════════════════ */
async function loadResources() {
  try {
    const res = await fetch(`${API}/resources`, { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    allResources = Array.isArray(data) ? data : (data.resources || []);
    populateResourceSelects(null);
  } catch (e) {
    console.error('Failed to load resources:', e);
  }
}

/* ════════════════════════════════════
   Load salon services from API
════════════════════════════════════ */
async function loadSalonServices() {
  try {
    const res = await fetch(`${API}/services`, { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    allSalonServices = Array.isArray(data) ? data : (data.services || []);
    // Populate service select in New Booking modal
    const opts = allSalonServices
      .filter(s => s.active === 'true' || s.active === true)
      .map(s => `<option value="${s.id}">${escHtml(s.name)}${Number.isFinite(s.duration_minutes) ? ' (' + escHtml(String(s.duration_minutes)) + ' min)' : (s.duration ? ' (' + escHtml(String(s.duration)) + ')' : '')}</option>`)
      .join('');
    document.getElementById('nb-service').innerHTML =
      '<option value="">— Select service —</option>' + opts;
  } catch (e) {
    console.error('Failed to load salon services:', e);
  }
}

/* ════════════════════════════════════
   Load bookings from API
════════════════════════════════════ */
async function loadBookings() {
  try {
    const res = await fetch(`${API}/booking`, { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    allBookings = data.bookings || (Array.isArray(data) ? data : []);
    renderBookingList();
    renderCalendar();
  } catch (e) {
    console.error('Failed to load bookings:', e);
    document.getElementById('bookings-list').innerHTML =
      '<div style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load bookings.</div>';
  }
}

/* ════════════════════════════════════
   Booking card HTML helper
════════════════════════════════════ */
function bookingCardHtml(b) {
  const bDate = extractDate(b.start_time);
  const bStart = extractTime(b.start_time);
  const bEnd = extractTime(b.end_time);

  return `
    <div class="booking-card">
      <div class="booking-card-left">
        <h4>${escHtml(b.customer_name || '—')}</h4>
        <p>${escHtml(bDate)} · ${escHtml(bStart)}–${escHtml(bEnd)}</p>
        <div class="booking-time">${escHtml(resourceLabel(b.resource_id, b.service_id))}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        ${statusBadge(b.status)}
        <div class="action-menu-wrap">
          <button class="action-menu-btn" onclick="toggleMenu(this)">⋯</button>
          <div class="action-dropdown">
            <button class="action-dropdown-item" onclick="openBookingEditModal(${b.id})"><span class="adi-icon">✎</span> Edit Booking</button>
            <button class="action-dropdown-item" onclick="markStatus(${b.id},'confirmed')"><span class="adi-icon">✓</span> Mark Confirmed</button>
            <button class="action-dropdown-item" onclick="markStatus(${b.id},'pending')"><span class="adi-icon">⏳</span> Mark Pending</button>
            <div class="action-dropdown-divider"></div>
            <button class="action-dropdown-item danger" onclick="deleteBooking(${b.id})"><span class="adi-icon">✕</span> Cancel &amp; Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
/* ════════════════════════════════════
   Render booking list
════════════════════════════════════ */
function renderBookingList() {
  const filterStatus = document.querySelectorAll('.filter-select')[1]?.value || 'All Statuses';

  let filtered = allBookings;
  if (filterStatus !== 'All Statuses') {
    filtered = filtered.filter(b => b.status?.toLowerCase() === filterStatus.toLowerCase());
  }

  // ── Today card ──
  const todayStr = new Date().toISOString().split('T')[0];

  const todayBookings = filtered.filter(b => extractDate(b.start_time) === todayStr);

  document.getElementById('today-header').innerHTML =
    `Today — ${todayBookings.length} appointment${todayBookings.length !== 1 ? 's' : ''}<span></span>`;

  const todayList = document.getElementById('today-list');
  if (todayBookings.length > 0) {
    todayList.innerHTML = todayBookings.map(bookingCardHtml).join('');
  } else {
    todayList.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px 0;">No appointments today.</div>';
  }

  // ── Selected day card ──
  const selCard = document.getElementById('selected-day-card');
  if (selectedDate && selectedDate !== todayStr) {

    const selBookings = filtered.filter(b => extractDate(b.start_time) === selectedDate);
    const selDate = new Date(selectedDate + 'T00:00:00');
    const selLabel = selDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
    document.getElementById('selected-day-header').innerHTML =
      `${selLabel} — ${selBookings.length} appointment${selBookings.length !== 1 ? 's' : ''}<span></span>`;
    document.getElementById('selected-day-list').innerHTML = selBookings.length
      ? selBookings.map(bookingCardHtml).join('')
      : '<div style="text-align:center;color:var(--text-muted);padding:20px 0;">No appointments.</div>';
    selCard.style.display = '';
  } else {
    selCard.style.display = 'none';
  }

  // ── All bookings card ──
  document.getElementById('booking-list-header').innerHTML =
    `All Bookings — ${filtered.length} appointment${filtered.length !== 1 ? 's' : ''}<span></span>`;

  const list = document.getElementById('bookings-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px 0;">No bookings found.</div>';
    return;
  }

  list.innerHTML = filtered.map(bookingCardHtml).join('');


  // ── All bookings card ──
  document.getElementById('booking-list-header').innerHTML =
    `All Bookings — ${filtered.length} appointment${filtered.length !== 1 ? 's' : ''}<span></span>`;

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px 0;">No bookings found.</div>';
    return;
  }

  list.innerHTML = filtered.map(bookingCardHtml).join('');
}

/* ════════════════════════════════════
   Open Edit modal pre-filled
════════════════════════════════════ */
function openBookingEditModal(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  editingBookingId = id;

  const bDate = extractDate(b.start_time);
  const bStart = extractTime(b.start_time);
  const bEnd = extractTime(b.end_time);
  document.getElementById('bm-client').textContent = b.customer_name || '—';
  document.getElementById('bm-sub').textContent = `${bDate} at ${bStart}`;
  document.getElementById('bm-d-client').textContent = b.customer_name || '—';
  document.getElementById('bm-d-service').textContent = resourceLabel(b.resource_id, b.service_id);
  document.getElementById('bm-d-duration').textContent = `${bStart} – ${bEnd}`;
  document.getElementById('bm-d-date').textContent = formatDateLabel(bDate) || '—';
  document.getElementById('bm-d-time').textContent = `${bStart} – ${bEnd}`;
  document.getElementById('bm-d-status').innerHTML = statusBadge(b.status);

  document.getElementById('bm-edit-date').value = bDate;
  document.getElementById('bm-edit-start').value = bStart;
  document.getElementById('bm-edit-end').value = bEnd;
  document.getElementById('bm-edit-name').value = b.customer_name || '';
  document.getElementById('bm-edit-phone').value = b.customer_phone || '';
  document.getElementById('bm-edit-email').value = b.customer_email || '';
  document.getElementById('bm-edit-notes').value = '';

  const sel = document.getElementById('bm-edit-status');
  [...sel.options].forEach(o => { o.selected = o.value === b.status?.toLowerCase(); });

  closeMenu();
  openModal('modal-booking');
}

/* ════════════════════════════════════
   Save edited booking
════════════════════════════════════ */
async function saveBookingChanges() {
  if (!editingBookingId) return;
  const date = document.getElementById('bm-edit-date').value;
  const start = document.getElementById('bm-edit-start').value;
  const end = document.getElementById('bm-edit-end').value;
  const payload = {
    status: document.getElementById('bm-edit-status').value,
    customer_name: document.getElementById('bm-edit-name').value.trim(),
    customer_phone: document.getElementById('bm-edit-phone').value.trim(),
    customer_email: document.getElementById('bm-edit-email').value.trim(),
    start_time: date && start ? `${date}T${start}:00` : undefined,
    end_time: date && end ? `${date}T${end}:00` : undefined,
  };
  try {
    const res = await fetch(`${API}/booking/${editingBookingId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { const e = await res.json(); alert('Error: ' + (e.message || res.status)); return; }
    closeModal('modal-booking');
    editingBookingId = null;
    await loadBookings();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   Quick status change
════════════════════════════════════ */
async function markStatus(id, status) {
  closeMenu();
  // Optimistic update — change badge immediately
  const local = allBookings.find(b => b.id === id);
  if (local) { local.status = status; renderBookingList(); }
  try {
    const res = await fetch(`${API}/booking/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) { const e = await res.json(); alert('Error: ' + (e.message || res.status)); return; }
    await loadBookings();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   Delete / cancel booking
════════════════════════════════════ */
async function deleteBooking(id) {
  const b = allBookings.find(x => x.id === id);
  if (!b) return;
  const bDate = extractDate(b.start_time);
  if (!confirm(`Delete booking for "${b.customer_name}" on ${bDate}? This cannot be undone.`)) return;
  closeMenu();
  try {
    const res = await fetch(`${API}/booking/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) { const e = await res.json(); alert('Error: ' + (e.message || res.status)); return; }
    await loadBookings();
  } catch (e) { alert('Network error: ' + e.message); }
}

/* ════════════════════════════════════
   Create new booking
════════════════════════════════════ */
async function createBooking() {
  const date = document.getElementById('nb-date').value;
  const resource_id = parseInt(document.getElementById('nb-resource').value, 10);
  const service_id = parseInt(document.getElementById('nb-service').value, 10) || 0;
  const status = document.getElementById('nb-status').value;

  let start = document.getElementById('nb-start').value;
  if (manualMode) {
    start = document.getElementById('nb-start-manual').value;
  }

  if (!date || !start || !resource_id || !service_id) {
    alert('Service, artist, date and start time are required.');
    return;
  }
  try {
    const res = await fetch(`${API}/booking/slot`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId: resource_id, serviceId: service_id, date, start })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      if (res.status === 409) {
        alert(e.message || 'Selected slot is not available.');
      } else {
        alert('Error: ' + (e.message || res.status));
      }
      return;
    }
    closeModal('modal-new-booking');
    clearNewBookingForm();
    await loadBookings();
  } catch (e) { alert('Network error: ' + e.message); }
}

function clearNewBookingForm() {
  ['nb-name', 'nb-email', 'nb-phone', 'nb-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('nb-date').value = today;
  document.getElementById('nb-service').value = '';
  document.getElementById('nb-start').value = '';
  document.getElementById('nb-end').value = '';
  selectedSlot = null;
  manualMode = false;
  // reset manual mode UI
  document.getElementById('nb-slots-section').style.display = 'none';
  document.getElementById('nb-manual-start-group').style.display = 'none';
  document.getElementById('nb-manual-end-group').style.display = 'none';
  document.getElementById('nb-manual-toggle').textContent = 'type manually';
  // reset override checkbox
  const ovr = document.getElementById('nb-end-override');
  if (ovr) { ovr.checked = false; toggleEndOverride(false); }
  populateResourceSelects(null);
}
/* ── Extract "YYYY-MM-DD" from an ISO string ── */
function extractDate(isoString) {
  if (!isoString) return '—';
  return isoString.split('T')[0];
}

/* ── Extract "HH:MM" from an ISO string ── */
function extractTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
/* ════════════════════════════════════
   Filters
════════════════════════════════════ */
document.querySelectorAll('.filter-select').forEach(s => s.addEventListener('change', renderBookingList));

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

/* ════════════════════════════════════
   Calendar
════════════════════════════════════ */
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function renderCalendar() {
  document.getElementById('cal-title').textContent = MONTH_NAMES[calMonth] + ' ' + calYear;

  const todayStr = new Date().toISOString().split('T')[0];
  const firstDow = new Date(calYear, calMonth, 1).getDay();     // 0=Sun
  const offset = (firstDow + 6) % 7;                          // Mon-first
  const daysInMon = new Date(calYear, calMonth + 1, 0).getDate();

  const bookedDays = new Set();
  allBookings.forEach(b => {
    if (!b.start_time) return;
    const datePart = extractDate(b.start_time); // Pull "YYYY-MM-DD" safely
    const [y, m, d] = datePart.split('-').map(Number);
    if (y === calYear && m === calMonth + 1)
      bookedDays.add(d);
  });

  let html = '';
  ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach(n => { html += `<div class="cal-day-name">${n}</div>`; });
  for (let i = 0; i < offset; i++)  html += '<div class="cal-day other-month"></div>';

  for (let d = 1; d <= daysInMon; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSel = dateStr === selectedDate;
    const hasBook = bookedDays.has(d);
    const cls = ['cal-day', isToday ? 'today' : '', isSel ? 'selected' : '', hasBook ? 'has-bookings' : ''].filter(Boolean).join(' ');
    html += `<div class="${cls}" onclick="selectDay('${dateStr}')" style="cursor:pointer;">${d}</div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
}

function selectDay(dateStr) {
  selectedDate = dateStr;
  renderCalendar();
  renderBookingList();
}

function calPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function calNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function goToday() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedDate = now.toISOString().split('T')[0];
  renderCalendar();
}

/* ── Wire "New Booking" button ── */
document.querySelector('.btn.btn-gold').addEventListener('click', () => openModal('modal-new-booking'));

/* ── Escape to close ── */
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
renderCalendar();
checkAdmin().then(ok => {
  if (!ok) return;
  Promise.all([loadResources(), loadSalonServices()])
    .then(() => loadBookings())
    .then(() => {
      const pendingId = sessionStorage.getItem('openBookingId');
      if (pendingId) {
        sessionStorage.removeItem('openBookingId');
        openBookingEditModal(parseInt(pendingId, 10));
      }
    });
});

