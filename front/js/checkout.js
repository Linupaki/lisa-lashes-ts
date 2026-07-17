const API = '';
let allCart = [];
let currentDiscountValue = 0;
let currentDiscountType = null;
let appliedPromoCode = null;
let userSavedAddresses = [];

// Stripe Core Initialization
const stripe = Stripe('pk_test_51TuDfNIlJFCatzciVFAZW3jNUjd2MqyfnHsUoU4ZPIVCNAtlYnf2F8jvzQNRG4Bv2AOSbYoytplGYxmIzKtU3DUH00Ohr8KN4p'); // Insert your client-side public key
let elements;
let clientSecret;

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initCheckoutAccordions();
  await prefillUserDetails(); // Populates customer details & dynamic layout dropdown maps
  await loadCart();            // Fetches actual cart entries and calls Stripe generation
  restoreCheckoutPrefs();      // Loads choices from memory
  bindCheckoutPrefsAutosave(); // Binds triggers to handle real-time UI toggles
  applyDeliveryMethodUI();
  toggleStripeUIContainer();   // Runs check on standard default option
});

// ── ACCORDIONS ───────────────────────────────────────────────────────────────

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

// ── PREFS & DOM UI VISIBILITY MUTATIONS ──────────────────────────────────────

function toggleStripeUIContainer() {
  const selectedPayment = document.querySelector('input[name="payment-method"]:checked')?.value || 'cash';
  const stripeContainer = document.getElementById('stripe-payment-container');

  if (stripeContainer) {
    stripeContainer.style.display = (selectedPayment === 'stripe') ? 'block' : 'none';
  }
}

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
    toggleStripeUIContainer();
  } catch (e) { }
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
    r.addEventListener('change', () => {
      toggleStripeUIContainer();
      saveCheckoutPrefs();
    });
  });
}

