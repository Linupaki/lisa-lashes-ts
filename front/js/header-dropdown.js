(function () {

  let _hdrUser = null;
  let _hdrLoaded = false;
  const API = '';

  async function login() {
    const identifierEl = document.getElementById('identifier');
    const passwordEl = document.getElementById('password');

    if (!identifierEl || !passwordEl) {
      console.error('Login inputs not found in the DOM layout!');
      return;
    }

    const identifier = identifierEl.value;
    const password = passwordEl.value;

    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      if (!res.ok) {
        alert('Wrong credentials');
        return;
      }

      const data = await res.json();

      if (data.success) {
        _hdrLoaded = false;
        await hdrLoadUser();

        // FIXED: Send all authenticated users directly to account.html regardless of role
        window.location.href = '/account.html';
      }

    } catch (err) {
      console.error('Network or Runtime Connection Error:', err);
    }
  }

  async function hdrLoadUser() {
    if (_hdrLoaded) return;
    _hdrLoaded = true;

    try {
      const res = await fetch(API + '/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        _hdrUser = await res.json();

        // AUTO-REDIRECT GUARD: If user lands on login.html but cookie is already valid
        if (window.location.pathname.includes('login.html')) {
          window.location.href = '/account.html';
        }
      } else if (res.status === 401) {
        _hdrUser = null;
      }

    } catch (e) {
      console.error('Failed to parse active authorization state:', e);
    }

    hdrRenderDropdown();
  }

  function hdrRenderDropdown() {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;

    if (_hdrUser) {
      const isAdminOrMaster =
        _hdrUser.role === 'admin' ||
        _hdrUser.role === 'master';

      dd.innerHTML = `
        <div style="padding:12px 18px 8px;border-bottom:1px solid #f0ebe0;">

          <div style="font-weight:600;font-size:14px;color:#2c2c2c;">
            ${hdrEsc(_hdrUser.first_name + ' ' + (_hdrUser.last_name || ''))}
          </div>

          <div style="font-size:12px;color:#aaa;margin-top:2px;">
            ${hdrEsc(_hdrUser.phone || _hdrUser.address || '')}
          </div>

        </div>

        ${hdrItem('👤 My Account', '/account.html')}

        ${isAdminOrMaster
          ? hdrItem('⚙️ Admin Panel', '/front_admin/admin.html')
          : ''
        }

        <div style="border-top:1px solid #f0ebe0;margin:4px 0;"></div>

        <div onclick="hdrLogout()" class="dropdown-item logout-item">
          🚪 Log Out
        </div>
      `;

    } else {

      dd.innerHTML = `
        <div style="padding:12px 18px 8px;border-bottom:1px solid #f0ebe0;font-size:13px;color:#888;">
          Not signed in
        </div>

        <a href="/login.html" class="dropdown-item">
          🔑 Log In
        </a>

        <a href="/register.html" class="dropdown-item">
          ✨ Register
        </a>
      `;
    }
  }

  function hdrItem(label, href) {
    return `
      <a href="${href}" class="dropdown-item">
        ${label}
      </a>
    `;
  }

  function hdrEsc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.hdrToggleDropdown = function () {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    if (dd.style.display === 'block') { dd.style.display = 'none'; return; }
    hdrLoadUser();
    dd.style.display = 'block';
  };

  window.hdrLogout = async function () {
    await fetch(API + '/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    _hdrUser = null;
    _hdrLoaded = false;
    window.location.href = '/index.html'; // Set clean path layout for root index
  };

  // ── CART DROPDOWN ────────────────────────────────────────────────────────────

  let _cartItems = [];
  let _cartHideTimer = null;

  async function hdrLoadCart() {
    try {
      const res = await fetch(API + '/cart', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) { _cartItems = []; return; }
      _cartItems = await res.json();
    } catch (e) {
      _cartItems = [];
    }
    hdrRenderCart();
    hdrUpdateBadge();
  }

  function hdrUpdateBadge() {
    const badge = document.getElementById('hdr-cart-badge');
    if (!badge) return;
    const total = _cartItems.reduce((sum, i) => sum + i.quantity, 0);
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  function hdrRenderCart() {
    const dd = document.getElementById('hdr-cart-dropdown');
    if (!dd) return;

    if (!_cartItems.length) {
      dd.innerHTML = `
        <div style="padding:20px;text-align:center;color:#aaa;font-size:13px;font-family:'Inter',sans-serif;">
          Your cart is empty
        </div>
        <div style="padding:0 14px 14px;">
          <a href="shop.html" style="display:block;text-align:center;padding:10px;background:#1b1b1b;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-family:'Inter',sans-serif;">
            Browse Shop
          </a>
        </div>
      `;
      return;
    }

    const subtotal = _cartItems.reduce((sum, i) => sum + Number(i.products.price) * i.quantity, 0);

    const itemsHtml = _cartItems.map(item => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #f5f5f5;">
        <img src="/front_admin/uploads/products/${hdrEsc(item.products.path || '')}"
          style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#f0f0f0;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Inter',sans-serif;">
            ${hdrEsc(item.products.name)}
          </div>
          <div style="font-size:12px;color:#888;font-family:'Inter',sans-serif;">
            ${item.quantity} × €${Number(item.products.price).toFixed(2)}
          </div>
        </div>
        <div style="font-size:13px;font-weight:600;color:#1a1a1a;flex-shrink:0;font-family:'Inter',sans-serif;">
          €${(Number(item.products.price) * item.quantity).toFixed(2)}
        </div>
      </div>
    `).join('');

    dd.innerHTML = `
      <div style="padding:12px 14px 8px;border-bottom:1px solid #f0ebe0;font-size:12px;font-weight:600;color:#888;letter-spacing:1px;text-transform:uppercase;font-family:'Inter',sans-serif;">
        Your Cart
      </div>
      <div style="max-height:280px;overflow-y:auto;">
        ${itemsHtml}
      </div>
      <div style="padding:12px 14px;border-top:1px solid #f0ebe0;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:600;font-family:'Inter',sans-serif;">Subtotal</span>
        <span style="font-size:14px;font-weight:700;color:#c0a060;font-family:'Inter',sans-serif;">€${subtotal.toFixed(2)}</span>
      </div>
      <div style="padding:0 14px 14px;">
        <a href="checkout.html" style="display:block;text-align:center;padding:10px;background:#1b1b1b;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;font-family:'Inter',sans-serif;">
          Go to Checkout
        </a>
      </div>
    `;
  }

  window.hdrShowCart = function () {
    clearTimeout(_cartHideTimer);
    const dd = document.getElementById('hdr-cart-dropdown');
    if (!dd) return;
    hdrLoadCart();
    dd.style.display = 'block';
  };

  window.hdrKeepCart = function () {
    clearTimeout(_cartHideTimer);
  };

  window.hdrHideCart = function () {
    _cartHideTimer = setTimeout(() => {
      const dd = document.getElementById('hdr-cart-dropdown');
      if (dd) dd.style.display = 'none';
    }, 200);
  };

  // Hide cart dropdown when clicking outside
  document.addEventListener('click', function (e) {
    const wrap = document.getElementById('hdr-cart-wrap');
    const dd = document.getElementById('hdr-cart-dropdown');
    if (wrap && dd && !wrap.contains(e.target)) dd.style.display = 'none';
  });

  // Refresh badge whenever any page fires the cartUpdated event
  window.addEventListener('cartUpdated', () => {
    hdrLoadCart();
  });

  // Load badge count — if DOM already ready (header injected late), call immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hdrLoadCart());
  } else {
    hdrLoadCart();
  }

  // ── END CART DROPDOWN ─────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
      });
    }

    // Automatically trigger user status check when any page finishes loading
    hdrLoadUser();
  });

  // UI Interactivity Global Layout Listeners
  document.addEventListener('click', function (e) {
    const wrap = document.getElementById('hdr-user-wrap');
    const dd = document.getElementById('hdr-dropdown');
    if (wrap && dd && !wrap.contains(e.target)) dd.style.display = 'none';
  });

  document.addEventListener('mouseover', function (e) {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    if (dd.contains(e.target)) {
      const item = e.target.closest('a, div[onclick]');
      if (item) item.style.background = '#faf7f2';
    }
  });

  document.addEventListener('mouseout', function (e) {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    const item = e.target.closest('a, div[onclick]');
    if (item && dd.contains(item)) item.style.background = '';
  });
})();
