/**
 * The site's one place for things that will change. The app's name isn't final (CLAUDE.md §0), so
 * every visible name on the page reads from here — renaming is this line and nothing else.
 *
 *   name     the app's name
 *   contact  where "Get early access" and "Bring it to your society" go (mailto:, a form, a link)
 *   video    the film: a path in this repo (assets/film.mp4) or a YouTube/Vimeo embed URL. Empty
 *            shows the "coming soon" card.
 *   poster   the image shown before the film plays
 */
window.SITE = {
  name: 'APP_NAME',
  contact: 'mailto:ops@example.org?subject=Early%20access',
  video: '',
  poster: 'assets/shots/home.webp',
};
