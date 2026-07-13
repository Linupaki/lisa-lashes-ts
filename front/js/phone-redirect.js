(function () {
  try {
    const meta = document.querySelector('meta[name="mobile-redirect"]');
    if (!meta) return;

    const mobilePath = (meta.getAttribute('content') || '').trim();
    if (!mobilePath) return;

    const isPhone = window.matchMedia('(max-width: 600px)').matches;
    if (!isPhone) return;

    // Preserve query params + hash.
    const targetUrl = `${mobilePath}${window.location.search || ''}${window.location.hash || ''}`;

    // Avoid loops if already on mobile page.
    if (window.location.pathname.includes(mobilePath)) return;

    window.location.replace(targetUrl);
  } catch (_) {
    // no-op
  }
})();
