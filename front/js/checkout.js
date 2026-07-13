const API = '';
let allCart = [];
let currentDiscountValue = 0;
let currentDiscountType = null;
let appliedPromoCode = null;

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  prefillUserDetails();
  loadCart();
  initCheckoutAccordions();
  restoreCheckoutPrefs();
  bindCheckoutPrefsAutosave();
  applyDeliveryMethodUI();
});

// ── ACCORDIONS (Delivery / Payment) ─────────────────────────────────────────

function initCheckoutAccordions() {
  const headers = document.querySelectorAll('.panel.accordion .panel-header');
  headers.forEach(h => {
    const toggle = () => {
      const panel = h.closest('.panel');
      if (!panel) return;
      panel.classList.toggle('collapsed');
      const isCollapsed = panel.classList.contains('collapsed');
      h.setAttribute('aria-expanded', String(!isCollapsed));
    };

    h.addEventListener('click', toggle);
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
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

  ids.forEach(id => {
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

  document.querySelectorAll('input[name="payment-method"]').forEach(r => {
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

function getEffectivePrice(product) {
  const d = product.product_discount;
  const orig = Number(product.price);
  if (!d) return orig;
  const now = new Date();
  const active = new Date(d.start_time) <= now && new Date(d.end_time) >= now;
  if (!active) return orig;
  return d.discount_type === 'percentage'
    ? orig * (1 - Number(d.discount_value) / 100)
    : Math.max(0, orig - Number(d.discount_value));
}

function renderCart(items) {
  const container = document.getElementById('cart-items');

  if (!items.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;">Your cart is empty.</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    const orig = Number(item.products.price);
    const sale = getEffectivePrice(item.products);
    const hasDiscount = sale < orig;
    const priceHtml = hasDiscount
      ? `<div class="cart-price">
           <span style="text-decoration:line-through;color:#aaa;font-size:12px;">€${(orig * item.quantity).toFixed(2)}</span>
           <span style="color:#c0392b;font-weight:700;margin-left:4px;">€${(sale * item.quantity).toFixed(2)}</span>
         </div>`
      : `<div class="cart-price">€${(orig * item.quantity).toFixed(2)}</div>`;

    return `
      <div class="summary-item">
        <img src="/front_admin/uploads/products/${item.products.path}" alt="${item.products.name}">
        <div class="cart-info">
          <div class="cart-name">${item.products.name}</div>
          <div class="cart-qty">Quantity: ${item.quantity}${hasDiscount ? ' <span style="font-size:10px;background:#fff3cd;color:#856404;padding:1px 5px;border-radius:8px;margin-left:4px;">Sale</span>' : ''}</div>
        </div>
        ${priceHtml}
      </div>
    `;
  }).join('');

  const subtotal = items.reduce((sum, item) => sum + getEffectivePrice(item.products) * item.quantity, 0);
  const origTotal = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const productSavings = origTotal - subtotal;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  let promoDiscount = 0;
  if (currentDiscountType === 'percent') promoDiscount = subtotal * (currentDiscountValue / 100);
  if (currentDiscountType === 'fixed') promoDiscount = currentDiscountValue;
  promoDiscount = Math.min(promoDiscount, subtotal);

  const total = subtotal - promoDiscount;

  document.getElementById('cart-count').textContent = ` (${totalItems} items)`;
  document.getElementById('subtotal').textContent = `€${subtotal.toFixed(2)}`;
  document.getElementById('savings').textContent = productSavings > 0 ? `-€${productSavings.toFixed(2)}` : `€0.00`;
  document.getElementById('promo-discount').textContent = `-€${promoDiscount.toFixed(2)}`;
  document.getElementById('total').textContent = `€${total.toFixed(2)}`;
  document.getElementById('total-label').textContent = `Total (${totalItems} items)`;

  if (promoDiscount > 0) document.getElementById('promo-row').style.display = 'flex';
  if (productSavings > 0) {
    const savingsRow = document.getElementById('savings-row');
    if (savingsRow) savingsRow.style.display = 'flex';
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

    const details = document.getElementById('details-panel');
    if (details) details.classList.remove('collapsed');
    return;
  }

  // Delivery validation
  const address1 = document.getElementById('delivery-address1')?.value.trim();
  const city = document.getElementById('delivery-city')?.value.trim();
  const deliveryMethod = document.getElementById('delivery-method')?.value || 'standard';
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;

  if (deliveryMethod !== 'pickup' && (!address1 || !city)) {
    errEl.textContent = 'Please fill in delivery address (Address line 1 and City).';
    errEl.style.display = 'block';

    const dp = document.getElementById('delivery-panel');
    if (dp) dp.classList.remove('collapsed');
    return;
  }

  if (!paymentMethod) {
    errEl.textContent = 'Please select a payment method.';
    errEl.style.display = 'block';
    const pp = document.getElementById('payment-panel');
    if (pp) pp.classList.remove('collapsed');
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

        // Extra fields (API currently ignores them, but UI requires them)
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
    try { localStorage.removeItem('checkout_prefs_v1'); } catch (e) { }
    window.location.href = 'account-orders.html';

  } catch (e) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}
