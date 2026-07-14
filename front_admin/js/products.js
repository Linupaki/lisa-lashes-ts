const API = '';

let allProducts = [];
let allProductTypes = [];
let editingId = null;
let editingTypeId = null;
let editingTypeOriginalName = '';
let editingPromoId = null;

/* ── Live Calendar Topbar Date Injection ── */
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* ── Lifecycle Boot Flow Sequence ── */
document.addEventListener('DOMContentLoaded', async () => {
  const isAuthorized = await checkAdmin();
  if (isAuthorized) {
    const typesInput = document.getElementById('types-new-name');
    if (typesInput) {
      typesInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          createTypeFromModal();
        }
      });
    }
    await loadProductTypes();
    await loadProducts();
    if (document.getElementById('promocodes-tbody')) {
      await loadPromocodes();
    }
  }
});

/* ── XSS Protection Safe String Escaper ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escHtml(str) { return escapeHtml(str); }

/* ── Secure Client-Side Session Interceptor ── */
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

/* ── System Logout Routine ── */
async function doAdminLogout(e) {
  e.preventDefault();
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { }
  window.location.href = '/index.html';
}

/* ── Load Products Framework Core ── */
async function loadProducts() {
  try {
    const res = await fetch(`${API}/products`, { credentials: 'include' });
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : (data.products || []);
    renderTable(allProducts);
  } catch (e) {
    console.error('Failed to load products index data matrix:', e);
  }
}

/* ── Load Dynamic Product Types Setup ── */
async function loadProductTypes() {
  try {
    const res = await fetch(`${API}/product-types`, { credentials: 'include' });
    if (!res.ok) return;

    allProductTypes = await res.json();

    const optionsHtml = `<option value="">— Select Type —</option>` +
      allProductTypes.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');

    const addSelect = document.getElementById('add-product-type');
    const editSelect = document.getElementById('p-product-type');

    if (addSelect) addSelect.innerHTML = optionsHtml;
    if (editSelect) editSelect.innerHTML = optionsHtml;

    // Populate toolbar category filter
    const filterSelect = document.getElementById('filter-category');
    if (filterSelect) {
      filterSelect.innerHTML = `<option value="All Categories">All Categories</option>` +
        allProductTypes.map(t => `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`).join('');
    }
  } catch (err) {
    console.error('Failed loading product type entities:', err);
  }
}

function stockBadge(stock) {
  if (stock <= 0) return '<span class="badge badge-out">Out of Stock</span>';
  if (stock <= 20) return '<span class="badge badge-low">Low Stock</span>';
  return '<span class="badge badge-active">In Stock</span>';
}

/* ── Render Products Data Table ── */
function renderTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No products found.</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => {
    const mediaUrl = `./uploads/products/` + p.path;
    let thumbnailHtml = `<div class="product-thumb-placeholder">💄</div>`;

    if (p.path) {
      if (p.path.toLowerCase().endsWith('.mp4')) {
        thumbnailHtml = `<video src="${mediaUrl}" muted loop autoplay playsinline style="width:32px; height:32px; object-fit:cover; border-radius:4px; pointer-events:none;"></video>`;
      } else {
        thumbnailHtml = `<img src="${mediaUrl}" style="width:32px; height:32px; object-fit:cover; border-radius:4px;">`;
      }
    }

    // Read fallback type classification parameter row
    const typeDisplay = p.product_type?.name || p.category || '—';

    return `
        <tr>
          <td>${thumbnailHtml}</td>
          <td class="td-name">
            <div>
              ${escapeHtml(p.name)}
              ${isDiscountActive(p.product_discount) ? `<span style="margin-left:6px;font-size:10px;font-weight:700;background:#fff3cd;color:#856404;padding:1px 6px;border-radius:10px;">🏷 ${discountBadgeText(p.product_discount)}</span>` : ''}
            </div>
            <div style="margin-top: 4px; display: flex; gap: 4px;">
              <span onclick=""
                    style="font-size:10px;padding:2px 6px;border-radius:12px;font-weight:600;${p.status === 'active' ? 'background:#e6f4ea;color:#137333;' :
        p.status === 'hidden' ? 'background:#fce8e6;color:#c5221f;' :
          'background:#f1f3f4;color:#5f6368;'
      }">
                ${p.status === 'active' ? '● Active' : p.status === 'hidden' ? '○ Hidden' : '✎ Draft'}
              </span>
              <span onclick="toggleProductProperty(${p.id}, 'in_slider', ${p.in_slider})" 
                    style="cursor:pointer; font-size:10px; padding:2px 6px; border-radius:12px; font-weight:600; 
                           background:${p.in_slider ? '#e8f0fe' : '#f1f3f4'}; color:${p.in_slider ? '#1a73e8' : '#5f6368'};">
                ${p.in_slider ? '★ In Slider' : '☆ No Slider'}
              </span>
            </div>
          </td>
          <td>${escapeHtml(typeDisplay)}</td>
          <td>€${parseFloat(p.price).toFixed(2)}</td>
          <td>${p.stock}</td>
          <td>${stockBadge(p.stock)}</td>
          <td>
            <div class="action-menu-wrap">
              <button class="action-menu-btn" onclick="toggleMenu(this)">⋯</button>
              <div class="action-dropdown">
                <button class="action-dropdown-item" onclick="openEditModal(${p.id})"><span class="adi-icon">✎</span> Edit Product</button>
                <button class="action-dropdown-item" onclick="openDiscountModal(${p.id}, '${escapeHtml(p.name)}', ${parseFloat(p.price)}, ${JSON.stringify(p.product_discount || null).replace(/"/g, '&quot;')}); closeMenu()"><span class="adi-icon">🏷</span> Set Discount</button>
                <div class="action-dropdown-divider"></div>
                <button class="action-dropdown-item danger" onclick="deleteProduct(${p.id})"><span class="adi-icon">✕</span> Delete</button>
              </div>
            </div>
          </td>
        </tr>
      `;
  }).join('');
}

