const API_URL = '';

async function loadCatalogue() {
  const grid = document.getElementById('catalogue-grid');
  if (!grid) return;

  try {
    const res = await fetch(`${API_URL}/gallery/public`);
    if (!res.ok) throw new Error(res.status);

    const items = await res.json();

    if (!items.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#aaa;padding:60px;">No work to show yet — check back soon.</div>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="work-card">
        <div class="work-image">
          <img src="front_admin/uploads/gallery/${esc(item.image_path)}"
               alt="${esc(item.title)}"
               onerror="this.src='assets/logo/logo.png'">
        </div>
        <h3>${esc(item.title)}</h3>
      </div>
    `).join('');

  } catch (e) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#aaa;padding:60px;">Could not load the catalogue.</div>';
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', loadCatalogue);
