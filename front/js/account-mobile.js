function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

const API = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-action="logout"]').forEach((a) => {
    a.addEventListener('click', (e) => doLogout(e));
  });
  checkUserSession();
});

async function checkUserSession() {
  const loader = document.getElementById('page-loading');
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
      window.location.href = 'login-mobile.html';
    }
  } catch (error) {
    console.error('Session check failed:', error);
    window.location.href = 'login-mobile.html';
  } finally {
    loader.style.display = 'none';
  }
}

function renderProfilePage(user) {
  document.getElementById('profile-section').style.display = 'block';

  document.getElementById('welcome-title').textContent = `Welcome Back, ${user.first_name || ''}!`;
  document.getElementById('prof-name').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  document.getElementById('prof-contact').textContent = user.phone || user.address || 'None added';
  document.getElementById('prof-role').textContent = user.role || 'user';

  if (user.role === 'admin' || user.role === 'master') {
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.style.display = 'block';
  }
}

async function doLogout(event) {
  if (event) event.preventDefault();

  try {
    await fetch(API + '/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error(error);
  }

  window.location.reload();
}

