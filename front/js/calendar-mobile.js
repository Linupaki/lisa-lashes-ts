/* ============================================================
   calendar-mobile.js — booking widget for index-mobile.html
   Uses same API endpoints/logic as desktop calendar.js
   ============================================================ */

const API = '';

// ── State ──────────────────────────────────────────────────
let allServices = [];
let allResources = [];
let currentUser = null;

let selectedDate = null; // YYYY-MM-DD
let selectedStart = null; // HH:mm
let selectedEnd = null; // HH:mm
let assignedResourceId = null;
let currentDate = new Date();

// ── DOM refs ───────────────────────────────────────────────
const serviceSelectEl = document.getElementById('serviceSelect');
const resourceSelectEl = document.getElementById('resourceSelect');
const timeSlotsEl = document.getElementById('timeSlots');
const bookNowBtn = document.getElementById('bookNowBtn');
const calendarGridEl = document.getElementById('calendarGrid');
const monthYearEl = document.getElementById('monthYear');
const selectedDateEl = document.getElementById('selectedDate');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

if (
  serviceSelectEl &&
  resourceSelectEl &&
  timeSlotsEl &&
  bookNowBtn &&
  calendarGridEl &&
  monthYearEl &&
  selectedDateEl
) {
  document.addEventListener('DOMContentLoaded', function () {
    Promise.all([loadServices(), loadResources(), loadCurrentUser()])
      .then(function () {
        renderCalendar();
        clearTimeSlots();
      });
  });

  serviceSelectEl.addEventListener('change', function () {
    const serviceId = parseInt(serviceSelectEl.value, 10) || 0;
    populateResourceSelect(serviceId);
    clearTimeSlots();
    selectedStart = null;
    selectedEnd = null;
    assignedResourceId = null;

    if (selectedDate) loadAvailability(selectedDate);
  });

  resourceSelectEl.addEventListener('change', function () {
    if (selectedDate) loadAvailability(selectedDate);
  });

  bookNowBtn.addEventListener('click', async function () {
    if (!serviceSelectEl.value) {
      showToast('Please select a service.', true);
      return;
    }

    if (!selectedDate) {
      showToast('Please select a date on the calendar.', true);
      return;
    }

    if (!selectedStart || !selectedEnd) {
      showToast('Please select a time slot.', true);
      return;
    }

    await loadCurrentUser();
    if (!currentUser) {
      openLoginRequiredModal();
      return;
    }

    const serviceName = serviceSelectEl.options[serviceSelectEl.selectedIndex]
      ? serviceSelectEl.options[serviceSelectEl.selectedIndex].text
      : '';

    const chosenResourceId = parseInt(resourceSelectEl.value, 10) || assignedResourceId;
    const assignedArtist = allResources.find(function (r) { return r.id === chosenResourceId; });

    const artistName = assignedArtist
      ? assignedArtist.name
      : (resourceSelectEl.options[resourceSelectEl.selectedIndex]?.text || 'Any available');

    const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const summaryEl = document.getElementById('bm-summary');
    if (summaryEl) {
      summaryEl.innerHTML =
        '<b>Name:</b> ' + escHtml((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')) + '<br>' +
        '<b>Phone:</b> ' + escHtml(currentUser.phone || '—') + '<br>' +
        '<b>Service:</b> ' + escHtml(serviceName) + '<br>' +
        '<b>Artist:</b> ' + escHtml(artistName) + '<br>' +
        '<b>Date:</b> ' + escHtml(displayDate) + '<br>' +
        '<b>Time:</b> ' + escHtml(selectedStart) + ' – ' + escHtml(selectedEnd);
    }

    openBookingModal();
  });
}

/* ============================================================
   Helpers
   ============================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, isError) {
  const el = document.getElementById('bookingToast');
  if (!el) {
    if (isError) alert(msg);
    return;
  }

  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = isError ? '#b94040' : '#2c2c2c';
  clearTimeout(el._timer);
  el._timer = setTimeout(function () {
    el.style.display = 'none';
  }, 3800);
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addMinutesToHHmm(hhmm, minutesToAdd) {
  const m = String(hhmm || '').match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const total = hours * 60 + minutes + minutesToAdd;
  const outH = Math.floor(total / 60) % 24;
  const outM = total % 60;
  return String(outH).padStart(2, '0') + ':' + String(outM).padStart(2, '0');
}

/* ============================================================
   Data loading (same endpoints as desktop)
   ============================================================ */
async function loadServices() {
  try {
    const res = await fetch(API + '/services', { credentials: 'include', cache: 'no-store' });
    const data = await res.json();

    allServices = (Array.isArray(data) ? data : data.services || []).filter(function (s) {
      return s.active === 'true' || s.active === true;
    });

    const opts = allServices
      .map(function (s) {
        const dur = s.duration_minutes ? ` (${String(s.duration_minutes)} min)` : '';
        return `<option value="${s.id}">${escHtml(s.name)}${escHtml(dur)}</option>`;
      })
      .join('');

    serviceSelectEl.innerHTML = `<option value="">Select Service</option>${opts}`;
  } catch (e) {
    console.error('Failed to load services:', e);
    serviceSelectEl.innerHTML = '<option value="">Failed to load</option>';
  }
}

async function loadResources() {
  try {
    const res = await fetch(API + '/resources', { credentials: 'include', cache: 'no-store' });
    const data = await res.json();

    allResources = (Array.isArray(data) ? data : data.resources || []).filter(function (r) {
      return r.active === 'true' || r.active === true;
    });

    populateResourceSelect(0);
  } catch (e) {
    console.error('Failed to load resources:', e);
    resourceSelectEl.innerHTML = '<option value="">Failed to load</option>';
  }
}

async function loadCurrentUser() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    currentUser = res.ok ? await res.json() : null;
  } catch (e) {
    currentUser = null;
  }
}

