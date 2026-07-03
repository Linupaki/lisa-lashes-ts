// ── CORE ENVIRONMENT CONFIGURATION ──
const API = 'http://localhost:3000';
const ADMIN_API = 'http://localhost:3000/admin';
let allReviews = [];

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAdmin();
  if (isAuthenticated) {
    await loadReviews();
    setupFilteringListeners();
  }
});

async function checkAdmin() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = '/login.html'; return false; }
    const user = await res.json();
    if (!(user.role === 'admin' || user.role === 'master')) { window.location.href = '/account.html'; return false; }
    document.getElementById('admin-name').textContent = user.first_name + ' ' + (user.last_name || '');
    document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
    return true;
  } catch (e) {
    window.location.href = '/login.html';
    return false;
  }
}

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadReviews() {
  const container = document.getElementById('reviews-container');
  try {
    const res = await fetch(`${ADMIN_API}/reviews`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP tracking block ${res.status}`);

    const data = await res.json();
    allReviews = data.reviews || (Array.isArray(data) ? data : []);

    calculateStats();
    renderReviewsGrid(allReviews);
  } catch (e) {
    console.error("Failed to load global studio feedback rows:", e);
    container.innerHTML = `
        <div style="text-align:center; color:red; padding:40px; grid-column:1/-1;">
          Failed to fetch client review indices. Verify database runtime connectivity coordinates.
        </div>`;
  }
}
function renderReviewsGrid(reviewsToRender) {
  const container = document.getElementById('reviews-container');
  if (!reviewsToRender.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;grid-column:1/-1;">No reviews found matching current filter targets.</div>`;
    return;
  }

  container.innerHTML = reviewsToRender.map(r => {
    const score = parseInt(r.rating) || 5;
    const starString = '★'.repeat(score) + '☆'.repeat(Math.max(0, 5 - score));

    let displayDate = r.created_at || r.date || '';
    if (displayDate.includes('T')) displayDate = displayDate.split('T')[0];

    const currentStatus = String(r.status || 'pending').toLowerCase();
    const cardOpacity = currentStatus === 'hidden' ? 'opacity: 0.65;' : '';
    const statusBadge = currentStatus === 'pending'
      ? `<span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--gold); letter-spacing:1px; margin-left:8px;">[Pending Approval]</span>`
      : currentStatus === 'hidden'
        ? `<span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:1px; margin-left:8px;">[Hidden]</span>`
        : '';

    return `
        <div class="review-card" style="${cardOpacity} display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div class="review-card-header">
              <div class="reviewer-info">
                <h4>${escHtml((r.user?.first_name || '') + ' ' + (r.user?.last_name || ''))}</h4>
                <div style="font-size:12px;color:var(--text-muted);">
                  ${escHtml(r.product?.name || '')}
                </div>
                <div class="review-date">${escHtml(displayDate)} ${statusBadge}</div>
              </div>
              <div class="review-stars" style="color:var(--gold); font-weight:bold;">${starString}</div>
            </div>
            <p class="review-text">"${escHtml(r.comment || '')}"</p>
            ${(r.review_images || []).length ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                ${(r.review_images).map(img => `<img src="../front_admin/uploads/reviews/${escHtml(img.path)}" style="width:54px;height:54px;object-fit:cover;border-radius:4px;border:1px solid var(--border);">`).join('')}
              </div>` : ''}
          </div>
          <div class="review-actions" style="margin-top:16px; display:flex; gap:8px;">
            ${currentStatus !== 'approved' ? `<button class="btn btn-gold btn-sm" onclick="updateReviewStatus(${r.id}, 'approved')">✓ Approve</button>` : ''}
            ${currentStatus !== 'hidden' ? `<button class="btn btn-outline btn-sm" onclick="updateReviewStatus(${r.id}, 'hidden')">Hide</button>` : `<button class="btn btn-outline btn-sm" onclick="updateReviewStatus(${r.id}, 'approved')">Unhide</button>`}
            <button class="btn btn-outline btn-sm" style="color:red; border-color:rgba(255,0,0,0.2); margin-left:auto;" onclick="purgeReviewRecord(${r.id})">Delete</button>
          </div>
        </div>
      `;
  }).join('');
}
function setupFilteringListeners() {
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const ratingFilter = document.getElementById('rating-filter');

  const executeFilterPipeline = () => {
    const query = searchInput.value.toLowerCase().trim();
    const statusValue = statusFilter.value;
    const ratingValue = ratingFilter.value;

    let results = allReviews;
    if (query) {
      results = results.filter(r =>
        ((r.user?.first_name || '') + ' ' + (r.user?.last_name || '')).toLowerCase().includes(query) ||
        (r.comment || '').toLowerCase().includes(query) ||
        (r.product?.name || '').toLowerCase().includes(query)
      );
    }
    if (statusValue !== 'all') {
      results = results.filter(r => String(r.status || 'pending').toLowerCase() === statusValue);
    }
    if (ratingValue !== 'all') {
      if (ratingValue === '3-below') {
        results = results.filter(r => (parseInt(r.rating) || 5) <= 3);
      } else {
        results = results.filter(r => (parseInt(r.rating) || 5) === parseInt(ratingValue));
      }
    }

    renderReviewsGrid(results);
  };

  searchInput.addEventListener('input', executeFilterPipeline);
  statusFilter.addEventListener('change', executeFilterPipeline);
  ratingFilter.addEventListener('change', executeFilterPipeline);
}

function calculateStats() {
  const total = allReviews.length;
  if (!total) {
    document.getElementById('stats-counter').textContent = "⭐ 0.0 average · 0 reviews";
    return;
  }
  const sum = allReviews.reduce((acc, r) => acc + (parseFloat(r.rating) || 5), 0);
  const avg = (sum / total).toFixed(1);
  document.getElementById('stats-counter').textContent = `⭐ ${avg} average · ${total} reviews`;
}
async function updateReviewStatus(id, newStatus) {
  try {
    const res = await fetch(`${ADMIN_API}/reviews?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error("Database mutation intercept execution dropped.");

    const targetReview = allReviews.find(r => r.id === id);
    if (targetReview) targetReview.status = newStatus;

    calculateStats();
    document.getElementById('status-filter').dispatchEvent(new Event('change'));
  } catch (e) {
    console.error("Failed handling processing state execution:", e);
    alert("System could not change processing state parameters mapping layout.");
  }
}
async function purgeReviewRecord(id) {
  if (!confirm("Are you sure you want to completely drop and purge this review transaction permanently from standard logs? This action is irreversible.")) return;
  try {
    const res = await fetch(`${ADMIN_API}/reviews?id=${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) throw new Error("Failed running backend destruction transaction pipeline loop.");

    allReviews = allReviews.filter(r => r.id !== id);
    calculateStats();
    document.getElementById('status-filter').dispatchEvent(new Event('change'));
  } catch (e) {
    console.error("Purge failure protocol intercept exception error:", e);
    alert("Transactional handshake dropped. Could not flush target from data layout layers.");
  }
}
