const API = 'http://localhost:3000';

let allProducts = [];



// ── BOOT ──────────────────────────────────────────────────────────────────────



async function loadProducts() {

  try {

    const res = await fetch(API + '/products/shop', {

      method: 'GET',

      credentials: 'include',

    });



    if (!res.ok) throw new Error(res.status);

    const data = await res.json();

    allProducts = data || [];



    populateCategories();

    setMaxPrice();

    applyFilters();

  } catch (e) {

    console.error('Failed to load products:', e);

    document.getElementById('products').innerHTML =

      '<div style="text-align:center;color:#999;padding:32px;">Failed to load products.</div>';

  }

}



// ── CATEGORIES ────────────────────────────────────────────────────────────────



function populateCategories() {

  const select = document.getElementById('shop-category');

  if (!select) return;



  // Collect unique category/type names

  const names = new Set(

    allProducts

      .map(p => p.product_type?.name || p.category || '')

      .filter(Boolean)

  );



  select.innerHTML = '<option value="">All categories</option>' +

    [...names].map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');

}



// ── PRICE RANGE ───────────────────────────────────────────────────────────────



function setMaxPrice() {

  const slider = document.getElementById('shop-price');

  if (!slider || !allProducts.length) return;



  const max = Math.ceil(Math.max(...allProducts.map(p => Number(p.price))));

  const rounded = Math.ceil(max / 10) * 10; // round up to nearest 10

  slider.max = rounded;

  slider.value = rounded;

  updatePriceLabel();

}



function updatePriceLabel() {

  const slider = document.getElementById('shop-price');

  const label = document.getElementById('price-max-label');

  if (slider && label) label.textContent = `€${slider.value}`;

}



// ── FILTERS ───────────────────────────────────────────────────────────────────



function applyFilters() {

  const query = (document.getElementById('shop-search')?.value || '').toLowerCase().trim();

  const category = document.getElementById('shop-category')?.value || '';

  const maxPrice = Number(document.getElementById('shop-price')?.value || 9999);



  const filtered = allProducts.filter(p => {

    const matchQ = !query ||

      p.name.toLowerCase().includes(query) ||

      (p.description || '').toLowerCase().includes(query);



    const typeName = p.product_type?.name || p.category || '';

    const matchC = !category || typeName === category;



    const matchP = Number(p.price) <= maxPrice;



    return matchQ && matchC && matchP;

  });



  // Update results count

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



  if (search) search.value = '';

  if (category) category.value = '';

  if (slider) { slider.value = slider.max; updatePriceLabel(); }



  document.getElementById('shop-results').textContent = '';

  renderProducts(allProducts);

}



// ── RENDER ────────────────────────────────────────────────────────────────────



function renderProducts(products) {
  const container = document.getElementById('products');

  if (!products.length) {
    container.innerHTML = '<div style="text-align:center;color:#999;padding:48px;grid-column:1/-1;">No products match your filters.</div>';
    return;
  }

  const now = new Date();

  container.innerHTML = products.map(p => {
    const d = p.product_discount;
    const discountOn = d &&
      new Date(d.start_time) <= now &&
      new Date(d.end_time) >= now;

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

    const priceHtml = discountOn
      ? `<div class="price">
           <span class="price-original">€${orig.toFixed(2)}</span>
           <span class="price-sale">€${sale.toFixed(2)}</span>
         </div>`
      : `<div class="price">€${orig.toFixed(2)}</div>`;

    return `
      <div class="product${discountOn ? ' product--sale' : ''}">
        <div class="product-image">
          ${pctOff ? `<span class="sale-badge">-${pctOff}%</span>` : discountOn ? `<span class="sale-badge">${escHtml(label)}</span>` : ''}
          <img src="front_admin/uploads/products/${escHtml(p.path || '')}"
               alt="${escHtml(p.name)}"
               onerror="this.src='assets/logo/logo.png'">
        </div>
        <h3>${escHtml(p.name)}</h3>
        ${discountOn && d.discount_label ? `<div class="sale-label">${escHtml(d.discount_label)}</div>` : ''}
        ${priceHtml}
        <div class="product-actions">
          <a href="product-main.html?id=${p.id}" class="add">View</a>
          <button class="add-to-cart-btn" onclick="addToCart(${p.id}, '${escHtml(p.name)}', this)">Add to Cart</button>
        </div>
      </div>
    `;
  }).join('');
}



// ── UTILS ─────────────────────────────────────────────────────────────────────



function escHtml(str) {

  return String(str || '')

    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

}



// ── CART ─────────────────────────────────────────────────────────────────────

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
      window.location.href = '/register.html';
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

loadProducts();
