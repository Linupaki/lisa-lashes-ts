const API = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  checkUserSession();
});

async function checkUserSession() {
  const loader = document.getElementById('page-loading');
  const authSec = document.getElementById('auth-section');
  const profSec = document.getElementById('profile-section');

  try {
    const res = await fetch(API + '/auth/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (res.ok) {
      const user = await res.json();
      renderProfilePage(user);
    } else {
      authSec.style.display = 'flex';
      profSec.style.display = 'none';
    }
  } catch (err) {
    console.error('Session check failed:', err);
    authSec.style.display = 'flex';
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function renderProfilePage(user) {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('profile-section').style.display = 'flex';

  document.getElementById('welcome-title').innerText = `Welcome Back, ${user.first_name}!`;
  document.getElementById('prof-name').innerText = `${user.first_name} ${user.last_name || ''}`;
  document.getElementById('prof-contact').innerText = user.phone || user.address || 'None added';
  document.getElementById('prof-role').innerText = user.role;

  if (user.role === 'admin' || user.role === 'master') {
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.style.display = 'block';
  }
}

async function doLogin() {
  const idEl = document.getElementById('login-identifier');
  const passEl = document.getElementById('login-password');
  const errEl = document.getElementById('login-error');

  errEl.style.display = 'none';

  try {
    const res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier: idEl.value, password: passEl.value }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      await checkUserSession();
    } else {
      errEl.innerText = data.message || 'Invalid credentials.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.innerText = 'Network error. Please try again.';
    errEl.style.display = 'block';
  }
}

async function doLogout(event) {
  if (event) event.preventDefault();
  try {
    await fetch(API + '/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    console.error('Logout failed:', e);
  }
  window.location.reload();
}

async function doRegister() {
  const first = document.getElementById('reg-first').value.trim();
  const last = document.getElementById('reg-last').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const errEl = document.getElementById('reg-error');
  const btn = document.getElementById('reg-btn');

  errEl.style.display = 'none';

  if (!first || !last || !phone || !pass) {
    errEl.innerText = 'First name, last name, phone and password are required.';
    errEl.style.display = 'block';
    return;
  }

  if (pass !== confirm) {
    errEl.innerText = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  if (pass.length < 6) {
    errEl.innerText = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const res = await fetch(API + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        first_name: first,
        last_name: last,
        phone,
        address: email || undefined,
        password: pass,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      await checkUserSession();
    } else {
      errEl.innerText = data.message || 'Registration failed.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  } catch (err) {
    errEl.innerText = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function switchTab(target) {
  const loginTab = document.getElementById('tab-login');
  const regTab = document.getElementById('tab-register');
  const btnLogin = document.getElementById('tab-btn-login');
  const btnReg = document.getElementById('tab-btn-register');

  if (target === 'login') {
    loginTab.style.display = 'block';
    regTab.style.display = 'none';
    btnLogin.classList.add('active');
    btnReg.classList.remove('active');
  } else {
    loginTab.style.display = 'none';
    regTab.style.display = 'block';
    btnLogin.classList.remove('active');
    btnReg.classList.add('active');
  }
}