function populateResourceSelect(serviceId) {
  let artists = allResources;

  if (serviceId) {
    artists = artists.filter(function (r) {
      return r.services && r.services.some(function (s) { return s.id === serviceId; });
    });
  }

  const opts = artists
    .map(function (r) { return `<option value="${r.id}">${escHtml(r.name)}</option>`; })
    .join('');

  resourceSelectEl.innerHTML = opts
    ? `<option value="">Any Artist</option>${opts}`
    : '<option value="">No artists for this service</option>';
}

/* ============================================================
   Calendar rendering (mobile grid)
   ============================================================ */
function renderCalendar() {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  monthYearEl.textContent = `${MONTHS[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  calendarGridEl.innerHTML = '';

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(function (d) {
    const el = document.createElement('div');
    el.className = 'calendar-day-name';
    el.textContent = d;
    calendarGridEl.appendChild(el);
  });

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    calendarGridEl.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);

    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = String(day);

    const isPast = dateStr < todayStr;
    if (isPast) {
      dayEl.classList.add('disabled');
    } else {
      dayEl.style.cursor = 'pointer';
      dayEl.addEventListener('click', function () {
        selectedDate = dateStr;
        selectedStart = null;
        selectedEnd = null;
        assignedResourceId = null;

        selectedDateEl.textContent = `Selected: ${dateStr}`;

        renderCalendar();
        loadAvailability(selectedDate);
      });
    }

    if (selectedDate && selectedDate === dateStr) {
      dayEl.classList.add('selected');
    }

    calendarGridEl.appendChild(dayEl);
  }
}

// Month navigation (called from HTML)
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

/* ============================================================
   Availability
   ============================================================ */
async function loadAvailability(date) {
  const resourceId = parseInt(resourceSelectEl.value, 10) || null;
  const serviceId = parseInt(serviceSelectEl.value, 10) || 0;

  if (!serviceId) {
    timeSlotsEl.innerHTML = '<p class="no-slots">Select a service to see available times.</p>';
    return;
  }

  const service = allServices.find(function (s) { return s.id === serviceId; });
  const duration = service ? (service.duration_minutes || 60) : 60;

  timeSlotsEl.innerHTML = '<p class="no-slots">Loading…</p>';
  assignedResourceId = null;
  selectedStart = null;
  selectedEnd = null;

  try {
    if (resourceId) {
      const res = await fetch(
        API + '/booking/availability?date=' + date + '&resourceId=' + resourceId + '&serviceId=' + serviceId,
        { credentials: 'include', cache: 'no-store' }
      );

      const slots = await res.json();
      renderTimeSlots(
        (Array.isArray(slots) ? slots : []).map(function (s) { return { start: s, free: true, resourceId: resourceId }; }),
        duration
      );
    } else {
      // Any Artist
      const artists = allResources.filter(function (r) {
        if (!r.services || !r.services.length) return true;
        return r.services.some(function (s) { return s.id === serviceId; });
      });

      const toQuery = artists.length ? artists : allResources;

      const results = await Promise.all(
        toQuery.map(function (r) {
          return fetch(
            API + '/booking/availability?date=' + date + '&resourceId=' + r.id + '&serviceId=' + serviceId,
            { credentials: 'include', cache: 'no-store' }
          )
            .then(function (res) { return res.json(); })
            .then(function (slots) {
              return (Array.isArray(slots) ? slots : []).map(function (s) {
                return { start: s, free: true, resourceId: r.id, resourceName: r.name };
              });
            })
            .catch(function () { return []; });
        })
      );

      const seen = {};
      const merged = [];

      results.forEach(function (artistSlots) {
        artistSlots.forEach(function (slot) {
          if (!seen[slot.start]) {
            seen[slot.start] = true;
            merged.push(slot);
          }
        });
      });

      merged.sort(function (a, b) { return a.start.localeCompare(b.start); });
      renderTimeSlots(merged, duration);
    }
  } catch (err) {
    console.error('Availability error:', err);
    timeSlotsEl.innerHTML = '<p class="no-slots">Failed to load times. Please try again.</p>';
  }
}

function renderTimeSlots(slots, durationMinutes) {
  timeSlotsEl.innerHTML = '';

  selectedStart = null;
  selectedEnd = null;
  assignedResourceId = null;

  if (!slots.length) {
    timeSlotsEl.innerHTML = '<p class="no-slots">No available slots for this date.</p>';
    return;
  }

  slots.forEach(function (slot) {
    const btn = document.createElement('button');
    const slotEnd = addMinutesToHHmm(slot.start, durationMinutes);

    btn.type = 'button';
    btn.className = 'time-slot';
    btn.textContent = slotEnd ? (slot.start + ' – ' + slotEnd) : slot.start;

    btn.addEventListener('click', function () {
      timeSlotsEl.querySelectorAll('.time-slot').forEach(function (b) {
        b.classList.remove('selected');
      });

      btn.classList.add('selected');
      selectedStart = slot.start;
      selectedEnd = slotEnd;
      assignedResourceId = slot.resourceId || null;

      if (!selectedEnd) {
        selectedStart = null;
        assignedResourceId = null;
        btn.classList.remove('selected');
        showToast('Invalid time slot format. Please refresh.', true);
      }
    });

    timeSlotsEl.appendChild(btn);
  });
}

function clearTimeSlots() {
  timeSlotsEl.innerHTML = '<p class="no-slots">Select a date to see available times.</p>';
}

/* ============================================================
   Modals / confirmation (same IDs as desktop)
   ============================================================ */
function openBookingModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) modal.style.display = 'flex';
}

function closeBookingModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) modal.style.display = 'none';
}

function openLoginRequiredModal() {
  const modal = document.getElementById('loginRequiredModal');
  if (modal) modal.style.display = 'flex';
}

function closeLoginRequiredModal() {
  const modal = document.getElementById('loginRequiredModal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('click', function (e) {
  const bm = document.getElementById('bookingModal');
  const lm = document.getElementById('loginRequiredModal');
  if (bm && e.target === bm) closeBookingModal();
  if (lm && e.target === lm) closeLoginRequiredModal();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeBookingModal();
    closeLoginRequiredModal();
  }
});

async function confirmBooking() {
  const confirmBtn = document.getElementById('confirmBtn');

  const resourceId = parseInt(resourceSelectEl.value, 10) || assignedResourceId;
  const serviceId = parseInt(serviceSelectEl.value, 10) || 0;

  if (!resourceId) {
    showToast('Could not determine artist. Please select a time slot again.', true);
    closeBookingModal();
    return;
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Booking…';
  }

  try {
    const res = await fetch(API + '/booking/slot', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceId: resourceId,
        serviceId: serviceId,
        date: selectedDate,
        start: selectedStart
      })
    });

    if (res.ok) {
      closeBookingModal();
      showToast('✓ Booking confirmed! See you soon.');
      selectedStart = null;
      selectedEnd = null;
      loadAvailability(selectedDate);
      return;
    }

    if (res.status === 409) {
      closeBookingModal();
      showToast('That slot was just taken. Please choose another time.', true);
      loadAvailability(selectedDate);
      return;
    }

    if (res.status === 302 || res.status === 401) {
      closeBookingModal();
      openLoginRequiredModal();
      return;
    }

    const err = await res.json().catch(function () { return {}; });
    showToast('Booking failed: ' + (err.message || res.status), true);
  } catch (e) {
    console.error('Booking error:', e);
    showToast('Network error. Please try again.', true);
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm';
    }
  }
}
