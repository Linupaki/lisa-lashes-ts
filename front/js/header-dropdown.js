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
        window.location.href = '/front/account.html';
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
          window.location.href = '/front/account.html';
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
    const base = hdrBasePath();

    if (_hdrUser) {
      const isAdminOrMaster = _hdrUser.role === 'admin' || _hdrUser.role === 'master';

      dd.innerHTML =
        '<div style="padding:12px 18px 8px;border-bottom:1px solid #f0ebe0;">' +
        '<div style="font-weight:600;font-size:14px;color:#2c2c2c;">' +
        hdrEsc(_hdrUser.first_name + ' ' + (_hdrUser.last_name || '')) +
        '</div>' +
        '<div style="font-size:12px;color:#aaa;margin-top:2px;">' +
        hdrEsc(_hdrUser.phone || _hdrUser.address || '') +
        '</div>' +
        '</div>' +
        hdrItem('👤 My Account', base + 'account.html') +
        (isAdminOrMaster ? hdrItem('⚙️ Admin Panel', '/admin/admin.html') : '') +
        '<div style="border-top:1px solid #f0ebe0;margin:4px 0;"></div>' +
        '<div onclick="hdrLogout()" style="display:block;padding:10px 18px;font-size:14px;color:#c0392b;cursor:pointer;">🚪 Log Out</div>';
    } else {
      dd.innerHTML =
        '<div style="padding:12px 18px 8px;border-bottom:1px solid #f0ebe0;font-size:13px;color:#888;">Not signed in</div>' +
        '<a href="' + base + 'login.html" style="display:block;padding:10px 18px;font-size:14px;color:#2c2c2c;text-decoration:none;">🔑 Log In</a>' +
        '<a href="' + base + 'register.html" style="display:block;padding:10px 18px;font-size:14px;color:#2c2c2c;text-decoration:none;">✨ Register</a>';
    }
  }

  function hdrItem(label, href) {
    return '<a href="' + href + '" style="display:block;padding:10px 18px;font-size:14px;color:#2c2c2c;text-decoration:none;">' + label + '</a>';
  }

  function hdrEsc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function hdrBasePath() {
    const path = window.location.pathname;
    if (path.includes('front_admin')) return '../front/';
    return '';
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
    window.location.href = '/front/index.html'; // Set clean path layout for root index
  };

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
