(function () {
  if (!document.getElementById('header-mobile-styles')) {
    const stylesheet = document.createElement('link');
    stylesheet.id = 'header-mobile-styles';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'css/header-mobile.css';
    document.head.appendChild(stylesheet);
  }

  async function inject(id, url) {
    const host = document.getElementById(id);
    if (!host) return;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      host.innerHTML = await res.text();
    } catch (e) {
      host.innerHTML = '';
      console.warn(`Failed to load ${url}:`, e);
    }
  }

  // Script placed at the end of <body>
  Promise.all([
    inject('menu-mobile-root', 'menu-mobile.html'),
    inject('header-mobile', 'header-mobile.html'),
    inject('footer-mobile', 'footer-mobile.html'),
  ]);
})();