async function cycleProductStatus(id, currentStatus) {
  const next = { draft: 'active', active: 'hidden', hidden: 'draft' };
  const newStatus = next[currentStatus] || 'draft';
  try {
    const formData = new FormData();
    formData.append('status', newStatus);
    const res = await fetch(`${API}/products?id=${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Error: ' + (e.message || res.status)); return; }
    const updated = await res.json();
    const idx = allProducts.findIndex(p => p.id === id);
    if (idx !== -1) allProducts[idx].status = updated.status;
    applyFilters();
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

async function toggleProductProperty(id, property, currentStatus) {
  try {
    const formData = new FormData();
    formData.append(property, !currentStatus);

    const res = await fetch(`${API}/products?id=${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });

    if (!res.ok) throw new Error('Failed to patch attribute parameters.');
    await loadProducts();
  } catch (e) {
    alert('Failed to update product setting: ' + e.message);
  }
}

/* ── Search / Filter Actions ── */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.search-box input');
  const categorySelect = document.getElementById('filter-category');
  const statusSelect = document.getElementById('filter-status');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (categorySelect) categorySelect.addEventListener('change', applyFilters);
  if (statusSelect) statusSelect.addEventListener('change', applyFilters);
});

function applyFilters() {
  const query = (document.querySelector('.search-box input')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('filter-category')?.value || 'All Categories';
  const status = document.getElementById('filter-status')?.value || 'All Statuses';

  const filtered = allProducts.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query);

    const currentTypeName = p.product_type?.name || p.category || '';
    const matchC = cat === 'All Categories' || currentTypeName === cat;

    let matchS = true;
    if (status === 'In Stock') matchS = p.stock > 20;
    if (status === 'Low Stock') matchS = p.stock > 0 && p.stock <= 20;
    if (status === 'Out of Stock') matchS = p.stock <= 0;

    return matchQ && matchC && matchS;
  });

  renderTable(filtered);
}

function openAddProductModal() {
  // Always start from a clean state when opening the Add modal
  editingId = null;
  clearAddForm();
  updateAddPreview();
  openModal('modal-add-product');
}



/* ── Shop Card Live Preview ── */

function renderShopPreview(target, data) {
  const el = document.getElementById(target);
  if (!el) return;

  const name = data.name || 'Product Name';
  const price = parseFloat(data.price) || 0;
  const img = data.imgSrc;
  const d = data.discount;

  let discountOn = false;
  let salePrice = price;
  let pctOff = null;
  let label = null;

  if (d && d.discount_value) {
    const now = new Date();
    const start = d.start_time ? new Date(d.start_time) : null;
    const end = d.end_time ? new Date(d.end_time) : null;
    discountOn = (!start || start <= now) && (!end || end >= now);

    if (discountOn) {
      salePrice = d.discount_type === 'percentage'
        ? price * (1 - Number(d.discount_value) / 100)
        : Math.max(0, price - Number(d.discount_value));
      pctOff = d.discount_type === 'percentage' ? Math.round(Number(d.discount_value)) : null;
      label = d.discount_label || null;
    }
  }

  el.innerHTML = `
    <div class="product${discountOn ? ' product--sale' : ''}">
      <div class="product-image">
        ${discountOn && pctOff ? `<span class="sale-badge">-${pctOff}%</span>` : ''}
        ${img
      ? `<img src="${img}" alt="${escapeHtml(name)}">`
      : `<div class="placeholder">\u{1F484}</div>`}
      </div>
      <h3>${escapeHtml(name)}</h3>
      <div class="price">
        ${discountOn
      ? `<span class="price-original">\u20ac${price.toFixed(2)}</span>
             <span class="price-sale">\u20ac${salePrice.toFixed(2)}</span>
             ${label ? `<div><span class="sale-label">${escapeHtml(label)}</span></div>` : ''}`
      : `\u20ac${price.toFixed(2)}`}
      </div>
      <div class="product-actions">
        <span class="add">View</span>
        <button class="add-to-cart-btn" disabled>Add to Cart</button>
      </div>
    </div>`;
}

function updateAddPreview() {
  const imgEl = document.getElementById('add-img-preview-el');
  renderShopPreview('add-shop-preview', {
    name: document.getElementById('add-name')?.value,
    price: document.getElementById('add-price')?.value,
    imgSrc: (imgEl && imgEl.style.display !== 'none' && imgEl.src) ? imgEl.src : null,
    discount: null,
  });
}

function updateEditPreview() {
  const imgEl = document.getElementById('img-preview-el');
  const product = allProducts.find(p => p.id === editingId);
  renderShopPreview('edit-shop-preview', {
    name: document.getElementById('p-name')?.value,
    price: document.getElementById('p-price')?.value,
    imgSrc: (imgEl && imgEl.style.display !== 'none' && imgEl.src) ? imgEl.src : null,
    discount: product?.product_discount || null,
  });
}

async function submitAddProduct() {
  const nameInput = document.getElementById('add-name');
  const name = nameInput ? nameInput.value.trim() : '';

  const price = document.getElementById('add-price')?.value.trim() || '';
  const stock = document.getElementById('add-stock')?.value.trim() || '0';
  const desc = document.getElementById('add-desc')?.value.trim() || '';
  const legacyCat = document.getElementById('add-desc-legacy')?.value.trim() || 'Lash Extensions';

  // Read clean selected Type ID assignment token properties safely
  const typeId = document.getElementById('add-product-type')?.value || '';

  const isActive = document.getElementById('add-p-active')?.checked || false;
  const inSlider = document.getElementById('add-p-slider')?.checked || false;
  const fileInput = document.getElementById('add-img-input');

  if (!name || !price) {
    alert('Name and price fields are required parameters.');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock', parseInt(stock, 10));
    formData.append('description', desc);
    formData.append('category', legacyCat);
    formData.append('is_active', isActive ? 'true' : 'false');
    formData.append('in_slider', inSlider ? 'true' : 'false');

    if (typeId) {
      formData.append('product_type_id', typeId);
    }

    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }

    const res = await fetch(`${API}/products`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert('Error creating product: ' + (e.message || res.status));
      return null;
    }

    const newProduct = await res.json();
    await uploadAddGallery(newProduct.id);

    // Product is created: enable sections management from the Add modal
    editingId = newProduct.id;

    const manageBtn = document.getElementById('add-manage-sections-btn');
    // (Button is always enabled; keep reference for future UI tweaks)
    if (manageBtn) manageBtn.disabled = false;

    // Prevent accidental duplicate creation
    const submitBtn = document.getElementById('add-submit-product-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Product created';
    }

    await loadProducts();
    return newProduct.id;
  } catch (e) {
    alert('Network transmission error processing entity additions: ' + e.message);
    return null;
  }
}

