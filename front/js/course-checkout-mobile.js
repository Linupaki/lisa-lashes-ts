const API = window.location.origin;
const params = new URLSearchParams(window.location.search);
const courseId = parseInt(params.get('id')) || null;

let currentUser = null;
let course = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!courseId) {
    showError('No course specified.');
    return;
  }

  await Promise.all([loadUser(), loadCourse()]);
});

// ── USER ─────────────────────────────────────────────────────────────────────

async function loadUser() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      window.location.href = 'login-mobile.html';
      return;
    }

    currentUser = await res.json();

    if (currentUser.first_name) document.getElementById('checkout-first').value = currentUser.first_name;
    if (currentUser.last_name) document.getElementById('checkout-last').value = currentUser.last_name;
    if (currentUser.email) document.getElementById('checkout-email').value = currentUser.email;
    if (currentUser.phone) document.getElementById('checkout-phone').value = currentUser.phone;
  } catch (e) {
    window.location.href = 'login-mobile.html';
  }
}

// ── COURSE ───────────────────────────────────────────────────────────────────

async function loadCourse() {
  try {
    const [courseRes, spotsRes] = await Promise.all([
      fetch(`${API}/courses/${courseId}`, { cache: 'no-store' }),
      fetch(`${API}/courses/${courseId}/spots`, { cache: 'no-store' }),
    ]);

    if (!courseRes.ok) {
      showError('Course not found.');
      return;
    }

    course = await courseRes.json();
    const spotsData = spotsRes.ok ? await spotsRes.json() : null;

    document.getElementById('course-loading').style.display = 'none';
    document.getElementById('course-summary-block').style.display = 'block';

    const img = document.getElementById('cs-img');
    img.src = course.image_path
      ? `/front_admin/uploads/courses/${esc(course.image_path)}`
      : 'assets/logo/logo.png';
    img.alt = course.title || '';

    document.getElementById('cs-title').textContent = course.title || 'Course';
    document.getElementById('summary-title').textContent = course.title || 'Course Summary';

    if (course.instructor) {
      const el = document.getElementById('cs-instructor');
      el.textContent = '👤 ' + course.instructor;
      el.style.display = 'block';
    }

    if (course.date) {
      const dateStr = new Date(course.date).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const timeStr = course.time_start && course.time_end
        ? ` · ${course.time_start} – ${course.time_end}`
        : (course.time_start ? ` · ${course.time_start}` : '');
      const el = document.getElementById('cs-date');
      el.textContent = '📅 ' + dateStr + timeStr;
      el.style.display = 'block';
    }

    if (course.location) {
      const el = document.getElementById('cs-location');
      el.textContent = '📍 ' + course.location;
      el.style.display = 'block';
    }

    const price = Number(course.price || 0).toFixed(2);
    document.getElementById('cs-price').textContent = `€${price}`;
    document.getElementById('cs-total').textContent = `€${price}`;

    // Spots badge
    const spotsEl = document.getElementById('cs-spots');
    if (spotsData && spotsData.spots !== null) {
      const avail = spotsData.available;
      if (avail <= 0) {
        spotsEl.innerHTML = '<span class="spots-badge spots-out">Fully Booked</span>';
        disableBooking();
      } else if (avail <= 3) {
        spotsEl.innerHTML = `<span class="spots-badge spots-low">Only ${avail} spot${avail !== 1 ? 's' : ''} left!</span>`;
      } else {
        spotsEl.innerHTML = `<span class="spots-badge spots-ok">${avail} spots available</span>`;
      }
    }

    // Check if already booked
    if (currentUser) {
      try {
        const myRes = await fetch(`${API}/course-bookings`, { credentials: 'include', cache: 'no-store' });
        if (myRes.ok) {
          const bookings = await myRes.json();
          const already = Array.isArray(bookings)
            ? bookings.find((b) => b.course_id === courseId && b.status !== 'cancelled')
            : null;
          if (already) {
            document.getElementById('details-panel').style.display = 'none';
            document.getElementById('already-booked-panel').style.display = 'block';
          }
        }
      } catch (e) { }
    }
  } catch (e) {
    showError('Could not load course details. Please try again.');
  }
}

// ── CONFIRM ───────────────────────────────────────────────────────────────────

async function confirmBooking() {
  const firstName = document.getElementById('checkout-first').value.trim();
  const lastName = document.getElementById('checkout-last').value.trim();
  const phone = document.getElementById('checkout-phone').value.trim();
  const errEl = document.getElementById('checkout-error');
  const btn = document.getElementById('confirm-btn');

  errEl.style.display = 'none';

  if (!firstName || !lastName || !phone) {
    errEl.textContent = 'First name, last name and phone are required.';
    errEl.style.display = 'block';
    return;
  }

  if (!currentUser) {
    window.location.href = 'login-mobile.html';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Booking…';

  try {
    const res = await fetch(`${API}/course-bookings/${courseId}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (res.status === 401) {
      window.location.href = 'login-mobile.html';
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.message || 'Could not complete booking. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Confirm Booking';
      return;
    }

    document.getElementById('details-panel').style.display = 'none';
    document.getElementById('success-panel').style.display = 'block';
    document.getElementById('success-title-text').textContent = course?.title || 'this course';
  } catch (e) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function showError(msg) {
  const loading = document.getElementById('course-loading');
  if (loading) loading.style.display = 'none';
  const block = document.getElementById('course-summary-block');
  if (block) block.style.display = 'block';

  const errEl = document.getElementById('checkout-error');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}

function disableBooking() {
  const btn = document.getElementById('confirm-btn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
