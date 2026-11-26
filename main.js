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
    const frame = $('.film-frame');
    const isFile = /\.(mp4|webm|mov)(\?|$)/i.test(SITE.video);
    // A file starts downloading quietly once the film is a screen or two away, so pressing play doesn't start from
    // nothing; the same element then plays in place.
    let video;
    const fetchFilm = () => {
      if (video) return video;
      video = Object.assign(document.createElement('video'), { src: SITE.video, poster: SITE.poster || '', preload: 'auto', controls: true, playsInline: true });
      return video;
    };
    if (isFile && 'IntersectionObserver' in window) {
      const near = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (near.disconnect(), fetchFilm().load()), { rootMargin: '150% 0px' });
      near.observe(film);
    }
    $('.film-play').addEventListener('click', () => {
      if (!isFile) {
        frame.innerHTML = `<iframe src="${SITE.video}${SITE.video.includes('?') ? '&' : '?'}autoplay=1" title="${name} film" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
        return;
      }
      frame.replaceChildren(fetchFilm());
      video.play().catch(() => {});
    });
  }

  /* ── Ready: the curtain lifts once the page can be seen whole ─────────────────── */
  // Ready means the fonts, the hero's images and the canopy's drawings are in (or three seconds have passed), so the
  // first thing anyone sees is the finished page, never one assembling itself. Everything that moves on arrival
  // (the hero's intro, the reveals) waits for it.
  const lite = document.documentElement.classList.contains('lite');
  const loaded = (img) => (img.complete ? Promise.resolve() : new Promise((r) => (img.addEventListener('load', r, { once: true }), img.addEventListener('error', r, { once: true }))));
  const drawings = [...new Set($$('.hero-field .leaf b, .sky .leaf b').map((b) => getComputedStyle(b).backgroundImage.slice(5, -2)).filter(Boolean))];
  const root = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // The canopy's drawings, fetched and decoded before the boughs start to grow, so none pops in halfway (a first
  // visit fetches them while the loader runs); then the canopy has most of a second to grow before the page shows.
  const decoded = drawings.map((src) => Object.assign(new Image(), { src }).decode().catch(() => {}));
  const grown = Promise.all(decoded).then(() => (root.classList.remove('hold-canopy'), wait(calm ? 0 : 900)));
  const parts = [document.fonts?.ready, ...$$('.hero img, .sky img').map(loaded), ...decoded];
  const curtain = $('.curtain');
  // The curtain's brackets close in as the parts arrive (--p), and lock on once they're all in.
  let got = 0;
  parts.forEach((p) => Promise.resolve(p).then(() => curtain?.style.setProperty('--p', (++got / parts.length).toFixed(2))));
  const ready = Promise.race([Promise.all([...parts, grown]), wait(3200)])
    // A second on screen at least, so the brackets are seen closing in rather than flashing past.
    .then(() => wait(calm ? 0 : 1000 - performance.now()))
    .then(() => {
      curtain?.style.setProperty('--p', 1);
      curtain?.classList.add('is-locked');
      return wait(calm || !curtain ? 0 : 420);
    })
    .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  ready.then(() => {
    // The coin rises into the name's mark in the corner (its centre and size), then the curtain clears.
    const coin = $('.curtain-coin');
    const a = coin?.getBoundingClientRect();
    const b = $('.brand-mark')?.getBoundingClientRect();
    if (a && b?.width) {
      const fly = coin.parentElement.style;
      fly.setProperty('--fx', `${(b.left + b.width / 2 - a.left - a.width / 2).toFixed(1)}px`);
      fly.setProperty('--fy', `${(b.top + b.height / 2 - a.top - a.height / 2).toFixed(1)}px`);
      fly.setProperty('--fs', (b.width / a.width).toFixed(3));
    } else coin?.parentElement.classList.add('is-lost');
    root.classList.add('is-ready');
    // As it lands, the mark in the corner takes its place (the same drawing, the same size), and the curtain goes
    // altogether, so nothing in it keeps ticking behind the page.
    setTimeout(() => (root.classList.add('has-landed'), curtain?.remove()), calm ? 0 : 960);
    // Then, quietly, fetch the images further down, so they're there before anyone scrolls to them.
    setTimeout(() => $$('img[loading="lazy"]').forEach((img) => (img.loading = 'eager')), 1200);
  });

  /* ── Headline: words to rise ────────────────────────────────────────────────── */
  // Text splits into words; an element inside a line (the focus brackets) rises as one word.
  $$('.split .line').forEach((line) => {
    line.innerHTML = [...line.childNodes]
      .flatMap((n) => (n.nodeType === 3 ? n.textContent.trim().split(/\s+/).filter(Boolean) : [n.outerHTML]))
      .map((w) => `<span class="word">${w}</span>`)
      .join(' ');
  });

  /* ── Letters that lift when you point at them (the hero's title, the field guide's, every section's) ── */
  if (fine) {
    const letters = (root) => {
      root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walk.nextNode()) texts.push(walk.currentNode);
      texts.forEach((t) => {
        if (!t.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        t.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const w = Object.assign(document.createElement('span'), { className: 'w' });
          [...part].forEach((ch) => w.append(Object.assign(document.createElement('span'), { className: 'ch', textContent: ch })));
          frag.append(w);
        });
        t.replaceWith(frag);
      });
      root.classList.add('has-ch');
    };
    $$('.hero h1').forEach(letters);
    // The rest wait until the page has settled in, so splitting them never holds up the loader.
    const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
    ready.then(() => idle(() => $$('.fg-title, h2.h2').forEach(letters)));
    if (calm || !hasGsap) $('.hero h1').classList.add('intro-done');
    // The second line's gradient runs across the whole line: each letter carries its own slice of it.
    const lit = $('.hero .lit');
    const slice = () => {
      lit.style.setProperty('--lw', `${lit.offsetWidth}px`);
      $$('.ch', lit).forEach((c) => c.style.setProperty('--bx', `${-c.offsetLeft}px`));
    };
    if (lit) {
      ready.then(slice);
      addEventListener('resize', slice);
    }
  }

  /* ── Reveals, staggered within a group ──────────────────────────────────────── */
  $$('section').forEach((sec) => $$('.reveal', sec).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`)));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
    { rootMargin: '0px 0px -10% 0px' },
  );
  ready.then(() => $$('.reveal').forEach((el) => io.observe(el)));

  /* ── Numbers: the station board flicks over to each number ──────────────────── */
  // Each tile rolls forward through a few digits and lands on its own, the later tiles a little later. Tapping a
  // board rolls it again.
  const roll = (board) => {
    if (board.rolling) return;
    board.rolling = true;
    const tiles = $$('span[aria-hidden]', board);
    tiles.forEach((s, i) => {
      const end = +(s.dataset.end ??= s.textContent);
      let k = 5 + i * 2;
      const tick = () => {
        s.textContent = (end - k + 100) % 10;
        s.classList.remove('flip');
        void s.offsetWidth;
        s.classList.add('flip');
        if (k-- > 0) setTimeout(tick, 75);
        else if (i === tiles.length - 1) board.rolling = false;
      };
      tick();
    });
  };
  if (!calm) {
    $$('.fl-item').forEach((it) => {
      const board = $('.flaps', it);
      it.addEventListener('click', () => roll(board));
    });
    const flapIo = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          flapIo.unobserve(e.target);
          roll(e.target);
        }),
      { threshold: 0.6 },
    );
    $$('.flaps').forEach((f) => flapIo.observe(f));
  }

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
  $$('.hero, .marquee, .how, .ranks, .rwa, .screens, .film, .numbers, .cta').forEach((el) => seen.observe(el));

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
    // A few cards lean towards the cursor: they read --tx/--ty (-0.5 to 0.5) and do the rest in CSS.
    const lean = (el, to = el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        to.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        to.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      el.addEventListener('pointerleave', () => (to.style.setProperty('--tx', 0), to.style.setProperty('--ty', 0)));
    };
    $$('.sb-cell').forEach((c) => lean(c, $('.sb-phone', c)));
    $$('.film-frame, .letter').forEach((el) => lean(el));
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

  /* ── For RWAs: drag across the plan to compare it before and after ───────────── */
  const ba = $('.ba');
  const baRange = ba && $('.ba-range', ba);
  const split = (v) => ba.style.setProperty('--split', `${v}%`);
  baRange?.addEventListener('input', () => split(baRange.value));

  /* ── Inside the app: hovering (or focusing) a screen opens it in the bento ──── */
  const sb = $('.sb');
  if (sb) {
    const sbCells = $$('.sb-cell', sb);
    // The rearranging is tweened here, track by track (browsers jump between grid templates rather than animate them).
    const fr = { c0: 1, c1: 1, c2: 1, r0: 1, r1: 1 };
    const lay = () => ((sb.style.gridTemplateColumns = `${fr.c0}fr ${fr.c1}fr ${fr.c2}fr`), (sb.style.gridTemplateRows = `${fr.r0}fr ${fr.r1}fr`));
    const glide = (i) => {
      const to = i < 0 ? { c0: 1, c1: 1, c2: 1, r0: 1, r1: 1 } : { c0: i % 3 === 0 ? 1.7 : 0.65, c1: i % 3 === 1 ? 1.7 : 0.65, c2: i % 3 === 2 ? 1.7 : 0.65, r0: i < 3 ? 3 : 1, r1: i < 3 ? 1 : 3 };
      if (hasGsap && !calm) gsap.to(fr, { ...to, duration: 0.85, ease: 'power3.inOut', overwrite: true, onUpdate: lay });
      else (Object.assign(fr, to), lay());
    };
    const open = (i) => +sb.dataset.open !== i && ((sb.dataset.open = i), glide(i), sbCells.forEach((c, k) => c.classList.toggle('is-open', k === i)));
    sbCells.forEach((c, i) => {
      c.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && open(i));
      c.addEventListener('focus', () => open(i));
    });
    sb.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && open(-1));
    sb.addEventListener('focusout', (e) => sb.contains(e.relatedTarget) || open(-1));
    sb.addEventListener('hint', (e) => open(e.detail));
  }

  /* ── Get early access: copies our address to the clipboard, and says so ─────── */
  // The label swaps to "Email copied!" in place for a moment. The invitation's button still opens the email too, with
  // the society's address in it; the others just copy (and open the email only if copying isn't possible).
  const addr = /^mailto:/i.test(SITE.contact || '') ? decodeURIComponent(SITE.contact.slice(7).split('?')[0]) : '';
  if (addr) {
    const note = Object.assign(document.createElement('p'), { className: 'sr-only' });
    note.setAttribute('aria-live', 'polite');
    document.body.append(note);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(addr);
        return true;
      } catch {
        const f = Object.assign(document.createElement('textarea'), { value: addr, readOnly: true });
        f.style.cssText = 'position: fixed; top: 0; opacity: 0; pointer-events: none';
        document.body.append(f);
        f.select();
        const ok = document.execCommand('copy');
        f.remove();
        return ok;
      }
    };
    $$('[data-contact]').forEach((a) => {
      const t = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (t) {
        const say = Object.assign(document.createElement('span'), { className: 'say' });
        say.innerHTML = `<span>${t.textContent.trim()}</span><span aria-hidden="true">Email copied!</span>`;
        t.replaceWith(say);
      }
      const invite = !!a.closest('.letter');
      a.addEventListener('click', async (e) => {
        if (!invite) e.preventDefault();
        if (!(await copy())) return invite || (location.href = a.href);
        a.classList.add('is-copied');
        note.textContent = `Copied ${addr}`;
        clearTimeout(a.said);
        a.said = setTimeout(() => a.classList.remove('is-copied'), 2200);
      });
    });
  }

  /* ── The invitation: the society's email rides along in the email we're sent ── */
  const society = $('#society');
  const send = society?.closest('.letter').querySelector('[data-contact]');
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (society && send && /^mailto:/i.test(SITE.contact || '')) {
    const to = SITE.contact.split('?')[0];
    society.addEventListener('input', () => {
      const v = society.value.trim();
      send.href = `${to}?subject=${encodeURIComponent('Early access')}${isEmail(v) ? `&body=${encodeURIComponent(`Our society's email: ${v}`)}` : ''}`;
    });
    society.addEventListener('keydown', (e) => e.key === 'Enter' && send.click());
  }

  /* ── For RWAs: try the pickup slots; the capacity bar follows ─────────────────── */
  const cap = $('.rb-cap');
  $$('.rb-slots button').forEach((btn, i, all) =>
    btn.addEventListener('click', () => {
      all.forEach((o) => (o.classList.toggle('on', o === btn), o.setAttribute('aria-pressed', o === btn)));
      cap.style.setProperty('--cap', btn.dataset.cap);
    }),
  );

  /* ── The film: with no film set yet, play nudges the cover ──────────────────── */
  if (!SITE.video) {
    const reel = $('.film-reel');
    $('.film-play')?.addEventListener('click', () => {
      reel.classList.remove('is-nudge');
      void reel.offsetWidth;
      reel.classList.add('is-nudge');
    });
  }

  /* ── The invitation: a proper email stamps the seal ─────────────────────────── */
  const letter = society?.closest('.letter');
  society?.addEventListener('input', () => {
    const had = letter.classList.contains('has-email');
    const ok = isEmail(society.value.trim());
    letter.classList.toggle('has-email', ok);
    if (!had && ok) {
      letter.classList.remove('is-stamped');
      void letter.offsetWidth;
      letter.classList.add('is-stamped');
    }
  });

  /* ── The finished state, for "reduce motion" or no GSAP ─────────────────────── */
  const settle = () => {};
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
  const intro = gsap
    .timeline({ defaults: { ease }, paused: true })
    .from('.hero .word', { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.08 }, 0.1)
    .from('.phone-hero', { y: 120, rotate: 10, opacity: 0, duration: 1.6 }, 0.25)
    .from(movers, { x: (i) => home[i].x, y: (i) => home[i].y, z: -160, rotationY: (i) => -side[i] * 50, scale: 0.45, autoAlpha: 0, duration: 1.6, stagger: 0.12 }, 0.85)
    .call(() => (lean = true))
    // The focus brackets close in on "it" and lock, with a small squeeze like a camera finding focus.
    .from('.focus i', { x: (i) => (i % 2 ? 1 : -1) * 18, y: (i) => (i < 2 ? -1 : 1) * 14, opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03 }, 1.05)
    .to('.focus', { scale: 0.94, duration: 0.12, ease: 'power2.out' }, 1.6)
    .to('.focus', { scale: 1, duration: 0.5, ease: 'back.out(3)' }, 1.72)
    .call(() => $('.hero h1').classList.add('intro-done'), null, 1.5);
  ready.then(() => intro.play());
  // Hovering the word refocuses it.
  if (fine) $('.focus').addEventListener('pointerenter', () => gsap.fromTo('.focus i', { x: (i) => (i % 2 ? 1 : -1) * 8, y: (i) => (i < 2 ? -1 : 1) * 6 }, { x: 0, y: 0, duration: 0.45, ease: 'back.out(2.5)' }));
  ready.then(() => {
    heroIdle.push(gsap.to('.phone-hero', { y: -14, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 }));
    // Once out, each panel bobs on its own rhythm.
    panels.forEach((p, i) =>
      heroIdle.push(gsap.to($('.hpanel-float', p), { y: i % 2 ? 9 : -9, rotationZ: side[i] * (i % 2 ? 1 : -1) * 1.2, duration: 3.1 + i * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.4 + i * 0.25 })),
    );
  });
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
  // Scrolling away, they drift apart and up at different speeds, while the stage rises. Where the browser can tie an
  // animation to the scroll itself (CSS, .hero's view timeline), it does, so a fast flick never leaves them a frame
  // behind the text; elsewhere ScrollTrigger scrubs them.
  const drift = panels.map((p, i) => [side[i] * (i % 2 ? 140 : 90), -(i % 2 ? 200 : 120)]);
  if (CSS.supports('animation-timeline: view()')) {
    panels.forEach((p, i) => (p.style.setProperty('--sx', `${drift[i][0]}px`), p.style.setProperty('--sy', `${drift[i][1]}px`)));
  } else {
    panels.forEach((p, i) => gsap.to(p, { x: drift[i][0], y: drift[i][1], ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } }));
    gsap.to('.hero-stage', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  // The hero's field stays put: sliding it down would carry its dark foot past the hero and over How it works
  // (which has no panel to hide it); the boughs inside it carry the depth instead.
  // Boughs bend away from the cursor as it brushes through them, pivoting at their base on the page edge, and
  // spring back once it has passed. (Not on lower-end machines.)
  if (fine && !lite) ready.then(() => {
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
  });
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
      const balN = $('.bal-n'), bal = { v: 0 }, coin = balN.firstElementChild;
      gsap.to(bal, { v: 1240, duration: 1.4, delay: 0.3, ease: 'power2.out', onUpdate: () => balN.replaceChildren(coin, Math.round(bal.v).toLocaleString('en-IN')) });
      gsap.delayedCall(2.2, () => passes.some((p) => p.classList.contains('is-flipped')) || flip($('.pass[data-demo]'), true));
    },
  });

  // Ranks & streaks: the streak counts up as its days light.
  const streakN = $('.streak-n b');
  if (streakN) {
    const n = { v: 0 };
    ScrollTrigger.create({
      trigger: '.streak',
      start: 'top 80%',
      once: true,
      onEnter: () => gsap.fromTo(n, { v: 0 }, { v: 12, duration: 1.1, delay: 0.45, ease: 'power1.out', onUpdate: () => (streakN.textContent = Math.round(n.v)) }),
    });
  }
  // Inside the app: once, as the bento lands, Home opens for a moment to show what hovering does (desktop).
  if (sb && fine) {
    let touched = false;
    sb.addEventListener('pointerenter', () => (touched = true), { once: true });
    ScrollTrigger.create({
      trigger: sb,
      start: 'top 60%',
      once: true,
      onEnter: () => {
        gsap.delayedCall(1.2, () => touched || sb.dispatchEvent(new CustomEvent('hint', { detail: 0 })));
        gsap.delayedCall(3.1, () => touched || sb.dispatchEvent(new CustomEvent('hint', { detail: -1 })));
      },
    });
  }

  // For RWAs: the plan's split sweeps across once as it arrives, from mostly "before" to the middle.
  if (ba) {
    split(88);
    const sweep = { v: 88 };
    ScrollTrigger.create({
      trigger: ba,
      start: 'top 75%',
      once: true,
      onEnter: () => gsap.to(sweep, { v: 50, duration: 1.6, delay: 0.4, ease: 'power2.inOut', onUpdate: () => (split(sweep.v), (baRange.value = sweep.v)) }),
    });
  }
})();