function clearAddForm() {
  setTimeout(updateAddPreview, 0);
  ['add-name', 'add-price', 'add-desc', 'add-desc-legacy'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (document.getElementById('add-stock')) document.getElementById('add-stock').value = '0';
  if (document.getElementById('add-product-type')) document.getElementById('add-product-type').value = '';

  // Reset sections button state for Add modal
  // (Button remains enabled, but product id resets on open)
  const manageBtn = document.getElementById('add-manage-sections-btn');
  if (manageBtn) manageBtn.disabled = false;

  // Reset submit button state for Add modal
  const submitBtn = document.getElementById('add-submit-product-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Product';
  }

  clearAddImage();
  clearAddGallery();
}

async function openProductSectionsModalFromAdd() {
  // Called by the button under the description in the Add modal.
  // If the product isn't created yet, create it first.
  if (!editingId) {
    const createdId = await submitAddProduct();
    if (!createdId) return;
    editingId = createdId;
  }
  await openProductSectionsModal();
}

/* ── Open Edit Modal Row Loader ── */
function openEditModal(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  editingId = id;

  document.getElementById('modal-product-title').textContent = 'Edit — ' + p.name;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = parseFloat(p.price).toFixed(2);
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-desc').value = p.description || '';

  document.getElementById('p-status').value = p.status || 'draft';
  document.getElementById('p-slider').checked = p.in_slider === true || p.in_slider === 'true';

  // Set Edit Type dropdown token
  const typeSelect = document.getElementById('p-product-type');
  if (typeSelect) {
    typeSelect.value = p.product_type_id ? p.product_type_id : "";
  }

  clearImage();
  if (p.path) {
    const img = document.getElementById('img-preview-el');
    img.src = `./uploads/products/${p.path}`;
    img.style.display = 'block';
    document.getElementById('img-placeholder').style.display = 'none';
    document.getElementById('img-upload-actions').style.display = 'flex';
  }

  loadEditGallery(p);
  closeMenu();
  updateEditPreview();
  openModal('modal-product');
}

function previewProduct() {
  if (!editingId) return;
  window.open(`../product-main.html?id=${editingId}`, '_blank');
}

/* ── Submit Edit Form Stream ── */
async function submitEditProduct() {
  if (!editingId) return;
  const name = document.getElementById('p-name').value.trim();
  const price = document.getElementById('p-price').value.trim();
  const stock = document.getElementById('p-stock').value.trim();
  const desc = document.getElementById('p-desc').value.trim();

  const typeId = document.getElementById('p-product-type')?.value || '';

  const status = document.getElementById('p-status').value;
  const inSlider = document.getElementById('p-slider').checked;
  const fileInput = document.getElementById('p-img-input');

  if (!name || !price) {
    alert('Name and price are required parameters.');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock', parseInt(stock, 10));
    formData.append('description', desc);
    formData.append('status', status);
    formData.append('in_slider', inSlider ? 'true' : 'false');
    formData.append('product_type_id', typeId);

    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    } else {
      const originalProduct = allProducts.find(x => x.id === editingId);
      if (originalProduct && originalProduct.path) {
        formData.append('path', originalProduct.path);
      }
    }

    const res = await fetch(`${API}/products?id=${editingId}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Error: ' + (e.message || res.status)); return; }
    await uploadEditGallery(editingId);
    closeModal('modal-product');
    editingId = null;
    await loadProducts();
  } catch (e) {
    alert('Network exception handling data updates: ' + e.message);
  }
}

/* ── Delete Product Core ── */
async function deleteProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Delete "${p.name}"? This action cannot be undone.`)) return;
  closeMenu();
  try {
    const res = await fetch(`${API}/products?id=${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Error: ' + (e.message || res.status)); return; }
    await loadProducts();
  } catch (e) {
    alert('Network response error processing structural destruction: ' + e.message);
  }
}

/* ── Quick Create Product Type ── */
async function quickCreateProductType() {
  await openManageTypesInlineModal({ focusAdd: true });
}

/* ── Manage Product Types Display Overlay Toggles ── */
async function openManageTypesInlineModal(opts = {}) {
  openModal('modal-manage-types-inline');
  setTypesInlineStatus('');
  resetTypeEditState();
  await renderInlineTypesList();
  if (opts && opts.focusAdd) {
    const input = document.getElementById('types-new-name');
    if (input) setTimeout(() => input.focus(), 0);
  }
}

function resetTypeEditState() {
  editingTypeId = null;
  editingTypeOriginalName = '';
}

function setTypesInlineStatus(message, kind = 'error') {
  const el = document.getElementById('types-inline-status');
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    el.classList.remove('ok');
    el.classList.remove('error');
    return;
  }
  el.style.display = 'block';
  el.textContent = message;
  el.classList.toggle('ok', kind === 'ok');
  el.classList.toggle('error', kind !== 'ok');
}

function setTypesInlineCount(count) {
  const el = document.getElementById('types-inline-count');
  if (!el) return;
  el.textContent = typeof count === 'number' ? `${count} total` : '—';
}

async function createTypeFromModal() {
  const input = document.getElementById('types-new-name');
  const btn = document.getElementById('types-add-btn');
  const name = input ? input.value.trim() : '';
  if (!name) {
    setTypesInlineStatus('Type name cannot be empty.');
    return;
  }
  try {
    if (btn) btn.disabled = true;
    setTypesInlineStatus('');
    resetTypeEditState();
    const res = await fetch(`${API}/product-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setTypesInlineStatus('Could not save product type: ' + (errData.message || res.status));
      return;
    }

    if (input) input.value = '';
    await renderInlineTypesList();
    await loadProductTypes();
    setTypesInlineStatus('Type created.', 'ok');
  } catch (err) {
    console.error('Network exception adding product type taxonomy:', err);
    setTypesInlineStatus('Network error trying to process creation request.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function startEditType(id) {
  const type = (allProductTypes || []).find(x => x.id === id);
  if (!type) return;
  editingTypeId = id;
  editingTypeOriginalName = String(type.name || '');
  setTypesInlineStatus('');
  await renderInlineTypesList();
  const input = document.getElementById(`type-edit-input-${id}`);
  if (input) {
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveTypeEdit(id); }
      if (e.key === 'Escape') { e.preventDefault(); cancelTypeEdit(); }
    });
  }
}

