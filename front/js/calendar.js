/* ============================================================
   calendar.js  — Lisa's Lashes booking widget (index.html)
   ============================================================ */

const API = '';

// ── State ──────────────────────────────────────────────────
let allServices  = [];   // salon_services from DB
let allResources = [];   // resources (artists) from DB
let currentUser  = null; // populated when session exists

let selectedDate  = null;    // "YYYY-MM-DD"
let selectedStart = null;    // "HH:MM"
let selectedEnd   = null;    // "HH:MM"
let currentDate   = new Date();

// ── DOM refs ───────────────────────────────────────────────
const serviceSelectEl  = document.getElementById('serviceSelect');
const resourceSelectEl = document.getElementById('resourceSelect');
const timeSlotsEl      = document.getElementById('timeSlots');
const bookNowBtn       = document.getElementById('bookNowBtn');
const daysEl           = document.getElementById('days');
const monthYearEl      = document.getElementById('monthYear');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/* ============================================================
   Helpers
   ============================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/** "90 min", "1h 30min", "01:30:00" etc. → total minutes */
function parseDuration(durationStr) {
  if (!durationStr) return 60;
  // PostgreSQL interval format: "01:30:00"
  const pg = durationStr.match(/^(\d+):(\d+):\d+$/);
  if (pg) return parseInt(pg[1]) * 60 + parseInt(pg[2]);
  // "1h 30min" / "90 min"
  const hm = durationStr.match(/(\d+)\s*h(?:r|our)?s?\s*(?:(\d+)\s*min)?/i);
  if (hm) return parseInt(hm[1]) * 60 + (hm[2] ? parseInt(hm[2]) : 0);
  const mo = durationStr.match(/(\d+)\s*min/i);
  if (mo) return parseInt(mo[1]);
  return 60;
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function showToast(msg, isError) {
  const el = document.getElementById('bookingToast');
  if (!el) return;
  el.textContent  = msg;
  el.style.display = 'block';
  el.style.background = isError ? '#b94040' : '#2c2c2c';
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.style.display = 'none'; }, 3800);
}

/* ============================================================
   1. Bootstrap: load services, resources, and current user
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  Promise.all([loadServices(), loadResources(), loadCurrentUser()])
    .then(function() { renderCalendar(); });
});

async function loadServices() {
  try {
    const res = await fetch(API + '/services', { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    allServices = (Array.isArray(data) ? data : data.services || []).filter(function(s) {
      return s.active === 'true' || s.active === true;
    });

    const opts = allServices
      .map(function(s) {
        return '<option value="' + s.id + '">' + escHtml(s.name) +
               (s.duration_minutes ? ' (' + escHtml(String(s.duration_minutes)) + ' min)' : '') + '</option>';
      })
      .join('');
    serviceSelectEl.innerHTML = '<option value="">Select Service</option>' + opts;
  } catch (e) {
    console.error('Failed to load services:', e);
    serviceSelectEl.innerHTML = '<option value="">Failed to load</option>';
  }
}

async function loadResources() {
  try {
    const res  = await fetch(API + '/resources', { credentials: 'include', cache: 'no-store' });
    const data = await res.json();
    allResources = (Array.isArray(data) ? data : data.resources || []).filter(function(r) {
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
    if (res.ok) {
      currentUser = await res.json();
    } else {
      currentUser = null;
    }
  } catch (e) {
    currentUser = null;
  }
}

/* ============================================================
   2. Service select → filter artist list
   ============================================================ */
serviceSelectEl.addEventListener('change', function() {
  const serviceId = parseInt(serviceSelectEl.value) || 0;
  populateResourceSelect(serviceId);
  clearTimeSlots();
  selectedStart = null;
  selectedEnd   = null;
});

function populateResourceSelect(serviceId) {
  var artists = allResources;

  if (serviceId) {
    artists = artists.filter(function(r) {
      return r.services && r.services.some(function(s) { return s.id === serviceId; });
    });
  }

  const opts = artists
    .map(function(r) { return '<option value="' + r.id + '">' + escHtml(r.name) + '</option>'; })
    .join('');

  resourceSelectEl.innerHTML = opts
    ? '<option value="">Any Artist</option>' + opts
    : '<option value="">No artists for this service</option>';
}

