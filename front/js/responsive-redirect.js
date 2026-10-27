(function () {
  const isMobileLayout = window.matchMedia('(max-width: 834px)').matches;
  const mobileTarget = document.querySelector('meta[name="mobile-redirect"]')?.content?.trim();
  const desktopTarget = document.querySelector('meta[name="desktop-redirect"]')?.content?.trim();
  const target = isMobileLayout ? mobileTarget : desktopTarget;

  if (!target) return;

  const destination = new URL(target, window.location.href);
  if (!destination.search) destination.search = window.location.search;
  if (!destination.hash) destination.hash = window.location.hash;

  if (destination.pathname === window.location.pathname) return;
  window.location.replace(destination.href);
})();