function cancelTypeEdit() {
  resetTypeEditState();
  setTypesInlineStatus('');
  renderInlineTypesList();
}

async function saveTypeEdit(id) {
  const input = document.getElementById(`type-edit-input-${id}`);
  const btn = document.getElementById(`type-save-btn-${id}`);
  const newName = (input ? input.value : '').trim();
  if (!newName) {
    setTypesInlineStatus('Type name cannot be empty.');
    return;
  }

  if (newName === (editingTypeOriginalName || '').trim()) {
    cancelTypeEdit();
    return;
  }

  try {
    if (btn) btn.disabled = true;
    setTypesInlineStatus('');

    const res = await fetch(`${API}/product-types?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setTypesInlineStatus('Could not update type: ' + (errData.message || res.status));
      return;
    }

    resetTypeEditState();
    await renderInlineTypesList();
    await loadProductTypes();
    await loadProducts();
    setTypesInlineStatus('Type updated.', 'ok');
  } catch (err) {
    console.error('Network exception updating product type taxonomy field:', err);
    setTypesInlineStatus('Network error trying to process update request.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function renderInlineTypesList() {
  const container = document.getElementById('inline-types-list');
  if (!container) return;

  container.innerHTML = `<div class="types-empty">Loading…</div>`;
  setTypesInlineCount(null);

  await loadProductTypes();

  if (!allProductTypes || allProductTypes.length === 0) {
    container.innerHTML = `<div class="types-empty">No product types found.</div>`;
    setTypesInlineCount(0);
    return;
  }

  setTypesInlineCount(allProductTypes.length);

  container.innerHTML = allProductTypes.map(t => {
    const safeName = escapeHtml(t.name);
    const safeNameAttr = safeName.replace(/\"/g, '&quot;');
    const isEditing = editingTypeId === t.id;

    if (isEditing) {
      return `
          <div class="type-row editing">
            <input type="text" class="form-input type-edit-input" id="type-edit-input-${t.id}" value="${safeName}" autocomplete="off">
            <div class="actions">
              <button type="button" class="btn btn-gold btn-sm" id="type-save-btn-${t.id}" onclick="saveTypeEdit(${t.id})">Save</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="cancelTypeEdit()">Cancel</button>
            </div>
          </div>
        `;
    }
    return `
        <div class="type-row">
          <div class="type-name" title="${safeNameAttr}">${safeName}</div>
          <div class="actions">
            <button type="button" class="btn-icon" title="Edit" onclick="startEditType(${t.id})">✎</button>
            <button type="button" class="btn-icon delete" title="Delete" onclick="executeTypeDeletion(${t.id})">✕</button>
          </div>
        </div>
      `;
  }).join('');
}
async function executeTypeDeletion(id) {
  const type = (allProductTypes || []).find(x => x.id === id);
  const name = type?.name || `#${id}`;

  if (!confirm(`Are you sure you want to permanently delete the type "${name}"?`)) {
    return;
  }

  try {
    resetTypeEditState();
    const res = await fetch(`${API}/product-types?id=${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setTypesInlineStatus('Could not delete type: ' + (errData.message || res.status));
      return;
    }

    await renderInlineTypesList();
    await loadProductTypes();
  } catch (err) {
    console.error('Network exception removing product type row:', err);
    setTypesInlineStatus('Network error trying to process deletion request.');
  }
}

/* ── Actions Dropdown Logic Blocks ── */
function toggleMenu(btn) {
  const drop = btn.nextElementSibling;
  const isOpen = drop.classList.contains('open');
  closeMenu();
  if (!isOpen) drop.classList.add('open');
}

function closeMenu() {
  document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.action-menu-wrap')) closeMenu();
});

/* ── Modular Window Core Mechanics ── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
  }
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
  }
  if (id === 'modal-manage-types-inline') {
    resetTypeEditState();
    setTypesInlineStatus('');
  }
  document.body.style.overflow = document.querySelector('.modal-overlay.open') ? 'hidden' : '';
  closeMenu();
}

function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

/* ── Discount Management Canvas ── */
let discountingProductId = null;

function isDiscountActive(discount) {
  if (!discount) return false;
  const now = new Date();
  return new Date(discount.start_time) <= now && new Date(discount.end_time) >= now;
}

function discountBadgeText(discount) {
  if (!discount) return '';
  if (discount.discount_label) return escapeHtml(discount.discount_label);
  return discount.discount_type === 'percentage'
    ? `-${discount.discount_value}%`
    : `-€${parseFloat(discount.discount_value).toFixed(2)}`;
}

function openDiscountModal(id, name, price, existingDiscount) {
  discountingProductId = id;
  document.getElementById('discount-product-name').textContent = name;
  document.getElementById('discount-original').value = '€' + parseFloat(price).toFixed(2);

  // Decode HTML entities from JSON passed via onclick attribute
  let discount = existingDiscount;
  if (typeof existingDiscount === 'string') {
    try { discount = JSON.parse(existingDiscount.replace(/&quot;/g, '"')); } catch { discount = null; }
  }

  const hasDiscount = !!discount;
  document.getElementById('discount-toggle').checked = hasDiscount;
  document.getElementById('discount-fields').classList.toggle('visible', hasDiscount);

  if (hasDiscount) {
    document.getElementById('discount-type').value = discount.discount_type || 'percentage';
    document.getElementById('discount-value').value = discount.discount_value || '';
    document.getElementById('discount-label').value = discount.discount_label || '';
    document.getElementById('discount-start').value = discount.start_time ? discount.start_time.split('T')[0] : '';
    document.getElementById('discount-end').value = discount.end_time ? discount.end_time.split('T')[0] : '';
  } else {
    document.getElementById('discount-type').value = 'percentage';
    document.getElementById('discount-value').value = '';
    document.getElementById('discount-label').value = '';
    document.getElementById('discount-start').value = '';
    document.getElementById('discount-end').value = '';
  }

  calcDiscount();
  openModal('modal-discount');
}

function toggleDiscountFields() {
  const on = document.getElementById('discount-toggle').checked;
  document.getElementById('discount-fields').classList.toggle('visible', on);
}

function calcDiscount() {
  const orig = parseFloat(document.getElementById('discount-original').value.replace('€', '')) || 0;
  const val = parseFloat(document.getElementById('discount-value').value) || 0;
  const type = document.getElementById('discount-type').value;
  const result = type === 'percentage'
    ? Math.max(0, orig - orig * val / 100)
    : Math.max(0, orig - val);
  document.getElementById('discount-result').value = '€' + result.toFixed(2);
}

async function saveDiscount() {
  if (!discountingProductId) return;

  const active = document.getElementById('discount-toggle').checked;

  if (!active) {
    // Remove discount if toggle is off
    await removeDiscount();
    return;
  }

  const type = document.getElementById('discount-type').value;
  const value = parseFloat(document.getElementById('discount-value').value);
  const label = document.getElementById('discount-label').value.trim();
  const start = document.getElementById('discount-start').value;
  const end = document.getElementById('discount-end').value;

  if (!value || value <= 0) { alert('Please enter a valid discount value.'); return; }
  if (!start || !end) { alert('Please set start and end dates.'); return; }
  if (new Date(end) <= new Date(start)) { alert('End date must be after start date.'); return; }

  try {
    const res = await fetch(`${API}/products/${discountingProductId}/discount`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discount_value: value,
        discount_type: type,
        discount_label: label,
        start_time: new Date(start + 'T00:00:00').toISOString(),
        end_time: new Date(end + 'T23:59:59').toISOString(),
      }),
    });

    if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Error: ' + (e.message || res.status)); return; }

    const updated = await res.json();
    const idx = allProducts.findIndex(p => p.id === discountingProductId);
    if (idx !== -1) allProducts[idx].product_discount = updated;

    closeModal('modal-discount');
    applyFilters();
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

async function removeDiscount() {
  if (!discountingProductId) return;
  try {
    const res = await fetch(`${API}/products/${discountingProductId}/discount`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok && res.status !== 404) {
      const e = await res.json().catch(() => ({}));
      alert('Error removing discount: ' + (e.message || res.status));
      return;
    }
    const idx = allProducts.findIndex(p => p.id === discountingProductId);
    if (idx !== -1) allProducts[idx].product_discount = null;
    closeModal('modal-discount');
    applyFilters();
  } catch (e) {
    alert('Network error: ' + e.message);
  }
}

/* ── Promo Code Generator Functions ── */
function openPromoModal() { openModal('modal-promo'); }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('promo-code-input').value = code;
}

/* ── Image Upload Preview Pipeline Handlers ── */
function previewAddImage(input) {
  setTimeout(updateAddPreview, 150);
  setTimeout(updateAddPreview, 100);
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 4 * 1024 * 1024) { alert('Image size cannot exceed the 4 MB limit.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('add-img-preview-el');
    img.src = e.target.result; img.style.display = 'block';
    document.getElementById('add-img-placeholder').style.display = 'none';
    document.getElementById('add-img-actions').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function previewAddImageFull() {
  const img = document.getElementById('add-img-preview-el');
  if (img.src) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '20000';
    modal.onclick = () => document.body.removeChild(modal);

    const imgElement = document.createElement('img');
    imgElement.src = img.src;
    imgElement.style.maxWidth = '90%';
    imgElement.style.maxHeight = '90%';
    imgElement.style.borderRadius = '8px';

    modal.appendChild(imgElement);
    document.body.appendChild(modal);
  }
}

function clearAddImage() {
  document.getElementById('add-img-preview-el').style.display = 'none';
  document.getElementById('add-img-preview-el').src = '';
  document.getElementById('add-img-placeholder').style.display = 'flex';
  document.getElementById('add-img-actions').style.display = 'none';
  document.getElementById('add-img-input').value = '';
}

function previewImage(input) {
  setTimeout(updateEditPreview, 150);
  setTimeout(updateEditPreview, 150);
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 4 * 1024 * 1024) { alert('Image size cannot exceed the 4 MB limit.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('img-preview-el');
    img.src = e.target.result; img.style.display = 'block';
    document.getElementById('img-placeholder').style.display = 'none';
    document.getElementById('img-upload-actions').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function previewImageFull() {
  const img = document.getElementById('img-preview-el');
  if (img.src) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '20000';
    modal.onclick = () => document.body.removeChild(modal);

    const imgElement = document.createElement('img');
    imgElement.src = img.src;
    imgElement.style.maxWidth = '90%';
    imgElement.style.maxHeight = '90%';
    imgElement.style.borderRadius = '8px';

    modal.appendChild(imgElement);
    document.body.appendChild(modal);
  }
}

function clearImage() {
  document.getElementById('img-preview-el').style.display = 'none';
  document.getElementById('img-preview-el').src = '';
  document.getElementById('img-placeholder').style.display = 'flex';
  document.getElementById('img-upload-actions').style.display = 'none';
  document.getElementById('p-img-input').value = '';
}

/* Global Keyboard Esc Close Handle Bindings */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      closeModal(m.id);
    });
    closeMenu();
  }
});

// ════════════════════════════════════════════════════════════════════
// GALLERY — ADD MODAL (purely client-side until product is saved)
// Each picked file is stored in addGalleryFiles[]. On submit the
// product is created first, then gallery files are uploaded in one
// batch POST to /product-images/:newId
// ════════════════════════════════════════════════════════════════════

let addGalleryFiles = []; // Array<{ file: File, previewUrl: string }>

function handleAddGalleryPick(input) {
  if (!input.files || !input.files.length) return;
  const remaining = 10 - addGalleryFiles.length;
  const picked = Array.from(input.files).slice(0, remaining);
  input.value = ''; // reset so same file can be re-picked after removal

  picked.forEach(file => {
    if (file.size > 4 * 1024 * 1024) {
      alert(`"${file.name}" exceeds the 4 MB limit and was skipped.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      addGalleryFiles.push({ file, previewUrl: e.target.result });
      renderAddGallery();
    };
    reader.readAsDataURL(file);
  });
}

function renderAddGallery() {
  const grid = document.getElementById('add-gallery-grid');
  if (!grid) return;
  grid.innerHTML = addGalleryFiles.map((item, idx) => `
      <div class="gallery-thumb pending">
        <img src="${item.previewUrl}" alt="">
        <button type="button" class="gallery-thumb-remove" onclick="removeAddGalleryFile(${idx})">✕</button>
      </div>
    `).join('');
}

function removeAddGalleryFile(idx) {
  addGalleryFiles.splice(idx, 1);
  renderAddGallery();
}

function clearAddGallery() {
  addGalleryFiles = [];
  renderAddGallery();
}

// Called after product creation — uploads queued gallery files
async function uploadAddGallery(productId) {
  if (!addGalleryFiles.length) return;
  const formData = new FormData();
  addGalleryFiles.forEach(item => formData.append('gallery', item.file));
  const res = await fetch(`${API}/product-images/${productId}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Gallery upload failed:', err.message || res.status);
    alert('Product was created but some gallery images failed to upload.');
  }
}

// ════════════════════════════════════════════════════════════════════
// GALLERY — EDIT MODAL
// Existing images loaded from product data and shown immediately.
// Delete is instant (API call fires right away, no waiting for Save).
// New picks are queued in editGalleryFiles[] and uploaded on Save.
// ════════════════════════════════════════════════════════════════════

let editGalleryFiles = []; // Array<{ file: File, previewUrl: string }> — pending new uploads
let editGalleryExisting = []; // Array<{ id: number, path: string }> — saved images from DB

function loadEditGallery(product) {
  editGalleryExisting = (product.product_images || []).map(img => ({
    id: img.id,
    path: img.path,
  }));
  editGalleryFiles = [];
  renderEditGallery();
}

function renderEditGallery() {
  const grid = document.getElementById('edit-gallery-grid');
  if (!grid) return;

  const existingHtml = editGalleryExisting.map(img => `
      <div class="gallery-thumb" data-image-id="${img.id}">
        <img src="./uploads/products/${escapeHtml(img.path)}" alt="">
        <button type="button" class="gallery-thumb-remove" onclick="deleteEditGalleryImage(${img.id})">✕</button>
      </div>
    `).join('');

  const pendingHtml = editGalleryFiles.map((item, idx) => `
      <div class="gallery-thumb pending">
        <img src="${item.previewUrl}" alt="">
        <button type="button" class="gallery-thumb-remove" onclick="removeEditGalleryFile(${idx})">✕</button>
      </div>
    `).join('');

  grid.innerHTML = existingHtml + pendingHtml;
}

function handleEditGalleryPick(input) {
  if (!input.files || !input.files.length) return;
  const totalCurrent = editGalleryExisting.length + editGalleryFiles.length;
  const remaining = 10 - totalCurrent;
  const picked = Array.from(input.files).slice(0, remaining);
  input.value = '';

  picked.forEach(file => {
    if (file.size > 4 * 1024 * 1024) {
      alert(`"${file.name}" exceeds the 4 MB limit and was skipped.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      editGalleryFiles.push({ file, previewUrl: e.target.result });
      renderEditGallery();
    };
    reader.readAsDataURL(file);
  });
}

