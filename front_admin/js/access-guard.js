// Pages that require admin role (masters cannot access)
const ADMIN_ONLY_PAGES = ['customers.html', 'health.html', 'settings.html', 'about-editor.html'];

const currentPage = window.location.pathname.split('/').pop() || '';
const isAdminOnlyPage = ADMIN_ONLY_PAGES.includes(currentPage);

function updateAdminTopbar(user) {
  try {
    if (!user) return;

    const nameEl = document.getElementById('admin-name');
    if (nameEl) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      nameEl.textContent = fullName || user.email || 'Admin';
    }

    const avatarEl = document.getElementById('admin-avatar');
    if (avatarEl) {
      const src = (user.first_name || user.email || '').trim();
      avatarEl.textContent = (src ? src.charAt(0) : '?').toUpperCase();
    }
  } catch (_) {
  }
}

async function checkAdminAccess() {
  const API = '';
  try {
    const res = await fetch(API + '/auth/me', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) { window.location.href = '/account.html'; return false; }

    const user = await res.json();

    if (user.role !== 'admin' && user.role !== 'master') {
      window.location.href = '/account.html';
      return false;
    }

    if (user.role === 'master' && isAdminOnlyPage) {
      showAccessDenied(currentPage);
      return false;
    }

    // If the page has a topbar profile, populate it here.
    updateAdminTopbar(user);

    return user;
  } catch (e) {
    window.location.href = '/account.html';
    return false;
  }
}

function showAccessDenied(page) {
  // Inject modal styles if not already present
  if (!document.getElementById('access-denied-style')) {
    const style = document.createElement('style');
    style.id = 'access-denied-style';
    style.textContent = `
      .access-denied-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      }
      .access-denied-modal {
        background: var(--surface, #fff);
        border-radius: 14px;
        padding: 40px 36px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      }
      .access-denied-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .access-denied-title {
        font-family: 'Playfair Display', serif;
        font-size: 22px;
        font-weight: 600;
        color: var(--text, #1a1a1a);
        margin-bottom: 10px;
      }
      .access-denied-msg {
        font-size: 14px;
        color: var(--text-muted, #888);
        line-height: 1.6;
        margin-bottom: 28px;
      }
      .access-denied-btn {
        display: inline-block;
        padding: 10px 28px;
        background: var(--gold, #caa46a);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: opacity 0.2s;
      }
      .access-denied-btn:hover { opacity: 0.85; }
    `;
    document.head.appendChild(style);
  }

  const labels = {
    'customers.html': 'Customers',
    'health.html': 'Server Health',
    'settings.html': 'Settings',
  };

  const pageName = labels[page] || page;

  const overlay = document.createElement('div');
  overlay.className = 'access-denied-overlay';
  overlay.innerHTML = `
    <div class="access-denied-modal">
      <div class="access-denied-icon">🔒</div>
      <div class="access-denied-title">Access Restricted</div>
      <div class="access-denied-msg">
        The <strong>${pageName}</strong> page is only accessible to Administrators.<br>
        Masters do not have permission to view this section.
      </div>
      <a href="admin.html" class="access-denied-btn">Back to Dashboard</a>
    </div>
  `;
  document.body.appendChild(overlay);
}
