const API = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-action="logout"]').forEach((a) => {
    a.addEventListener('click', (e) => doLogout(e));
  });

  const container = document.getElementById('bookings-container');
  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-action="download-course-receipt"]') : null;
      if (!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      if (id) downloadCourseReceipt(id);
    });
  }

  await checkSession();
});

async function checkSession() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      window.location.href = 'account-mobile.html';
      return;
    }

    const user = await res.json();

    const loader = document.getElementById('page-loading');
    if (loader) loader.style.display = 'none';

    const profile = document.getElementById('profile-section');
    if (profile) profile.style.display = 'block';

    if (user.role === 'admin' || user.role === 'master') {
      const adminLink = document.getElementById('admin-link');
      if (adminLink) adminLink.style.display = 'block';
    }

    await loadBookings();
  } catch (e) {
    window.location.href = 'account-mobile.html';
  }
}

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;

  try {
    const res = await fetch(API + '/course-bookings', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load');
    const bookings = await res.json();
    renderBookings(bookings);
  } catch (e) {
    container.innerHTML = '<div style="color:#c0392b;text-align:center;padding:40px;">Could not load bookings.</div>';
  }
}

function renderBookings(bookings) {
  const container = document.getElementById('bookings-container');
  if (!container) return;

  if (!Array.isArray(bookings) || bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-bookings">
        <div class="empty-emoji">🎓</div>
        <div>You haven't booked any courses yet.</div>
        <div style="margin-top:10px;"><a href="course-mobile.html">Browse courses</a></div>
      </div>`;
    return;
  }

  container.innerHTML = bookings
    .map((b) => {
      const c = b.course || {};
      const dateStr = c.date
        ? new Date(c.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : null;
      const timeStr = c.time_start && c.time_end ? `${c.time_start} – ${c.time_end}` : null;
      const statusClass = b.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled';
      const imgSrc = c.image_path ? `/front_admin/uploads/courses/${esc(c.image_path)}` : 'assets/logo/logo.png';

      return `
        <div class="course-booking-card">
          <img class="course-booking-img" src="${imgSrc}" alt="${esc(c.title || '')}">
          <div class="course-booking-body">
            <div class="course-booking-title">${esc(c.title || 'Course')}</div>
            ${c.instructor ? `<div class="course-booking-meta">👤 ${esc(c.instructor)}</div>` : ''}
            ${dateStr ? `<div class="course-booking-meta">📅 ${dateStr}${timeStr ? ' · ' + timeStr : ''}</div>` : ''}
            ${c.location ? `<div class="course-booking-meta">📍 ${esc(c.location)}</div>` : ''}
            <div class="course-booking-footer">
              <span class="booking-status ${statusClass}">${esc(b.status)}</span>
              <div class="course-booking-actions">
                <button class="course-receipt-btn" type="button" data-action="download-course-receipt" data-id="${b.id}">⬇ Receipt</button>
                <span class="course-booking-price">€${Number(c.price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function downloadCourseReceipt(bookingId) {
  try {
    const res = await fetch(`${API}/receipts/course-booking/${bookingId}`, { credentials: 'include' });
    if (!res.ok) {
      alert('Could not generate receipt.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-course-booking-${bookingId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function doLogout(event) {
  if (event) event.preventDefault();
  try {
    await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (e) {
    // ignore
  }
  window.location.href = 'account-mobile.html';
}
