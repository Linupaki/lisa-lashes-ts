function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

const API = window.location.origin;
let allCart = [];
let currentDiscountValue = 0;
let currentDiscountType = null;
let appliedPromoCode = null;

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  prefillUserDetails();
  loadCart();
});

// ── PREFILL ───────────────────────────────────────────────────────────────────

async function prefillUserDetails() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return;
    const user = await res.json();
    if (user.first_name) document.getElementById('checkout-first').value = user.first_name;
    if (user.last_name) document.getElementById('checkout-last').value = user.last_name;
    if (user.phone) document.getElementById('checkout-phone').value = user.phone;
    if (user.address) document.getElementById('checkout-email').value = user.address;
  } catch (e) { }
}

async function loadCart() {
  try {
    const res = await fetch(API + '/cart', {
      method: 'GET',
      credentials: 'include',
    });

    if (res.status === 401) {
      window.location.href = 'login-mobile.html';
      return;
    }

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

  try {
    const res = await fetch(`${API}/cart/item/${productId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update item quantity');
    }

    await loadCart();
  } catch (error) {
    console.error('Error updating quantity:', error);
    alert(error.message || 'Failed to update quantity');
  }
}

async function removeItem(productId) {
  try {
    const res = await fetch(`${API}/cart/item/${productId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to remove item');
    }

    await loadCart();
  } catch (error) {
    console.error('Error removing item:', error);
    alert(error.message || 'Failed to remove item');
  }
}

function renderCart(items) {
  const container = document.getElementById('cart-items');

  if (!items.length) {
    container.innerHTML = '<div style="text-align:center;padding:12px;">Your cart is empty.</div>';
    updateCartTotals(items);
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

  updateCartTotals(items);
}

function updateCartTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  let promoDiscount = 0;
  if (currentDiscountType === 'percent') promoDiscount = subtotal * (currentDiscountValue / 100);
  if (currentDiscountType === 'fixed') promoDiscount = currentDiscountValue;
  promoDiscount = Math.min(promoDiscount, subtotal);

  const total = subtotal - promoDiscount;

  // Обновляем заголовок Cart items со счетчиком
  document.getElementById('cart-items-header').textContent = `Cart items (${totalItems})`;
  
  document.getElementById('subtotal').textContent = `€${subtotal.toFixed(2)}`;
  document.getElementById('savings').textContent = `€0.00`;
  document.getElementById('promo-discount').textContent = `-€${promoDiscount.toFixed(2)}`;
  document.getElementById('total').textContent = `€${total.toFixed(2)}`;
  document.getElementById('total-label').textContent = `Total (${totalItems} items)`;

  if (promoDiscount > 0) {
    document.getElementById('promo-row').style.display = 'flex';
  } else {
    document.getElementById('promo-row').style.display = 'none';
  }
}

// ── PROMO ─────────────────────────────────────────────────────────────────────

async function applyPromo() {
  const code = document.getElementById('promo-code').value.trim();

  if (!code) {
    alert('Please enter a promo code.');
    return;
  }

  try {
    const res = await fetch(`${API}/promo/validate?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      credentials: 'include',
    });

    const promo = await res.json();

    if (!res.ok) {
      throw new Error(promo.message || 'Invalid promo code.');
    }

    currentDiscountValue = promo.discountValue;
    currentDiscountType = promo.discountType;
    appliedPromoCode = code;

    updateCartTotals(allCart);
    alert('Promo code applied!');
  } catch (err) {
    alert(err.message || 'Promo code not found or expired.');
    currentDiscountValue = 0;
    currentDiscountType = null;
    appliedPromoCode = null;
    updateCartTotals(allCart);
  }
}

// ── ORDER ─────────────────────────────────────────────────────────────────────

async function placeOrder() {
  const firstName = document.getElementById('checkout-first').value.trim();
  const lastName = document.getElementById('checkout-last').value.trim();
  const email = document.getElementById('checkout-email').value.trim();
  const phone = document.getElementById('checkout-phone').value.trim();
  const errEl = document.getElementById('checkout-error');
  const btn = document.getElementById('confirm-btn');

  errEl.style.display = 'none';

  if (!firstName || !lastName || !phone) {
    errEl.textContent = 'First name, last name and phone number are required.';
    errEl.style.display = 'block';
    return;
  }

  if (!allCart.length) {
    errEl.textContent = 'Your cart is empty.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Placing order…';

  try {
    const res = await fetch(API + '/orders', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        promoCode: appliedPromoCode || undefined,
      }),
    });

    if (res.status === 401) {
      window.location.href = 'login-mobile.html';
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.message || 'Could not place order. Please try again.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Place Order';
      return;
    }

    window.dispatchEvent(new Event('cartUpdated'));
    window.location.href = 'account-orders.html';

  } catch (e) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

loadCart();

