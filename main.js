/*
 * Motion for the site. Content is visible without any of this (no JS, no GSAP, or "reduce motion"
 * all fall back to the finished state); GSAP adds the scrubbed and pinned pieces on top.
 */
(() => {
  const SITE = window.SITE || {};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ── Config: the name, the button, the film ─────────────────────────────────── */
  const name = SITE.name || 'Cathartic';
  $$('[data-app-name]').forEach((el) => (el.textContent = name));
  document.title = `${name} — Notice it. Pick it up.`;
  $$('[data-contact]').forEach((a) => (a.href = SITE.contact || '#'));
  if (SITE.poster) $$('[data-poster]').forEach((img) => (img.src = SITE.poster));

  const film = $('.film');
  if (SITE.video && film) {
    film.classList.add('has-video');
    $('.film-play').addEventListener('click', () => {
      const frame = $('.film-frame');
      const isFile = /\.(mp4|webm|mov)(\?|$)/i.test(SITE.video);
      frame.innerHTML = isFile
        ? `<video src="${SITE.video}" controls autoplay playsinline></video>`
        : `<iframe src="${SITE.video}${SITE.video.includes('?') ? '&' : '?'}autoplay=1" title="${name} film" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    });
  }

  /* ── Headline: words to rise ────────────────────────────────────────────────── */
  // Text splits into words; an element inside a line (the focus brackets) rises as one word.
  $$('.split .line').forEach((line) => {
    line.innerHTML = [...line.childNodes]
      .flatMap((n) => (n.nodeType === 3 ? n.textContent.trim().split(/\s+/).filter(Boolean) : [n.outerHTML]))
      .map((w) => `<span class="word">${w}</span>`)
      .join(' ');
  });

  /* ── Reveals, staggered within a group ──────────────────────────────────────── */
  $$('section').forEach((sec) => $$('.reveal', sec).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`)));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
    { rootMargin: '0px 0px -10% 0px' },
  );
  $$('.reveal').forEach((el) => io.observe(el));

  /* ── Counters ───────────────────────────────────────────────────────────────── */
  const countIo = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        countIo.unobserve(e.target);
        const end = Number(e.target.dataset.count);
        if (calm) return void (e.target.textContent = end);
        const t0 = performance.now();
        const dur = 1400;
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          e.target.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { threshold: 0.6 },
  );
  $$('[data-count]').forEach((el) => countIo.observe(el));

  /* ── Scroll: progress, the rail's current section, the top corners ─────────── */
  const bar = $('.progress');
  const rail = $('.rail');
  const pct = $('.rail-pct');
  const top = $('.top');
  const marks = $$('.rail a').map((a) => [a, $(a.hash)]);
  const phone = window.matchMedia('(max-width: 960px)');
  let queued = false;
  let lastY = scrollY;
  const onScroll = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    // Phones: the tab bar steps aside on the way down and comes back on the way up (and at the end).
    const dy = scrollY - lastY;
    if (Math.abs(dy) > 6 || scrollY < 120) {
      rail.classList.toggle('is-tucked', phone.matches && dy > 0 && scrollY > 120 && max - scrollY > 80);
      lastY = scrollY;
    }
    const p = max > 0 ? scrollY / max : 0;
    bar.style.setProperty('--p', p.toFixed(4));
    rail.style.setProperty('--p', p.toFixed(4));
    pct.textContent = `${Math.round(p * 100)}%`;
    top.classList.toggle('is-scrolled', scrollY > 40);
    // The current section is the last one whose top has passed 45% of the screen.
    let on = null;
    marks.forEach(([a, sec]) => sec && sec.getBoundingClientRect().top <= innerHeight * 0.45 && (on = a));
    marks.forEach(([a]) => (a.classList.toggle('is-on', a === on), a === on ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
  };
  addEventListener('scroll', () => queued || ((queued = true), requestAnimationFrame(onScroll)), { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // A tap leaves focus on the link, which would hold the desktop panel open; let it close.
  let pointer = 'mouse';
  rail.addEventListener('pointerdown', (e) => (pointer = e.pointerType));
  rail.addEventListener('click', (e) => pointer !== 'mouse' && e.target.closest('a')?.blur());

  /* ── Rest what can't be seen ──────────────────────────────────────────────────── */
  // Sections off screen pause their CSS animations; while the hero is up, the page's ambient light (hidden under
  // its canopy) rests too, and hero-only motion stops once it has scrolled away.
  const heroIdle = [];
  let heroOn = true;
  const seen = new IntersectionObserver((entries) =>
    entries.forEach((e) => {
      e.target.classList.toggle('is-off', !e.isIntersecting);
      if (e.target.classList.contains('hero')) {
        heroOn = e.isIntersecting;
        document.documentElement.classList.toggle('hero-in', heroOn);
        heroIdle.forEach((t) => (heroOn ? t.resume() : t.pause()));
      }
    }),
  );
  $$('.hero, .marquee, .how, .screens, .rwa, .film, .cta').forEach((el) => seen.observe(el));

  /* ── Reel: a second copy so the loop never shows a seam ─────────────────────── */
  const reel = $('.reel-track');
  if (reel) [...reel.children].forEach((c) => reel.appendChild(Object.assign(c.cloneNode(true), { ariaHidden: 'true' })));

  /* ── Pointer: glow, tilt, magnetic buttons (fine pointers only) ─────────────── */
  if (fine && !calm) {
    const glow = $('.glow');
    addEventListener('pointermove', (e) => {
      glow.style.setProperty('--gx', `${e.clientX}px`);
      glow.style.setProperty('--gy', `${e.clientY}px`);
    });
    // Cards only: the phones' transforms belong to GSAP. Leaving hands the transform back to CSS.
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.22}px`);
        el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.32}px`);
      });
      el.addEventListener('pointerleave', () => (el.style.setProperty('--mx', '0px'), el.style.setProperty('--my', '0px')));
    });
  }

  /* ── How it works: the steps orbit the phone ──────────────────────────────────── */
  // The phone shows the Collect screen and the steps are glass panels round it. As p runs from 0 to 2, each panel
  // moves on along a loop of keyframes (passing the phone's top or foot behind it), so the next step comes round to
  // the front, where it faces you, and the screen steps through the flow with it. Phones: the panels swing past
  // under the phone like a carousel. e (0 → 1) fans them out from behind the phone as the section arrives.
  const orbit = (() => {
    const stage = $('.how-stage');
    const phone = $('.how-phone', stage);
    const wire = $('.how-wire', stage);
    const cards = $$('.hstep', stage);
    const island = $('.top-step');
    const count = $('.top-n b', island);
    const bal = $('.scr-bal b', stage);
    const total = bal.textContent;
    const num = (t) => +t.replace(/\D/g, '');
    let K = [], size = [], ph = {}, H = 0, small = false, p = 0, e = 1, step = -1, lit = -1, tally;
    // A smooth loop through the six keyframes in K, two to a step (Catmull-Rom, so it never pauses at one).
    const along = (s) => {
      const u = s * 2, i = Math.floor(u), t = u - i, k = (n) => K[(n + 6) % 6];
      const [a, b, c, d] = [k(i - 1), k(i), k(i + 1), k(i + 2)];
      return b.map((_, f) => b[f] + 0.5 * t * (c[f] - a[f] + t * (2 * a[f] - 5 * b[f] + 4 * c[f] - d[f] + t * (3 * (b[f] - c[f]) + d[f] - a[f]))));
    };
    // All measuring happens here (on load and resize), never while drawing.
    const layout = () => {
      small = innerWidth <= 960;
      const W = stage.clientWidth;
      H = stage.clientHeight;
      ph = { x: phone.offsetLeft + phone.offsetWidth / 2, y: phone.offsetTop + phone.offsetHeight / 2, w: phone.offsetWidth, h: phone.offsetHeight };
      size = cards.map((c) => [c.offsetWidth, c.offsetHeight]);
      if (small) return;
      const cw = size[0][0];
      const X = Math.min(ph.w / 2 + Math.max(48, Math.min(W * 0.05, 100)) + cw / 2, W / 2 - cw / 2);
      // [x, y, turn, scale, opacity] from the phone's centre: at the front, on its right; past its top corner, half
      // behind it; back left, high; round the far left; back left, low; past its foot, half behind it.
      K = [[X, 0, -6, 1, 1], [0.4 * X, -0.28 * H, 4, 0.66, 0.55], [-X, -0.25 * H, 24, 0.7, 0.62], [-1.1 * X, 0, 30, 0.62, 0.42], [-X, 0.25 * H, 24, 0.7, 0.72], [0.4 * X, 0.28 * H, -4, 0.66, 0.6]];
      const len = X - cw / 2 - ph.w / 2 + 8;
      wire.style.cssText = `left: ${ph.x + ph.w / 2 - 4}px; top: ${ph.y}px; width: ${len}px; --run: ${len - 14}px`;
    };
    const draw = () => {
      const k = 1 - (1 - e) ** 3;
      cards.forEach((c, i) => {
        const [w, h] = size[i];
        let v, back;
        if (small) {
          const r = Math.max(-1.6, Math.min(1.6, i - p)), a = Math.abs(r);
          const y = Math.min(ph.h * 0.34 + h / 2, H - ph.y - h / 2 - 4);
          v = [r * w * 0.84, y, -r * 40, 1 - Math.min(a, 1) * 0.18, Math.max(0, 1 - a * 0.7)];
          back = a > 0.5;
        } else {
          const s = (((p - i) % 3) + 3) % 3;
          v = along(s);
          back = s > 0.12 && s < 2.88;
        }
        const [x, y, ry, sc, op] = v;
        c.style.transform = `translate3d(${ph.x + x * k - w / 2}px, ${ph.y + y * k - h / 2}px, 0) rotateY(${ry}deg) scale(${sc * (0.5 + 0.5 * k)})`;
        c.style.opacity = op * k;
        c.classList.toggle('is-back', back || k < 0.97);
      });
      phone.style.transform = `translate3d(0, ${(1 - k) * 60}px, 0)`;
      phone.style.opacity = 0.3 + 0.7 * k;
      const now = Math.max(0, Math.min(2, Math.round(p)));
      if (now !== step) {
        if (step >= 0 && count) {
          count.textContent = now + 1;
          count.classList.remove('roll');
          void count.offsetWidth; // restart the roll
          count.classList.add('roll');
        }
        step = now;
        phone.dataset.step = now;
        island.dataset.step = now;
        cards.forEach((c, i) => c.classList.toggle('is-done', i < now));
        // The balance counts up as the coins land.
        tally?.kill();
        bal.textContent = bal.dataset.from;
        if (now === 2) {
          const o = { v: num(bal.dataset.from) };
          tally = window.gsap.to(o, { v: num(total), duration: 1.2, delay: 0.55, ease: 'power2.out', onUpdate: () => (bal.textContent = Math.round(o.v).toLocaleString('en-IN')) });
        }
      }
      const on = k > 0.97 && Math.abs(p - now) < 0.08 ? now : -1;
      if (on !== lit) {
        lit = on;
        cards.forEach((c, i) => c.classList.toggle('is-on', i === on));
        wire.classList.toggle('is-on', on >= 0);
      }
    };
    return { layout, set: (q) => ((p = q), draw()), enter: (q) => ((e = q), draw()), redraw: () => (layout(), draw()) };
  })();

  document.fonts?.ready.then(() => window.ScrollTrigger?.refresh());

  /* ── Rewards: tap a pass to flip it to its code (one at a time) ───────────────── */
  const passes = $$('.pass');
  const flip = (p, on) => (p.classList.toggle('is-flipped', on), p.setAttribute('aria-pressed', on));
  passes.forEach((p) => p.addEventListener('click', () => {
    const on = !p.classList.contains('is-flipped');
    passes.forEach((o) => o !== p && flip(o, false));
    flip(p, on);
  }));

  /* ── The finished state, for "reduce motion" or no GSAP ─────────────────────── */
  const settle = () => {
    $$('.ms').forEach((m) => m.classList.add('on'));
    $('.ms-track b').style.transform = 'none';
  };
  if (calm || !hasGsap) return settle();

  /* ── GSAP from here ─────────────────────────────────────────────────────────── */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const ease = 'expo.out';

  // Hero: words rise, the phone rises up from the bottom of the screen, then the spatial panels fan out from behind it.
  const panels = $$('.hpanel').filter((p) => p.offsetParent);
  const movers = panels.map((p) => $('.hpanel-move', p));
  // Each panel starts tucked behind the phone: measure how far that is before anything moves.
  const pr = $('.phone-hero').getBoundingClientRect();
  const home = movers.map((m) => {
    const r = m.getBoundingClientRect();
    return { x: pr.left + pr.width / 2 - (r.left + r.width / 2), y: pr.top + pr.height * 0.25 - (r.top + r.height / 2) };
  });
  const side = panels.map((p) => (parseFloat(getComputedStyle(p).getPropertyValue('--px')) < 0 ? -1 : 1));
  let lean = false;
  gsap
    .timeline({ defaults: { ease } })
    .from('.hero .word', { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.08 }, 0.1)
    .from('.phone-hero', { y: 120, rotate: 10, opacity: 0, duration: 1.6 }, 0.25)
    .from(movers, { x: (i) => home[i].x, y: (i) => home[i].y, z: -160, rotationY: (i) => -side[i] * 50, scale: 0.45, autoAlpha: 0, duration: 1.6, stagger: 0.12 }, 0.85)
    .call(() => (lean = true))
    // The focus brackets close in on "it" and lock, with a small squeeze like a camera finding focus.
    .from('.focus i', { x: (i) => (i % 2 ? 1 : -1) * 18, y: (i) => (i < 2 ? -1 : 1) * 14, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03 }, 1.05)
    .to('.focus', { scale: 0.94, duration: 0.12, ease: 'power2.out' }, 1.6)
    .to('.focus', { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 1.72);
  // Hovering the word refocuses it.
  if (fine) $('.focus').addEventListener('pointerenter', () => gsap.fromTo('.focus i', { x: (i) => (i % 2 ? 1 : -1) * 8, y: (i) => (i < 2 ? -1 : 1) * 6 }, { x: 0, y: 0, duration: 0.45, ease: 'back.out(2.5)' }));
  heroIdle.push(gsap.to('.phone-hero', { y: -14, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 }));
  // Once out, each panel bobs on its own rhythm.
  panels.forEach((p, i) =>
    heroIdle.push(gsap.to($('.hpanel-float', p), { y: i % 2 ? 9 : -9, rotationZ: side[i] * (i % 2 ? 1 : -1) * 1.2, duration: 3.1 + i * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.4 + i * 0.25 })),
  );
  // They lean towards the cursor, the near ones more, like real glass in space.
  if (fine) {
    const q = movers.map((m) => ['rotationY', 'rotationX', 'x', 'y'].map((k) => gsap.quickTo(m, k, { duration: 0.9, ease: 'power3' })));
    addEventListener('pointermove', (e) => {
      if (!lean || scrollY > innerHeight) return;
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      q.forEach(([ry, rx, x, y], i) => {
        const d = i % 2 ? 1.35 : 1;
        ry(nx * 14 * d);
        rx(-ny * 10 * d);
        x(nx * 26 * d);
        y(ny * 18 * d);
      });
    });
  }
  // Scrolling away, they drift apart and up at different speeds, while the stage rises.
  panels.forEach((p, i) =>
    gsap.to(p, { x: side[i] * (i % 2 ? 140 : 90), y: -(i % 2 ? 200 : 120), ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }),
  );
  gsap.to('.hero-stage', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  // The hero's field stays put: sliding it down would carry its dark foot past the hero and over How it works
  // (which has no panel to hide it); the boughs inside it carry the depth instead.
  // Boughs bend away from the cursor as it brushes through them, pivoting at their base on the page edge, and
  // spring back once it has passed.
  if (fine) {
    // The hero's boughs along the top edge, and the page canopy's along the sides (fixed, so they're there all the way down).
    const fields = $$('.hero-field, .sky');
    const leaves = $$('.hero-field .leaf, .sky .leaf').map((el) => {
      const near = !!el.closest('.canopy-near');
      const ease = { duration: near ? 0.9 : 1.2, ease: 'power3' };
      const field = el.closest('.hero-field, .sky');
      return { el, near, field, hero: field.classList.contains('hero-field'), layer: el.closest('.canopy-layer'), k: 0, qx: gsap.quickTo(el, 'x', ease), qy: gsap.quickTo(el, 'y', ease), qr: gsap.quickTo(el, 'rotation', ease) };
    });
    // Each bough's base, direction and the middle of its leaves, measured once (and again on resize).
    const rest = () =>
      leaves.forEach((l) => {
        const r = (parseFloat(getComputedStyle(l.el).getPropertyValue('--r')) * Math.PI) / 180;
        const len = l.el.firstElementChild.offsetHeight * 0.87;
        l.ux = Math.sin(r);
        l.uy = -Math.cos(r);
        l.mx = l.layer.offsetLeft + l.el.offsetLeft + l.ux * len * 0.6;
        l.my = l.layer.offsetTop + l.el.offsetTop + l.uy * len * 0.6;
      });
    rest();
    addEventListener('resize', rest);
    let px = -1e4;
    let py = -1e4;
    let ticking = false;
    const brush = () => {
      ticking = false;
      const at = new Map(fields.map((f) => [f, f.getBoundingClientRect()]));
      leaves.forEach((l) => {
        if (l.hero && !heroOn) return;
        const f = at.get(l.field);
        const x = px - f.left;
        const y = py - f.top;
        const vx = x - l.mx;
        const vy = y - (l.my + gsap.getProperty(l.layer, 'y'));
        const d = Math.hypot(vx, vy) || 1;
        const reach = l.near ? 320 : 250;
        const k = d < reach ? (1 - d / reach) ** 2 : 0;
        // Out of reach and already at rest: nothing to do.
        if (k === 0 && l.k === 0) return;
        l.k = k;
        if (k > 0 && !l.lifted) {
          clearTimeout(l.drop);
          l.el.classList.add('is-pushed');
          l.lifted = true;
        } else if (k === 0 && l.lifted) {
          // Back at rest once the spring settles; then it folds into its layer again.
          l.lifted = false;
          l.drop = setTimeout(() => l.lifted || l.el.classList.remove('is-pushed'), 1500);
        }
        // Bend away from the side the cursor is on, with a little give at the base.
        const side = Math.sign(l.ux * vy - l.uy * vx);
        l.qr(-side * k * (l.near ? 10 : 6));
        l.qx((-vx / d) * k * (l.near ? 16 : 9));
        l.qy((-vy / d) * k * (l.near ? 16 : 9));
      });
    };
    const queue = () => ticking || ((ticking = true), requestAnimationFrame(brush));
    addEventListener('pointermove', (e) => ((px = e.clientX), (py = e.clientY), queue()));
    document.documentElement.addEventListener('pointerleave', () => ((px = py = -1e4), queue()));
    addEventListener('scroll', () => scrollY < innerHeight * 1.2 && queue(), { passive: true });
  }
  // The page canopy drifts a little as you go down the page, the near boughs more than the far ones.
  gsap.to('.sky .canopy-near', { y: -70, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  gsap.to('.sky .canopy-far', { y: -30, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  // The near leaves pass faster than the far ones, for depth.
  gsap.to('.hero-field .canopy-near', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-field .canopy-far', { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // How it works: the heading rises in and the panels fan out from behind the phone as the section arrives; then,
  // held on screen, the scroll turns the orbit a step at a time, resting at each.
  $('.how').classList.add('is-live');
  orbit.layout();
  ScrollTrigger.addEventListener('refresh', orbit.redraw);
  gsap.from('.how-head', { y: 60, opacity: 0, ease: 'power1.out', scrollTrigger: { trigger: '.how', start: 'top 70%', end: 'top 10%', scrub: true } });
  const come = { e: 0 };
  gsap.to(come, { e: 1, ease: 'none', onUpdate: () => orbit.enter(come.e), scrollTrigger: { trigger: '.how', start: 'top 75%', end: 'top 5%', scrub: 0.6 } });
  const turn = { p: 0 };
  gsap
    .timeline({
      defaults: { ease: 'power2.inOut' },
      onUpdate: () => orbit.set(turn.p),
      scrollTrigger: { trigger: '.how', start: 'top top', end: 'bottom bottom', scrub: 0.7 },
    })
    .to({}, { duration: 0.6 })
    .to(turn, { p: 1, duration: 1 })
    .to({}, { duration: 0.9 })
    .to(turn, { p: 2, duration: 1 })
    .to({}, { duration: 0.7 });
  orbit.enter(0);
  // While the section holds the screen, its name and progress show in the middle of the top bar.
  ScrollTrigger.create({ trigger: '.how', start: 'top 30%', end: 'bottom 70%', toggleClass: { targets: document.documentElement, className: 'how-on' } });


  // Rewards: the passes deal in along the line, it lights up to your balance and the marker rises; then one pass
  // turns over by itself, to show what tapping does (unless one has been tapped already).
  const rewards = $('.rewards');
  rewards.classList.add('is-live');
  ScrollTrigger.create({
    trigger: '.rw-row',
    start: 'top 80%',
    once: true,
    onEnter: () => {
      rewards.classList.add('is-in');
      gsap.delayedCall(2.2, () => passes.some((p) => p.classList.contains('is-flipped')) || flip($('.pass[data-demo]'), true));
    },
  });

  // Ranks: the three stubs fan out of a stack (as wide as the screen allows); the streak track fills.
  const fan = innerWidth < 561 ? 112 : innerWidth < 961 ? 170 : 205;
  gsap
    .timeline({ scrollTrigger: { trigger: '.stubs', start: 'top 70%' } })
    .from('.stub', { y: 80, opacity: 0, duration: 0.8, ease, stagger: 0.1 })
    .to('.s2', { x: -fan, rotate: -9, y: 26, duration: 1.2, ease: 'back.out(1.3)' }, 0.6)
    .to('.s3', { x: fan, rotate: 9, y: 26, duration: 1.2, ease: 'back.out(1.3)' }, 0.6)
    .to('.s1', { y: -14, duration: 1.2, ease: 'back.out(1.3)' }, 0.6);
  const msTl = gsap.timeline({ scrollTrigger: { trigger: '.streak', start: 'top 70%' } });
  msTl.to('.ms-track b', { scaleX: 1, duration: 1.8, ease: 'power2.inOut' });
  $$('.ms').forEach((m, i) => msTl.call(() => m.classList.add('on'), null, i * 0.85));

  // RWA: pins drop onto the plan, the phone rises past it.
  gsap.from('.pin', { y: -70, opacity: 0, duration: 0.9, ease: 'bounce.out', stagger: 0.25, scrollTrigger: { trigger: '.plan', start: 'top 70%' } });
  gsap.from('.plan-blocks rect', { opacity: 0, scale: 0.85, transformOrigin: 'center', duration: 0.7, ease, stagger: 0.04, scrollTrigger: { trigger: '.plan', start: 'top 75%' } });
  gsap.fromTo('.phone-admin', { y: 120 }, { y: -60, ease: 'none', scrollTrigger: { trigger: '.rwa', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Film and CTA: a slow push-in as they arrive.
  gsap.from('.film-frame', { scale: 0.9, duration: 1.4, ease, scrollTrigger: { trigger: '.film', start: 'top 75%' } });
  gsap.from('.cta-card', { y: 60, scale: 0.96, duration: 1.4, ease, scrollTrigger: { trigger: '.cta', start: 'top 80%' } });
})();
