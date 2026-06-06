/* Khuzama floating particles — injects subtle lavender particles into the
   dark hero / page-header areas to give the site life. Pure CSS animation;
   respects prefers-reduced-motion. */
(function () {
  function spawn(host, count) {
    if (host.querySelector('.khuzama-particles')) return;
    const layer = document.createElement('div');
    layer.className = 'khuzama-particles';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'khuzama-particle';
      const size = 4 + Math.random() * 11;
      p.style.left = (Math.random() * 100) + '%';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.animationDuration = (9 + Math.random() * 13) + 's';
      p.style.animationDelay = (-Math.random() * 16) + 's';
      p.style.opacity = (0.15 + Math.random() * 0.5).toFixed(2);
      layer.appendChild(p);
    }
    host.insertBefore(layer, host.firstChild);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  }

  function init() {
    document.querySelectorAll('.hero').forEach(h => spawn(h, 22));
    document.querySelectorAll('.page-header').forEach(h => spawn(h, 14));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
