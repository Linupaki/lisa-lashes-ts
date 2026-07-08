const API = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
});

async function checkSession() {
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
}

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  try {
    const res = await fetch(API + '/booking/my', { credentials: 'include', cache: 'no-store' });
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
        <div style="font-size:40px;margin-bottom:16px;">📅</div>
        <div>You have no bookings yet.</div>
        <div style="margin-top:10px;"><a href="index.html#booking-section">Book an appointment</a></div>
      </div>`;
    return;
  }

  container.innerHTML = bookings.map(b => {
    const startDate = b.start_time
      ? new Date(b.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const startTime = b.start_time
      ? new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '—';
    const endTime = b.end_time
      ? new Date(b.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '—';

    const statusClass = {
      confirmed: 'status-confirmed',
      pending:   'status-pending',
      cancelled: 'status-cancelled',
      completed: 'status-completed',
    }[b.status] || 'status-pending';

    const service  = b.salon_services?.name || '—';
    const resource = b.resources?.name || '—';
    const price    = b.salon_services?.price != null
      ? `€${Number(b.salon_services.price).toFixed(2)}`
      : null;
    const duration = b.salon_services?.duration_minutes
      ? `${b.salon_services.duration_minutes} min`
      : null;

    return `
      <div class="booking-card">
        <div class="booking-header">
          <div>
            <div class="booking-id">Booking #${b.id}</div>
            <div class="booking-date">${startDate}</div>
          </div>
          <span class="booking-status ${statusClass}">${esc(b.status)}</span>
        </div>

        <div class="booking-body">
          <div class="booking-detail">
            <span class="booking-detail-label">Service</span>
            <span class="booking-detail-value">${esc(service)}</span>
          </div>
          <div class="booking-detail">
            <span class="booking-detail-label">Artist</span>
            <span class="booking-detail-value">${esc(resource)}</span>
          </div>
          <div class="booking-detail">
            <span class="booking-detail-label">Time</span>
            <span class="booking-detail-value">${startTime} – ${endTime}</span>
          </div>
          ${duration ? `
          <div class="booking-detail">
            <span class="booking-detail-label">Duration</span>
            <span class="booking-detail-value">${duration}</span>
          </div>` : ''}
        </div>

        <div class="booking-footer">
          <span>${esc(b.customer_name || '')}</span>
          ${price ? `<span class="booking-price">${price}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function doLogout(event) {
  if (event) event.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
  window.location.href = 'account.html';
}
