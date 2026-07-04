const API = 'http://localhost:3000';
const ADMIN_API = '';
let allProducts = [];

async function loadProducts() {
  try {
    const res = await fetch(API + '/products/shop', {
      method: 'GET',
      credentials: 'include'
    });

    const data = await res.json();
    allProducts = data || [];
    renderProducts(allProducts);
  } catch (e) {
    console.error('Failed to load products:', e);
    document.getElementById('products').innerHTML =
      '<div style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load products.</div>';
  }
}

function renderProducts(products) {
  const container = document.getElementById('products');

  container.innerHTML = products.map(p => `
      <div class="product">
        <div class="product-image">
          <img src="front_admin/uploads/products/${p.path}" alt="${p.name}">
        </div>

        <h3>${p.name}</h3> 

        <div class="price">€${p.price}</div>

        <a href="product-main.html?id=${p.id}" class="add">View</a>
      </div>
    `).join('');
}
loadProducts();



