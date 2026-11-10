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
  $$('.split .line').forEach((line) => {
    line.innerHTML = line.textContent
      .trim()
      .split(/\s+/)
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

  /* ── The finished state, for "reduce motion" or no GSAP ─────────────────────── */
  const settle = () => {
    $$('.frame img, .drop-thumb').forEach((el) => Object.assign(el.style, { opacity: 1, transform: 'none' }));
    $$('.strip-line b').forEach((el) => (el.style.transform = 'none'));
    Object.assign($('.receipt-card').style, { opacity: 1, transform: 'none' });
    // How it works rests on its last frame: the drop point, dimmed, with the coin card on top.
    $('.scene-find').style.opacity = 0;
    $('.scene-drop').style.opacity = 1;
    $('.scene-dim').style.opacity = 1;
    $('.drop-art').style.opacity = 0.3;
    $('.reticle-drop').style.opacity = 0;
    $$('.how-dots i').forEach((d) => d.classList.add('on'));
    $('.how-count b').textContent = 3;
    $$('.ms').forEach((m) => m.classList.add('on'));
    $('.ms-track b').style.transform = 'none';
    $$('.step').forEach((s) => s.classList.add('is-on'));
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
    .call(() => (lean = true));
  gsap.to('.phone-hero', { y: -14, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 });
  // Once out, each panel bobs on its own rhythm.
  panels.forEach((p, i) =>
    gsap.to($('.hpanel-float', p), { y: i % 2 ? 9 : -9, rotationZ: side[i] * (i % 2 ? 1 : -1) * 1.2, duration: 3.1 + i * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.4 + i * 0.25 }),
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

  // How it works: pinned, and the scroll plays find → drop → minted, one step showing at a time.
  const steps = $$('.step');
  const dots = $$('.how-dots i');
  const count = $('.how-count b');
  const setStep = (n) => {
    steps.forEach((s, i) => s.classList.toggle('is-on', i === n));
    dots.forEach((d, i) => d.classList.toggle('on', i <= n));
    count.textContent = n + 1;
  };
  $('.how').classList.add('is-live');
  // On the way in, the veil lifts off the scene's top edge and the camera and panel rise into place.
  const arrive = { trigger: '.how', start: 'top 90%', end: 'top top', scrub: true };
  // The veil holds while the scene's top edge is still on screen, and lifts only as the section pins.
  gsap.fromTo('.how-veil', { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: { ...arrive, start: 'top 12%' } });
  gsap.from('.how-scenes', { scale: 1.08, ease: 'none', scrollTrigger: arrive });
  gsap.from('.how-frame, .how-copy', { y: 70, opacity: 0, ease: 'power1.out', stagger: 0.1, scrollTrigger: { ...arrive, start: 'top 60%', end: 'top 5%' } });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => howTimeline('+=240%'));
  mm.add('(max-width: 960px)', () => howTimeline('+=180%'));
  function howTimeline(end) {
    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: {
        trigger: '.how',
        pin: '.how-pin',
        start: 'top top',
        end,
        scrub: 0.6,
        onUpdate: (self) => setStep(self.progress < 0.36 ? 0 : self.progress < 0.7 ? 1 : 2),
      },
    });
    tl.to('.scene-img', { scale: 1.06, duration: 1 })
      .to('.shutter i', { scale: 0.82, duration: 0.15 }, 0.85)
      .to('.shutter i', { scale: 1, duration: 0.2 }, 1)
      .fromTo('.flash', { opacity: 0 }, { opacity: 0.9, duration: 0.08 }, 0.95)
      .to('.flash', { opacity: 0, duration: 0.35 }, 1.03)
      .to('.frame-find img', { opacity: 1, scale: 1, duration: 0.4 }, 1)
      .to('.strip-line b', { scaleX: 1, duration: 0.5 }, 1.2)
      .to('.frame-find', { borderColor: 'rgba(249,253,214,.3)', boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.3 }, 1.4)
      .to('.frame-drop', { borderStyle: 'solid', borderColor: '#e1ec97', boxShadow: '0 0 18px rgba(225,236,151,.35)', duration: 0.3 }, 1.4)
      .to('.scene-find', { opacity: 0, duration: 0.5 }, 1.5)
      .to('.scene-drop', { opacity: 1, duration: 0.5 }, 1.5)
      .to('.drop-art', { opacity: 1, duration: 0.5 }, 1.5)
      .fromTo('.vf-bag', { yPercent: -160, opacity: 0 }, { yPercent: 70, opacity: 1, duration: 0.9, ease: 'power2.in' }, 1.8)
      .to('.vf-bag', { opacity: 0, scale: 0.6, duration: 0.2 }, 2.6)
      .to('.shutter i', { scale: 0.82, duration: 0.15 }, 2.7)
      .to('.shutter i', { scale: 1, duration: 0.2 }, 2.85)
      .fromTo('.flash', { opacity: 0 }, { opacity: 0.9, duration: 0.08 }, 2.8)
      .to('.flash', { opacity: 0, duration: 0.35 }, 2.88)
      .to('.frame-drop .drop-thumb', { opacity: 1, scale: 1, duration: 0.4 }, 2.85)
      .to('.scene-dim', { opacity: 1, duration: 0.5 }, 3.1)
      .to('.drop-art', { opacity: 0.3, duration: 0.5 }, 3.1)
      .to('.reticle-drop', { opacity: 0, duration: 0.3 }, 3.1)
      .to('.receipt-card', { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 3.2)
      .fromTo('.coin-big', { rotateY: -540, scale: 0.4 }, { rotateY: 0, scale: 1, duration: 1.1, ease: 'power3.out' }, 3.3)
      .to({}, { duration: 0.6 });
    return () => setStep(0);
  }

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
