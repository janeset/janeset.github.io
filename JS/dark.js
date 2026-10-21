document.getElementById('year').textContent = new Date().getFullYear();
//var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var reduce = false;

// Sparse, quiet starfield
(function () {
  var canvas = document.getElementById('stars');
  var ctx = canvas.getContext('2d');
  var stars = [], shooting = null, w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    var count = Math.round((innerWidth * innerHeight) / 9000);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 0.8 + 0.2) * dpr,
        a: Math.random() * Math.PI,
        s: Math.random() * 0.006 + 0.001,
        b: Math.random() * 0.5 + 0.2
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      if (!reduce) st.a += st.s;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(235,232,225,' + (st.b * (0.55 + Math.abs(Math.sin(st.a)) * 0.45)) + ')';
      ctx.fill();
    }
    if (!reduce) {
      if (!shooting && Math.random() < 0.0015) {
        shooting = { x: Math.random() * w * 0.6, y: Math.random() * h * 0.35, vx: 7 * dpr, vy: 2.5 * dpr, life: 1 };
      }
      if (shooting) {
        var g = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 16, shooting.y - shooting.vy * 16);
        g.addColorStop(0, 'rgba(235,232,225,' + shooting.life * 0.8 + ')');
        g.addColorStop(1, 'rgba(235,232,225,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(shooting.x - shooting.vx * 16, shooting.y - shooting.vy * 16);
        ctx.stroke();
        shooting.x += shooting.vx; shooting.y += shooting.vy; shooting.life -= 0.012;
        if (shooting.life <= 0) shooting = null;
      }
      requestAnimationFrame(draw);
    }
  }

  addEventListener('resize', function () { resize(); if (reduce) draw(); });
  resize();
  draw();
})();

// Back to the top: glide up to the hero. Relaunch: fade to black, then over to the launch pad
// (the bright side's countdown, where you choose a side again)
document.querySelector('.to-top').addEventListener('click', function (e) {
  e.preventDefault();
  scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
});
document.querySelector('[data-relaunch]').addEventListener('click', function () {
  var veil = document.createElement('div');
  veil.className = 'relaunch-veil';
  document.body.appendChild(veil);
  veil.getBoundingClientRect();
  document.documentElement.classList.add('relaunching');
  setTimeout(function () { location.href = './?launch'; }, reduce ? 0 : 450);
});

// Nav background once scrolled; hero parallax (moon rises, text drifts away)
(function () {
  var nav = document.querySelector('.nav');
  var horizon = document.querySelector('.hero .horizon');
  var content = document.querySelector('.hero-content');
  var suit = document.querySelector('.suit');
  var footer = document.querySelector('.footer');
  var mx = 0, my = 0;
  var ticking = false;

  function update() {
    var y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    document.documentElement.classList.toggle('show-top', y > innerHeight * .6);
    // as the footer scrolls in, the corner buttons rise to sit just above its line
    var lift = Math.max(0, innerHeight - footer.getBoundingClientRect().top);
    document.documentElement.style.setProperty('--footer-lift', lift.toFixed(1) + 'px');
    if (!reduce && y < innerHeight * 1.2) {
      horizon.style.setProperty('--rise', (-y * 0.3) + 'px');
      content.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.55));
      content.style.transform = 'translateY(' + (y * 0.25) + 'px)';
    }
    if (!reduce) {
      // Astronaut drifts at its own depth: slower than the page, nudged by the pointer
      var r = suit.getBoundingClientRect();
      var offset = r.top + r.height / 2 - innerHeight / 2;
      suit.style.setProperty('--px', mx + 'px');
      suit.style.setProperty('--py', (-offset * 0.14 + my) + 'px');
    }
    ticking = false;
  }
  function requestUpdate() {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', function (e) {
      mx = (e.clientX / innerWidth - 0.5) * -18;
      my = (e.clientY / innerHeight - 0.5) * -14;
      requestUpdate();
    }, { passive: true });
  }
  update();
})();

