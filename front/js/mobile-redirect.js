(function () {
  try {
    const meta = document.querySelector('meta[name="desktop-redirect"]');
    if (!meta) return;

    const desktopPath = (meta.getAttribute('content') || '').trim();
    if (!desktopPath) return;

    const isNotPhone = window.matchMedia('(min-width: 601px)').matches;
    if (!isNotPhone) return;

    // Preserve query params + hash.
    const targetUrl = `${desktopPath}${window.location.search || ''}${window.location.hash || ''}`;

    // Avoid loops if already on desktop page.
    if (window.location.pathname.includes(desktopPath)) return;

    window.location.replace(targetUrl);
  } catch (_) {
    // no-op
  }
})();
