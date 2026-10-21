// Easter eggs, shared by both sides (the script tag's data-side says which one this is):
//  - Earth opens Google Earth, the moon opens NASA's live 3D moon, the dark side's ship opens
//    NASA's Eyes on the Solar System. The cursor turns to a pointer over them, nothing else hints.
//  - The astronaut does a zero-gravity flip when clicked.
//  - A small spiral galaxy turns beside the projects: clicking it opens a wormhole to the other side.
//  - A cat sits on the moon by the contact section; click it and it blasts off to space (and comes back).
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
  var QUIPS = ['Houston, we have a developer.', 'Zero gravity, zero worries.', 'Weeee!', 'One small flip for a dev.', 'Still floating. Still coding.',
    'I came for the view, stayed for the Wi-Fi.', 'It works on my planet.', 'Space is cold. My coffee is colder.', 'No bugs up here. Just meteors.',
    'Do not push me. Okay, push me again.', 'I left my keys on Earth.', 'Who needs stairs when you have orbit?', 'Deploying to production... in space.',
    'My helmet is fogging up. Stop making me laugh.', 'Ground control, I think I left the oven on.'];
  // The dark side's astronaut, floating by the About section, is more the thoughtful sort: a mix of
  // dry engineering humour, working principles and a few quotes from people who built things
  if (side === 'dark') QUIPS = [
    'Talk is cheap. Show me the code.\n— Linus Torvalds',
    'Clean code, clear head, open sky.',
    'First, solve the problem. Then, write the code.\n— John Johnson',
    'Every bug is just a feature that hasn\'t met its user story.',
    'Make it work, make it right, make it fast.\n— Kent Beck',
    'The cloud is just someone else\'s computer. I\'ve met it. It\'s nice.',
    'The best way to predict the future is to invent it.\n— Alan Kay',
    'Ship small, ship often, sleep well.',
    'Simplicity is prerequisite for reliability.\n— Edsger Dijkstra',
    'I don\'t always test my code. But up here, I have to.',
    'Earth is the cradle of humanity, but one cannot stay in the cradle forever.\n— Tsiolkovsky',
    'Curiosity: the only fuel that never runs out.',
    'Any sufficiently advanced bug is indistinguishable from a feature.',
    'Aim for the moon. Commit often on the way.',
    'The sky was never the limit. Bad documentation was.'
  ];
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

  // The astronaut and the cat talk in a speech bubble over their heads that goes where they go.
  // track: what the speaker rides on (its frame, not the picture, which flips and tumbles);
  // head: where its head is in that frame: centre x and y (fractions of the frame) and radius
  // (a fraction of its width). The bubble sits above the head, or beside it when that would run
  // under the nav, and its tail points at the head. below: put it under the speaker instead (when
  // there is text above it and open ground below), its tail pointing up at it.
  var bubble, bubbleTimer, bubbleTrack, bubbleHead, bubbleBelow, following = false;
  function placeBubble() {
    var t = bubbleTrack.getBoundingClientRect(), hd = bubbleHead;
    var cx = t.left + t.width * hd[0], cy = t.top + t.height * hd[1], r = t.width * hd[2];
    var w = bubble.offsetWidth, h = bubble.offsetHeight, gap = 14, edge = 12, top = 76, at, x, y, tail;
    var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    if (bubbleBelow && t.bottom + gap + h < innerHeight - edge) {
      at = 'below';
      x = clamp(cx - w / 2, edge, innerWidth - w - edge);
      y = t.bottom + gap;
      tail = clamp(cx - x, 22, w - 22);
    } else if (cy - r - gap - h > top) {
      at = 'above';
      x = clamp(cx - w / 2, edge, innerWidth - w - edge);
      y = cy - r - gap - h;
      tail = clamp(cx - x, 22, w - 22);
    } else {
      at = innerWidth - (cx + r) >= cx - r ? 'right' : 'left';
      x = clamp(at === 'right' ? cx + r + gap : cx - r - gap - w, edge, innerWidth - w - edge);
      y = Math.max(top, cy - h / 2);
      tail = clamp(cy - y, 16, h - 16);
    }
    bubble.dataset.at = at;
    bubble.style.left = (x + scrollX).toFixed(1) + 'px';
    bubble.style.top = (y + scrollY).toFixed(1) + 'px';
    bubble.style.setProperty('--tail', tail.toFixed(1) + 'px');
  }
  function speak(text, track, head, below) {
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'egg-bubble';
      bubble.setAttribute('role', 'status');
      document.body.appendChild(bubble);
    }
    bubble.textContent = text;
    bubbleTrack = track;
    bubbleHead = head;
    bubbleBelow = below;
    bubble.classList.remove('is-on');
    placeBubble();
    bubble.getBoundingClientRect();
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    // the dark side's longer lines and quotes stay up long enough to read (about 70ms a letter)
    var hold = side === 'dark' ? Math.max(4500, text.length * 70) : 2800;
    bubbleTimer = setTimeout(function () { bubble.classList.remove('is-on'); }, hold);
    // keep up with the speaker as it drifts and the page scrolls, until the bubble has gone
    if (!following) (function follow() {
      following = bubble.classList.contains('is-on');
      if (following) { placeBubble(); requestAnimationFrame(follow); }
    })();
  }
  // Where each astronaut's helmet is in its picture, for the bubble to point at
  var HELMETS = { 'astronaut-intro': [.49, .228, .125], 'astronaut-ukiyoe': [.667, .155, .13], 'astronaut': [.54, .162, .13] };

  // The launch screen talks back once the gate is up (before that a click skips the countdown):
  // the rocket answers from a bubble over its nose, and the shy clouds tease you from a bubble over
  // their tops (riding along as they drift off). The clouds ignore the pointer, so clicks are
  // tested against each one's shape inside its picture (the print leaves a margin around it); the
  // rocket counts only along its slim body, not the empty sides of its picture.
  var ROCKET_QUIPS = ['Pick a side first, then we fly!', 'Fuel at 99%. Patience at 12%.', 'Psst, the countdown already ended.', 'Ready when you are, captain.', 'I don\'t do round trips. Kidding!', 'Hold on, checking my mirrors.', 'That tickles the fuel tank.', 'Destination: anywhere but here.'];
  var CLOUD_QUIPS = ['You can\'t touch me!', 'Too slow!', 'Catch me if you can!', 'Nope. Just vapor.', 'Hands off, I just got fluffed.', 'I\'m 99% water, 1% attitude.', 'Tickles!', 'Personal space, please.'];
  var rocketQuip = 0, cloudQuip = 0;
  document.addEventListener('click', function (e) {
    var intro = document.querySelector('.intro');
    if (!root.classList.contains('intro-on') || !intro || intro.dataset.stage !== '4') return;
    if (e.target.closest && e.target.closest('button, a')) return;
    var ship = intro.querySelector('.intro-ship'), s = ship && ship.getBoundingClientRect();
    if (s && e.clientX > s.left + s.width * .22 && e.clientX < s.right - s.width * .22 && e.clientY > s.top && e.clientY < s.bottom) {
      speak(ROCKET_QUIPS[rocketQuip++ % ROCKET_QUIPS.length], ship, [.5, .02, 0]);
      return;
    }
    var wisps = intro.querySelectorAll('.intro-wisp');
    for (var i = 0; i < wisps.length; i++) {
      var r = wisps[i].getBoundingClientRect();
      if (e.clientX > r.left + r.width * .08 && e.clientX < r.right - r.width * .08 &&
          e.clientY > r.top + r.height * .15 && e.clientY < r.bottom - r.height * .1) {
        speak(CLOUD_QUIPS[cloudQuip++ % CLOUD_QUIPS.length], wisps[i], [.5, .28, 0]);
        return;
      }
    }
  });

  // Anything else (opening a link, the galaxy) is a small note that floats up from the bottom of
  // the screen, then fades
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
      var pic = (egg.astro.getAttribute('src').match(/([\w-]+)\.\w+$/) || [])[1];
      speak(QUIPS[quip++ % QUIPS.length], egg.astro.parentNode, HELMETS[pic] || [.5, .16, .13]);
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

  // The space cat: sits on the moon by the contact section, minding its own business. Click it and
  // it puts on a bubble helmet and blasts off; a few seconds later it comes back down to its spot.
  // The cat is a picture in each side's style (images/cat-*.png). To put it in the scene rather than
  // on top of it, the script seats it on the moon's curve (sitting up straight, paws just
  // inside the rim on ground we can see) and lights it like the moon around it: the picture's own
  // silhouette masks a shading layer, a rim of key light, a rim of light bounced up off the moon,
  // and a shadow cast across the ground. The helmet, its neck ring and the rocket flame are drawn
  // in the picture's own pixels to fit its head and chest: the bubble clears the ear tips and
  // closes on a ring at the shoulders, and its highlights sit where the key light and the moon
  // would show in curved glass.
  //   head: the bubble's centre and radius; ring: its centre and radii; light: toward the key
  //   light on screen (bright side: upper right, where the print already gilds the cat's edge;
  //   dark side: the sun the astronaut's tether is lit by, upper left); rim: the key rim's width
  //   in px; sink: how far inside the moon's rim the paws rest (past the print's inked edge)
  var CATS = {
    bright: { src: 'images/cat-ukiyoe.png', w: 129, h: 260, head: [65, 62, 89.5], ring: [65, 141, 42, 9], light: [.6, -.8], rim: 2.4, sink: 17,
      glass: '214,232,255', moon: '240,184,96', flame: ['#fff', '#ffe08a', '#ff9a3c', '#ff5a1e'],
      metal: ['#3b290f', '#9a7030', '#f6dc98', '#a77b33', '#4a3413'] },
    dark: { src: 'images/cat-dark.png', w: 140, h: 260, head: [70, 62, 89.5], ring: [70, 141, 42, 9], light: [-.664, -.748], rim: 2.2, sink: 7,
      glass: '235,232,225', moon: '235,232,225', flame: ['#fff', '#f2f0ea', '#bdbab3', '#77746e'],
      metal: ['#1c1c1c', '#5a5955', '#f2f0ea', '#8a8883', '#2a2a2a'] }
  };
  var C = CATS[side === 'dark' ? 'dark' : 'bright'];
  // a point on a circle, by the clock: 0 is straight up, turning clockwise
  function onCircle(x, y, r, deg) {
    var a = deg * Math.PI / 180;
    return (x + r * Math.sin(a)).toFixed(1) + ' ' + (y - r * Math.cos(a)).toFixed(1);
  }
  function arc(x, y, r, from, to) {
    return 'M' + onCircle(x, y, r, from) + 'A' + r + ' ' + r + ' 0 0 1 ' + onCircle(x, y, r, to);
  }
  function catGear() {
    var hx = C.head[0], hy = C.head[1], r = C.head[2];
    var rx = C.ring[0], ry = C.ring[1], rw = C.ring[2], rh = C.ring[3];
    var view = 'viewBox="0 0 ' + C.w + ' ' + C.h + '" aria-hidden="true"';
    var ringL = (rx - rw) + ' ' + ry, ringR = (rx + rw) + ' ' + ry;
    var rgba = function (rgb, a) { return 'rgba(' + rgb + ',' + a + ')'; };
    var stops = function (list) {
      return list.map(function (c, i) { return '<stop offset="' + (i / (list.length - 1)).toFixed(2) + '" stop-color="' + c + '"/>'; }).join('');
    };
    var defs = '<defs>' +
      '<linearGradient id="cat-metal" gradientUnits="userSpaceOnUse" x1="' + (rx - rw) + '" y1="0" x2="' + (rx + rw) + '" y2="0">' +
        stops(C.light[0] > 0 ? C.metal : C.metal.slice().reverse()) + '</linearGradient>' +
      '<radialGradient id="cat-glass" gradientUnits="userSpaceOnUse" cx="' + hx + '" cy="' + hy + '" r="' + r + '">' +
        '<stop offset=".7" stop-color="' + rgba(C.glass, 0) + '"/><stop offset=".93" stop-color="' + rgba(C.glass, .14) + '"/>' +
        '<stop offset="1" stop-color="' + rgba(C.glass, .34) + '"/></radialGradient>' +
      '<linearGradient id="cat-fire" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + C.flame[0] + '"/><stop offset=".25" stop-color="' + C.flame[1] + '"/>' +
        '<stop offset=".6" stop-color="' + C.flame[2] + '" stop-opacity=".85"/><stop offset="1" stop-color="' + C.flame[3] + '" stop-opacity="0"/></linearGradient>' +
      '<filter id="cat-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>' +
    '</defs>';
    // Behind the cat: the far side of the neck ring and the flame under its paws
    var back = '<svg class="cat-back" ' + view + '>' + defs +
      '<path class="cat-flame" d="M' + (rx - 24) + ' 246C' + (rx - 21) + ' 278 ' + (rx - 8) + ' 300 ' + rx + ' 322 ' + (rx + 8) + ' 300 ' + (rx + 21) + ' 278 ' + (rx + 24) + ' 246Z" fill="url(#cat-fire)"/>' +
      '<g class="cat-helmet"><path d="M' + ringL + 'A' + rw + ' ' + rh + ' 0 0 1 ' + ringR + '" fill="none" stroke="url(#cat-metal)" stroke-width="7" opacity=".7"/></g>' +
    '</svg>';
    // In front: the glass, darker and more reflective toward its edge as curved glass is; the key
    // light's window highlight (turned to the light by the script); the moon glowing up in the
    // lower curve; and the near side of the ring
    var front = '<svg class="cat-gear" ' + view + '>' +
      '<g class="cat-helmet">' +
        '<path d="M' + ringL + 'A' + r + ' ' + r + ' 0 1 1 ' + ringR + 'Z" fill="url(#cat-glass)" stroke="' + rgba(C.glass, .5) + '" stroke-width="2"/>' +
        '<g fill="none" stroke-linecap="round" filter="url(#cat-soft)">' +
          '<path d="' + arc(hx, hy, r - 6, 114, 146) + '" stroke="' + rgba(C.moon, .7) + '" stroke-width="8"/>' +
          '<path d="' + arc(hx, hy, r - 6, -146, -114) + '" stroke="' + rgba(C.moon, .7) + '" stroke-width="8"/>' +
        '</g>' +
        '<g class="cat-shine">' +
          '<path d="' + arc(hx, hy, r - 10, -26, 22) + '" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="7" stroke-linecap="round" filter="url(#cat-soft)"/>' +
          '<path d="' + arc(hx, hy, r - 21, -14, 6) + '" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="' + onCircle(hx, hy, r - 30, 16).split(' ')[0] + '" cy="' + onCircle(hx, hy, r - 30, 16).split(' ')[1] + '" r="4" fill="#fff" fill-opacity=".9"/>' +
          // and the faint second reflection, where the light comes back out the far side
          '<path d="' + arc(hx, hy, r - 5, 160, 196) + '" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="3" stroke-linecap="round"/>' +
        '</g>' +
        '<path d="M' + ringL + 'A' + rw + ' ' + rh + ' 0 0 0 ' + ringR + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="10"/>' +
        '<path d="M' + ringL + 'A' + rw + ' ' + rh + ' 0 0 0 ' + ringR + '" fill="none" stroke="url(#cat-metal)" stroke-width="7"/>' +
      '</g>' +
    '</svg>';
    return { back: back, front: front };
  }
  var gear = catGear();
  var cat = plant('.contact', 'space-cat', 'A cat sitting on the moon. It seems to want to go to space',
    '<span class="cat-ground" aria-hidden="true"><span class="cat-cast"></span></span>' +
    '<span class="cat-body" aria-hidden="true">' + gear.back +
      '<span class="cat-fur"><img class="cat-img" src="' + C.src + '" alt="" width="' + C.w + '" height="' + C.h + '">' +
      '<span class="cat-shade"></span><span class="cat-rim cat-key"></span><span class="cat-rim cat-bounce"></span><span class="cat-glow"></span></span>' +
      gear.front +
    '</span>');
  // Seat the cat on top of the moon, at its crown under the send button, between the two links
  // (which part to make room for it), and set its rims, shading, shadow and helmet shine to the
  // side's light
  function seatCat() {
    var moon = document.querySelector(side === 'dark' ? '.horizon-end' : '.contact-moon');
    if (!moon) return;
    // (measured on screen, then scaled back in case the section is ever scaled)
    var box = cat.parentNode.getBoundingClientRect(), m = moon.getBoundingClientRect();
    var k = box.width / cat.parentNode.offsetWidth || 1;
    var R = m.width / 2 / k, cx = (m.left - box.left) / k + R, cy = (m.top - box.top) / k + R;
    var w = cat.offsetWidth, h = cat.offsetHeight, r = R - C.sink;
    // where things are laid out in the section (not where they are on screen: the text slides in)
    var laid = function (el) {
      var x = 0, y = 0;
      for (var e = el; e && e !== cat.parentNode; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
      return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight };
    };
    // what it must not cover: the send button and the links
    var keepClear = [].map.call(cat.parentNode.querySelectorAll('.contact-inner [data-open-message], .contact-links a'), laid)
      .filter(function (b) { return b.right > b.left; });
    // the gap between the two links, when they sit side by side (it is a few px off the crown,
    // as the links differ in width: the ground there is still flat)
    var links = [].map.call(cat.parentNode.querySelectorAll('.contact-links a'), laid), aim = cx;
    if (links.length === 2 && Math.abs(links[0].top - links[1].top) < 4) aim = (links[0].right + links[1].left) / 2;
    // if something is in the way on some screen, walk on round the curve until clear, but never
    // so far that it walks off the screen
    var step = Math.asin(Math.max(-.3, Math.min(.3, (aim - cx) / R))), a, x, y;
    for (var i = 0; i < 30; i++, step += .02) {
      // sitting up straight on a slope, it settles a little lower so its downhill paws still rest
      // on the ground
      var rs = r - .35 * w * Math.tan(Math.abs(step));
      var nx = cx + rs * Math.sin(step) - w / 2, ny = cy - rs * Math.cos(step) - h;
      if (i && nx + w + 16 > cat.parentNode.offsetWidth) break;
      a = step; x = nx; y = ny;
      var blocked = keepClear.some(function (b) { return x < b.right + 6 && x + w > b.left - 6 && y < b.bottom + 6 && y + h > b.top - 6; });
      if (!blocked || a > .55) break;
    }
    cat.style.left = x.toFixed(1) + 'px';
    cat.style.top = y.toFixed(1) + 'px';
    // the cat sits up straight; only its shadow lies along the slope of the ground there
    cat.style.setProperty('--slope', a.toFixed(4) + 'rad');
    var lx = C.light[0], ly = C.light[1];
    cat.style.setProperty('--rim-x', (-lx * C.rim).toFixed(2) + 'px');
    cat.style.setProperty('--rim-y', (-ly * C.rim).toFixed(2) + 'px');
    cat.style.setProperty('--shade', Math.atan2(-lx, ly).toFixed(3) + 'rad');
    cat.style.setProperty('--cast', (lx > 0 ? 76 : -76) + 'deg');
    cat.querySelector('.cat-shine').setAttribute('transform', 'rotate(' + (Math.atan2(lx, -ly) * 180 / Math.PI).toFixed(1) + ' ' + C.head[0] + ' ' + C.head[1] + ')');
  }
  if (cat) {
    // (absolute, or the stylesheets would look for it beside themselves)
    cat.style.setProperty('--cat', 'url("' + new URL(C.src, document.baseURI).href + '")');
    cat.style.setProperty('--ar', C.w + ' / ' + C.h);
    seatCat();
    addEventListener('resize', seatCat);
    addEventListener('load', seatCat);
    if (window.ResizeObserver) new ResizeObserver(seatCat).observe(cat.parentNode);
  }
  var CAT_QUIPS = ['One small step for cat, one giant leap for catkind.', 'Cat-stronaut away!', 'Houston, the cat has the controls.', 'Nine lives, zero gravity.'];
  var catTrip = 0;
  if (cat) cat.addEventListener('click', function () {
    if (cat.dataset.state) return;
    // said from its seat as it lifts off (the bubble stays where it was said). On the dark side it
    // goes under the cat, on the dark ground, rather than over the send button and links
    speak(CAT_QUIPS[catTrip++ % CAT_QUIPS.length], cat, [C.head[0] / C.w, C.head[1] / C.h, C.head[2] / C.w], side === 'dark');
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
