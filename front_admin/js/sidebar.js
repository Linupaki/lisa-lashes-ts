(function () {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  fetch('sidebar.html')
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Mark active link based on current filename
      const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
      container.querySelectorAll('.nav-item[data-page]').forEach(link => {
        if (link.getAttribute('data-page') === currentPage) {
          link.classList.add('active');
        }
      });
    })
    .catch(err => console.error('Failed to load sidebar:', err));
})();
