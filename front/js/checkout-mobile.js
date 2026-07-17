const API = window.location.origin;
let allCart = [];
let currentDiscountValue = 0;
let currentDiscountType = null;
let appliedPromoCode = null;

function getActiveDiscountInfo(product, now = new Date()) {
  const d = product?.product_discount;
  if (!d) return null;

  const orig = Number(product?.price);
  if (!Number.isFinite(orig)) return null;

  const value = Number(d.discount_value);
  if (!Number.isFinite(value) || value <= 0) return null;

  const start = d.start_time ? new Date(d.start_time) : null;
  const end = d.end_time ? new Date(d.end_time) : null;

  if (start && !Number.isNaN(start.getTime()) && start > now) return null;
  if (end && !Number.isNaN(end.getTime()) && end < now) return null;

  let sale = orig;
  if (d.discount_type === 'percentage') {
    sale = orig * (1 - value / 100);
  } else {
    sale = orig - value;
  }

  sale = Math.max(0, sale);
  if (!(sale < orig)) return null;

  return { orig, sale };
}

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  prefillUserDetails();
  loadCart();
  restoreCheckoutPrefs();
  bindCheckoutPrefsAutosave();
  applyDeliveryMethodUI();
  bindCheckoutUI();
});

function bindCheckoutUI() {
  const promoBtn = document.getElementById('promo-apply-btn');
  if (promoBtn) promoBtn.addEventListener('click', applyPromo);

  const confirmBtn = document.getElementById('confirm-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', placeOrder);

  // Cart actions (delegated)
  const cartWrap = document.getElementById('cart-items');
  if (cartWrap) {
    cartWrap.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const productId = Number(btn.getAttribute('data-product-id'));
      if (!action || !productId) return;

      if (action === 'qty') {
        const delta = Number(btn.getAttribute('data-delta'));
        const currentQty = Number(btn.getAttribute('data-current-qty'));
        const next = Number.isFinite(currentQty) ? currentQty + delta : NaN;
        if (Number.isFinite(next)) setItemQuantity(productId, next);
      }

      if (action === 'remove') {
        removeItem(productId);
      }
    });
  }

  // Optional: help button behavior (keeps HTML clean)
  const helpBtn = document.querySelector('.help button');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      window.location.href = 'index-mobile.html#contact';
    });
  }
}

// ── PREFS (localStorage) ────────────────────────────────────────────────────

function restoreCheckoutPrefs() {
  try {
    const raw = localStorage.getItem('checkout_prefs_v1');
    if (!raw) return;
    const prefs = JSON.parse(raw);

    if (prefs.address1) document.getElementById('delivery-address1').value = prefs.address1;
    if (prefs.address2) document.getElementById('delivery-address2').value = prefs.address2;
    if (prefs.city) document.getElementById('delivery-city').value = prefs.city;
    if (prefs.eircode) document.getElementById('delivery-eircode').value = prefs.eircode;
    if (prefs.deliveryMethod) document.getElementById('delivery-method').value = prefs.deliveryMethod;
    if (prefs.note) document.getElementById('order-note').value = prefs.note;

    if (prefs.paymentMethod) {
      const radio = document.querySelector(`input[name="payment-method"][value="${prefs.paymentMethod}"]`);
      if (radio && !radio.disabled) radio.checked = true;
    }
  } catch (e) {
    // ignore
  }
}

function bindCheckoutPrefsAutosave() {
  const ids = [
    'delivery-address1',
    'delivery-address2',
    'delivery-city',
    'delivery-eircode',
    'delivery-method',
    'order-note',
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', saveCheckoutPrefs);
    el.addEventListener('change', saveCheckoutPrefs);
  });

  const deliveryMethodEl = document.getElementById('delivery-method');
  if (deliveryMethodEl) {
    deliveryMethodEl.addEventListener('change', () => {
      applyDeliveryMethodUI();
      saveCheckoutPrefs();
    });
  }

  document.querySelectorAll('input[name="payment-method"]').forEach((r) => {
    r.addEventListener('change', saveCheckoutPrefs);
  });
}

function applyDeliveryMethodUI() {
  const method = document.getElementById('delivery-method')?.value || 'standard';
  const addrWrap = document.getElementById('delivery-address-fields');
  if (addrWrap) addrWrap.style.display = method === 'pickup' ? 'none' : '';

  // If pickup is selected, default payment to pay-on-pickup
  if (method === 'pickup') {
    const pickupPay = document.querySelector('input[name="payment-method"][value="pickup"]');
    if (pickupPay && !pickupPay.disabled) pickupPay.checked = true;
  }
}