resourceSelectEl.addEventListener('change', function() {
  if (selectedDate) loadAvailability(selectedDate);
});

/* ============================================================
   3. Calendar rendering
   ============================================================ */
function renderCalendar() {
  const month = currentDate.getMonth();
  const year  = currentDate.getFullYear();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay       = new Date(year, month + 1, 0).getDate();
  const prevLastDay   = new Date(year, month, 0).getDate();

  monthYearEl.innerText = MONTHS[month] + ' ' + year;
  daysEl.innerHTML = '';

  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  // Trailing days from previous month
  for (var x = firstDayIndex; x > 0; x--) {
    daysEl.innerHTML += '<div class="day inactive">' + (prevLastDay - x + 1) + '</div>';
  }

  // Current month days
  for (var i = 1; i <= lastDay; i++) {
    const fullDate   = formatDate(year, month, i);
    const isToday    = fullDate === todayStr;
    const isSelected = fullDate === selectedDate;
    const isPast     = fullDate < todayStr;

    var cls = 'day current';
    if (isToday)    cls += ' today';
    if (isSelected) cls += ' selected';
    if (isPast)     cls += ' inactive';

    daysEl.innerHTML += '<div class="' + cls + '" data-date="' + fullDate + '">' + i + '</div>';
  }
}

// Navigation
document.getElementById('prev').onclick = function() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById('next').onclick = function() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

document.getElementById('todayBtn').onclick = function() {
  currentDate   = new Date();
  const today   = new Date();
  selectedDate  = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  renderCalendar();
  loadAvailability(selectedDate);
};

// Click on a calendar day
daysEl.addEventListener('click', function(e) {
  const dayEl = e.target.closest('.day.current:not(.inactive)');
  if (!dayEl) return;

  selectedDate  = dayEl.dataset.date;
  selectedStart = null;
  selectedEnd   = null;

  document.querySelectorAll('.day').forEach(function(d) { d.classList.remove('selected'); });
  dayEl.classList.add('selected');

  loadAvailability(selectedDate);
});

/* ============================================================
   4. Availability — fetch & render time slots
   ============================================================ */
