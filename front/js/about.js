const API_URL = '';
let aboutSections = [];

// Keep escapeHtml for team/values where we want plain text protection
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// NEW: Helper to safely parse Quill HTML arrays without escaping the tags
function parseQuillHtml(rawHtml) {
  if (!rawHtml || rawHtml === '[]' || rawHtml === '""') return '';
  try {
    const parsed = JSON.parse(rawHtml);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.join(''); // Join all items without escaping to preserve Quill formatting
    }
  } catch (e) {
    // If it's not valid JSON, assume it's legacy raw string data
  }
  return rawHtml;
}

async function loadAboutSections() {
  const container = document.getElementById('about-main');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/about/public`);

    if (!res.ok) {
      throw new Error(`Server returned initialization status: ${res.status}`);
    }

    aboutSections = await res.json();

    if (!Array.isArray(aboutSections) || aboutSections.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:80px;color:#aaa;">No content has been published yet.</div>`;
      return;
    }

    container.innerHTML = aboutSections.map(section => {
      const sectionId = section.slug ? `id="section-${escapeHtml(section.slug)}"` : `id="section-id-${section.id}"`;

      // Images are mounted from your static path where NestJS saves them
      const imageSrc = section.image_path ? `front_admin/uploads/about/${section.image_path}` : null;

      // Extract body text paragraphs safely WITHOUT escaping the HTML tags
      const textHtml = parseQuillHtml(section.content_html || section.body);

      // ── LAYOUT RENDER ENGINE ───────────────────────────────────────────────
      let layoutHtml = '';

      if (section.type === 'hero') {
        // Full width Banner image layout
        if (imageSrc) {
          layoutHtml = `
            <div class="about-hero-block" style="width:100%; margin-bottom: 24px;">
              <img src="${imageSrc}" alt="About Banner" style="width:100%; height:auto; display:block; border-radius:4px;">
            </div>`;
        }
      }
      else if (section.type === 'split') {
        // Image on Left, Text Content on Right
        layoutHtml = `
          <div class="about-split-container" style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center;">
            ${imageSrc ? `<div class="about-split-media" style="flex: 1 1 400px;"><img src="${imageSrc}" style="width:100%; height:auto; border-radius:4px; display:block;"></div>` : ''}
            <div class="about-split-text" style="flex: 1 1 400px;">
              <div class="about-section-body-html rich-text-content">${textHtml}</div>
            </div>
          </div>`;
      }
      else if (section.type === 'split_reverse') {
        // Text Content on Left, Image on Right
        layoutHtml = `
          <div class="about-split-container" style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center;">
            <div class="about-split-text" style="flex: 1 1 400px;">
              <div class="about-section-body-html rich-text-content">${textHtml}</div>
            </div>
            ${imageSrc ? `<div class="about-split-media" style="flex: 1 1 400px;"><img src="${imageSrc}" style="width:100%; height:auto; border-radius:4px; display:block;"></div>` : ''}
          </div>`;
      }
      else if (section.type === 'values') {
        // Structured Grid Blocks
        let valuesGrid = [];
        try { valuesGrid = JSON.parse(section.content_html || section.body || '[]'); } catch (e) { }
        if (!Array.isArray(valuesGrid)) valuesGrid = [];

        layoutHtml = `
          <div class="about-values-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
            ${valuesGrid.map(v => `
              <div class="value-item-card" style="padding: 20px; border: 1px solid #f1f1f1; border-radius: 4px;">
                <h3 style="margin-top:0; margin-bottom:10px; color:var(--primary-color, #333);">${escapeHtml(v.title)}</h3>
                <p style="margin:0; font-size:14px; color:#666; line-height:1.5;">${escapeHtml(v.text)}</p>
              </div>
            `).join('')}
          </div>`;
      }
      else if (section.type === 'team') {
        // Team Bio Profile Layout 
        let members = [];
        try { members = JSON.parse(section.content_html || section.body || '[]'); } catch (e) { }
        if (!Array.isArray(members)) members = [];

        layoutHtml = `
          <div class="about-team-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
            ${members.map(m => `
              <div class="team-member-card" style="text-align: center; padding: 16px;">
                <h3 style="margin-bottom: 4px; margin-top:0;">${escapeHtml(m.name)}</h3>
                <p style="font-style: italic; color: #888; margin:0; font-size:14px;">${escapeHtml(m.role)}</p>
              </div>
            `).join('')}
          </div>`;
      }
      else {
        // Fallback Default Stack layout ('intro' style structural components)
        layoutHtml = `<div class="about-section-body-html rich-text-content">${textHtml}</div>`;
      }

      return `
        <section class="about-content-row" ${sectionId} style="margin-bottom: 40px; width: 100%;">
          ${layoutHtml}
        </section>
      `;
    }).join('<hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">');

  } catch (error) {
    console.error('Hydration process failure matching about modules:', error);
    container.innerHTML = `
      <div style="text-align:center;padding:80px;color:#c0392b;">
        <h3>Network error loading item</h3>
        <p style="font-size:14px;color:#888;margin-top:8px;">Unable to maintain socket communication with server modules.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAboutSections();
});
