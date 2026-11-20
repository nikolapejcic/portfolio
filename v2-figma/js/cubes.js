/* Isometric cubes sprinkled in the page frame (2026-11-19): sidebar space and right margin, never in article content.
   Seeded by the URL hash, so every case study gets its own scatter but it stays the same between visits. Desktop only. */
(function () {
  var PINK = ['#FFE3F3', '#FFCEEB', '#FFC1E7'], YEL = ['#FAFBDD', '#F6F9C1', '#ECEEC1'];
  function rng(seed) { var h = 2166136261; for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // one isometric block: footprint a x b, height h (2:1 isometric, like the logo cubes)
  function block(x, y, a, b, h, c) {
    var P = function (pts) { return pts.map(function (p) { return (x + p[0]).toFixed(1) + ',' + (y + p[1]).toFixed(1); }).join(' '); };
    var t = [[b, 0], [b + a, a / 2], [a, (a + b) / 2], [0, b / 2]];
    var L = [t[3], t[2], [t[2][0], t[2][1] + h], [0, b / 2 + h]], R = [t[2], t[1], [t[1][0], t[1][1] + h], [t[2][0], t[2][1] + h]];
    return '<polygon points="' + P(L) + '" fill="' + c[1] + '"/><polygon points="' + P(R) + '" fill="' + c[2] + '"/><polygon points="' + P(t) + '" fill="' + c[0] + '"/>';
  }
  function group(r) {
    var n = 1 + Math.floor(r() * 3), parts = [], W = 0, H = 0, x = 0;
    for (var i = 0; i < n; i++) {
      var s = 12 + r() * 30, kind = r(), a = s, b = s, h = s;
      if (kind < .3) h = s * (1.6 + r());            // tall block
      else if (kind < .55) { h = s * .35; a = s * 1.5; } // flat slab
      var c = r() < .62 ? PINK : YEL, y = r() * 26;
      parts.push(block(x, y, a, b, h, c));
      x += a + b * (.4 + r() * .7);
      W = Math.max(W, x + b); H = Math.max(H, y + (a + b) / 2 + h);
    }
    return { svg: parts.join(''), w: Math.ceil(W), h: Math.ceil(H) };
  }
  // Cubes live in the page frame, never inside an article: the empty sidebar space under the
  // navigation, and the outer right margin. Reshuffled per case study (seeded by the URL hash).
  var layer;
  function draw() {
    if (!layer) { layer = document.createElement('div'); layer.id = 'cube-layer'; layer.setAttribute('aria-hidden', 'true');
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1'; document.body.appendChild(layer); }
    layer.innerHTML = '';
    if (window.innerWidth < 1241 || !document.body.classList.contains('reading')) return;
    var side = document.querySelector('.sidebar'), secs = document.querySelector('.sidebar .sections'), main = document.querySelector('.main');
    if (!side || !secs || !main) return;
    var sr = side.getBoundingClientRect(), nr = secs.getBoundingClientRect(), mr = main.getBoundingClientRect();
    var zones = [];
    var top = nr.bottom + 48, bot = window.innerHeight - 110;
    if (bot - top > 80) zones.push({ x0: sr.left + 8, x1: sr.right - 8, y0: top, y1: bot, max: 200 });
    var rw = window.innerWidth - mr.right - 20;
    if (rw > 50) zones.push({ x0: mr.right + 12, x1: window.innerWidth - 8, y0: 24, y1: window.innerHeight - 80, max: rw - 8 });
    var gw = mr.left - sr.right - 16;   // gutter between sidebar and article, top of the page
    if (gw > 40) zones.push({ x0: sr.right + 8, x1: mr.left - 8, y0: 110, y1: Math.min(window.innerHeight * .55, 520), max: gw });
    zones.push(zones[zones.length - 1]);  // weight the upper zones
    if (!zones.length) return;
    var r = rng(location.hash || 'home'), groups = 1 + Math.floor(r() * 3);
    for (var g = 0; g < groups; g++) {
      var z = zones[Math.floor(r() * zones.length)], gr = group(r);
      var scale = Math.min(.7 + r() * .9, z.max / gr.w, (z.y1 - z.y0) / gr.h);
      var w = gr.w * scale, h = gr.h * scale;
      var x = z.x0 + r() * Math.max(0, z.x1 - z.x0 - w), y = z.y0 + Math.pow(r(), 2.4) * Math.max(0, z.y1 - z.y0 - h);  // skewed toward the top
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px';
      el.innerHTML = '<svg viewBox="0 0 ' + gr.w + ' ' + gr.h + '" width="100%" height="100%">' + gr.svg + '</svg>';
      layer.appendChild(el);
    }
  }
  var t; function later() { clearTimeout(t); t = setTimeout(draw, 120); }
  window.addEventListener('resize', later); window.addEventListener('hashchange', later);
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
  window.addEventListener('load', later);
})();
