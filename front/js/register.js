document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const first_name = document.getElementById('name').value;
  const last_name = document.getElementById('surname').value;
  const address = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const password_hash = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password_hash !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }

  try {
    const registerRes = await fetch('/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name,
        last_name,
        address,
        phone,
        password_hash
      })
    });

    if (!registerRes.ok) {
      alert('Registration failed');
      return;
    }

    const loginRes = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        identifier: address,
        password: password_hash
      })
    });

    const loginData = await loginRes.json();

    if (loginData.success) {
      window.location.href = '/account.html';
    } else {
      alert('Account created but login failed');
    }

  } catch (err) {
    console.error(err);
    alert('Server error');
  }
}); 
