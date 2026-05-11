(function() {
  const API = 'http://localhost:8000/api';
  let _hdrUser = null;
  let _hdrLoaded = false;

  async function hdrLoadUser() {
    if (_hdrLoaded) return;
    _hdrLoaded = true;
    try {
      const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) _hdrUser = await res.json();
    } catch(e) {}
    hdrRenderDropdown();
  }

  function hdrRenderDropdown() {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    const base = hdrBasePath();

    if (_hdrUser) {
      dd.innerHTML =
        '<div style="padding:12px 18px 8px;border-bottom:1px solid #f0ebe0;">' +
          '<div style="font-weight:600;font-size:14px;color:#2c2c2c;">' +
            hdrEsc(_hdrUser.first_name + ' ' + _hdrUser.last_name) +
          '</div>' +
          '<div style="font-size:12px;color:#aaa;margin-top:2px;">' +
            hdrEsc(_hdrUser.phone || _hdrUser.email || '') +
          '</div>' +
        '</div>' +
        hdrItem('👤 My Account', base + 'account.html') +
        (_hdrUser.is_admin ? hdrItem('⚙️ Admin Panel', '/admin/admin.html') : '') +
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
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function hdrBasePath() {
    const path = window.location.pathname;
    if (path.includes('front_admin')) return '../front/';
    return '';
  }

  window.hdrToggleDropdown = function() {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    if (dd.style.display === 'block') { dd.style.display = 'none'; return; }
    hdrLoadUser();
    dd.style.display = 'block';
  };

  window.hdrLogout = async function() {
    try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch(e) {}
    _hdrUser = null; _hdrLoaded = false;
    window.location.href = '/front/index.html';
  };

  document.addEventListener('click', function(e) {
    const wrap = document.getElementById('hdr-user-wrap');
    const dd   = document.getElementById('hdr-dropdown');
    if (wrap && dd && !wrap.contains(e.target)) dd.style.display = 'none';
  });

  document.addEventListener('mouseover', function(e) {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    if (dd.contains(e.target)) {
      const item = e.target.closest('a, div[onclick]');
      if (item) item.style.background = '#faf7f2';
    }
  });
  document.addEventListener('mouseout', function(e) {
    const dd = document.getElementById('hdr-dropdown');
    if (!dd) return;
    const item = e.target.closest('a, div[onclick]');
    if (item && dd.contains(item)) item.style.background = '';
  });
})();
