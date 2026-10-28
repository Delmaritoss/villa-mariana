/* Villa Mariana 1877 · page behaviour
   Languages, the bar and the louvre menu, the hero (the shutters open and
   the camera goes through the window), the peak (the postcard of the street
   front comes to life, its sky opens and the house steps down in front of the
   garden), the louvres on the bedrooms, the close (back out of the window),
   gallery, enquiry, map. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = (doc.querySelector('meta[name="vm-email"]') || {}).content || '';
  var DICT = window.VM_I18N || {};
  var LANGS = ['hr', 'en', 'de', 'it'];
  var lang = 'hr';

  root.classList.add('js');

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function progress(el) {
    var r = el.getBoundingClientRect();
    var travel = r.height - innerHeight;
    return { r: r, p: travel > 1 ? clamp(-r.top / travel, 0, 1) : 0 };
  }
  function near(r) { return r.bottom > -60 && r.top < innerHeight + 60; }

  /* ------------------------------------------------------------ i18n -- */
  var origText = new WeakMap();
  var origAttr = new WeakMap();

  // A key's text in the current language. Croatian lives in the markup; the
  // few strings only JavaScript writes have their Croatian in DICT.hr.
  function t(key) {
    var d = DICT[lang] || {};
    if (d[key] != null) return d[key];
    if (DICT.hr && DICT.hr[key] != null) return DICT.hr[key];
    return key;
  }

  function applyLang(next) {
    lang = LANGS.indexOf(next) > -1 ? next : 'hr';
    var d = DICT[lang] || {};
    root.lang = lang;
    $$('[data-i18n]').forEach(function (el) {
      if (!origText.has(el)) origText.set(el, el.textContent);
      var k = el.getAttribute('data-i18n');
      el.textContent = lang === 'hr' ? origText.get(el) : (d[k] != null ? d[k] : origText.get(el));
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      if (!origAttr.has(el)) origAttr.set(el, {});
      var o = origAttr.get(el);
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':'), a = bits[0].trim(), k = (bits[1] || '').trim();
        if (!(a in o)) o[a] = el.getAttribute(a) || '';
        var v = lang === 'hr' ? o[a] : (d[k] != null ? d[k] : (DICT.hr && DICT.hr[k]) || o[a]);
        el.setAttribute(a, v);
      });
    });
    // photo alt text is composed from the group and the room
    $$('img[data-cap]').forEach(function (img) {
      if (img.hasAttribute('data-i18n-attr')) return;
      var c = img.getAttribute('data-cap').split('.');
      if (!origAttr.has(img)) origAttr.set(img, { alt: img.alt });
      img.alt = lang === 'hr' ? origAttr.get(img).alt : t('g.' + c[0] + '.name') + ': ' + t('cap.' + c[1]);
    });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    store('vm-lang', lang);
    doc.dispatchEvent(new CustomEvent('vm:lang'));
  }

  function firstLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.indexOf(q) > -1) return q;
    var saved = store('vm-lang');
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var nav = (navigator.languages || [navigator.language || 'hr']);
    for (var i = 0; i < nav.length; i++) {
      var two = String(nav[i]).slice(0, 2).toLowerCase();
      if (two === 'hr' || two === 'sr' || two === 'bs' || two === 'sl') return 'hr';
      if (LANGS.indexOf(two) > -1) return two;
    }
    return 'en';
  }

  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });

  /* ------------------------------------------------------------ small bits */
  $$('[data-email]').forEach(function (a) {
    a.href = 'mailto:' + EMAIL;
    a.textContent = EMAIL;
    if (/\.example$/.test(EMAIL)) a.classList.add('placeholder');
  });
  $$('[data-year]').forEach(function (s) { s.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------ the menu --
     A panel slides in under a column of green louvres, which then turn
     edge-on one after another, top to bottom, and the links are behind them. */
  var bar = $('[data-bar]');
  var menuBtn = $('[data-menu-btn]');
  var menu = $('[data-menu]');
  var closing;
  if (menu) $$('.menu__louvres i', menu).forEach(function (i, n) { i.style.setProperty('--i', n); });

  function setMenu(open) {
    clearTimeout(closing);
    menuBtn.setAttribute('aria-expanded', String(open));
    doc.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
      var cur = $('a[aria-current="page"]', menu) || $('a', menu);
      cur.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      closing = setTimeout(function () { menu.hidden = true; }, reduce ? 0 : 560);
    }
    request();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    $$('.menu__nav a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    menu.addEventListener('click', function (e) { if (e.target === menu) setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
      // keep Tab inside the open menu: the bar (language, CTA, close) and the panel
      if (e.key === 'Tab' && menuBtn.getAttribute('aria-expanded') === 'true') {
        var f = $$('a, button', bar).concat($$('a, button', menu)).filter(function (x) { return x.offsetParent !== null; });
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ------------------------------------------------------------ the window (hero and close)
     The wall is one layer with a hole; its transform origin is the centre of
     the window. Going through: it scales geometrically (a constant-speed
     dolly) until the hole is larger than the screen, while it slides so the
     window ends centred. The view behind scales the other way, a little:
     the near plane moves far more than the far one. */
  function windowGeo(stage, win) {
    var W = stage.clientWidth, H = stage.clientHeight;
    var w = win.offsetWidth, h = win.offsetHeight;
    var cx = win.offsetLeft + w / 2, cy = win.offsetTop + h / 2;
    return { W: W, H: H, cx: cx, cy: cy, S: 1.22 * Math.max(W / w, H / h) };
  }
  function through(wall, view, g, e) {
    var s = Math.pow(g.S, e);
    wall.style.transform = 'translate3d(' + ((g.W / 2 - g.cx) * e).toFixed(1) + 'px,' + ((g.H / 2 - g.cy) * e).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    wall.style.visibility = e > 0.995 ? 'hidden' : '';
    view.style.transformOrigin = (g.cx / g.W * 100).toFixed(2) + '% ' + (g.cy / g.H * 100).toFixed(2) + '%';
    view.style.transform = 'scale(' + (1.12 - 0.12 * e).toFixed(4) + ')';
  }

  /* ------------------------------------------------------------ 1 · hero --
     Pin progress p:
       0.00 – 0.42  the shutters swing out from ajar (7°) to flat on the wall (172°)
       0.05 – 0.25  the sign, the line and the button leave
       0.26 – 0.86  through the window
       0.76 – 0.94  "This is the view from the window." rises over the pool  */
  var hero = $('[data-hero]');
  var hStage = hero && $('.hero__stage', hero);
  var hWall = hero && $('[data-hero-wall]', hero);
  var hWin = hero && $('[data-win]', hero);
  var hView = hero && $('[data-hero-view]', hero);
  var hSign = hero && $('[data-hero-sign]', hero);
  var hShade = hero && $('[data-hero-shade]', hero);
  var hSecond = hero && $('[data-hero-second]', hero);
  var hShutters = hero ? $$('[data-shutter]', hero) : [];
  var hGeo = null, hLast = -1;

  function drawHero() {
    var o = progress(hero), p = o.p;
    if (bar) bar.classList.toggle('is-over', o.r.top > -innerHeight * 0.5 && p < 0.5 && !doc.body.classList.contains('menu-open'));
    if (!near(o.r)) return;
    if (Math.abs(p - hLast) < 0.0004) return;
    hLast = p;
    if (!hGeo) hGeo = windowGeo(hStage, hWin);
    var rise = smooth((p - 0.76) / 0.18);
    hSecond.style.opacity = rise.toFixed(3);
    hSecond.style.transform = 'translate3d(0,' + ((1 - rise) * 22).toFixed(1) + 'px,0)';
    hShade.style.opacity = rise.toFixed(3);
    if (reduce) {
      // no movement: the shutters stay shut and the wall dissolves to the view
      var f = smooth((p - 0.1) / 0.4);
      hWall.style.opacity = (1 - f).toFixed(3);
      hWall.style.visibility = f > 0.99 ? 'hidden' : '';
      hero.classList.toggle('is-through', f > 0.9);
      return;
    }
    var open = smooth(p / 0.42);
    var a = 7 + 165 * open;
    hShutters.forEach(function (s) { s.style.setProperty('--a', a.toFixed(2) + 'deg'); });
    var leave = smooth((p - 0.05) / 0.2);
    hSign.style.opacity = (1 - leave).toFixed(3);
    hSign.style.visibility = leave > 0.99 ? 'hidden' : '';
    var e = smooth((p - 0.26) / 0.6);
    through(hWall, hView, hGeo, e);
    hero.classList.toggle('is-through', e > 0.9);
  }

  // The film: one 9 s loop made from the real golden-hour pool photo (camera
  // locked; the oleander, the water, the parasol and a sailboat move). It
  // plays only on screen, never under reduced motion or Save-Data, and the
  // visitor can stop it.
  var film = hero && $('[data-hero-film]', hero);
  var pauseBtn = hero && $('[data-hero-pause]', hero);
  var saveData = navigator.connection && navigator.connection.saveData;
  if (film && !reduce && !saveData) {
    // the phone cut covers 608 of 1916 columns, enough while the stage is at
    // most 0.6 as wide as it is tall
    var shape = function () { return hStage.clientWidth / Math.max(1, hStage.clientHeight) <= 0.6 ? 'p' : 'l'; };
    var portrait = shape() === 'p';
    var stopped = store('vm-film-paused') === '1';
    var inView = true, ready = false;
    var sync = function () {
      if (ready && inView && !stopped && !doc.hidden) { var pr = film.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else film.pause();
      pauseBtn.setAttribute('aria-pressed', String(stopped));
    };
    film.addEventListener('playing', function () { hero.classList.add('is-playing'); });
    pauseBtn.hidden = false;
    pauseBtn.addEventListener('click', function () { stopped = !stopped; store('vm-film-paused', stopped ? '1' : '0'); sync(); });
    doc.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; sync(); }).observe(hero);
    // Cloudflare Pages answers without byte ranges and iOS Safari will not play
    // an mp4 it cannot range-request, so the file arrives whole as a Blob.
    var load = function () {
      return fetch(film.getAttribute(portrait ? 'data-src-mobile' : 'data-src'))
        .then(function (r) { if (!r.ok) throw r; return r.blob(); })
        .then(function (b) {
          if (film.src) URL.revokeObjectURL(film.src);
          film.src = URL.createObjectURL(b); ready = true; sync();
        });
    };
    var start = function () { load().catch(function () {}); };
    if (doc.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', function () { setTimeout(start, 300); });
    var reshape;
    addEventListener('resize', function () {
      clearTimeout(reshape);
      reshape = setTimeout(function () {
        if ((shape() === 'p') === portrait) return;
        portrait = !portrait; ready = false; hero.classList.remove('is-playing');
        load().catch(function () {});
      }, 250);
    });
  }

  /* ------------------------------------------------------------ 3 · PEAK --
     One frame (16:9, covering the stage) holds four layers: the garden photo
     at the back, the facade photo with its sky, the facade cut out along its
     roofline, and the same facade printed as an old postcard on top. Pin
     progress p:
       0.00 – 0.26  the postcard lies on the table (its caption leaves by 0.11),
                    then straightens and grows
       0.08 – 0.30  today's colour comes in from the left
       0.30 – 0.52  the sky over the roof dissolves from the top: the garden is behind it
       0.48 – 0.84  the house steps down and comes closer; the garden settles
       0.62 – 0.78  "Behind it: a garden of 1,500 m²."
       0.80 – 0.98  the places in the garden are named                       */
  var peak = $('[data-peak]');
  var pStage = peak && $('.peak__stage', peak);
  var pCard = peak && $('[data-peak-card]', peak);
  var pGarden = peak && $('[data-peak-garden]', peak);
  var pSky = peak && $('[data-peak-sky]', peak);
  var pSkyImg = peak && $('[data-peak-sky-img]', peak);
  var pRez = peak && $('[data-peak-rez]', peak);
  var pPostW = peak && $('[data-peak-postw]', peak);
  var pPost = peak && $('[data-peak-post]', peak);
  var pPaper = peak && $('[data-peak-paper]', peak);
  var pMarks = peak && $('[data-peak-marks]', peak);
  var pA = peak && $('[data-peak-a]', peak);
  var pB = peak && $('[data-peak-b]', peak);
  var pScrim = peak && $('[data-peak-scrim]', peak);
  var pTags = peak ? $$('[data-peak-tags] li', peak) : [];
  var pGeo = null, pLast = -1;

  function measurePeak() {
    var W = pStage.clientWidth, H = pStage.clientHeight;
    var Fw = pCard.offsetWidth, Fh = pCard.offsetHeight;
    var phone = W / H < 0.75 || W < 700;
    var cw = phone ? W * 0.84 : Math.min(W * 0.54, H * 0.62 * 16 / 9);
    var cx = phone ? W * 0.5 : W * 0.6, cy = phone ? H * 0.56 : H * 0.45;
    pGeo = { W: W, H: H, Fw: Fw, Fh: Fh, s0: cw / Fw, tx: cx - W / 2, ty: cy - H / 2 };
    // a name whose place is off the screen at full size is not shown
    pTags.forEach(function (li) {
      var x = parseFloat(li.style.getPropertyValue('--x')) / 100;
      var sx = W / 2 + (x - 0.5) * Fw;
      li.hidden = sx < 70 || sx > W - 70;
    });
    pLast = -1;
  }

  function drawPeak() {
    var o = progress(peak), p = o.p;
    if (!near(o.r)) return;
    if (Math.abs(p - pLast) < 0.0004) return;
    pLast = p;
    var g = pGeo;
    var a = 1 - smooth((p - 0.04) / 0.07);
    pA.style.opacity = a.toFixed(3);
    pA.style.visibility = a < 0.01 ? 'hidden' : '';
    var b = smooth((p - 0.62) / 0.16);
    pB.style.opacity = b.toFixed(3);
    pB.style.transform = 'translate3d(0,' + ((1 - b) * 20).toFixed(1) + 'px,0)';
    pScrim.style.opacity = b.toFixed(3);
    pTags.forEach(function (li, i) {
      var k = smooth((p - 0.8 - i * 0.03) / 0.08);
      li.style.opacity = k.toFixed(3);
      li.style.transform = 'translate3d(0,' + ((1 - k) * 10).toFixed(1) + 'px,0)';
    });
    if (reduce) {
      // the same story in dissolves: postcard, then today, then the garden
      pPaper.style.opacity = '0';
      pMarks.style.opacity = '0';
      pCard.style.transform = 'none';
      pPostW.style.opacity = (1 - smooth((p - 0.06) / 0.2)).toFixed(3);
      var gone = smooth((p - 0.34) / 0.24);
      pSky.style.opacity = (1 - gone).toFixed(3);
      pRez.style.opacity = (1 - gone).toFixed(3);
      return;
    }
    var k = smooth((p - 0.04) / 0.22);
    var s = g.s0 + (1 - g.s0) * k;
    pCard.style.transform = 'translate3d(' + (g.tx * (1 - k)).toFixed(1) + 'px,' + (g.ty * (1 - k)).toFixed(1) + 'px,0) rotate(' + (-2.4 * (1 - k)).toFixed(3) + 'deg) scale(' + s.toFixed(4) + ')';
    var paper = 1 - smooth((p - 0.12) / 0.12);
    pPaper.style.opacity = paper.toFixed(3);
    pMarks.style.opacity = (1 - smooth((p - 0.08) / 0.1)).toFixed(3);
    var d = smooth((p - 0.08) / 0.22) * 1.3 * g.Fw;
    pPostW.style.transform = 'translate3d(' + d.toFixed(1) + 'px,0,0)';
    pPost.style.transform = 'translate3d(' + (-d).toFixed(1) + 'px,0,0)';
    pPostW.style.visibility = d >= 1.3 * g.Fw - 1 ? 'hidden' : '';
    var q = smooth((p - 0.3) / 0.22) * 1.3 * g.Fh;
    pSky.style.transform = 'translate3d(0,' + q.toFixed(1) + 'px,0)';
    pSkyImg.style.transform = 'translate3d(0,' + (-q).toFixed(1) + 'px,0)';
    pSky.style.visibility = q >= 1.3 * g.Fh - 1 ? 'hidden' : '';
    var z = smooth((p - 0.48) / 0.36);
    pRez.style.transform = 'translate3d(0,' + (z * 1.04 * g.Fh).toFixed(1) + 'px,0) scale(' + (1 + 0.16 * z).toFixed(4) + ')';
    pRez.style.visibility = z > 0.999 ? 'hidden' : '';
    pGarden.style.transform = 'translate3d(0,' + (-(1 - z) * 0.05 * g.Fh).toFixed(1) + 'px,0) scale(' + (1.1 - 0.1 * z).toFixed(4) + ')';
  }
  if (peak) {
    measurePeak();
    addEventListener('resize', measurePeak);
    // the layers are lazy; ask for them a screen early so the postcard is never empty
    if ('IntersectionObserver' in window) {
      var pre = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        $$('img', peak).forEach(function (im) { im.loading = 'eager'; });
        pre.disconnect();
      }, { rootMargin: '150% 0px' });
      pre.observe(peak);
    }
  }

  /* ------------------------------------------------------------ 4 · louvres --
     Twelve green slats over each bedroom photo. As the photo comes up the
     screen they turn edge-on one after another, top to bottom, and the room
     is behind them. Once open they are gone for good. */
  var louvres = reduce ? [] : $$('[data-louvre] .louvre').map(function (lv) {
    var n = 12, slats = [];
    lv.style.setProperty('--n', n);
    for (var i = 0; i < n; i++) { var s = doc.createElement('i'); lv.appendChild(s); slats.push(s); }
    return { el: lv, fig: lv.parentNode, slats: slats, last: -1, done: false };
  });
  function drawLouvres() {
    for (var j = 0; j < louvres.length; j++) {
      var L = louvres[j];
      if (L.done) continue;
      var r = L.fig.getBoundingClientRect();
      if (r.top > innerHeight * 1.1 || r.bottom < -innerHeight) continue;
      // closed until the photo's top passes 80 % of the screen, open at 30 %
      var pr = clamp((innerHeight * 0.8 - r.top) / (innerHeight * 0.5), 0, 1);
      if (Math.abs(pr - L.last) < 0.002) continue;
      L.last = pr;
      for (var i = 0; i < L.slats.length; i++) {
        var k = smooth((pr - i / L.slats.length * 0.42) / 0.5);
        L.slats[i].style.setProperty('--r', (k * 88).toFixed(1) + 'deg');
      }
      if (pr >= 1) { L.done = true; L.el.classList.add('is-done'); }
    }
  }

  /* ------------------------------------------------------------ 8 · close --
     The hero in reverse: the golden pool fills the screen, then the camera
     steps back out of the window onto the stucco wall, the shutters flat on
     it, and the dates appear under the name. Pin progress p:
       0.00 – 0.62  back out of the window
       0.46 – 0.72  the form                                                  */
  var close = $('[data-close]');
  var cStage = close && $('.close__stage', close);
  var cWall = close && $('[data-close-wall]', close);
  var cWin = close && $('[data-win]', close);
  var cView = close && $('[data-close-view]', close);
  var cBody = close && $('[data-close-body]', close);
  var cGeo = null, cLast = -1;

  function drawClose() {
    var o = progress(close), p = o.p;
    if (!near(o.r)) return;
    if (Math.abs(p - cLast) < 0.0004) return;
    cLast = p;
    if (!cGeo) cGeo = windowGeo(cStage, cWin);
    var f = reduce ? 1 : smooth((p - 0.46) / 0.26);
    cBody.style.opacity = f.toFixed(3);
    cBody.style.visibility = f < 0.02 ? 'hidden' : '';
    if (reduce) { through(cWall, cView, cGeo, 0); return; }
    through(cWall, cView, cGeo, 1 - smooth(p / 0.62));
  }

  /* ------------------------------------------------------------ one loop */
  var ticking = false;
  function frame() {
    ticking = false;
    if (hero) drawHero();
    else if (bar) bar.classList.remove('is-over');
    if (peak) drawPeak();
    if (louvres.length) drawLouvres();
    if (close) drawClose();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', function () { hGeo = null; cGeo = null; hLast = cLast = -1; request(); });

  /* ------------------------------------------------------------ the dates (home) */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parse(v) { if (!v) return null; var b = v.split('-'); return new Date(+b[0], b[1] - 1, +b[2]); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var dates = $('[data-dates]');
  if (dates) {
    var a = $('#d-od', dates), b = $('#d-do', dates);
    a.min = iso(today);
    a.addEventListener('change', function () {
      var d = parse(a.value); if (!d) return;
      d.setDate(d.getDate() + 1); b.min = iso(d);
      if (b.value && parse(b.value) <= parse(a.value)) b.value = '';
    });
  }

  /* ------------------------------------------------------------ gallery -- */
  var grid = $('[data-grid]');
  if (grid) {
    var tiles = $$('a', grid);
    var buttons = $$('[data-filters] button');
    var filter = 'all';

    buttons.forEach(function (bt) {
      var f = bt.getAttribute('data-f');
      var n = f === 'all' ? tiles.length : tiles.filter(function (x) { return x.getAttribute('data-group') === f; }).length;
      $('.n', bt).textContent = n;
      bt.addEventListener('click', function () { setFilter(f, true); });
    });

    var setFilter = function (f, push) {
      filter = buttons.some(function (bt) { return bt.getAttribute('data-f') === f; }) ? f : 'all';
      buttons.forEach(function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-f') === filter)); });
      tiles.forEach(function (x) { x.hidden = filter !== 'all' && x.getAttribute('data-group') !== filter; });
      if (push) history.replaceState(null, '', filter === 'all' ? location.pathname : '#' + filter);
    };
    setFilter((location.hash || '').slice(1) || 'all', false);
    addEventListener('hashchange', function () { setFilter(location.hash.slice(1), false); });

    var lb = $('[data-lightbox]');
    var lbImg = $('[data-lb-img]', lb);
    var lbCap = $('[data-lb-cap]', lb);
    var lbCount = $('[data-lb-count]', lb);
    var shown = [], at = 0, opener = null;

    var show = function (i) {
      at = (i + shown.length) % shown.length;
      var el = shown[at], thumb = $('img', el);
      lbImg.src = el.getAttribute('href');
      lbImg.alt = thumb.alt;
      lbCap.textContent = thumb.alt;
      lbCount.textContent = (at + 1) + ' / ' + shown.length;
      var next = shown[(at + 1) % shown.length];
      if (next) { var pre = new Image(); pre.src = next.getAttribute('href'); }
    };
    tiles.forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (!lb.showModal) return;
        e.preventDefault();
        opener = el;
        shown = tiles.filter(function (x) { return !x.hidden; });
        show(shown.indexOf(el));
        lb.showModal();
      });
    });
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(at - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(at + 1); });
    $('[data-lb-close]', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('close', function () { if (opener) opener.focus(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === $('[data-lb-stage]', lb)) lb.close(); });
    var x0 = null;
    $('[data-lb-stage]', lb).addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    $('[data-lb-stage]', lb).addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
    });
    doc.addEventListener('vm:lang', function () { if (lb.open) show(at); });
  }

  /* ------------------------------------------------------------ enquiry -- */
  var form = $('[data-form]');
  if (form) {
    var q = new URLSearchParams(location.search);
    var od = $('#f-od'), dd = $('#f-do'), ad = $('#f-odrasli'), kd = $('#f-djeca'), pets = $('#f-ljubimci');
    var warn = $('[data-warn]'), status = $('[data-status]');
    od.min = iso(today);
    if (q.get('od')) od.value = q.get('od');
    if (q.get('do')) dd.value = q.get('do');
    if (q.get('g')) ad.value = String(clamp(parseInt(q.get('g'), 10) || 2, 1, 8));

    var fmt = function (d) { return new Intl.DateTimeFormat(lang === 'hr' ? 'hr-HR' : lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(d); };

    var update = function () {
      var a = parse(od.value), b = parse(dd.value);
      if (a) { var m = new Date(a); m.setDate(m.getDate() + 1); dd.min = iso(m); }
      var S = function (k, v) { $('[data-s="' + k + '"]').textContent = v; };
      S('dates', a && b ? fmt(a) + ' – ' + fmt(b) : (a ? fmt(a) : '–'));
      var n = a && b ? Math.round((b - a) / 864e5) : 0;
      S('nights', n > 0 ? String(n) : '–');
      var adults = +ad.value, kids = +kd.value, pn = +pets.value;
      S('guests', t('s.adults') + ' ' + adults + (kids ? ', ' + t('s.kids') + ' ' + kids : ''));
      S('pets', pn ? String(pn) : t('s.none'));
      var msgs = [];
      if (adults + kids > 8) msgs.push(t('w.cap'));
      if (a && a < today) msgs.push(t('w.past'));
      if (a && b && n <= 0) msgs.push(t('w.order'));
      warn.hidden = !msgs.length;
      warn.textContent = msgs.join(' ');
      return { a: a, b: b, n: n, adults: adults, kids: kids, pets: pn, ok: !msgs.length };
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    doc.addEventListener('vm:lang', update);

    var err = function (name, key) {
      var box = $('[data-err="' + name + '"]');
      var field = { od: od, 'do': dd, ime: $('#f-ime'), email: $('#f-email'), privola: $('[data-consent]') }[name];
      if (box) box.textContent = key ? t(key) : '';
      if (field) field.setAttribute('aria-invalid', key ? 'true' : 'false');
      return key ? field : null;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = update();
      var bad = [];
      bad.push(err('od', !s.a ? 'e.need' : (s.a < today ? 'w.past' : null)));
      bad.push(err('do', !s.b ? 'e.need' : (s.n <= 0 ? 'w.order' : null)));
      var name = $('#f-ime').value.trim(), mail = $('#f-email').value.trim();
      bad.push(err('ime', name ? null : 'e.need'));
      bad.push(err('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? null : 'e.mail'));
      bad.push(err('privola', $('[data-consent]').checked ? null : 'e.consent'));
      bad = bad.filter(Boolean);
      if (bad.length) { bad[0].focus(); return; }

      var lines = [
        t('m.hello'), '',
        t('book.dates') + ': ' + fmt(s.a) + ' – ' + fmt(s.b) + ' (' + s.n + ' ' + t('m.nights') + ')',
        t('book.guests') + ': ' + t('s.adults') + ' ' + s.adults + (s.kids ? ', ' + t('s.kids') + ' ' + s.kids : '')
      ];
      if (s.pets) lines.push(t('book.pets') + ': ' + s.pets);
      if ($('#f-krevetic').checked) lines.push(t('book.cot'));
      lines.push('', t('book.name') + ': ' + name, t('book.email') + ': ' + mail);
      var tel = $('#f-tel').value.trim();
      if (tel) lines.push(t('book.phone') + ': ' + tel);
      var msg = $('#f-poruka').value.trim();
      if (msg) lines.push('', msg);
      if (!s.ok) lines.push('', '(' + warn.textContent + ')');
      var body = lines.join('\n');
      var subject = t('m.subject') + ': ' + fmt(s.a) + ' – ' + fmt(s.b);

      status.hidden = false;
      status.innerHTML = '';
      var p = doc.createElement('p');
      p.textContent = t('st.ok') + ' ' + EMAIL + '.';
      var copy = doc.createElement('button');
      copy.type = 'button'; copy.className = 'btn btn--line'; copy.style.marginTop = '0.9rem';
      copy.textContent = t('st.copy');
      copy.addEventListener('click', function () {
        (navigator.clipboard ? navigator.clipboard.writeText(subject + '\n\n' + body) : Promise.reject())
          .then(function () { copy.textContent = t('st.copied'); })
          .catch(function () { copy.textContent = t('st.copyFail'); });
      });
      var pr = doc.createElement('pre'); pr.textContent = body;
      status.appendChild(p); status.appendChild(copy); status.appendChild(pr);
      location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  /* ------------------------------------------------------------ map ------ */
  var map = $('[data-map]');
  if (map) {
    $('[data-map-load]', map).addEventListener('click', function () {
      var la = +map.getAttribute('data-lat'), lo = +map.getAttribute('data-lon');
      var f = doc.createElement('iframe');
      f.title = t('map.title');
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer';
      f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        (lo - 0.012).toFixed(5) + '%2C' + (la - 0.0065).toFixed(5) + '%2C' + (lo + 0.012).toFixed(5) + '%2C' + (la + 0.0065).toFixed(5) +
        '&layer=mapnik&marker=' + la + '%2C' + lo;
      map.innerHTML = '';
      map.appendChild(f);
    });
  }

  /* ------------------------------------------------------------ start ---- */
  applyLang(firstLang());
  if (window.ScrollCraft) ScrollCraft.mount(doc.body);
  if (form) form.dispatchEvent(new Event('change'));
  frame();
})();
