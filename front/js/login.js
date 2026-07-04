document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const identifier = document.getElementById('identifier').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        identifier,
        password
      })
    });

    const data = await res.json();

    if (data.success) {

      if (data.user.role === 'admin' || data.user.role === 'master') {
        window.location.href = '/front_admin/admin.html';
      } else {
        window.location.href = '/index.html';
      }

    } else {
      alert('Login failed');
    }

  } catch (err) {
    console.error(err);
    alert('Server error');
  }
});

