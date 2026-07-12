const API = '';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = 'account.html'; return; }
    const user = await res.json();
    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('profile-section').style.display = 'flex';
    if (user.role === 'admin' || user.role === 'master') {
      document.getElementById('admin-link').style.display = 'block';
    }
    await loadBookings();
  } catch (e) {
    window.location.href = 'account.html';
  }
});

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  try {
    const res = await fetch(API + '/course-bookings', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error();
    const bookings = await res.json();
    renderBookings(bookings);
  } catch (e) {
    container.innerHTML = '<div style="color:#c0392b;text-align:center;padding:40px;">Could not load bookings.</div>';
  }
}

function renderBookings(bookings) {
  const container = document.getElementById('bookings-container');

  if (!bookings.length) {
    container.innerHTML = `
      <div class="empty-bookings">
        <div style="font-size:40px;margin-bottom:16px;">🎓</div>
        <div>You haven't booked any courses yet.</div>
        <div style="margin-top:10px;"><a href="course.html">Browse courses</a></div>
      </div>`;
    return;
  }

  container.innerHTML = bookings.map(b => {
    const c = b.course;
    const dateStr = c.date
      ? new Date(c.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    const timeStr = c.time_start && c.time_end ? `${c.time_start} – ${c.time_end}` : null;
    const statusClass = b.status === 'confirmed' ? 'status-confirmed' : 'status-cancelled';
    const imgSrc = c.image_path ? `/front_admin/uploads/courses/${esc(c.image_path)}` : 'assets/logo/logo.png';

    return `
      <div class="course-booking-card">
        <img class="course-booking-img" src="${imgSrc}" alt="${esc(c.title)}">
        <div class="course-booking-body">
          <div class="course-booking-title">${esc(c.title)}</div>
          ${c.instructor ? `<div class="course-booking-meta">👤 ${esc(c.instructor)}</div>` : ''}
          ${dateStr ? `<div class="course-booking-meta">📅 ${dateStr}${timeStr ? ' · ' + timeStr : ''}</div>` : ''}
          ${c.location ? `<div class="course-booking-meta">📍 ${esc(c.location)}</div>` : ''}
          <div class="course-booking-footer">
            <span class="booking-status ${statusClass}">${esc(b.status)}</span>
            <div style="display:flex;align-items:center;gap:12px;">
              <button onclick="downloadCourseReceipt(${b.id})"
                style="font-size:12px;color:#888;background:none;border:1px solid #ddd;padding:4px 10px;border-radius:6px;cursor:pointer;transition:all 0.2s;font-family:inherit;"
                onmouseover="this.style.borderColor='#caa46a';this.style.color='#caa46a'"
                onmouseout="this.style.borderColor='#ddd';this.style.color='#888'">
                ⬇ Receipt
              </button>
              <span class="course-booking-price">€${Number(c.price).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function downloadCourseReceipt(bookingId) {
  try {
    const res = await fetch(`${API}/receipts/course-booking/${bookingId}`, { credentials: 'include' });
    if (!res.ok) { alert('Could not generate receipt.'); return; }
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

async function doLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = 'account.html';
}
