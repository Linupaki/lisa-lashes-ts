const API = '';

document.addEventListener('DOMContentLoaded', () => {
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
      window.location.replace('/register.html');
    }
  } catch (err) {
    console.error('Session check failed:', err);
    window.location.replace('/register.html');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function renderProfilePage(user) {
  const profileSection = document.getElementById('profile-section');
  if (profileSection) profileSection.style.display = 'flex';

  document.getElementById('welcome-title').innerText = `Welcome Back, ${user.first_name}!`;
  document.getElementById('prof-name').innerText = `${user.first_name} ${user.last_name || ''}`;
  document.getElementById('prof-contact').innerText = user.phone || user.address || 'None added';
  document.getElementById('prof-role').innerText = user.role;

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
  } catch (e) {
    console.error('Logout failed:', e);
  }
  window.location.replace('/register.html');
}
