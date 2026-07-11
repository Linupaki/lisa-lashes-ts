const API = '';
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

// ── CART ──────────────────────────────────────────────────────────────────────

async function loadCart() {
  try {
    const res = await fetch(API + '/cart', { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    allCart = Array.isArray(data) ? data : [];
    renderCart(allCart);
  } catch (e) {
    console.error('Failed to load cart:', e);
    document.getElementById('cart-items').innerHTML =
      '<div style="text-align:center;padding:16px;color:#999;">Failed to load cart.</div>';
  }
}

function renderCart(items) {
  const container = document.getElementById('cart-items');

  if (!items.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;">Your cart is empty.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="summary-item">
      <img src="/front_admin/uploads/products/${item.products.path}" alt="${item.products.name}">
      <div class="cart-info">
        <div class="cart-name">${item.products.name}</div>
        <div class="cart-qty">Quantity: ${item.quantity}</div>
      </div>
      <div class="cart-price">€${(Number(item.products.price) * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  const subtotal = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  let promoDiscount = 0;
  if (currentDiscountType === 'percent') promoDiscount = subtotal * (currentDiscountValue / 100);
  if (currentDiscountType === 'fixed') promoDiscount = currentDiscountValue;
  promoDiscount = Math.min(promoDiscount, subtotal);

  const total = subtotal - promoDiscount;

  document.getElementById('cart-count').textContent = ` (${totalItems} items)`;
  document.getElementById('subtotal').textContent = `€${subtotal.toFixed(2)}`;
  document.getElementById('savings').textContent = `€0.00`;
  document.getElementById('promo-discount').textContent = `-€${promoDiscount.toFixed(2)}`;
  document.getElementById('total').textContent = `€${total.toFixed(2)}`;
  document.getElementById('total-label').textContent = `Total (${totalItems} items)`;

  if (promoDiscount > 0) {
    document.getElementById('promo-row').style.display = 'flex';
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

    renderCart(allCart);
    alert('Promo code applied!');
  } catch (err) {
    alert(err.message || 'Promo code not found or expired.');
    currentDiscountValue = 0;
    currentDiscountType = null;
    appliedPromoCode = null;
    renderCart(allCart);
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
      window.location.href = 'account.html';
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
