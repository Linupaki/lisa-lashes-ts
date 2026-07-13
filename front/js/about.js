const API_URL = '';
let aboutSections = [];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseQuillHtml(rawHtml) {
  if (!rawHtml || rawHtml === '[]' || rawHtml === '""') return '';
  let html = rawHtml;
  // Handle JSON array format ["<html>"]
  if (typeof html === 'string' && html.startsWith('[')) {
    try {
      const parsed = JSON.parse(html);
      if (Array.isArray(parsed) && parsed.length > 0) html = parsed.join('');
    } catch (e) { }
  }
  // Fix relative uploads paths to include front_admin prefix, clean nbsp and encoded quotes
  return html
    .replace(/src="uploads\//g, 'src="front_admin/uploads/')
    .replace(/&nbsp;/g, ' ')
    .replace(/%22/g, '"')
    .replace(/src=""([^"]+)""/g, 'src="$1"');
}

async function loadAboutSections() {
  const container = document.getElementById('about-main');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/about/public`);
    if (!res.ok) throw new Error(`${res.status}`);

    aboutSections = await res.json();

    if (!Array.isArray(aboutSections) || !aboutSections.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = aboutSections.map(s => {
      const imgSrc = s.image_path ? `front_admin/uploads/about/${s.image_path}` : null;
      const textHtml = parseQuillHtml(s.content_html || s.body);

      // ── INTRO ────────────────────────────────────────────────────────────────
      if (s.type === 'intro') {
        return `
          <section class="about-intro">
            <div class="text" style="max-width:680px;margin:0 auto;">${textHtml}</div>
          </section>`;
      }

      // ── SPLIT (image left, text right) ────────────────────────────────────
      if (s.type === 'split') {
        return `
          <section class="about-section split">
            <div class="image-placeholder large">
              ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(s.title || '')}">` : ''}
            </div>
            <div class="text">
              <div style="max-width:55ch;">${textHtml}</div>
            </div>
          </section>`;
      }

      // ── SPLIT REVERSE (text left, image right) ────────────────────────────
      if (s.type === 'split_reverse') {
        return `
          <section class="about-section split reverse">
            <div class="text">
              <div style="max-width:55ch;">${textHtml}</div>
            </div>
            <div class="image-placeholder medium">
              ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(s.title || '')}">` : ''}
            </div>
          </section>`;
      }

      // ── HERO (full width image) ───────────────────────────────────────────
      if (s.type === 'hero') {
        return `
          <section class="about-hero">
            <div class="image-placeholder wide">
              ${imgSrc ? `<img src="${imgSrc}" alt="About Lisa's Lashes">` : ''}
            </div>
          </section>`;
      }

      // ── VALUES ────────────────────────────────────────────────────────────
      if (s.type === 'values') {
        let values = [];
        try { values = JSON.parse(s.content_html || s.body || '[]'); } catch (e) { }
        if (!Array.isArray(values)) values = [];
        return `
          <section class="about-values">
            ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ''}
            <div class="values-grid">
              ${values.map(v => `
                <div class="value">
                  <h3>${escapeHtml(v.title || '')}</h3>
                  <p>${escapeHtml(v.text || '')}</p>
                </div>`).join('')}
            </div>
          </section>`;
      }

      // ── TEAM ──────────────────────────────────────────────────────────────
      if (s.type === 'team') {
        let members = [];
        try { members = JSON.parse(s.content_html || s.body || '[]'); } catch (e) { }
        if (!Array.isArray(members)) members = [];
        return `
          <section class="about-values">
            ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ''}
            <div class="values-grid">
              ${members.map(m => `
                <div class="value">
                  <h3>${escapeHtml(m.name || '')}</h3>
                  <p>${escapeHtml(m.role || '')}</p>
                </div>`).join('')}
            </div>
          </section>`;
      }

      return '';
    }).join('');

  } catch (error) {
    console.error('Failed to load about sections:', error);
    container.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAboutSections();
});
