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

  /* ── How it works: the trail through the canopy ─────────────────────────────── */
  // The trail is drawn through the middle of each stop, from off one edge of the page to off the other, from where
  // the stops actually sit, so it fits any screen. show(d) draws it in up to a fraction d of its length, each stop
  // growing in as the line reaches it; walkTo(f) lights it up to f, moves the walker there and marks the stops.
  const trail = (() => {
    const box = $('.trail');
    const svg = $('.trail-path', box);
    const ahead = $('.trail-ahead', svg);
    const reveal = $('.trail-reveal', svg);
    const mask = $('mask', svg);
    const lit = $$('.trail-glow, .trail-walked', svg);
    const walker = $('.trail-walker', box);
    const stops = $$('.stop', box);
    const count = $('.how-count b');
    const phone = window.matchMedia('(max-width: 960px)');
    let len = 1;
    let samples = [[0, 0]];
    let at = [0.2, 0.5, 0.8];
    let f = 0;
    let drawn = 1;
    let finished = false;
    // How close (as a share of the trail) the walker must be to a stop to be at it: on phones, within its height.
    let near = 0.02;
    const paint = () => {
      const lead = Math.min(f, drawn);
      lit.forEach((p) => (p.style.strokeDashoffset = len * (1 - lead)));
      walker.style.opacity = drawn >= f ? 1 : 0;
    };
    const show = (d) => {
      drawn = d;
      reveal.style.strokeDashoffset = len * (1 - d);
      // The mask is only needed while the trail draws in; once drawn it would cost a repaint every frame.
      if (d < 1) ahead.setAttribute('mask', 'url(#trail-drawn)');
      else ahead.removeAttribute('mask');
      stops.forEach((s, i) => s.classList.toggle('is-shown', d >= at[i] - 0.04));
      paint();
    };
    const walkTo = (to) => {
      f = to;
      const pt = ahead.getPointAtLength(len * f);
      walker.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
      paint();
      let reached = 1;
      stops.forEach((s, i) => {
        s.classList.toggle('is-on', Math.abs(f - at[i]) < near);
        s.classList.toggle('is-done', f > at[i] + near);
        if (f >= at[i] - near) reached = i + 1;
      });
      if (+count.textContent !== reached) {
        count.textContent = reached;
        count.classList.remove('roll');
        void count.offsetWidth; // restart the roll
        count.classList.add('roll');
      }
    };
    const build = () => {
      const w = box.offsetWidth;
      const h = box.offsetHeight;
      const list = stops[0].offsetParent;
      const c = stops.map((s) => [list.offsetLeft + s.offsetLeft + s.offsetWidth / 2, list.offsetTop + s.offsetTop + s.offsetHeight / 2]);
      // Desktop: in from the left edge below the first stop, out at the right above the last. Phones: in from the
      // right, out at the left.
      const pts = phone.matches
        ? [[w + 30, c[0][1] - 90], ...c, [-30, c[2][1] + 110]]
        : [[-30, c[0][1] + 120], ...c, [w + 30, c[2][1] - 110]];
      // A Catmull-Rom curve through the points, as cubic Béziers.
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const [p0, p1, p2, p3] = [pts[i - 1] || pts[i], pts[i], pts[i + 1], pts[i + 2] || pts[i + 1]];
        d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
      }
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      Object.entries({ x: -300, y: -300, width: w + 600, height: h + 600 }).forEach(([k, v]) => mask.setAttribute(k, v));
      [ahead, reveal, ...lit].forEach((p) => p.setAttribute('d', d));
      len = ahead.getTotalLength();
      [reveal, ...lit].forEach((p) => (p.style.strokeDasharray = `${len} ${len}`));
      near = phone.matches ? (stops[0].offsetHeight * 0.55) / len : 0.02;
      samples = Array.from({ length: 401 }, (_, i) => {
        const pt = ahead.getPointAtLength((len * i) / 400);
        return [pt.x, pt.y];
      });
      // Where along the trail each stop sits.
      at = c.map(([x, y]) => {
        let best = 0;
        samples.forEach(([sx, sy], i) => (sx - x) ** 2 + (sy - y) ** 2 < (samples[best][0] - x) ** 2 + (samples[best][1] - y) ** 2 && (best = i));
        return best / 400;
      });
      show(drawn);
      walkTo(finished ? at[2] : f);
    };
    // Phones: the walker keeps pace with the reader, 55% of the way down the screen.
    const follow = () => {
      const y = innerHeight * 0.55 - box.getBoundingClientRect().top;
      let i = 0;
      samples.forEach(([, sy], j) => sy <= y && (i = j));
      walkTo(i / 400);
    };
    const finish = () => ((finished = true), show(1), walkTo(at[2]));
    build();
    return { build, show, walkTo, follow, finish, get at() { return at; } };
  })();
  document.fonts?.ready.then(() => (trail.build(), window.ScrollTrigger?.refresh()));

  /* ── The finished state, for "reduce motion" or no GSAP ─────────────────────── */
  const settle = () => {
    // How it works rests at its last stop, the whole trail walked.
    trail.finish();
    addEventListener('resize', trail.build);
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
  gsap.to('.hero-field', { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  // Boughs bend away from the cursor as it brushes through them, pivoting at their base on the page edge, and
  // spring back once it has passed.
  if (fine) {
    const field = $('.hero-field');
    const leaves = $$('.hero-field .leaf').map((el) => {
      const near = !!el.closest('.canopy-near');
      const ease = { duration: near ? 0.9 : 1.2, ease: 'power3' };
      return { el, near, layer: el.closest('.canopy-layer'), qx: gsap.quickTo(el, 'x', ease), qy: gsap.quickTo(el, 'y', ease), qr: gsap.quickTo(el, 'rotation', ease) };
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
      if (!heroOn) return;
      const f = field.getBoundingClientRect();
      const x = px - f.left;
      const y = py - f.top;
      leaves.forEach((l) => {
        const vx = x - l.mx;
        const vy = y - (l.my + gsap.getProperty(l.layer, 'y'));
        const d = Math.hypot(vx, vy) || 1;
        const reach = l.near ? 320 : 250;
        const k = d < reach ? (1 - d / reach) ** 2 : 0;
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
  // The near leaves pass faster than the far ones, for depth.
  gsap.to('.hero-field .canopy-near', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-field .canopy-far', { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // How it works: on the way in the trail draws itself from the left and each stop grows in as it arrives; then the
  // scroll walks it, stop to stop. Desktop pins the section while it plays; phones keep scrolling, with the walker
  // keeping pace.
  $('.how').classList.add('is-live');
  ScrollTrigger.addEventListener('refreshInit', trail.build);
  const arrive = { trigger: '.how', start: 'top 90%', end: 'top top', scrub: true };
  gsap.from('.how-head', { y: 60, opacity: 0, ease: 'power1.out', scrollTrigger: { ...arrive, start: 'top 70%', end: 'top 10%' } });
  // The stops and the trail rise together, so the line always runs through the stops.
  gsap.from('.trail', { y: 50, ease: 'power1.out', scrollTrigger: { ...arrive, start: 'top 70%', end: 'top 5%' } });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    const draw = (s) => trail.show(s.progress);
    ScrollTrigger.create({ trigger: '.how', start: 'top 80%', end: 'top 8%', onUpdate: draw, onRefresh: draw });
    // As the walk goes on, the boughs drift past, the near ones faster: walking on through the trees.
    const far = gsap.quickSetter('.how-field .canopy-far', 'x', 'px');
    const nearby = gsap.quickSetter('.how-field .canopy-near', 'x', 'px');
    const walk = { f: 0 };
    const go = () => (trail.walkTo(walk.f), far(-walk.f * 20), nearby(-walk.f * 40));
    gsap
      .timeline({
        defaults: { ease: 'power1.inOut', onUpdate: go },
        scrollTrigger: { trigger: '.how', pin: '.how-pin', start: 'top top', end: '+=220%', scrub: 0.6, invalidateOnRefresh: true },
      })
      .fromTo(walk, { f: () => trail.at[0] * 0.45 }, { f: () => trail.at[0], duration: 1 })
      .to({}, { duration: 1.1 })
      .to(walk, { f: () => trail.at[1], duration: 1.2 })
      .to({}, { duration: 1.1 })
      .to(walk, { f: () => trail.at[2], duration: 1.2 })
      .to({}, { duration: 1.3 });
    go();
  });
  mm.add('(max-width: 960px)', () => {
    trail.show(1);
    ScrollTrigger.create({ trigger: '.trail', start: 'top bottom', end: 'bottom top', onUpdate: trail.follow, onRefresh: trail.follow });
    trail.follow();
  });

  // Rewards: the leaders draw, the balance line sweeps, the receipt prints.
  gsap.from('.leader', { scaleX: 0, duration: 1.1, ease, stagger: 0.12, scrollTrigger: { trigger: '.menu', start: 'top 75%' } });
  gsap.fromTo('.menu-balance', { '--bal': 0 }, { '--bal': 1, duration: 1.2, ease, delay: 0.5, scrollTrigger: { trigger: '.menu', start: 'top 75%' } });
  gsap
    .timeline({ scrollTrigger: { trigger: '.rewards-stage', start: 'top 65%' } })
    .fromTo('.receipt-paper', { clipPath: 'inset(0 0 100% 0)', y: -40 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.6, ease: 'steps(14)' })
    .from('.receipt-code', { letterSpacing: '0.5em', opacity: 0, duration: 0.6, ease }, '-=0.3');

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
