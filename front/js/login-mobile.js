
function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

// Forgot Password Modal Functions
function openForgotModal(e) {
  e.preventDefault();
  document.getElementById('forgotModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeForgotModal() {
  document.getElementById('forgotModal').classList.remove('show');
  document.getElementById('forgotSuccess').style.display = 'none';
  document.querySelector('.forgot-form').style.display = 'block';
  document.getElementById('forgot-email').value = '';
  document.body.style.overflow = 'auto';
}

function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;

  // Here you would send the email to your backend
  // For now, we'll just show a success message
  console.log('Reset link sent to:', email);

  // Show success message
  document.querySelector('.forgot-form').style.display = 'none';
  document.getElementById('forgotSuccess').style.display = 'block';
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
  const modal = document.getElementById('forgotModal');
  if (event.target === modal) {
    closeForgotModal();
  }
});

// Auth (cookie-based, same as desktop)
async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch('/auth/me', { credentials: 'include', cache: 'no-store' });
    if (res.ok) {
      window.location.href = '/account-mobile.html';
    }
  } catch (_) { }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAlreadyLoggedIn();

  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const identifier = document.getElementById('identifier')?.value || '';
    const password = document.getElementById('password')?.value || '';

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        alert('Login failed');
        return;
      }

      window.location.href = '/account-mobile.html';
    } catch (err) {
      console.error(err);
      alert('Server error');
    }
  });
});