function applyDeliveryMethodUI() {
  const method = document.getElementById('delivery-method')?.value || 'standard';
  const addrWrap = document.getElementById('delivery-address-fields');
  if (addrWrap) addrWrap.style.display = method === 'pickup' ? 'none' : '';

  if (method === 'pickup') {
    const pickupPay = document.querySelector('input[name="payment-method"][value="pickup"]');
    if (pickupPay && !pickupPay.disabled) {
      pickupPay.checked = true;
      toggleStripeUIContainer();
    }
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

// ── DATA PREFILLS ────────────────────────────────────────────────────────────

async function prefillUserDetails() {
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return;
    const user = await res.json();
    if (user.first_name) document.getElementById('checkout-first').value = user.first_name;
    if (user.last_name) document.getElementById('checkout-last').value = user.last_name;
    if (user.phone) document.getElementById('checkout-phone').value = user.phone;
    if (user.address) document.getElementById('checkout-email').value = user.address;

    const addrRes = await fetch(API + '/account/addresses', { credentials: 'include', cache: 'no-store' });
    if (addrRes.ok) {
      userSavedAddresses = await addrRes.json();
      setupAddressSelector();
    }
  } catch (e) { console.error('Error prefilling details:', e); }
}

// ── ADRESS SECTOR MATRIX ──────────────────────────────────────────────────────

function setupAddressSelector() {
  const wrapper = document.getElementById('saved-addresses-wrapper');
  const selector = document.getElementById('saved-address-selector');
  if (!wrapper || !selector || !userSavedAddresses.length) return;

  wrapper.style.display = 'block';

  userSavedAddresses.forEach(addr => {
    const option = document.createElement('option');
    option.value = addr.id;
    option.textContent = `${addr.label || 'Address'} (${addr.address1}, ${addr.city})`;
    if (addr.is_default) option.selected = true;
    selector.appendChild(option);
  });

  syncSelectedAddress();
  selector.addEventListener('change', syncSelectedAddress);
}

function syncSelectedAddress() {
  const selector = document.getElementById('saved-address-selector');
  if (!selector) return;

  const value = selector.value;
  if (value === 'new') {
    document.getElementById('delivery-address1').value = '';
    document.getElementById('delivery-address2').value = '';
    document.getElementById('delivery-city').value = '';
    document.getElementById('delivery-eircode').value = '';
  } else {
    const chosen = userSavedAddresses.find(a => String(a.id) === String(value));
    if (chosen) {
      document.getElementById('delivery-address1').value = chosen.address1 || '';
      document.getElementById('delivery-address2').value = chosen.address2 || '';
      document.getElementById('delivery-city').value = chosen.city || '';
      document.getElementById('delivery-eircode').value = chosen.eircode || '';
    }
  }
  saveCheckoutPrefs();
}

// ── CART HANDLING ─────────────────────────────────────────────────────────────

async function loadCart() {
  try {
    const res = await fetch(API + '/cart', { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    allCart = Array.isArray(data) ? data : [];
    renderCart(allCart);

    if (allCart.length > 0) {
      await initializePaymentUI();
    }
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
}

// ── PROMO CODES ──────────────────────────────────────────────────────────────

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
    if (!res.ok) throw new Error(promo.message || 'Invalid promo code.');

    currentDiscountValue = promo.discountValue;
    currentDiscountType = promo.discountType;
    appliedPromoCode = code;

    renderCart(allCart);
    alert('Promo code applied!');

    await initializePaymentUI();
  } catch (err) {
    alert(err.message || 'Promo code not found or expired.');
    currentDiscountValue = 0;
    currentDiscountType = null;
    appliedPromoCode = null;
    renderCart(allCart);
  }
}

// ── STRIPE ENGINE INTERFACES ──────────────────────────────────────────────────

async function initializePaymentUI() {
  try {
    const promoCode = appliedPromoCode || undefined;

    const res = await fetch(API + '/orders/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promoCode }),
      credentials: 'include'
    });

    if (!res.ok) {
      const errData = await res.json();
      document.getElementById('payment-errors').textContent = errData.message || 'Failed initializing stripe intent.';
      return;
    }

    const data = await res.json();
    clientSecret = data.clientSecret;

    elements = stripe.elements({ clientSecret });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
  } catch (err) {
    console.error('Error loading payment UI:', err);
  }
}

// ── ORDER EXECUTION SUBMIT HOOK ───────────────────────────────────────────────

async function placeOrder() {
  const submitButton = document.getElementById('confirm-btn');
  const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'stripe';

  submitButton.disabled = true;
  document.getElementById('payment-errors').textContent = '';
  document.getElementById('checkout-error').style.display = 'none';

  try {
    let stripeIntentId = null;

    // Run verification routines ONLY if user selects to pay online via card element
    if (selectedPaymentMethod === 'stripe') {
      const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required'
      });

      if (error) {
        document.getElementById('payment-errors').textContent = error.message;
        submitButton.disabled = false;
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        stripeIntentId = paymentIntent.id;
      } else {
        throw new Error('Payment authorization unverified. Please try again.');
      }
    }

    const orderPayload = {
      first_name: document.getElementById('checkout-first').value.trim(),
      last_name: document.getElementById('checkout-last').value.trim(),
      email: document.getElementById('checkout-email').value.trim(),
      phone: document.getElementById('checkout-phone').value.trim(),
      promoCode: appliedPromoCode || undefined,
      stripePaymentIntentId: stripeIntentId || undefined,
      addressId: document.getElementById('saved-address-selector')?.value !== 'new'
        ? parseInt(document.getElementById('saved-address-selector').value, 10)
        : undefined,
      delivery: {
        method: document.getElementById('delivery-method').value,
        address1: document.getElementById('delivery-address1')?.value || '',
        address2: document.getElementById('delivery-address2')?.value || '',
        city: document.getElementById('delivery-city')?.value || '',
        eircode: document.getElementById('delivery-eircode')?.value || '',
      },
      payment: { method: selectedPaymentMethod }
    };

    const finalResponse = await fetch(API + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
      credentials: 'include'
    });

    if (finalResponse.ok) {
      const orderData = await finalResponse.json();
      localStorage.removeItem('checkout_prefs_v1');

      // 🎯 Redirect altered to pass tracking metrics directly to your order log panel
      window.location.href = `/account-orders.html?id=${orderData.id}`;
    } else {
      const errJson = await finalResponse.json();
      document.getElementById('checkout-error').textContent = errJson.message || 'Order completion rejected.';
      document.getElementById('checkout-error').style.display = 'block';
      submitButton.disabled = false;
    }
  } catch (err) {
    console.error(err);
    document.getElementById('checkout-error').textContent = err.message || 'Internal connection error occurred.';
    document.getElementById('checkout-error').style.display = 'block';
    submitButton.disabled = false;
  }
}
