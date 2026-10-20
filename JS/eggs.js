// Easter eggs, shared by both sides (the script tag's data-side says which one this is):
//  - Earth opens Google Earth, the moon opens NASA's live 3D moon, the dark side's ship opens
//    NASA's Eyes on the Solar System. The cursor turns to a pointer over them, nothing else hints.
//  - The astronaut does a zero-gravity flip when clicked.
//  - A small spiral galaxy turns beside the projects: clicking it opens a wormhole to the other side.
//  - A cat sits by the contact section; click it and it blasts off to space (and comes back).
//  - A hello in the browser console for anyone looking under the hood.
// The pictures are decorative layers (often behind other layers), so clicks are hit-tested by
// position rather than listened for on the images themselves.
(function () {
  var me = document.currentScript;
  var side = (me && me.dataset.side) || 'bright';
  var root = document.documentElement;

  var LINKS = [
    { sel: '.ship', shape: 'box', url: 'https://eyes.nasa.gov/apps/solar-system/', say: 'Opening NASA\'s Eyes on the Solar System…' },
    { sel: '.earth', shape: 'disc', url: 'https://earth.google.com/web/', say: 'Opening Google Earth…' },
    { sel: '.hero-moon img, .contact-moon img, .horizon img', shape: 'disc', url: 'https://eyes.nasa.gov/apps/solar-system/#/moon', say: 'Flying to the moon with NASA…' }
  ];
  var ASTRO = '.hero-astro img, .suit .astro';
  var QUIPS = ['Houston, we have a developer.', 'Zero gravity, zero worries.', 'Weeee!', 'One small flip for a dev.', 'Still floating. Still coding.'];
  // clicks on words, controls or the popup stay theirs, never an easter egg
  var SKIP = 'a, button, input, textarea, select, label, dialog, h1, h2, h3, p, li, dl, figcaption, .anno, .nav, .hud-nav, header, footer, .intro, .sound-dock, .hud-stack';

  function visible(el, r) {
    if (!r.width || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    var s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .1;
  }
  // the pictures are round planets on square images, or a figure inside a padded box
  function hit(el, shape, x, y) {
    var r = el.getBoundingClientRect();
    if (!visible(el, r)) return false;
    if (shape === 'disc') {
      var dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      // the dark side's moon fills its whole frame; the painted ones sit inside a little margin
      var rad = Math.min(r.width, r.height) * (el.closest('.horizon') ? .5 : .46);
      return dx * dx + dy * dy <= rad * rad;
    }
    var px = r.width * .18, py = r.height * .1;
    return x > r.left + px && x < r.right - px && y > r.top + py && y < r.bottom - py;
  }
  function find(x, y, target) {
    if (root.classList.contains('intro-on') || document.querySelector('dialog[open]')) return null;
    if (target && target.closest && target.closest(SKIP)) return null;
    var astros = document.querySelectorAll(ASTRO);
    for (var a = 0; a < astros.length; a++) if (hit(astros[a], 'box', x, y)) return { astro: astros[a] };
    for (var i = 0; i < LINKS.length; i++) {
      var els = document.querySelectorAll(LINKS[i].sel);
      for (var j = 0; j < els.length; j++) if (hit(els[j], LINKS[i].shape, x, y)) return LINKS[i];
    }
    return null;
  }

  // A small message that floats up from the bottom of the screen, then fades
  var toast, toastTimer;
  function say(text) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'egg-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.remove('is-on');
    toast.getBoundingClientRect();
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2600);
  }

  // Pointer over a hidden link: show the hand, so the curious can find it
  var pending = false, lastX = 0, lastY = 0, lastTarget = null;
  addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    lastX = e.clientX; lastY = e.clientY; lastTarget = e.target;
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      root.classList.toggle('egg-hover', !!find(lastX, lastY, lastTarget));
    });
  }, { passive: true });

  var quip = 0;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    var egg = find(e.clientX, e.clientY, e.target);
    if (!egg) return;
    if (egg.astro) {
      // a flip, added on top of whatever float or tumble the astronaut is already doing
      if (!egg.astro.animate) return;
      egg.astro.animate([{ rotate: '0deg', scale: 1 }, { rotate: '200deg', scale: 1.06, offset: .5 }, { rotate: '360deg', scale: 1 }],
        { duration: 1400, easing: 'cubic-bezier(.45, 0, .2, 1)', composite: 'add' });
      say(QUIPS[quip++ % QUIPS.length]);
      return;
    }
    say(egg.say);
    window.open(egg.url, '_blank', 'noopener');
  });

  // The spiral galaxy: a small galaxy turning slowly in the sky beside the projects. Clicking it
  // opens a wormhole to the other side. Drawn here (no image): stars scattered along two spiral
  // arms around a glowing core, tilted like a disc seen at an angle.
  function plant(where, cls, label, svg) {
    var spot = document.querySelector(where);
    if (!spot) return null;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.innerHTML = svg;
    spot.appendChild(b);
    return b;
  }
  var galaxy = plant('#work', 'galaxy', 'A spiral galaxy: travel to the ' + (side === 'dark' ? 'bright' : 'dark') + ' side',
    '<canvas aria-hidden="true"></canvas>');
  if (galaxy) (function () {
    var canvas = galaxy.querySelector('canvas'), ctx = canvas.getContext('2d');
    // colours from the core outwards: woodblock gold to indigo on the bright side, silver on the dark
    var TONES = side === 'dark'
      ? [[255, 255, 255], [225, 222, 215], [170, 168, 162], [120, 120, 125]]
      : [[255, 246, 214], [240, 196, 110], [226, 120, 70], [120, 150, 230]];
    var stars = [], clouds = [], ARMS = 2, N = 1300, TILT = .62;
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
    // a point along an arm: wound further round the further out it is, and looser there too
    function onArm(i, t, loose) {
      return (i % ARMS) * Math.PI * 2 / ARMS + t * 4.4 + gauss() * (.25 + t * .35) * loose;
    }
    function tone(t) { return TONES[Math.min(3, Math.floor(t * 3.2 + Math.random() * .6))]; }
    for (var i = 0; i < N; i++) {
      var t = Math.pow(Math.random(), .75);              // 0 at the core, 1 at the rim
      stars.push({ a: onArm(i, t, 1.4), r: t + gauss() * .05, s: (1 - t) * 1.1 + Math.random() * .9 + .35, o: .3 + Math.random() * .6 * (1 - t * .5), c: tone(t) });
    }
    // soft glowing clouds of gas along the arms, so they read as cloudy rather than dotted
    for (i = 0; i < 160; i++) {
      t = .12 + Math.pow(Math.random(), .9) * .85;
      clouds.push({ a: onArm(i, t, 1), r: t + gauss() * .04, s: .1 + Math.random() * .12 * (1.2 - t), o: .1 + Math.random() * .16, c: tone(t) });
    }
    // one blurred puff per colour, drawn once and stamped for every cloud
    var puffs = TONES.map(function (c) {
      var p = document.createElement('canvas');
      p.width = p.height = 64;
      var g = p.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(' + c + ', 1)');
      grad.addColorStop(.4, 'rgba(' + c + ', .45)');
      grad.addColorStop(1, 'rgba(' + c + ', 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return p;
    });
    var spin = 0, speed = .0025, target = .0025, size = 0, dpr = 1, raf = 0, visible = false;
    function fit() {
      size = galaxy.clientWidth;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.height = Math.round(size * dpr);
    }
    function draw() {
      raf = 0;
      if (!visible || document.hidden) return;
      speed += (target - speed) * .06;
      spin += speed;
      var R = size * .46, cx = size / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.translate(cx, cx);
      ctx.rotate(-.35);
      // the haze of the disc, then the core's glow
      var c0 = TONES[1], c3 = TONES[3];
      var haze = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      haze.addColorStop(0, 'rgba(' + c0 + ', .35)');
      haze.addColorStop(.45, 'rgba(' + c3 + ', .12)');
      haze.addColorStop(1, 'rgba(' + c3 + ', 0)');
      ctx.save();
      ctx.scale(1, TILT);
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < clouds.length; k++) {
        var q = clouds[k], qa = q.a + spin, qr = q.r * R, d = q.s * R * 2;
        ctx.globalAlpha = q.o;
        ctx.drawImage(puffs[TONES.indexOf(q.c)], Math.cos(qa) * qr - d / 2, Math.sin(qa) * qr * TILT - d * TILT / 2, d, d * TILT);
      }
      ctx.globalAlpha = 1;
      for (var i = 0; i < stars.length; i++) {
        var p = stars[i], ang = p.a + spin, rr = p.r * R;
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.o + ')';
        ctx.fillRect(Math.cos(ang) * rr, Math.sin(ang) * rr * TILT, p.s * .9, p.s * .9);
      }
      var core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * .32);
      core.addColorStop(0, 'rgba(' + TONES[0] + ', .95)');
      core.addColorStop(.35, 'rgba(' + c0 + ', .45)');
      core.addColorStop(1, 'rgba(' + c0 + ', 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * .32, R * .32 * TILT, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw); }
    fit();
    addEventListener('resize', function () { fit(); wake(); });
    document.addEventListener('visibilitychange', wake);
    // only turns while it's on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; wake(); }).observe(galaxy);
    } else { visible = true; wake(); }
    // it spins up when the pointer finds it
    galaxy.addEventListener('pointerenter', function () { target = .02; });
    galaxy.addEventListener('pointerleave', function () { target = .0025; });
    galaxy.addEventListener('focus', function () { target = .02; });
    galaxy.addEventListener('blur', function () { target = .0025; });
    galaxy.spinUp = function () { target = .12; };
  })();
  var warping = false;
  if (galaxy) galaxy.addEventListener('click', function () {
    if (galaxy.spinUp) galaxy.spinUp();
    if (warping) return;
    warping = true;
    var other = side === 'dark' ? 'bright' : 'dark';
    say('The galaxy pulls you in. Next stop: the ' + other + ' side…');
    // swirl around the middle of the screen, not the middle of the whole (long) page
    document.body.style.transformOrigin = '50% ' + (scrollY + innerHeight / 2) + 'px';
    root.classList.add('wormhole');
    // the vortex of light the page falls into (styled per side); it sits outside the body, which is
    // the part that swirls away
    var vortex = document.createElement('div');
    vortex.className = 'wormhole-vortex';
    root.appendChild(vortex);
    // the launch countdown has been seen already, so the other side opens straight onto its hero
    try { sessionStorage.setItem('nebulaiIntro', 'seen'); } catch (err) {}
    setTimeout(function () { location.href = side === 'dark' ? './' : 'dark.html'; }, 1300);
  });

  // The space cat: sits by the contact section, minding its own business. Click it and it puts on
  // a bubble helmet and blasts off; a few seconds later it parachutes back down to its spot.
  // The cat is a picture in each side's style, looking out at us; the rocket flame below it and the
  // bubble helmet around its head are drawn over it and only show while it flies
  var cat = plant('.contact', 'space-cat', 'A cat looking at you. It seems to want to go to space',
    '<img class="cat-img" src="images/' + (side === 'dark' ? 'cat-dark.png' : 'cat-ukiyoe.png') + '" alt="" width="130" height="260">' +
    '<svg viewBox="0 0 50 100" aria-hidden="true">' +
      '<path class="cat-flame" d="M15 97c2 9 6 12 10 12s8-3 10-12z"/>' +
      '<circle class="cat-helmet" cx="25" cy="25" r="22" stroke-width="2"/>' +
    '</svg>');
  var CAT_QUIPS = ['One small step for cat, one giant leap for catkind.', 'Cat-stronaut away!', 'Houston, the cat has the controls.', 'Nine lives, zero gravity.'];
  var catTrip = 0;
  if (cat) cat.addEventListener('click', function () {
    if (cat.dataset.state) return;
    say(CAT_QUIPS[catTrip++ % CAT_QUIPS.length]);
    cat.dataset.state = 'launch';
    // up and away, then back down gently to the same spot
    setTimeout(function () { cat.dataset.state = 'return'; }, 3200);
    setTimeout(function () { delete cat.dataset.state; }, 5200);
  });

  // For the developers who open the console
  if (window.console && console.log) {
    console.log('%c🚀 Nebulai', 'font: 700 20px sans-serif; color: ' + (side === 'dark' ? '#ebe8e1' : '#e6b85c'));
    console.log('Looking under the hood? Hi! Hidden on this page: click the planets and the moon, give the astronaut a nudge, fall into the spiral galaxy, and find the cat that wants to go to space.');
  }
})();
