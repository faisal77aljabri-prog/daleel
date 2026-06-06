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
      const size = 6 + Math.random() * 12;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 360);
      p.style.left = (Math.random() * 100) + '%';
      p.style.width = size + 'px';
      p.style.height = (size * 1.35) + 'px';      // elongated -> petal
      p.style.setProperty('--spin', spin.toFixed(0) + 'deg');
      p.style.animationDuration = (9 + Math.random() * 13) + 's';
      p.style.animationDelay = (-Math.random() * 16) + 's';
      p.style.opacity = (0.18 + Math.random() * 0.5).toFixed(2);
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
