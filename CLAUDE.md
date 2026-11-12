# CLAUDE.md — the Cathartic website

The landing page for a litter-collection app in Gurgaon: residents pick up loose street litter,
drop it at their society's registered drop point, and earn coins they spend at partner cafés.
Tagline: **"Notice it. Pick it up."** Live at https://aryan278.github.io/cathartic/ (GitHub Pages
from `main`, root). The owner is Aryan.

## Stack and structure
- Plain static site: `index.html`, `styles.css`, `main.js`, `config.js`. No build step, no npm.
- GSAP 3.12.5 + ScrollTrigger from cdnjs for scroll animation. Fonts: Funnel Display (headlines),
  Plus Jakarta Sans (body), Martian Mono (labels) from Google Fonts.
- `config.js` is the one place for things that change: `name` (the app name is "Cathartic" — never
  hardcode it; elements with `data-app-name` read it), `contact` (the "Get early access" link), `video`
  (the film: repo path to an MP4 or a YouTube/Vimeo embed URL), `poster`.
- Navigation: name and "Get early access" float in the top corners (`.top`); the sections live in
  `.rail`, a left icon rail on desktop that opens into a panel on hover/focus, and a bottom tab bar
  at ≤960px that tucks away while scrolling down. `--rail` in `styles.css` keeps the page column clear of it.
- One canopy runs behind the whole page (`.sky`, fixed): the light from above, the canopy photo faintly, drifting glows
  and boughs from the side edges. Sections have no backgrounds of their own, so the page reads as one; the hero adds
  only the boughs along its top edge. The leaves are boughs in `assets/img/canopy/`, drawn by `tools/canopy.py` (edit it, then run
  `python3 tools/canopy.py`). They grow in from the page edges like real branches: bare wood only where it is
  thick, foliage from the edge out, never loose floating sprigs. No peepal leaves or shimmering sunflecks (both read wrong).
- How it works is a spatial orbit: a phone in the middle shows the Collect screen (built in HTML, sized in `cqw`)
  and the three steps are glass panels that orbit it as the scroll goes on; the one at the front faces you, gets the
  focus brackets and a lit wire, and the screen steps through Find → Drop → Earn with it. The section is tall and its
  inner `.how-pin` is sticky (no GSAP pin); on phones the panels swing past under the phone like a carousel. main.js
  (`orbit`) measures once per refresh and only writes transform/opacity while scrolling.
- Two ways to help is a field guide: the heading split across two rows ("Pick it up —" / "or point it out."), each
  half beside its photo in a glass print with a marker ring and an arrow back to the words. Rewards is a row of passes
  in two labelled groups (yours today / next); a pass flips to its code when tapped. While How it works holds the
  screen, its name and progress sit in the middle of the top bar (`.top-step`).
- Cursors (fine pointers only): a classic arrow with an Ivory rim, and a pointing hand on anything clickable. SVG
  sources in `assets/cursors/`, with 1x/2x PNGs rendered from them (the CSS uses `image-set`).
- `assets/shots/` are real app screenshots (demo data); `assets/img/` holds the app's field
  backgrounds, eco-bag, grain texture and report photos.

## Look — match the app, don't reinvent it
- Dark only. Palette ("dappled light" greens): Shade `#101110`, Bark `#1d2719`, Deep olive `#2a4224`,
  Moss `#314926`, Fern `#5a732f`, Sage `#678133`, Khaki `#9bb444`, Signal `#b2c74b` (accent),
  Bright `#e1ec97`, Ivory `#f9fdd6` (every "white" — text, glass, rims). Ember `#c98a3a` for warnings
  only. No new hues.
- Glass = Ivory at low alpha with a diagonal sheen and a bright top rim; grain overlay; drifting
  light blobs. Primary button = Ivory pill with dark ink.
- Copy rules: **Collect** is loose surface litter only, by hand. **Report** is hands-off — never
  suggest touching drains or sludge. Coins are earned, never sold. Don't invent stats or partners.

## Rules for changes
- Content must stay visible without JS and with `prefers-reduced-motion` (main.js `settle()`).
  Animate transform/opacity; keep it smooth on mid-range phones.
- No horizontal scroll at 390px; check phone and desktop widths.
- Commit with clear messages and push to `main`; Pages redeploys in about a minute.
- Bump the `?v=` stamp on `styles.css`, `config.js` and `main.js` in `index.html` with every change to them, or
  browsers keep the old copy against the new page.
