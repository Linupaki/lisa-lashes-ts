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

async function loadProducts() {
  try {
    const res = await fetch(API + '/products/shop', {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to load products: ${res.status}`);
    }

    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];
    renderProducts(allProducts);
  } catch (error) {
    console.error('Failed to load products:', error);
    document.getElementById('products').innerHTML =
      '<div style="grid-column:1/-1;text-align:center;color:#777;padding:20px;">Failed to load products.</div>';
  }
}

function renderProducts(products) {
  const container = document.getElementById('products');

  if (!products.length) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#777;padding:20px;">No products found.</div>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product">
      <div class="product-image">
        <img src="/front_admin/uploads/products/${p.path || ''}" alt="${p.name}">
      </div>
      <h3>${p.name}</h3>
      <p>${p.description || ''}</p>
      <div class="price">€${Number(p.price).toFixed(2)}</div>
      <a class="add" href="product-main-mobile.html?id=${p.id}">View</a>
    </div>
  `).join('');
}

loadProducts();