// Tether: a 3D model of a 1.5 cm braided cable from the astronaut's hip (5 m from the camera) to
// the ship's rear hatch (~105 m), projected through a pinhole camera. It is redrawn every frame from
// the live positions of both ends, so float, tumble and parallax all keep it attached.
(function () {
  var wrap = document.querySelector('.tether');
  if (!wrap) return;
  var suit = document.querySelector('.suit');
  var floater = document.querySelector('.suit-float');
  var astro = document.querySelector('.suit .astro');
  var far = document.querySelector('.far');
  var canvases = wrap.querySelectorAll('canvas');
  var ctxs = Array.prototype.map.call(canvases, function (c) { return c.getContext('2d'); });

  var Z0 = 5, Z1 = 105;              // depth of the hip and the hatch, m
  var LEN = 104;                     // cable length, m (~4% slack over the ~100 m gap)
  var DIA = 0.015;                   // cable diameter, m
  var SHADOW_END = 0.85;             // first stretch sits in the astronaut's shadow, m
  var BUCKETS = [2, 6, 12, Infinity]; // depth-of-field buckets (canvas 1-4), by metres along the cable
  // Slack, authored as it should look from the camera: [fraction of the way across the screen,
  // x px, y px off the straight sight line, for the 400 px figure]. Each point is lifted back into
  // 3D at its own depth, so foreshortening can't fold the curve into a kink. Lazy curves sit near
  // the astronaut (behind the glove, then out and back), the far part runs straight. No gravity in
  // orbit, so no sag; the tightest 3D bend is ~1.5 m, far above the cable's ~20 cm limit.
  var SHAPE = [[0, 0, 0], [.11, 23.3, 18.9], [.25, 45.3, 76.3], [.38, 64, 65.6], [.52, 56.9, 31],
               [.64, 27.4, 7.1], [.75, 10.7, 1], [.87, 2.3, 1], [1, 0, 0]];
  var GLINTS = [19, 31, 47, 66, 88]; // where the far hairline now and then catches the sun, m
  var SUN = norm([-.55, -.62, -.56]);  // toward the sun: upper left, camera side
  var EARTH = norm([.45, -.45, .77]);  // toward Earth: upper right, behind the astronaut
  var IVORY = [228, 223, 212];         // matches the sunlit suit fabric
  var EARTHSHINE = [120, 150, 205];
  var BANDS = [-.75, -.25, .25, .75];  // across the cylinder, -1..1

  // Sample points packed toward the astronaut, where most of the on-screen length is
  var U = [];
  for (var i = 0; i <= 80; i++) U.push(LEN * (Math.exp(5 * i / 80) - 1) / (Math.exp(5) - 1));

  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function rgb(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  // How much of the cable at u metres a blur bucket draws. Across each seam the blurrier bucket
  // fades in before it and the sharper one fades out after it, so one is always fully opaque:
  // no gap and no doubled-up blob where the two meet.
  function bucketShare(b, u) {
    var lo = b ? BUCKETS[b - 1] : -Infinity, hi = BUCKETS[b];
    var fadeIn = b ? Math.min(1, Math.max(0, (u - lo * .7) / (lo * .3))) : 1;
    var fadeOut = hi === Infinity ? 1 : Math.min(1, Math.max(0, 1 - (u - hi) / (hi * .3)));
    return Math.min(fadeIn, fadeOut);
  }

  // Smooth (Catmull-Rom style) interpolation of the slack shape
  function shapeSlope(k, j) {
    if (k === 0 || k === SHAPE.length - 1) return 0;
    return (SHAPE[k + 1][j] - SHAPE[k - 1][j]) / (SHAPE[k + 1][0] - SHAPE[k - 1][0]);
  }
  function deviation(s) {
    var k = 1;
    while (k < SHAPE.length - 1 && SHAPE[k][0] < s) k++;
    var a = SHAPE[k - 1], b = SHAPE[k], h = b[0] - a[0], q = (s - a[0]) / h, q2 = q * q, q3 = q2 * q;
    return [1, 2].map(function (j) {
      return (2 * q3 - 3 * q2 + 1) * a[j] + (q3 - 2 * q2 + q) * h * shapeSlope(k - 1, j) +
             (3 * q2 - 2 * q3) * b[j] + (q3 - q2) * h * shapeSlope(k, j);
    });
  }
  // Slow transverse waves running from the astronaut toward the ship, dying out with distance
  function wave(u, t) {
    var env = .09 * (1 - Math.exp(-u * u / .36)) * Math.exp(-u / 7);
    var a = Math.sin(2 * Math.PI * (u / 7 - t / 16));
    var b = Math.sin(2 * Math.PI * (u / 11 - t / 13) + 1.3);
    return [env * (.8 * a - .35 * b), env * (.6 * a + .55 * b)];
  }
  // A point on the cable u metres from the hip, in camera space (m). A straight line from hip to
  // hatch projects at screen fraction k * Z1 / Z, which is where the slack shape is looked up.
  function pointAt(u, t, A, B) {
    var k = u / LEN, Z = A[2] + k * (B[2] - A[2]), d = deviation(k * B[2] / Z), w = wave(u, t);
    return [A[0] + k * (B[0] - A[0]) + d[0] * Z / 1250 + w[0], A[1] + k * (B[1] - A[1]) + d[1] * Z / 1250 + w[1], Z];
  }

  // Live end points, in the figure's own pixels
  function matrixOf(el) {
    var t = getComputedStyle(el).transform;
    if (!t || t === 'none') return [1, 0, 0, 1, 0, 0];
    var v = t.slice(t.indexOf('(') + 1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
    return v.length === 6 ? v : [v[0], v[1], v[4], v[5], v[12], v[13]];
  }
  function translateOf(el) {
    var t = getComputedStyle(el).translate;
    if (!t || t === 'none') return [0, 0];
    var v = t.split(' ').map(parseFloat);
    return [v[0] || 0, v[1] || 0];
  }
  // Clip point behind the right hip, carried through the astronaut's tumble and zero-g drift
  function hipPoint(W, H) {
    var m = matrixOf(astro), ox = .54 * W, oy = .36 * H; // .astro transform-origin
    var dx = .60 * W - ox, dy = .50 * H - oy, fl = matrixOf(floater);
    return [ox + m[0] * dx + m[2] * dy + m[4] + fl[4], oy + m[1] * dx + m[3] * dy + m[5] + fl[5]];
  }
  // Rear hatch (12% / 43% into the ship image), plus the far layer's own parallax offset
  function hatchPoint(W, H) {
    var o = translateOf(far), shipW = .4 * W;
    return [W + .12 * shipW + o[0], .02 * H + .43 * shipW * 507 / 900 + o[1]];
  }

  var dpr = 1, cw = 0, ch = 0;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = wrap.offsetWidth;
    ch = wrap.offsetHeight;
    Array.prototype.forEach.call(canvases, function (c, k) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
      ctxs[k].setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxs[k].lineCap = 'round';
    });
  }

  // One short stretch of cable, shaded as a lit cylinder and drawn at its true projected width.
  // fade is this stretch's share of its depth-of-field bucket (cross-fades at bucket seams).
  function segment(i, P, S, f, ctx, fade) {
    var p0 = P[i], p1 = P[i + 1], s0 = S[i], s1 = S[i + 1];
    var sx = s1[0] - s0[0], sy = s1[1] - s0[1], sl = Math.hypot(sx, sy) || 1;
    var nx = -sy / sl, ny = sx / sl;
    var m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
    var T = norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
    // V faces the camera; N runs across the cable on the side of the screen normal
    var c = norm([-m[0], -m[1], -m[2]]), ct = dot(c, T);
    var V = norm([c[0] - ct * T[0], c[1] - ct * T[1], c[2] - ct * T[2]]);
    var N = norm(cross(T, V));
    if ((N[0] - m[0] / m[2] * N[2]) * nx + (N[1] - m[1] / m[2] * N[2]) * ny < 0) N = [-N[0], -N[1], -N[2]];
    var sunA = dot(V, SUN), sunB = dot(N, SUN), earthA = dot(V, EARTH), earthB = dot(N, EARTH);
    var lit = (U[i] + U[i + 1]) / 2 >= SHADOW_END ? 1 : 0; // hard shadow edge: no air to soften it
    var width = f * DIA / m[2];

    // No ambient light in vacuum: only the sun and a faint cool rim of Earthshine
    function shade(x) {
      var r = Math.sqrt(1 - x * x);
      var sun = lit * Math.max(0, sunA * r + sunB * x);
      var earth = .22 * Math.max(0, earthA * r + earthB * x);
      return [0, 1, 2].map(function (j) { return 4 + IVORY[j] * sun + EARTHSHINE[j] * earth; });
    }
    function line(offset, lineWidth, style, alpha) {
      ctx.globalAlpha = alpha * fade;
      // Round caps join neighbouring strokes, but where they're translucent the overlaps would bead
      ctx.lineCap = alpha * fade < 1 ? 'butt' : 'round';
      ctx.strokeStyle = style;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(s0[0] + nx * offset, s0[1] + ny * offset);
      ctx.lineTo(s1[0] + nx * offset, s1[1] + ny * offset);
      ctx.stroke();
    }

    if (width >= 1) {
      // Bands across the tapered width, plus a specular streak where the sun hits square on
      BANDS.forEach(function (x) { line(x * width / 2, width / 4 * 1.3, rgb(shade(x)), 1); });
      var peak = Math.hypot(sunA, sunB);
      if (lit && peak > 0) line(sunB / peak * width * .4, Math.max(.35, width * .15), '#fffcf4', .45 * peak);
    } else {
      // Under a pixel wide: a 1 px hairline whose opacity is its true coverage (no haze in vacuum)
      var avg = [0, 0, 0];
      BANDS.forEach(function (x) { shade(x).forEach(function (v, j) { avg[j] += v / BANDS.length; }); });
      line(0, 1, rgb(avg), width);
    }
    ctx.globalAlpha = 1;
  }

  // Brief sun glints where the far hairline's braid catches the light
  function glints(A, B, f, cx, cy, t) {
    var ctx = ctxs[ctxs.length - 1];
    GLINTS.forEach(function (u, k) {
      var g = Math.pow(.5 + .5 * Math.sin(t * 2 * Math.PI / 9 + k * 2.1), 8);
      if (g < .02) return;
      var p = pointAt(u, t, A, B), x = cx + f * p[0] / p[2], y = cy + f * p[1] / p[2];
      var glow = ctx.createRadialGradient(x, y, 0, x, y, 1.8);
      glow.addColorStop(0, 'rgba(255,252,244,' + (.55 * g) + ')');
      glow.addColorStop(1, 'rgba(255,252,244,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  function draw(t) {
    if (!wrap.offsetParent) return; // hidden on narrow screens
    if (wrap.offsetWidth !== cw || wrap.offsetHeight !== ch) size();
    var W = suit.offsetWidth, H = suit.offsetHeight;
    var f = 3.125 * W, cx = W / 2, cy = H / 2; // 1250 px focal length for the 400 px figure
    var hip = hipPoint(W, H), hatch = hatchPoint(W, H);
    var A = [(hip[0] - cx) * Z0 / f, (hip[1] - cy) * Z0 / f, Z0];
    var B = [(hatch[0] - cx) * Z1 / f, (hatch[1] - cy) * Z1 / f, Z1];

    var P = [], S = [];
    for (var i = 0; i < U.length; i++) {
      var p = pointAt(U[i], t, A, B);
      P.push(p);
      S.push([cx + f * p[0] / p[2], cy + f * p[1] / p[2]]);
    }
    ctxs.forEach(function (ctx) { ctx.clearRect(0, 0, cw, ch); });
    for (i = 0; i < U.length - 1; i++) {
      var u = (U[i] + U[i + 1]) / 2;
      for (var b = 0; b < ctxs.length; b++) {
        var fade = bucketShare(b, u);
        if (fade > 0) segment(i, P, S, f, ctxs[b], fade);
      }
    }
    glints(A, B, f, cx, cy, t);
  }

  var raf = 0;
  function loop(ms) { draw(ms / 1000); raf = requestAnimationFrame(loop); }
  if (reduce) {
    // One still frame, redrawn only when the layout changes
    draw(0);
    addEventListener('resize', function () { draw(0); });
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      cancelAnimationFrame(raf);
      if (entries[entries.length - 1].isIntersecting) raf = requestAnimationFrame(loop);
    }, { rootMargin: '100px' }).observe(suit);
  } else {
    raf = requestAnimationFrame(loop);
  }
})();

// Background music: "Space Ambient" by playstarz_music (Pixabay License, no attribution needed).
// Played through Web Audio so fades and volume also work on iOS. The file only loads once someone
// turns sound on; browsers allow that only after a click or key press. On/off and volume are
// remembered for the next visit.
(function () {
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.sound-toggle'));
  var dock = document.querySelector('.sound-dock');
  var slider = document.querySelector('.sound-volume input');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!buttons.length || !AC) { if (dock) dock.hidden = true; return; }

  var SRC = 'audio/space-ambient.mp3';
  var KEY = 'nebulaiSound', VOL_KEY = 'nebulaiVolume';
  var volume = .6, wanted = false, running = false;
  var ctx, gain, track;

  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }
  // Slider position to gain, on a curve so the low end of the slider stays usable
  function level() { return Math.pow(volume, 1.6); }

  function build() {
    ctx = new AC();
    track = new Audio(SRC);
    track.loop = true;
    track.preload = 'auto';
    gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(track).connect(gain).connect(ctx.destination);
  }
  function start() {
    if (!ctx) build();
    running = true;
    ctx.resume();
    track.play().catch(function () {}); // still blocked: the next click retries via the toggle
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(level(), ctx.currentTime, 1);
  }
  function stop() {
    running = false;
    if (!ctx) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, .35);
    setTimeout(function () { if (!running) track.pause(); }, 1800);
  }

  function showState(on) {
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', on ? 'Mute background music' : 'Play background music');
    });
  }
  function setWanted(on) {
    wanted = on;
    store(KEY, on ? 'on' : 'off');
    showState(on);
    if (on) start(); else stop();
    // Show the volume slider for a moment when sound comes on (touch screens have no hover)
    if (dock && on) {
      dock.classList.add('is-open');
      clearTimeout(dock.closeTimer);
      dock.closeTimer = setTimeout(function () { dock.classList.remove('is-open'); }, 4000);
    }
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { setWanted(!wanted); }); });

  if (slider) {
    var savedVolume = parseFloat(stored(VOL_KEY));
    if (!isNaN(savedVolume)) volume = Math.min(1, Math.max(0, savedVolume));
    slider.value = Math.round(volume * 100);
    slider.style.setProperty('--fill', slider.value + '%');
    slider.addEventListener('input', function () {
      volume = slider.value / 100;
      slider.style.setProperty('--fill', slider.value + '%');
      store(VOL_KEY, volume);
      if (running) gain.gain.setTargetAtTime(level(), ctx.currentTime, .05);
    });
  }

  // Returning visitor who left sound on: show it on, start at their first click or key press
  if (stored(KEY) === 'on') {
    wanted = true;
    showState(true);
    var resume = function (e) {
      if (dock && dock.contains(e.target)) return; // the dock handles its own clicks
      ['pointerdown', 'keydown'].forEach(function (type) { removeEventListener(type, resume, true); });
      if (wanted && !running) start();
    };
    ['pointerdown', 'keydown'].forEach(function (type) { addEventListener(type, resume, true); });
  }

  // Pause with the tab hidden, pick up again when it comes back
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !running) return;
    if (document.hidden) track.pause(); else track.play().catch(function () {});
  });
})();

