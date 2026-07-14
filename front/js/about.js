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

function showPreviewBanner() {
  if (document.getElementById('preview-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'preview-banner';
  banner.style.cssText = `
    position: sticky; top: 0; z-index: 9999;
    background: #1a1a1a; color: #fff;
    padding: 10px 20px; text-align: center;
    font-family: 'Inter', sans-serif; font-size: 13px;
    display: flex; align-items: center; justify-content: center; gap: 16px;
  `;
  banner.innerHTML = `
    <span>👁 <strong>Preview Mode</strong> — showing all blocks including hidden ones</span>
    <a href="about.html" style="color:#caa46a;text-decoration:underline;font-size:12px;">Exit preview</a>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
}

function showPreviewDenied() {
  if (document.getElementById('preview-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'preview-banner';
  banner.style.cssText = `
    position: sticky; top: 0; z-index: 9999;
    background: #c0392b; color: #fff;
    padding: 10px 20px; text-align: center;
    font-family: 'Inter', sans-serif; font-size: 13px;
  `;
  banner.innerHTML = '🔒 Preview mode requires admin access — showing public page instead.';
  document.body.insertBefore(banner, document.body.firstChild);
}

async function loadAboutSections() {
  const container = document.getElementById('about-main');
  if (!container) return;

  // Preview mode — admins can see inactive blocks
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === '1';
  const endpoint = isPreview ? '/about/admin' : '/about/public';

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      credentials: isPreview ? 'include' : 'same-origin',
      cache: 'no-store',
    });

    // If preview fails (not admin), fall back to public
    if (isPreview && !res.ok) {
      const fallback = await fetch(`${API_URL}/about/public`);
      if (!fallback.ok) throw new Error('Failed to load');
      aboutSections = await fallback.json();
      showPreviewDenied();
    } else {
      if (!res.ok) throw new Error(`${res.status}`);
      aboutSections = await res.json();
      if (isPreview) showPreviewBanner();
    }

    if (!Array.isArray(aboutSections) || !aboutSections.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = aboutSections.map(s => {
      const imgSrc = s.image_path ? `front_admin/uploads/about/${s.image_path}` : null;
      const textHtml = parseQuillHtml(s.content_html || s.body);

      // In preview mode, wrap hidden blocks with a visual indicator
      const isHidden = isPreview && s.is_active === false;
      const wrap = (html) => isHidden
        ? `<div style="position:relative;opacity:0.5;outline:2px dashed #c0392b;outline-offset:-2px;margin:8px 0;">
             <div style="position:absolute;top:8px;right:8px;z-index:10;background:#c0392b;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">HIDDEN</div>
             ${html}
           </div>`
        : html;

      // ── INTRO ────────────────────────────────────────────────────────────────
      if (s.type === 'intro') {
        return wrap(`
          <section class="about-intro">
            <div class="text" style="max-width:680px;margin:0 auto;">${textHtml}</div>
          </section>`);
      }

      // ── SPLIT (image left, text right) ────────────────────────────────────
      if (s.type === 'split') {
        return wrap(`
          <section class="about-section split">
            <div class="image-placeholder large">
              ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(s.title || '')}">` : ''}
            </div>
            <div class="text">
              <div style="max-width:55ch;">${textHtml}</div>
            </div>
          </section>`);
      }

      // ── SPLIT REVERSE (text left, image right) ────────────────────────────
      if (s.type === 'split_reverse') {
        return wrap(`
          <section class="about-section split reverse">
            <div class="text">
              <div style="max-width:55ch;">${textHtml}</div>
            </div>
            <div class="image-placeholder medium">
              ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(s.title || '')}">` : ''}
            </div>
          </section>`);
      }

      // ── HERO (full width image) ───────────────────────────────────────────
      if (s.type === 'hero') {
        return wrap(`
          <section class="about-hero">
            <div class="image-placeholder wide">
              ${imgSrc ? `<img src="${imgSrc}" alt="About Lisa's Lashes">` : ''}
            </div>
          </section>`);
      }

      // ── VALUES ────────────────────────────────────────────────────────────
      if (s.type === 'values') {
        let values = [];
        try { values = JSON.parse(s.content_html || s.body || '[]'); } catch (e) { }
        if (!Array.isArray(values)) values = [];
        return wrap(`
          <section class="about-values">
            ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ''}
            <div class="values-grid">
              ${values.map(v => `
                <div class="value">
                  <h3>${escapeHtml(v.title || '')}</h3>
                  <p>${escapeHtml(v.text || '')}</p>
                </div>`).join('')}
            </div>
          </section>`);
      }

      // ── TEAM ──────────────────────────────────────────────────────────────
      if (s.type === 'team') {
        let members = [];
        try { members = JSON.parse(s.content_html || s.body || '[]'); } catch (e) { }
        if (!Array.isArray(members)) members = [];
        return wrap(`
          <section class="about-values">
            ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ''}
            <div class="values-grid">
              ${members.map(m => `
                <div class="value">
                  <h3>${escapeHtml(m.name || '')}</h3>
                  <p>${escapeHtml(m.role || '')}</p>
                </div>`).join('')}
            </div>
          </section>`);
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
