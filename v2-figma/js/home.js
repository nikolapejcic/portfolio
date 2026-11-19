// v2 home: intro <-> article switching and image zoom, matching the Figma prototype.
(function () {
  var body = document.body;
  var articles = document.querySelectorAll('.article');
  var zoom = document.querySelector('.zoom');
  var zoomImg = zoom.querySelector('.stage img');
  var zoomStage = zoom.querySelector('.stage');
  var lastThumb = null;

  // Show the article named in the URL (#ux-maturity etc.), or the intro.
  function route() {
    var id = location.hash.slice(1);
    var target = id && document.getElementById(id);
    if (!target || !target.classList.contains('article')) target = null;

    articles.forEach(function (a) {
      var on = a === target;
      if (on && !a.classList.contains('on')) a.scrollTop = 0;   // each article opens at its top
      a.classList.toggle('on', on);
    });
    body.classList.toggle('reading', !!target);

    document.querySelectorAll('a.item[href^="#"]').forEach(function (link) {
      if (link.getAttribute('href') === '#' + (target ? target.id : '')) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (window.matchMedia('(max-width: 900px)').matches && target) target.scrollIntoView();
  }

  // Logo goes back to the intro.
  document.querySelector('.logo').addEventListener('click', function (e) {
    e.preventDefault();
    if (location.hash) history.pushState(null, '', location.pathname);
    route();
  });

  // Image zoom: full-screen overlay with "Back to article".
  function openZoom(btn) {
    lastThumb = btn;
    zoom.classList.remove('wide', 'fill');
    zoom.classList.add(btn.dataset.mode || 'fill');
    zoomImg.src = btn.dataset.zoom;
    zoomImg.alt = btn.querySelector('img').alt;
    zoomStage.scrollLeft = 0;
    zoom.classList.add('on');
    zoom.querySelector('.back').focus();
  }
  function closeZoom() {
    zoom.classList.remove('on');
    if (lastThumb) lastThumb.focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-zoom]').forEach(function (btn) {
    btn.addEventListener('click', function () { openZoom(btn); });
  });
  zoom.querySelector('.back').addEventListener('click', closeZoom);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && zoom.classList.contains('on')) closeZoom();
  });

  // Wide charts: let the mouse wheel scroll them sideways.
  zoomStage.addEventListener('wheel', function (e) {
    if (!zoom.classList.contains('wide') || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    zoomStage.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);

  // First load: no animation.
  body.style.setProperty('--open', '0ms');
  route();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { body.style.removeProperty('--open'); });
  });
})();