// Contact form: checks the fields, then sends the message through Web3Forms, which emails it to
// Jane (the key in data-access-key decides where it goes). Results show under the fields.
// Guards against spam and slips: a hidden bot trap, a minimum time to fill it in, length limits,
// control characters stripped, one send at a time with a cooldown after, and a network timeout.
(function () {
  var COPY = {
    idle: 'Transmit', busy: 'Transmitting…',
    ok: 'Signal received. Thank you, I\'ll be in touch soon.', fail: 'Signal lost. Try again in a moment.',
    invalid: 'Add your name, a valid email and a message.',
    short: 'Say a little more, at least 10 characters.',
    quick: 'That was quick! Give it a second look, then send.',
    wait: 'The channel is cooling down. Give it a minute before transmitting again.', offline: 'No signal. Check your connection and try again.', slow: 'The signal timed out. Try again in a moment.'
  };
  var MIN_FILL = 3000, COOLDOWN = 60000, TIMEOUT = 15000, MIN_MESSAGE = 10, LAST_KEY = 'nebulaiLastSent';
  var form = document.querySelector('.contact-form');
  if (!form) return;
  var el = form.elements, status = form.querySelector('.form-status'), button = form.querySelector('[type="submit"]');
  var count = form.querySelector('.field-count'), openedAt = 0, sending = false;
  // the popup: opened by its button; ×, Esc or a click on the backdrop close it. A half-written
  // message stays put if it's closed, so nothing is lost
  var dialog = document.querySelector('.message-dialog');
  document.querySelector('[data-open-message]').addEventListener('click', function () {
    if (status.dataset.kind === 'ok') say('');
    if (!openedAt) openedAt = Date.now();
    dialog.showModal();
    (el.name.value ? el.message : el.name).focus();
  });
  dialog.querySelector('[data-close-message]').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  var fields = form.querySelectorAll('[required]');
  function say(text, kind) { status.textContent = text; status.dataset.kind = kind || ''; }
  // drops invisible control characters (keeps line breaks in the message) and trims
  function clean(v, multiline) {
    v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮]/g, '');
    return (multiline ? v : v.replace(/\s+/g, ' ')).trim();
  }
  function counter() {
    var max = el.message.maxLength, n = el.message.value.length;
    count.textContent = n + ' / ' + max;
    count.dataset.near = n > max * .9 ? 'true' : '';
  }
  counter();
  form.addEventListener('input', function (e) {
    e.target.removeAttribute('aria-invalid');
    if (e.target === el.message) counter();
    if (status.dataset.kind === 'error') say('');
  });
  function lastSent() { try { return +localStorage.getItem(LAST_KEY) || 0; } catch (e) { return 0; } }
  function busy(on) {
    sending = on;
    button.textContent = on ? COPY.busy : COPY.idle;
    button.disabled = on;
    button.toggleAttribute('aria-busy', on);
    fields.forEach(function (f) { f.readOnly = on; });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    // the trap is hidden from people; anything that ticks it is a bot, so it gets a quiet "sent"
    if (el.botcheck.checked) { form.reset(); counter(); say(COPY.ok, 'ok'); return; }
    var name = clean(el.name.value), email = clean(el.email.value), message = clean(el.message.value, true);
    var bad = Array.prototype.filter.call(fields, function (f) { return !clean(f.value) || !f.checkValidity(); });
    if (email && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) && bad.indexOf(el.email) < 0) bad.push(el.email);
    bad.forEach(function (f) { f.setAttribute('aria-invalid', 'true'); });
    if (bad.length) { say(COPY.invalid, 'error'); bad[0].focus(); return; }
    if (message.length < MIN_MESSAGE) { el.message.setAttribute('aria-invalid', 'true'); say(COPY.short, 'error'); el.message.focus(); return; }
    if (Date.now() - openedAt < MIN_FILL) { say(COPY.quick, 'error'); return; }
    if (Date.now() - lastSent() < COOLDOWN) { say(COPY.wait, 'error'); return; }
    if (navigator.onLine === false) { say(COPY.offline, 'error'); return; }
    var key = form.dataset.accessKey;
    if (!key || /^YOUR_/.test(key)) { say('Messages aren\'t connected yet.', 'error'); return; }
    busy(true);
    say('');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        access_key: key,
        subject: 'New message from nebulai.dev (dark side)',
        from_name: 'nebulai.dev',
        name: name,
        email: email,
        message: message,
        botcheck: false
      })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (res) {
        if (!res.success) throw new Error(res.message || 'Not sent');
        try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (e) {}
        form.reset();
        counter();
        say(COPY.ok, 'ok');
      })
      .catch(function (err) { say(err && err.name === 'AbortError' ? COPY.slow : COPY.fail, 'error'); })
      .then(function () { clearTimeout(timer); busy(false); });
  });
})();

// Reveal elements as they enter the viewport
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
}
