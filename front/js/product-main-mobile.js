function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

const API = window.location.origin;
let currentQty = 1;
let currentProductId = null;

function setQty(next) {
  currentQty = Math.max(1, next);
  document.getElementById('qty-count').textContent = String(currentQty);
}

function showMessage(text, isError = false) {
  const el = document.getElementById('cart-message');
  el.textContent = text;
  el.classList.toggle('error', isError);
}

async function loadProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    document.getElementById('product-name').textContent = 'Product Not Found';
    document.getElementById('product-description').textContent = 'Missing product id in URL.';
    return;
  }

  currentProductId = Number(productId);

  try {
    const res = await fetch(`${API}/products/${productId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch product: ${res.status}`);
    }

    const product = await res.json();

    document.title = `${product.name} – Lisa's Lashes`;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-subtitle').textContent = product.name;
    document.getElementById('product-price').innerHTML = `€${Number(product.price).toFixed(2)} <span>Tax included.</span>`;
    document.getElementById('product-description').textContent = product.description || 'No description yet.';

    const mainImage = document.getElementById('main-image');
    const imagePath = product.path ? `/front_admin/uploads/products/${product.path}` : 'assets/logo/logo.png';
    mainImage.src = imagePath;
    mainImage.alt = product.name;

    const thumbs = ['thumb-1', 'thumb-2', 'thumb-3'];
    thumbs.forEach((id) => {
      const t = document.getElementById(id);
      t.src = imagePath;
      t.alt = product.name;
      t.onclick = () => {
        mainImage.src = t.src;
      };
    });
  } catch (error) {
    console.error('Failed to load product:', error);
    document.getElementById('product-name').textContent = 'Failed to load product';
    document.getElementById('product-description').textContent = 'Please try again later.';
  }
}

async function addToCart() {
  if (!currentProductId) {
    showMessage('Product is not loaded yet', true);
    return;
  }

  try {
    const res = await fetch(`${API}/cart/item`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: currentProductId,
        quantity: currentQty,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to add to cart: ${res.status}`);
    }

    showMessage('Added to cart');
  } catch (error) {
    console.error(error);
    showMessage('Failed to add to cart', true);
  }
}

document.getElementById('qty-minus').addEventListener('click', () => setQty(currentQty - 1));
document.getElementById('qty-plus').addEventListener('click', () => setQty(currentQty + 1));
document.getElementById('add-to-cart-btn').addEventListener('click', addToCart);

loadProductDetails();

