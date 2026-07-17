const API = '';
let allBlocks = [];
let pendingImages = {}; // blockId/tempId -> File

document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAdminAccess();
  if (!user) return;
  document.getElementById('admin-name').textContent = user.first_name + ' ' + (user.last_name || '');
  document.getElementById('admin-avatar').textContent = user.first_name.charAt(0).toUpperCase();
  await loadBlocks();
});

// ── AUTH ──────────────────────────────────────────────────────────────────────

async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

// ── LOAD ──────────────────────────────────────────────────────────────────────

async function loadBlocks() {
  try {
    const res = await fetch(`${API}/about/admin`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error();
    allBlocks = await res.json();

    if (!allBlocks.length) {
      document.getElementById('blocks-container').innerHTML = `
        <div style="text-align:center;padding:60px;">
          <div style="font-size:36px;margin-bottom:12px;">📄</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px;">No blocks yet</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">
            Import the default content from your static about page to get started.
          </div>
          <button class="btn btn-gold" onclick="seedBlocks()">Import Default Content</button>
        </div>`;
      return;
    }

    renderBlocks();
  } catch (e) {
    document.getElementById('blocks-container').innerHTML =
      '<div style="text-align:center;color:red;padding:60px;">Failed to load blocks.</div>';
  }
}

async function seedBlocks() {
  try {
    await fetch(`${API}/about/seed`, { method: 'POST', credentials: 'include' });
    await loadBlocks();
  } catch (e) { alert('Failed to seed.'); }
}

// ── CONFIG & HELPERS ──────────────────────────────────────────────────────────

const TYPE_LABELS = {
  intro: 'Intro Section',
  text_only: 'Text Only Section',
  split: 'Image + Text',
  split_reverse: 'Text + Image',
  feature_block: 'Feature Focus (Text/Media)',
  hero: 'Full Width Image',
  values: 'Values Grid',
  team: 'Team Section',
  video: 'Fullscreen Video',
  divider: 'Devider',
};

// Returns true if the section is a rich-text layout manageable via the Quill modal
function isQuillEditable(type) {
  const excludedTypes = ['hero', 'values', 'team'];
  return !excludedTypes.includes(type);
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderBlocks() {
  const container = document.getElementById('blocks-container');
  if (!allBlocks.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">No blocks. Click + Add Block to start.</div>';
    return;
  }
  container.innerHTML = allBlocks.map((b, i) => renderBlockCard(b, i)).join('');
}

function renderBlockCard(b, i) {
  const typeLabel = TYPE_LABELS[b.type] || b.type;
  const title = b.title || typeLabel;
  const editable = isQuillEditable(b.type);

  // Dynamic visual indicators for styling the card border and modal button
  const editBtnClass = editable ? 'edit-btn-active' : 'edit-btn-disabled';
  const manageabilityBadge = editable
    ? `<span class="badge-editable">📝 Text Editable</span>`
    : `<span class="badge-structural">🔒 Structure Only</span>`;

  return `
    <div class="block-card ${editable ? 'block-card-editable' : 'block-card-structural'}" id="block-card-${b.id || b._tempId}" data-index="${i}">
      <div class="block-header" onclick="toggleBlock('${b.id || b._tempId}')">
        <div class="block-header-left">
          <span class="block-type-badge">${typeLabel}</span>
          ${manageabilityBadge}
          <span class="block-header-title">${esc(title)}</span>
        </div>
        <div class="block-controls" onclick="event.stopPropagation()">
          <button type="button" 
            class="btn btn-outline btn-sm ${editBtnClass}" 
            onclick="${editable ? `openAboutSectionsModal(${b.id || null})` : 'alert(\'This structural block is managed via the form fields inside this card. Click the card to expand.\')'}" 
            ${!editable ? 'disabled' : ''}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="edit-btn-icon"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit Content
          </button>
          <button class="block-ctrl-btn" onclick="moveBlock(${i}, -1)" title="Move up"   ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="block-ctrl-btn" onclick="moveBlock(${i},  1)" title="Move down" ${i === allBlocks.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="block-ctrl-btn danger" onclick="removeBlock(${i})" title="Delete">✕</button>
        </div>
        <span class="block-toggle">▾</span>
      </div>
      <div class="block-body" id="block-body-${b.id || b._tempId}">
        ${renderBlockFields(b, i)}
      </div>
    </div>
  `;
}

function renderBlockFields(b, i) {
  const parsed = (() => { try { return b.body ? JSON.parse(b.body) : null; } catch { return null; } })();
  const imgSrc = b.image_path ? `uploads/about/${b.image_path}` : null;

  let html = `
    <div class="block-active-toggle">
      <label class="toggle-switch">
        <input type="checkbox" id="active-${i}" ${b.is_active !== false ? 'checked' : ''} onchange="allBlocks[${i}].is_active = this.checked">
        <span class="toggle-slider"></span>
      </label>
      <span>Visible on page</span>
    </div>`;

  // 1. VIDEO SECTIONS (Mirrors Hero image layout styling)
  if (b.type === 'video') {
    html += `
      <div class="form-group">
        <label>Section Title / Overlay Header</label>
        <input type="text" class="form-input" id="title-${i}" value="${esc(b.title || '')}" oninput="allBlocks[${i}].title = this.value">
      </div>
      <div class="form-group">
        <label>Video Preview</label>
        <div class="video-preview-box">
          ${imgSrc
        ? `<video src="${imgSrc}" id="video-preview-${i}" class="video-preview-player" muted playsinline controls></video>`
        : `<div class="image-preview-placeholder video-preview-empty" id="video-preview-placeholder-${i}">📹</div>`
      }
        </div>
        <input type="file" class="form-input" accept="video/*" onchange="stageVideoInline(${i}, this)">
        <div class="field-hint">Video uploads instantly when you save changes.</div>
      </div>`;
    return html;
  }

  // 2. DIVIDER SECTIONS
  if (b.type === 'divider') {
    html += `
      <div class="divider-info-box">
        📏 Spacing Divider Line — No content fields required
      </div>`;
    return html;
  }

  // 3. DYNAMIC RICH-TEXT BLOCKS (Quill modal manageable)
  if (isQuillEditable(b.type)) {
    html += `
      <div class="form-group">
        <label>Section Name (admin only, not shown on page)</label>
        <input type="text" class="form-input" id="title-${i}" value="${esc(b.title || '')}" oninput="allBlocks[${i}].title = this.value">
      </div>`;
    if (b.type !== 'intro' && b.type !== 'text_only') {
      html += renderImageField(b, i, imgSrc);
    }
    return html;
  }

  // 4. HERO BLOCKS
  if (b.type === 'hero') {
    html += renderImageField(b, i, imgSrc);
    return html;
  }

  // 5. VALUES GRID
  if (b.type === 'values') {
    const values = Array.isArray(parsed) ? parsed : [];
    html += `
      <div class="form-group">
        <label>Section Heading</label>
        <input type="text" class="form-input" id="title-${i}" value="${esc(b.title || '')}" oninput="allBlocks[${i}].title = this.value">
      </div>
      <div class="form-group">
        <label>Values</label>
        <div id="values-list-${i}">
          ${values.map((v, vi) => renderValueRow(i, vi, v)).join('')}
        </div>
        <button class="add-item-btn" onclick="addValue(${i})">+ Add value</button>
      </div>`;
    return html;
  }

  // 6. TEAM MEMBERS
  if (b.type === 'team') {
    const members = Array.isArray(parsed) ? parsed : [];
    html += `
      <div class="form-group">
        <label>Section Heading</label>
        <input type="text" class="form-input" id="title-${i}" value="${esc(b.title || '')}" oninput="allBlocks[${i}].title = this.value">
      </div>
      <div class="form-group">
        <label>Team Members</label>
        <div id="team-list-${i}">
          ${members.map((m, mi) => renderTeamRow(i, mi, m)).join('')}
        </div>
        <button class="add-item-btn" onclick="addTeamMember(${i})">+ Add member</button>
      </div>`;
    return html;
  }

  return html;
}

function renderValueRow(i, vi, v = {}) {
  return `
    <div class="value-row" id="value-row-${i}-${vi}">
      <div class="sub-item-media">
        <div class="sub-item-thumb" id="val-img-preview-${i}-${vi}">
          ${v.image ? `<img src="${esc(v.image)}">` : '🖼️'}
        </div>
        <div class="sub-item-upload">
          <input type="file" class="form-input form-input-sm" accept="image/*" onchange="uploadSubItemImage(${i}, ${vi}, this, 'val')">
          <input type="hidden" id="val-img-url-${i}-${vi}" value="${esc(v.image || '')}">
          <div class="field-hint" id="val-upload-status-${i}-${vi}"></div>
        </div>
      </div>
      <input type="text" class="form-input" id="val-title-${i}-${vi}" placeholder="Title" value="${esc(v.title || '')}">
      <textarea class="form-input form-textarea" id="val-text-${i}-${vi}" placeholder="Description">${esc(v.text || '')}</textarea>
      <button class="rm-btn" onclick="removeValue(${i}, ${vi})">✕</button>
    </div>`;
}

function renderTeamRow(i, mi, m = {}) {
  return `
    <div class="value-row" id="team-row-${i}-${mi}">
      <div class="sub-item-media">
        <div class="sub-item-thumb" id="team-img-preview-${i}-${mi}">
          ${m.image ? `<img src="${esc(m.image)}">` : '🖼️'}
        </div>
        <div class="sub-item-upload">
          <input type="file" class="form-input form-input-sm" accept="image/*" onchange="uploadSubItemImage(${i}, ${mi}, this, 'team')">
          <input type="hidden" id="team-img-url-${i}-${mi}" value="${esc(m.image || '')}">
          <div class="field-hint" id="team-upload-status-${i}-${mi}"></div>
        </div>
      </div>
      <input type="text" class="form-input" id="team-name-${i}-${mi}" placeholder="Name" value="${esc(m.name || '')}">
      <textarea class="form-input form-textarea" id="team-role-${i}-${mi}" placeholder="Role / Bio">${esc(m.role || '')}</textarea>
      <button class="rm-btn" onclick="removeTeamMember(${i}, ${mi})">✕</button>
    </div>`;
}

function renderImageField(b, i, imgSrc) {
  return `
    <div class="form-group">
      <label>Image</label>
      ${imgSrc
      ? `<img src="${imgSrc}" class="image-preview" id="img-preview-${i}">`
      : `<div class="image-preview-placeholder" id="img-preview-${i}">🖼️</div>`}
      <input type="file" class="form-input" accept="image/*" onchange="stageImage(${i}, this)">
      <div class="field-hint">Image will upload when you save.</div>
    </div>`;
}

// ── BLOCK ACTIONS ─────────────────────────────────────────────────────────────

function toggleBlock(id) {
  const card = document.getElementById(`block-card-${id}`);
  const body = document.getElementById(`block-body-${id}`);
  if (card && body) {
    card.classList.toggle('expanded');
    body.classList.toggle('open');
  }
}

function moveBlock(i, dir) {
  collectCurrentState();
  const j = i + dir;
  if (j < 0 || j >= allBlocks.length) return;
  [allBlocks[i], allBlocks[j]] = [allBlocks[j], allBlocks[i]];
  renderBlocks();
}

async function removeBlock(i) {
  if (!confirm('Remove this block?')) return;
  collectCurrentState();
  const block = allBlocks[i];
  if (block.id && !String(block.id).startsWith('temp-')) {
    try {
      const res = await fetch(`${API}/about/admin?id=${block.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) { alert('Failed to delete block.'); return; }
    } catch (e) { alert('Network error: ' + e.message); return; }
  }
  allBlocks.splice(i, 1);
  renderBlocks();
}

function addBlock(type) {
  collectCurrentState();
  const tempId = `temp-${Date.now()}`;
  allBlocks.push({ _tempId: tempId, type, sort_order: allBlocks.length, is_active: true, body: "[]", content_html: "[]" });
  closeModal('modal-add-block');
  renderBlocks();
  setTimeout(() => toggleBlock(tempId), 50);
}

function showAddBlockModal() {
  collectCurrentState();
  openModal('modal-add-block');
}

// ── DYNAMIC FIELD ACTIONS ─────────────────────────────────────────────────────

function addValue(i) {
  const container = document.getElementById(`values-list-${i}`);
  const vi = container.children.length;
  container.insertAdjacentHTML('beforeend', renderValueRow(i, vi));
}

function removeValue(i, vi) {
  document.getElementById(`value-row-${i}-${vi}`)?.remove();
}

function addTeamMember(i) {
  const container = document.getElementById(`team-list-${i}`);
  const mi = container.children.length;
  container.insertAdjacentHTML('beforeend', renderTeamRow(i, mi));
}

function removeTeamMember(i, mi) {
  document.getElementById('team-row-' + i + '-' + mi)?.remove();
}

function stageImage(i, input) {
  const file = input.files[0];
  if (!file) return;
  const id = allBlocks[i].id || allBlocks[i]._tempId;
  pendingImages[id] = file;

  const preview = document.getElementById(`img-preview-${i}`);
  if (preview) {
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.tagName === 'DIV'
      ? (preview.outerHTML = `<img src="${url}" class="image-preview" id="img-preview-${i}">`)
      : (preview.src = url);
  }
}

// Staging video files directly on block card layout
function stageVideoInline(i, input) {
  const file = input.files[0];
  if (!file) return;
  const id = allBlocks[i].id || allBlocks[i]._tempId;
  pendingImages[id] = file;

  const previewPlaceholder = document.getElementById(`video-preview-placeholder-${i}`);
  let videoTag = document.getElementById(`video-preview-${i}`);

  const localUrl = URL.createObjectURL(file);

  if (previewPlaceholder) {
    const freshVideo = document.createElement('video');
    freshVideo.id = `video-preview-${i}`;
    freshVideo.style.cssText = 'width:100%; height:100%; object-fit:cover;';
    freshVideo.controls = true;
    freshVideo.muted = true;
    freshVideo.src = localUrl;
    previewPlaceholder.parentNode.replaceChild(freshVideo, previewPlaceholder);
  } else if (videoTag) {
    videoTag.src = localUrl;
    videoTag.load();
  }
}

async function uploadSubItemImage(blockIndex, itemIndex, input, prefix) {
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById(`${prefix}-upload-status-${blockIndex}-${itemIndex}`);
  const previewEl = document.getElementById(`${prefix}-img-preview-${blockIndex}-${itemIndex}`);
  const urlInput = document.getElementById(`${prefix}-img-url-${blockIndex}-${itemIndex}`);

  if (statusEl) {
    statusEl.textContent = 'Uploading...';
    statusEl.style.color = '#d35400';
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`${API}/about/content-media`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');

    const data = await res.json();
    const uploadedUrl = `uploads/about/${data.filename}`;

    if (urlInput) urlInput.value = uploadedUrl;

    if (previewEl) {
      previewEl.innerHTML = `<img src="${uploadedUrl}" style="width:100%; height:100%; object-fit:cover;">`;
    }

    if (statusEl) {
      statusEl.textContent = '✓ Uploaded';
      statusEl.style.color = '#27ae60';
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = '✕ Error: ' + e.message;
      statusEl.style.color = '#e74c3c';
    }
  }
}

// ── COLLECT STATE ─────────────────────────────────────────────────────────────

function collectCurrentState() {
  allBlocks.forEach((b, i) => {
    const key = b.id || b._tempId;
    if (!document.getElementById(`block-card-${key}`)) return;

    b.is_active = document.getElementById(`active-${i}`)?.checked !== false;
    b.sort_order = i;
    b.image_path = b.image_path || null;

    const inputTitle = document.getElementById(`title-${i}`)?.value?.trim();
    if (inputTitle !== undefined) {
      b.title = inputTitle || null;
    }

    // Protect custom dynamic text templates, video structures, and dividers from being cleared out
    if (isQuillEditable(b.type) || b.type === 'video' || b.type === 'divider') {
      return;
    }

    if (b.type === 'values') {
      const values = [];
      const container = document.getElementById(`values-list-${i}`);
      if (container) {
        container.querySelectorAll('.value-row').forEach(row => {
          const title = row.querySelector('[id^="val-title"]')?.value?.trim();
          const text = row.querySelector('[id^="val-text"]')?.value?.trim();
          const image = row.querySelector('[id^="val-img-url"]')?.value?.trim();
          if (title || text || image) values.push({ title: title || '', text: text || '', image: image || '' });
        });
      }
      b.body = JSON.stringify(values);
    }

    if (b.type === 'team') {
      const members = [];
      const container = document.getElementById(`team-list-${i}`);
      if (container) {
        container.querySelectorAll('.value-row').forEach(row => {
          const name = row.querySelector('[id^="team-name"]')?.value?.trim();
          const role = row.querySelector('[id^="team-role"]')?.value?.trim();
          const image = row.querySelector('[id^="team-img-url"]')?.value?.trim();
          if (name || role || image) members.push({ name: name || '', role: role || '', image: image || '' });
        });
      }
      b.body = JSON.stringify(members);
    }
  });
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

async function saveAll() {
  collectCurrentState();

  const status = document.getElementById('save-status');
  status.textContent = 'Saving…';
  status.style.color = 'var(--text-muted)';

  try {
    const keysBeforeSave = allBlocks.map(b => b.id || b._tempId);

    const res = await fetch(`${API}/about/admin`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: allBlocks }),
    });

    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Save failed.');
    const saved = await res.json();

    for (let i = 0; i < saved.length; i++) {
      const block = saved[i];
      const oldKey = keysBeforeSave[i];
      const file = pendingImages[oldKey];

      if (file) {
        const formData = new FormData();
        formData.append('image', file);

        const uploadRes = await fetch(`${API}/about/blocks/${block.id}/image`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error(`Failed uploading file/video asset for block ID: ${block.id}`);
        } else {
          delete pendingImages[oldKey];
        }
      }
    }

    status.textContent = '✓ Saved successfully!';
    status.style.color = '#27ae60';
    await loadBlocks();
    setTimeout(() => { status.textContent = ''; }, 3000);

  } catch (e) {
    status.textContent = '✕ ' + e.message;
    status.style.color = '#e74c3c';
  }
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function handleOverlayClick(e, id) { if (e.target === e.currentTarget) closeModal(id); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escHtml = esc;

// ── ABOUT PAGE CONTENT SECTIONS SYSTEM (QUILL) ──────────────────────────────

let aboutQuillInstance = null;
let currentAboutSectionId = null;

function setAboutSectionsStatus(message, kind = 'error') {
  const el = document.getElementById('about-sections-status');
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  el.textContent = message;
  if (kind === 'ok') {
    el.style.background = '#effaf1';
    el.style.border = '1px solid #cdebd2';
    el.style.color = '#2b6f3a';
  } else {
    el.style.background = '#fff3f3';
    el.style.border = '1px solid #f1cccc';
    el.style.color = '#8b2a2a';
  }
}

function ensureAboutEditor() {
  if (aboutQuillInstance) return;
  if (!window.Quill) {
    setAboutSectionsStatus('Rich text layout module missing. Please refresh.', 'error');
    return;
  }

  aboutQuillInstance = new Quill('#about-section-editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: function () {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            input.onchange = async () => {
              const file = input.files[0];
              if (!file) return;
              const formData = new FormData();
              formData.append('image', file);
              try {
                const res = await fetch(`${API}/about/content-media`, {
                  method: 'POST',
                  credentials: 'include',
                  body: formData,
                });
                if (!res.ok) { alert('Image upload failed.'); return; }
                const data = await res.json();
                const range = aboutQuillInstance.getSelection(true);
                aboutQuillInstance.insertEmbed(range.index, 'image', `uploads/about/${data.filename}`);
                aboutQuillInstance.setSelection(range.index + 1);
              } catch (e) {
                alert('Image upload error: ' + e.message);
              }
            };
          }
        }
      }
    },
  });
}

function openAboutSectionsModal(blockId = null) {
  setAboutSectionsStatus('');
  openModal('modal-about-sections');
  ensureAboutEditor();

  if (blockId) {
    selectAboutSection(blockId);
  } else {
    const firstTextBlock = allBlocks.find(b => isQuillEditable(b.type));
    if (firstTextBlock) {
      selectAboutSection(firstTextBlock.id);
    } else {
      currentAboutSectionId = null;
      document.getElementById('about-section-title').value = '';
      if (aboutQuillInstance) aboutQuillInstance.setText('');
    }
  }
  renderAboutSectionsList();
}

function renderAboutSectionsList() {
  const list = document.getElementById('about-sections-list');
  if (!list) return;

  // Render all blocks manageable inside the modal hierarchy (Quill, Video, and Divider blocks)
  const manageableBlocks = allBlocks.filter(b => isQuillEditable(b.type) || b.type === 'video' || b.type === 'divider');

  if (!manageableBlocks.length) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:10px;">No configurable section blocks found.</div>';
    return;
  }

  list.innerHTML = manageableBlocks
    .map((s, idx) => {
      const active = s.is_active !== false;
      const isSelected = (s.id && Number(s.id) === Number(currentAboutSectionId));
      const typeLabel = TYPE_LABELS[s.type] || s.type;
      return `
        <button type="button" onclick="selectAboutSection(${s.id})"
          class="section-list-btn ${isSelected ? 'selected' : ''}">
          <div class="section-list-row">
            <div class="section-list-title">${escHtml(s.title || typeLabel)}</div>
            <span class="section-list-status ${active ? 'on' : 'off'}">${active ? 'ON' : 'OFF'}</span>
          </div>
          <div class="section-list-meta">Position ${idx + 1} · ${typeLabel}</div>
        </button>
      `;
    })
    .join('');
}

function selectAboutSection(id) {
  if (!id) return;
  const block = allBlocks.find(s => Number(s.id) === Number(id));
  if (!block) return;
  currentAboutSectionId = block.id;

  document.getElementById('about-section-title').value = block.title || '';
  document.getElementById('about-section-active').value = block.is_active === false ? 'false' : 'true';

  const editorContainer = document.getElementById('about-section-editor');
  const mediaContainerId = 'modal-special-media-container';
  let mediaContainer = document.getElementById(mediaContainerId);

  if (!mediaContainer) {
    mediaContainer = document.createElement('div');
    mediaContainer.id = mediaContainerId;
    mediaContainer.className = 'modal-media-container';
    editorContainer.parentNode.insertBefore(mediaContainer, editorContainer);
  }
  mediaContainer.innerHTML = ''; // Clear prior elements

  ensureAboutEditor();

  // CASE 1: DIVIDER SECTIONS
  if (block.type === 'divider') {
    if (aboutQuillInstance) {
      aboutQuillInstance.root.innerHTML = '';
      aboutQuillInstance.enable(false);
    }
    editorContainer.style.opacity = '0.4';
    mediaContainer.innerHTML = `
      <div class="modal-info-box modal-info-muted">
        <strong>📏 Divider Line Block</strong><br>
        This section represents structural horizontal whitespace on the live page. No editable text canvas is required.
      </div>`;
    renderAboutSectionsList();
    return;
  }

  // CASE 2: VIDEO SECTIONS
  if (block.type === 'video') {
    if (aboutQuillInstance) {
      aboutQuillInstance.root.innerHTML = '';
      aboutQuillInstance.enable(false);
    }
    editorContainer.style.opacity = '0.4';

    const currentVideoPath = block.image_path ? `uploads/about/${block.image_path}` : '';
    mediaContainer.innerHTML = `
      <div class="modal-info-box modal-info-warm">
        <label class="modal-media-label">📹 Video Stream Asset File</label>
        <video src="${currentVideoPath}" controls class="modal-video-preview"></video>
        <input type="file" accept="video/*" onchange="stageVideoForModal(${block.id}, this)" class="form-input form-input-sm">
      </div>`;
    renderAboutSectionsList();
    return;
  }

  // CASE 3: STANDARD RICH TEXT/IMAGE BLOCKS (Enable Quill fully)
  if (aboutQuillInstance) {
    aboutQuillInstance.enable(true);
    editorContainer.style.opacity = '1';

    let contentHtml = block.content_html || block.body || '';

    if (typeof contentHtml === 'string' && contentHtml.startsWith('[')) {
      try {
        const parsed = JSON.parse(contentHtml);
        if (Array.isArray(parsed) && parsed.length > 0) contentHtml = parsed[0];
      } catch (e) { }
    }

    contentHtml = contentHtml
      .replace(/%22/g, '"')
      .replace(/src=""([^"]+)""/g, 'src="$1"');

    aboutQuillInstance.root.innerHTML = (contentHtml && contentHtml !== '[]') ? contentHtml : '';
  }

  renderAboutSectionsList();
}

function stageVideoForModal(blockId, input) {
  const file = input.files[0];
  if (!file) return;

  pendingImages[blockId] = file;

  const parent = input.parentNode;
  const videoElement = parent.querySelector('video');

  if (videoElement) {
    const localVideoURL = URL.createObjectURL(file);
    videoElement.src = localVideoURL;
    videoElement.load();

    videoElement.onended = function () {
      URL.revokeObjectURL(localVideoURL);
    };
  }

  let notice = parent.querySelector('.upload-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.className = 'upload-notice';
    parent.appendChild(notice);
  }
  notice.textContent = `✓ Video selected: "${file.name}" (Will upload on save)`;
}

async function saveCurrentAboutSection() {
  ensureAboutEditor();
  const title = (document.getElementById('about-section-title')?.value || '').trim();
  const isActive = (document.getElementById('about-section-active')?.value || 'true') === 'true';

  if (!currentAboutSectionId) {
    setAboutSectionsStatus('Please select a valid section block to modify.', 'error');
    return;
  }

  const targetIndex = allBlocks.findIndex(b => Number(b.id) === Number(currentAboutSectionId));
  if (targetIndex === -1) return;

  const currentBlock = allBlocks[targetIndex];

  // Save textual details only if it is a true rich text canvas
  if (currentBlock.type !== 'divider' && currentBlock.type !== 'video') {
    let rawHtml = '';
    if (aboutQuillInstance) {
      rawHtml = aboutQuillInstance.root.innerHTML;
      rawHtml = rawHtml.replace(/<p><br><\/p>$/, '').trim();
    }
    currentBlock.body = rawHtml;
    currentBlock.content_html = rawHtml;
  }

  currentBlock.title = title || currentBlock.title;
  currentBlock.is_active = isActive;

  setAboutSectionsStatus('Saving updates to backend...', 'ok');

  try {
    const res = await fetch(`${API}/about/admin`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: allBlocks }),
    });

    if (!res.ok) throw new Error('Root update sequence failed validation on server.');

    // Upload pending asset if one has been selected
    const file = pendingImages[currentAboutSectionId];
    if (file) {
      const formData = new FormData();
      formData.append('image', file); // API expects multipart field key as 'image'

      const uploadRes = await fetch(`${API}/about/blocks/${currentAboutSectionId}/image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Video/Image asset upload failed.');
      } else {
        delete pendingImages[currentAboutSectionId];
      }
    }

    setAboutSectionsStatus('Layout changes saved successfully!', 'ok');
    await loadBlocks();
    renderAboutSectionsList();
  } catch (e) {
    setAboutSectionsStatus('Save failed: ' + e.message, 'error');
  }
}
