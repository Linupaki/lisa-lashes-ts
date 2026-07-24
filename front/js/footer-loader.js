(function () {
  var container = document.getElementById('footer-new');
  if (!container) return;

  var basePath = container.getAttribute('data-path') || '';
  var footerFile = container.getAttribute('data-footer') || 'footer.html';

  fetch(basePath + footerFile)
    .then(function (r) { return r.text(); })
    .then(function (html) {
      container.innerHTML = html;
      loadProfile();
    })
    .catch(function (e) { console.error('Footer load failed:', e); });

  async function loadProfile() {
    try {
      var API = "";
      var res = await fetch(API + '/profile', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      var p = await res.json();

      var set = function (id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      set('footer-business-name', [p.business_name, p.address].filter(Boolean).join(', ') || 'Our Salon');
      set('footer-phone', p.phone || '');
      set('footer-email', p.email || '');

      var copy = document.getElementById('footer-copyright');
      if (copy && p.business_name) {
        copy.textContent = '\u00A9 ' + new Date().getFullYear() + ' ' + p.business_name + '. All rights reserved.';
      }
    } catch (e) {
      console.error('Footer profile load failed:', e);
    }
  }
})();
