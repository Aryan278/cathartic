# APP_NAME — website

The landing page for the litter-collection app: *Notice it. Pick it up.*
A plain static site (HTML, CSS, JS) with GSAP scroll animations. No build step.

## Edit the things that change

Everything that will change lives in `config.js`:

- `name`: the app's name (it's still a placeholder)
- `contact`: where the "Get early access" buttons go
- `video`: the film, either a file in this repo (`assets/film.mp4`) or a YouTube/Vimeo embed URL
- `poster`: the image shown before the film plays

## Run it locally

```bash
py -m http.server 5180
```

Then open http://localhost:5180.

## Publish

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.
