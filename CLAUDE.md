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
