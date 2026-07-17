function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

const API = window.location.origin;
let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  bindShopUI();
  loadProducts();
});

function bindShopUI() {
  const search = document.getElementById('shop-search');
  if (search) search.addEventListener('input', applyFilters);

  const category = document.getElementById('shop-category');
  if (category) category.addEventListener('change', applyFilters);

  const slider = document.getElementById('shop-price');
  if (slider) {
    slider.addEventListener('input', () => {
      updatePriceLabel();
      applyFilters();
    });
    slider.addEventListener('change', () => {
      updatePriceLabel();
      applyFilters();
    });
  }

  const resetBtn = document.getElementById('shop-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  // Delegated cart actions
  const productsWrap = document.getElementById('products');
  if (productsWrap) {
    productsWrap.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('.add-to-cart-btn') : null;
      if (!btn) return;

      const productId = Number(btn.getAttribute('data-product-id'));
      if (!productId) return;
      addToCart(productId, '', btn);
    });
  }
}

// ── LOAD ───────────────────────────────────────────────────────────────────

async function loadProducts() {
  try {
    const res = await fetch(API + '/products/shop', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(res.status);

    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];

    populateCategories();
    setMaxPrice();
    applyFilters();
  } catch (error) {
    console.error('Failed to load products:', error);
    const container = document.getElementById('products');
    if (container) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#777;padding:20px;">Failed to load products.</div>';
    }
  }
}

// ── FILTER UI ──────────────────────────────────────────────────────────────

function populateCategories() {
  const select = document.getElementById('shop-category');
  if (!select) return;

  const names = new Set(
    allProducts
      .map(p => p.product_type?.name || p.category || '')
      .filter(Boolean)
  );

  select.innerHTML = '<option value="">All categories</option>' +
    [...names].map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
}

function setMaxPrice() {
  const slider = document.getElementById('shop-price');
  if (!slider || !allProducts.length) return;

  const max = Math.ceil(Math.max(...allProducts.map(p => Number(p.price))));
  const rounded = Math.ceil(max / 10) * 10;
  slider.max = String(rounded);
  slider.value = String(rounded);
  updatePriceLabel();
}

function updatePriceLabel() {
  const slider = document.getElementById('shop-price');
  const label = document.getElementById('price-max-label');
  if (slider && label) label.textContent = `€${slider.value}`;
  if (slider) paintRangeFill(slider);
}

function paintRangeFill(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 100);
  const val = Number(slider.value || 0);
  const pct = max === min ? 100 : ((val - min) / (max - min)) * 100;

  // Fill part is gold, remaining track is light grey
  slider.style.background = `linear-gradient(to right, var(--gold) 0%, var(--gold) ${pct}%, #d6d6d6 ${pct}%, #d6d6d6 100%)`;
}

function applyFilters() {
  const query = (document.getElementById('shop-search')?.value || '').toLowerCase().trim();
  const category = document.getElementById('shop-category')?.value || '';
  const maxPrice = Number(document.getElementById('shop-price')?.value || 999999);

  const filtered = allProducts.filter(p => {
    const matchQ = !query ||
      (p.name || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query);

    const typeName = p.product_type?.name || p.category || '';
    const matchC = !category || typeName === category;
    const matchP = Number(p.price) <= maxPrice;
    return matchQ && matchC && matchP;
  });

  const resultsEl = document.getElementById('shop-results');
  if (resultsEl) {
    resultsEl.textContent = filtered.length === allProducts.length
      ? ''
      : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`;
  }

  renderProducts(filtered);
}

function resetFilters() {
  const search = document.getElementById('shop-search');
  const category = document.getElementById('shop-category');
  const slider = document.getElementById('shop-price');
  const resultsEl = document.getElementById('shop-results');

  if (search) search.value = '';
  if (category) category.value = '';
  if (slider) {
    slider.value = slider.max;
    updatePriceLabel();
  }
  if (resultsEl) resultsEl.textContent = '';

  renderProducts(allProducts);
}

// ── RENDER ─────────────────────────────────────────────────────────────────

function renderProducts(products) {
  const container = document.getElementById('products');
  if (!container) return;

  if (!products.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#777;padding:20px;">No products found.</div>';
    return;
  }

  const now = new Date();

  container.innerHTML = products.map(p => {
    const d = p.product_discount;
    const discountOn = d && new Date(d.start_time) <= now && new Date(d.end_time) >= now;

    const orig = Number(p.price);
    const sale = discountOn
      ? (d.discount_type === 'percentage'
        ? orig * (1 - Number(d.discount_value) / 100)
        : Math.max(0, orig - Number(d.discount_value)))
      : orig;

    const pctOff = discountOn && d.discount_type === 'percentage'
      ? Math.round(Number(d.discount_value))
      : null;

    const label = discountOn ? (d.discount_label || (pctOff ? `-${pctOff}%` : 'Sale')) : null;

    const labelHtml = discountOn && d.discount_label
      ? `<span class="sale-label">${escHtml(d.discount_label)}</span>`
      : '';

    const priceHtml = discountOn
      ? `<div class="price">
           <div class="price-row">
             <span class="price-original">€${orig.toFixed(2)}</span>
             <span class="price-sale">€${sale.toFixed(2)}</span>
           </div>
           ${labelHtml}
         </div>`
      : `<div class="price">
           <div class="price-row">
             <span class="price-regular">€${orig.toFixed(2)}</span>
           </div>
           ${labelHtml}
         </div>`;

    return `
      <div class="product${discountOn ? ' product--sale' : ''}">
        <div class="product-image">
          ${pctOff ? `<span class="sale-badge">-${pctOff}%</span>` : discountOn ? `<span class="sale-badge">${escHtml(label)}</span>` : ''}
          <img data-fallback-src="assets/logo/logo.png" src="front_admin/uploads/products/${escHtml(p.path || '')}" alt="${escHtml(p.name)}">
        </div>
        <h3>${escHtml(p.name)}</h3>
        ${priceHtml}
        <div class="product-actions">
          <a class="add" href="product-main-mobile.html?id=${p.id}">View</a>
          <button class="add-to-cart-btn" type="button" data-product-id="${p.id}">Add to Cart</button>
        </div>
      </div>
    `;
  }).join('');

  // Image fallback (no inline onerror)
  container.querySelectorAll('img[data-fallback-src]').forEach((img) => {
    img.addEventListener('error', () => {
      const fb = img.getAttribute('data-fallback-src');
      if (fb && img.src !== fb) img.src = fb;
    }, { once: true });
  });
}

// ── CART ───────────────────────────────────────────────────────────────────

async function addToCart(productId, productName, btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';

  try {
    const res = await fetch(API + '/cart', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    if (res.status === 401) {
      window.location.href = 'login-mobile.html';
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Could not add to cart.');
      btn.disabled = false;
      btn.textContent = original;
      return;
    }

    btn.textContent = '✓ Added';
    btn.style.background = '#27ae60';
    window.dispatchEvent(new Event('cartUpdated'));

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = original;
      btn.style.background = '';
    }, 1800);
  } catch (e) {
    alert('Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

