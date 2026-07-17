
function openMenu() {
  document.getElementById('mobileMenu').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
}

function closeMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
}

// Bind once (works even when menu/header are injected after this script runs)
(function bindMobileMenuEvents() {
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Open menu
    if (target && target.closest && target.closest('.menu-btn')) {
      e.preventDefault();
      openMenu();
      return;
    }

    // Close menu via overlay / close button
    if (target && target.closest) {
      if (target.closest('#menuOverlay') || target.closest('#mobileMenu .close-btn')) {
        e.preventDefault();
        closeMenu();
        return;
      }

      // Close menu when clicking a navigation link
      if (target.closest('#mobileMenu a.menu-item') || target.closest('#mobileMenu a.menu-book')) {
        closeMenu();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
})();