async function loadAvailability(date) {
  const resourceId = parseInt(resourceSelectEl.value) || null;
  const serviceId  = parseInt(serviceSelectEl.value)  || 0;

  if (!serviceId) {
    timeSlotsEl.innerHTML = '<p class="no-slots">Select a service to see available times.</p>';
    return;
  }

  if (!resourceId) {
    timeSlotsEl.innerHTML = '<p class="no-slots">Select an artist to see available times.</p>';
    return;
  }

  const service  = allServices.find(function(s) { return s.id === serviceId; });
  const duration = service ? (service.duration_minutes || 60) : 60;

  timeSlotsEl.innerHTML = '<p class="no-slots">Loading…</p>';

  try {
    const res = await fetch(
      API + '/booking/availability?date=' + date + '&resourceId=' + resourceId + '&serviceId=' + serviceId,
      { credentials: 'include', cache: 'no-store' }
    );
    const slots = await res.json();
    renderTimeSlots((Array.isArray(slots) ? slots : []).map(function(s) { return { start: s, free: true }; }), duration);
  } catch (err) {
    console.error('Availability error:', err);
    timeSlotsEl.innerHTML = '<p class="no-slots">Failed to load times. Please try again.</p>';
  }
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

function renderTimeSlots(slots, durationMinutes) {
  timeSlotsEl.innerHTML = '';
  selectedStart = null;
  selectedEnd   = null;

  if (!slots.length) {
    timeSlotsEl.innerHTML = '<p class="no-slots">No available slots for this date.</p>';
    return;
  }

  slots.forEach(function(slot) {
    const btn = document.createElement('button');
    const slotEnd = addMinutesToHHmm(slot.start, durationMinutes);
    btn.textContent = slotEnd ? (slot.start + ' – ' + slotEnd) : slot.start;

    if (slot.free) {
      btn.className = 'time-slot';
      btn.addEventListener('click', function() {
        timeSlotsEl.querySelectorAll('.time-slot').forEach(function(b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        selectedStart = slot.start;
        selectedEnd = slotEnd;
        if (!selectedEnd) {
          selectedStart = null;
          btn.classList.remove('selected');
          showToast('Invalid time slot format. Please refresh.', true);
        }
      });
    } else {
      btn.className = 'time-slot booked';
      btn.disabled  = true;
    }

    timeSlotsEl.appendChild(btn);
  });
}

function clearTimeSlots() {
  timeSlotsEl.innerHTML = '<p class="no-slots">Select a date to see available times.</p>';
}

/* ============================================================
   5. Book Now button
   ============================================================ */
bookNowBtn.addEventListener('click', async function() {
  if (!serviceSelectEl.value) {
    showToast('Please select a service.', true); return;
  }
  if (!resourceSelectEl.value) {
    showToast('Please select an artist.', true); return;
  }
  if (!selectedDate) {
    showToast('Please select a date on the calendar.', true); return;
  }
  if (!selectedStart || !selectedEnd) {
    showToast('Please select a time slot.', true); return;
  }

  // Re-check session
  await loadCurrentUser();

  if (!currentUser) {
    openLoginRequiredModal();
    return;
  }

  const serviceName = serviceSelectEl.options[serviceSelectEl.selectedIndex]
    ? serviceSelectEl.options[serviceSelectEl.selectedIndex].text : '';
  const artistName  = resourceSelectEl.options[resourceSelectEl.selectedIndex]
    ? resourceSelectEl.options[resourceSelectEl.selectedIndex].text : '';
  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  document.getElementById('bm-summary').innerHTML =
    '<b>Name:</b> '    + escHtml(currentUser.first_name + ' ' + currentUser.last_name) + '<br>' +
    '<b>Phone:</b> '   + escHtml(currentUser.phone || '—')   + '<br>' +
    '<b>Service:</b> ' + escHtml(serviceName) + '<br>' +
    '<b>Artist:</b> '  + escHtml(artistName)  + '<br>' +
    '<b>Date:</b> '    + escHtml(displayDate) + '<br>' +
    '<b>Time:</b> '    + escHtml(selectedStart) + ' – ' + escHtml(selectedEnd);

  openBookingModal();
});

/* ============================================================
   6. Booking confirmation modal
   ============================================================ */
function openBookingModal() {
  const modal = document.getElementById('bookingModal');
  modal.style.display = 'flex';
}

function closeBookingModal() {
  document.getElementById('bookingModal').style.display = 'none';
}

function openLoginRequiredModal() {
  document.getElementById('loginRequiredModal').style.display = 'flex';
}

function closeLoginRequiredModal() {
  document.getElementById('loginRequiredModal').style.display = 'none';
}

document.getElementById('bookingModal').addEventListener('click', function(e) {
  if (e.target === this) closeBookingModal();
});

document.getElementById('loginRequiredModal').addEventListener('click', function(e) {
  if (e.target === this) closeLoginRequiredModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeBookingModal(); closeLoginRequiredModal(); }
});

async function confirmBooking() {
  const confirmBtn     = document.getElementById('confirmBtn');
  const resourceId = parseInt(resourceSelectEl.value, 10);
  const serviceId = parseInt(serviceSelectEl.value, 10) || 0;

  confirmBtn.disabled    = true;
  confirmBtn.textContent = 'Booking…';

  try {
    const res = await fetch(API + '/booking/slot', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
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
      selectedEnd   = null;
      timeSlotsEl.querySelectorAll('.time-slot').forEach(function(b) {
        b.classList.remove('selected');
      });
      loadAvailability(selectedDate);
    } else {
      const err = await res.json().catch(function() { return {}; });
      if (res.status === 409) {
        showToast('That slot was just taken. Please choose another time.', true);
        closeBookingModal();
        loadAvailability(selectedDate);
      } else if (res.status === 302 || res.status === 401) {
        closeBookingModal();
        openLoginRequiredModal();
      } else {
        showToast('Booking failed: ' + (err.message || res.status), true);
      }
    }
  } catch (e) {
    console.error('Booking error:', e);
    showToast('Network error. Please try again.', true);
  } finally {
    confirmBtn.disabled    = false;
    confirmBtn.textContent = 'Confirm';
  }
}



