function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

const API = 'http://localhost:3000';
let allCart = [];

function getCartTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, totalItems };
}

async function loadCart() {
  try {
    const res = await fetch(API + '/cart', {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to load cart: ${res.status}`);
    }

    const data = await res.json();
    allCart = Array.isArray(data) ? data : [];
    renderCart(allCart);
  } catch (error) {
    console.error('Failed to load cart:', error);
    document.getElementById('cart-items').innerHTML = '<div style="text-align:center;padding:16px;">Failed to load cart.</div>';
  }
}

async function setItemQuantity(productId, quantity) {
  if (quantity < 1) {
    return;
  }

  const res = await fetch(`${API}/cart/item/${productId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    throw new Error('Failed to update item quantity');
  }

  await loadCart();
}

async function removeItem(productId) {
  const res = await fetch(`${API}/cart/item/${productId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to remove item');
  }

  await loadCart();
}

function renderCart(items) {
  const container = document.getElementById('cart-items');

  if (!items.length) {
    container.innerHTML = '<div style="text-align:center;padding:12px;">Your cart is empty.</div>';
    document.getElementById('cart-summary-label').textContent = 'Order summary (0 items)';
    document.getElementById('cart-summary-total').textContent = '€0.00';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="mobile-cart-item">
      <img src="/front_admin/uploads/products/${item.products.path}" alt="${item.products.name}">
      <div class="mobile-cart-info">
        <div class="mobile-cart-name">${item.products.name}</div>
        <div class="mobile-cart-controls">
          <button class="qty-btn" onclick="setItemQuantity(${item.products.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="setItemQuantity(${item.products.id}, ${item.quantity + 1})">+</button>
          <button class="remove-btn" onclick="removeItem(${item.products.id})">Remove</button>
        </div>
      </div>
      <div class="mobile-cart-price">€${(Number(item.products.price) * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  const { subtotal, totalItems } = getCartTotals(items);
  document.getElementById('cart-summary-label').textContent = `Order summary (${totalItems} items)`;
  document.getElementById('cart-summary-total').textContent = `€${subtotal.toFixed(2)}`;
}

loadCart();