function removeEditGalleryFile(idx) {
  editGalleryFiles.splice(idx, 1);
  renderEditGallery();
}

// Immediate delete — fires API call right away without waiting for Save
async function deleteEditGalleryImage(imageId) {
  if (!confirm('Remove this photo from the gallery?')) return;
  try {
    const res = await fetch(`${API}/product-images/${imageId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Could not delete image: ' + (err.message || res.status));
      return;
    }
    editGalleryExisting = editGalleryExisting.filter(img => img.id !== imageId);
    renderEditGallery();
  } catch (e) {
    alert('Network error deleting gallery image: ' + e.message);
  }
}

// Called inside submitEditProduct — uploads queued new files
async function uploadEditGallery(productId) {
  if (!editGalleryFiles.length) return;
  const formData = new FormData();
  editGalleryFiles.forEach(item => formData.append('gallery', item.file));
  const res = await fetch(`${API}/product-images/${productId}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Gallery upload failed:', err.message || res.status);
    alert('Changes saved but some gallery images failed to upload.');
  }
}

// Load promocode from API
async function loadPromocodes() {
  try {
    const res = await fetch(API + '/promo', {
      method: 'GET',
      credentials: 'include'
    });

    const data = await res.json();
    allPromocodes = data || [];
    renderPromoTable(allPromocodes);
  } catch (e) {
    console.error('Failed to load promocodes:', e);
    const tbody = document.getElementById('promocodes-tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load promocodes.</td></tr>';
    }
  }
}

//Render table
function renderPromoTable(promocodes) {
  const tbody = document.getElementById('promocodes-tbody');

  if (!promocodes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7"
            style="text-align:center;color:var(--text-muted);padding:32px;">
          No promo codes found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = promocodes.map(promo => {
    const isExpired =
      promo.expiresAt &&
      new Date(promo.expiresAt) < new Date();

    return `
      <tr>
        <td>
          <strong>${escHtml(promo.code)}</strong>
        </td>

        <td>
          ${promo.discountType === 'percent'
        ? `${promo.discountValue}%`
        : `€${promo.discountValue}`
      }
        </td>

        <td>
          ${promo.discountType === 'percent' ? 'Percentage (%)' : 'Fixed Amount (€)'}
        </td>

        <td>
          ${promo.usedCount || 0}
          ${promo.maxUses ? `/ ${promo.maxUses}` : ''}
        </td>

        <td>
          ${promo.singleUsePerUser
        ? '<span class="badge badge-active">Yes</span>'
        : '<span style="color:var(--text-muted);font-size:12px;">No</span>'
      }
        </td>

        <td>
          ${promo.expiresAt
        ? new Date(promo.expiresAt).toLocaleDateString('en-GB')
        : 'Never'
      }
        </td>

        <td>
          ${isExpired
        ? '<span class="badge badge-out">Expired</span>'
        : '<span class="badge badge-active">Active</span>'
      }
        </td>

        <td>
          <div class="action-menu-wrap">
            <button class="action-menu-btn"
                    onclick="toggleMenu(this)">⋯</button>

            <div class="action-dropdown">
              <button class="action-dropdown-item"
                      onclick="openEditPromoModal(${promo.id})">
                <span class="adi-icon">✎</span>
                Edit
              </button>

              <div class="action-dropdown-divider"></div>

              <button class="action-dropdown-item danger"
                      onclick="deletePromo(${promo.id})">
                <span class="adi-icon">✕</span>
                Delete
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Creating promocode
async function submitCreatePromo() {
  const code = document.getElementById('promo-code-input').value.trim();
  const type = document.getElementById('promo-type').value;
  const value = parseFloat(document.getElementById('promo-value').value);
  const maxUsesInput = document.getElementById('promo-max-uses').value;
  const expiresOn = document.getElementById('promo-expires').value;

  if (!code || isNaN(value)) {
    alert('Promo code and discount value are required.');
    return;
  }

  const payload = {
    code: code.toUpperCase(),
    discountType: type,
    discountValue: value,
    maxUses: maxUsesInput ? parseInt(maxUsesInput, 10) : null,
    expiresAt: expiresOn ? new Date(expiresOn).toISOString() : null,
    singleUsePerUser: document.getElementById('promo-single-use')?.checked ?? false,
  };

  try {

    const res = await fetch(`${API}/promo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Server error');
    }

    alert('Promo code created successfully!');
    closeModal('modal-promo');

    await loadPromocodes();

    document.getElementById('promo-code-input').value = '';
    document.getElementById('promo-value').value = '';
    if (document.getElementById('promo-max-uses')) document.getElementById('promo-max-uses').value = '';
    if (document.getElementById('promo-expires')) document.getElementById('promo-expires').value = '';
  } catch (e) {
    alert('Failed to create promo code: ' + e.message);
  }
}

//Open edit promocode modal
function openEditPromoModal(id) {
  const promo = allPromocodes.find(p => p.id === id);

  if (!promo) return;

  editingPromoId = id;

  document.getElementById('promo-code-input').value = promo.code;
  document.getElementById('promo-value').value = promo.discountValue;

  document.getElementById('promo-max-uses').value =
    promo.maxUses ?? '';

  document.getElementById('promo-expires').value =
    promo.expiresAt
      ? promo.expiresAt.slice(0, 10)
      : '';

  document.getElementById('promo-type').value =
    promo.discountType === 'percent'
      ? 'Percentage (%)'
      : 'Fixed Amount (€)';

  const singleUseEl = document.getElementById('promo-single-use');
  if (singleUseEl) singleUseEl.checked = promo.singleUsePerUser ?? false;

  document.querySelector(
    '#modal-promo .modal-title'
  ).textContent = 'Edit Promo Code';

  document.querySelector(
    '#modal-promo .btn-gold'
  ).textContent = 'Save Changes';

  openModal('modal-promo');
}

//Updating promocode
async function updatePromo() {
  const payload = {
    code: document
      .getElementById('promo-code-input')
      .value
      .trim()
      .toUpperCase(),

    discountType:
      document.getElementById('promo-type').value ===
        'Percentage (%)'
        ? 'percentage'
        : 'fixed',

    discountValue: Number(
      document.getElementById('promo-value').value
    ),

    maxUses:
      document.getElementById('promo-max-uses').value
        ? Number(
          document.getElementById('promo-max-uses').value
        )
        : null,

    expiresAt:
      document.getElementById('promo-expires').value ||
      null,

    singleUsePerUser: document.getElementById('promo-single-use')?.checked ?? false,
  };

  const res = await fetch(
    `${API}/promo/${editingPromoId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error('Failed to update promo');
  }

  closeModal('modal-promo');

  editingPromoId = null;

  await loadPromocodes();
}

async function savePromo() {
  if (editingPromoId) {
    await updatePromo();
  } else {
    await submitCreatePromo();
  }
}

//Deleting promocode
async function deletePromo(id) {
  if (!confirm('Delete this promo code?')) return;

  try {
    const res = await fetch(`${API}/promo/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Failed to delete promo');
    }

    await loadPromocodes();
  } catch (err) {
    console.error(err);
    alert('Failed to delete promo code');
  }
}


// ── PRODUCT SECTIONS (Dynamic blocks on product page) ──────────────

let sectionsQuill = null;
let sectionsProductId = null;
let sectionsCache = [];
let currentSectionId = null;

function setSectionsStatus(message, kind = 'error') {
  const el = document.getElementById('sections-status');
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    el.style.background = '';
    el.style.border = '';
    el.style.color = '';
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

function ensureSectionsEditor() {
  if (sectionsQuill) return;
  if (!window.Quill) {
    setSectionsStatus('Quill editor failed to load. Please refresh the page.', 'error');
    return;
  }

  sectionsQuill = new Quill('#section-editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });
}

async function openProductSectionsModal() {
  if (!editingId) {
    alert('Open a product first (Edit Product) to manage its sections.');
    return;
  }

  sectionsProductId = editingId;
  currentSectionId = null;
  setSectionsStatus('');
  openModal('modal-product-sections');
  ensureSectionsEditor();
  await loadAdminSections();

  // If nothing exists, start with a blank draft.
  if (!sectionsCache.length) {
    createNewSectionDraft();
  } else {
    selectSection(sectionsCache[0].id);
  }
}

async function loadAdminSections() {
  if (!sectionsProductId) return;
  try {
    const res = await fetch(`${API}/product-sections/admin?productId=${sectionsProductId}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || res.status);
    }
    sectionsCache = await res.json();
    renderSectionsList();
  } catch (e) {
    setSectionsStatus('Could not load sections: ' + e.message, 'error');
  }
}

function renderSectionsList() {
  const list = document.getElementById('sections-list');
  if (!list) return;

  if (!sectionsCache.length) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:10px;">No sections yet.</div>';
    return;
  }

  const sorted = sectionsCache
    .slice()
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  list.innerHTML = sorted
    .map((s, idx) => {
      const active = s.is_active === true || s.is_active === 'true';
      const isSelected = Number(s.id) === Number(currentSectionId);
      const displayPos = idx + 1;
      return `
        <button type="button" onclick="selectSection(${Number(s.id)})"
          style="text-align:left; padding:10px 10px; border-radius:8px; border:1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}; background:${isSelected ? '#fff9ef' : '#fff'}; cursor:pointer;">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
            <div style="font-size:13px; font-weight:700; color:#222;">${escHtml(s.title || 'Untitled')}</div>
            <div style="font-size:11px; color:${active ? '#2b6f3a' : '#999'}; font-weight:700;">${active ? 'ON' : 'OFF'}</div>
          </div>
          <div style="font-size:11px; color:#999; margin-top:4px;">Position: ${displayPos}</div>
        </button>
      `;
    })
    .join('');
}

function selectSection(id) {
  const section = sectionsCache.find(s => Number(s.id) === Number(id));
  if (!section) return;
  currentSectionId = section.id;

  const titleInput = document.getElementById('section-title');
  const activeSelect = document.getElementById('section-active');
  if (titleInput) titleInput.value = section.title || '';
  if (activeSelect) activeSelect.value = section.is_active === false ? 'false' : 'true';

  ensureSectionsEditor();
  if (sectionsQuill) {
    // Set raw HTML into the editor
    sectionsQuill.root.innerHTML = section.content_html || '';
  }
  renderSectionsList();
}

function createNewSectionDraft() {
  currentSectionId = null;
  const titleInput = document.getElementById('section-title');
  const activeSelect = document.getElementById('section-active');
  if (titleInput) titleInput.value = '';
  if (activeSelect) activeSelect.value = 'true';
  ensureSectionsEditor();
  if (sectionsQuill) sectionsQuill.setText('');
  renderSectionsList();
}

async function saveCurrentSection() {
  if (!sectionsProductId) return;
  ensureSectionsEditor();
  if (!sectionsQuill) return;

  const title = (document.getElementById('section-title')?.value || '').trim();
  const isActive = (document.getElementById('section-active')?.value || 'true') === 'true';
  const contentHtml = sectionsQuill.root.innerHTML || '';

  if (!title) {
    setSectionsStatus('Section title is required.', 'error');
    return;
  }

  const payload = {
    title,
    is_active: isActive,
    content_html: contentHtml,
  };

  try {
    let res;
    if (currentSectionId) {
      res = await fetch(`${API}/product-sections/admin?id=${currentSectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API}/product-sections/admin?productId=${sectionsProductId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || res.status);
    }

    const saved = await res.json();
    setSectionsStatus('Saved.', 'ok');
    await loadAdminSections();
    selectSection(saved.id);
  } catch (e) {
    setSectionsStatus('Save failed: ' + e.message, 'error');
  }
}

async function deleteCurrentSection() {
  if (!currentSectionId) {
    setSectionsStatus('Select a section to delete.', 'error');
    return;
  }
  if (!confirm('Delete this section?')) return;

  try {
    const res = await fetch(`${API}/product-sections/admin?id=${currentSectionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || res.status);
    }
    setSectionsStatus('Deleted.', 'ok');
    currentSectionId = null;
    await loadAdminSections();
    if (sectionsCache.length) selectSection(sectionsCache[0].id);
    else createNewSectionDraft();
  } catch (e) {
    setSectionsStatus('Delete failed: ' + e.message, 'error');
  }
}

async function moveSectionUp() {
  if (!currentSectionId) return;
  const idx = sectionsCache.findIndex(s => Number(s.id) === Number(currentSectionId));
  if (idx <= 0) return;
  const copy = sectionsCache.slice();
  const tmp = copy[idx - 1];
  copy[idx - 1] = copy[idx];
  copy[idx] = tmp;
  await persistSectionsOrder(copy);
}

async function moveSectionDown() {
  if (!currentSectionId) return;
  const idx = sectionsCache.findIndex(s => Number(s.id) === Number(currentSectionId));
  if (idx < 0 || idx >= sectionsCache.length - 1) return;
  const copy = sectionsCache.slice();
  const tmp = copy[idx + 1];
  copy[idx + 1] = copy[idx];
  copy[idx] = tmp;
  await persistSectionsOrder(copy);
}

async function persistSectionsOrder(newList) {
  if (!sectionsProductId) return;
  try {
    const orderedIds = newList.map(s => Number(s.id));
    const res = await fetch(`${API}/product-sections/admin/reorder?productId=${sectionsProductId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || res.status);
    }
    sectionsCache = await res.json();
    renderSectionsList();
  } catch (e) {
    setSectionsStatus('Reorder failed: ' + e.message, 'error');
  }
}