function saveCheckoutPrefs() {
  const payment = document.querySelector('input[name="payment-method"]:checked')?.value || 'cash';
  const prefs = {
    address1: document.getElementById('delivery-address1')?.value?.trim() || '',
    address2: document.getElementById('delivery-address2')?.value?.trim() || '',
    city: document.getElementById('delivery-city')?.value?.trim() || '',
    eircode: document.getElementById('delivery-eircode')?.value?.trim() || '',
    deliveryMethod: document.getElementById('delivery-method')?.value || 'standard',
    paymentMethod: payment,
    note: document.getElementById('order-note')?.value?.trim() || '',
  };
  try {
    localStorage.setItem('checkout_prefs_v1', JSON.stringify(prefs));
  } catch (e) { }
}

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

  const now = new Date();

  container.innerHTML = items.map(item => {
    const p = item.products;
    const qty = Number(item.quantity) || 0;
    const origUnit = Number(p?.price) || 0;
    const disc = getActiveDiscountInfo(p, now);
    const unit = disc ? disc.sale : origUnit;

    const origTotal = origUnit * qty;
    const total = unit * qty;

    const priceHtml = disc
      ? `<div class="mobile-cart-price">
           <div class="mobile-cart-price-row">
             <span class="mobile-cart-price-original">€${origTotal.toFixed(2)}</span>
             <span class="mobile-cart-price-sale">€${total.toFixed(2)}</span>
           </div>
         </div>`
      : `<div class="mobile-cart-price">€${total.toFixed(2)}</div>`;

    return `
    <div class="mobile-cart-item">
      <img data-fallback-src="assets/logo/logo.png" src="/front_admin/uploads/products/${p.path}" alt="${p.name}">
      <div class="mobile-cart-info">
        <div class="mobile-cart-name">${p.name}</div>
        <div class="mobile-cart-controls">
          <button class="qty-btn" type="button" data-action="qty" data-product-id="${p.id}" data-delta="-1" data-current-qty="${qty}" ${qty <= 1 ? 'disabled' : ''}>−</button>
          <span>${qty}</span>
          <button class="qty-btn" type="button" data-action="qty" data-product-id="${p.id}" data-delta="1" data-current-qty="${qty}">+</button>
          <button class="remove-btn" type="button" data-action="remove" data-product-id="${p.id}">Remove</button>
        </div>
      </div>
      ${priceHtml}
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

  updateCartTotals(items);
}

function updateCartTotals(items) {
  const now = new Date();

  const totals = items.reduce((acc, item) => {
    const p = item.products;
    const qty = Number(item.quantity) || 0;
    const origUnit = Number(p?.price) || 0;
    const disc = getActiveDiscountInfo(p, now);
    const unit = disc ? disc.sale : origUnit;

    acc.totalItems += qty;
    acc.originalSubtotal += origUnit * qty;
    acc.discountedSubtotal += unit * qty;
    return acc;
  }, { totalItems: 0, originalSubtotal: 0, discountedSubtotal: 0 });

  const productSavings = Math.max(0, totals.originalSubtotal - totals.discountedSubtotal);

  let promoDiscount = 0;
  if (currentDiscountType === 'percent') promoDiscount = totals.discountedSubtotal * (currentDiscountValue / 100);
  if (currentDiscountType === 'fixed') promoDiscount = currentDiscountValue;
  promoDiscount = Math.min(promoDiscount, totals.discountedSubtotal);

  const total = totals.discountedSubtotal - promoDiscount;

  // Обновляем заголовок Cart items со счетчиком
  document.getElementById('cart-items-header').textContent = `Cart items (${totals.totalItems})`;
  
  document.getElementById('subtotal').textContent = `€${totals.originalSubtotal.toFixed(2)}`;
  document.getElementById('savings').textContent = productSavings > 0
    ? `-€${productSavings.toFixed(2)}`
    : `€0.00`;
  document.getElementById('promo-discount').textContent = `-€${promoDiscount.toFixed(2)}`;
  document.getElementById('total').textContent = `€${total.toFixed(2)}`;
  document.getElementById('total-label').textContent = `Total (${totals.totalItems} items)`;

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

  // Delivery validation
  const deliveryMethod = document.getElementById('delivery-method')?.value || 'standard';
  const address1 = document.getElementById('delivery-address1')?.value.trim();
  const city = document.getElementById('delivery-city')?.value.trim();
  if (deliveryMethod !== 'pickup' && (!address1 || !city)) {
    errEl.textContent = 'Please fill in delivery address (Address line 1 and City).';
    errEl.style.display = 'block';
    return;
  }

  const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
  if (!paymentMethod) {
    errEl.textContent = 'Please select a payment method.';
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

        // Extra fields (API may ignore them, but UI requires them)
        delivery: {
          address1: deliveryMethod === 'pickup' ? '' : (address1 || ''),
          address2: deliveryMethod === 'pickup' ? '' : (document.getElementById('delivery-address2')?.value.trim() || ''),
          city: deliveryMethod === 'pickup' ? '' : (city || ''),
          eircode: deliveryMethod === 'pickup' ? '' : (document.getElementById('delivery-eircode')?.value.trim() || ''),
          method: deliveryMethod,
        },
        payment: {
          method: paymentMethod,
        },
        note: document.getElementById('order-note')?.value.trim() || undefined,
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
    try { localStorage.removeItem('checkout_prefs_v1'); } catch (e) { }
    window.location.href = 'account-orders-mobile.html';

  } catch (e) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

