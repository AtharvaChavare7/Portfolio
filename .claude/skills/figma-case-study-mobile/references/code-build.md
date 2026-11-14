# Building the mobile version in code

## Page structure

Keep one URL per case study. The desktop deck stays exactly as it is; the mobile version is a sibling element:

```html
<main class="case-study-embed case-study-page">…desktop deck…</main>

<!-- Phone-only short version. The full deck above is hidden below 720px. -->
<article class="cs-mobile" aria-label="<Project> case study, short version">
  <header class="cs-m-hero">…</header>
  <section class="cs-m-section" data-cs-m-reveal>…</section>
  …
</article>
```

```css
.cs-mobile { display: none; }
@media (max-width: 720px) {
  .case-study-page, .research-popup { display: none !important; }
  .cs-mobile { display: block; }
}
```

`display: none` also hides the inactive version from screen readers, so the content isn't read twice.

Style it from the deck, not from a template: the deck's fonts (or the agreed web equivalent), its exact colours, its card/border/radius treatment, its illustrations and decorative shapes exported as SVG/WebP, and its own copy. Match the approved Figma frames. `assets/case-study-mobile.css` is only a structural starting point (copy it into the site once, e.g. `work/case-study-mobile.css`, and link it from every case-study page). Retheme it through its custom properties (`--cs-m-blue`, `--cs-m-ink`, `--cs-m-tint`, …) and the font-family to match the deck. Components it provides:

| Class | Use |
|---|---|
| `.cs-m-hero`, `.cs-m-phone` (+ `<video>`), `.cs-m-eyebrow`, `.cs-m-title`, `.cs-m-lede`, `.cs-m-notice`, `.cs-m-meta` | Hero with phone-framed video, title, desktop note, role/team grid |
| `.cs-m-section`, `--tint`, `--blue` | Section bands |
| `.cs-m-kicker`, `.cs-m-h2` | Section label + heading |
| `.cs-m-funnel` (`__row`, `__bar` with `--w`, `__label`) | Animated bar funnel |
| `.cs-m-stats`, `.cs-m-stat` (`__num`, `__txt`) | Stat cards |
| `.cs-m-insights` | Number + sentence list |
| `.cs-m-hmw` | How-might-we card |
| `.cs-m-steps`, `.cs-m-step` (`__n`, h3, p, img), `.cs-m-step__media` | Solution cards with full-bleed image, optional video overlay |
| `.cs-m-learn` | Numbered learnings list |

Add new components as needed, prefixed `cs-m-`, generic rather than project-specific.

Fonts: if the deck uses a font that isn't on the site, either load the web version (Google Fonts) or use the closest available family. Add any weights you use (e.g. 700/800) to the font request.

## Script (in the shared case-study JS)

```js
const mobile = document.querySelector(".cs-mobile");
if (mobile && window.matchMedia("(max-width: 720px)").matches) {
  // Videos: autoplay attribute does most of the work; retry for browsers that refuse.
  const videos = [...mobile.querySelectorAll("[data-cs-m-video]")];
  const playAll = () => videos.forEach((v) => { v.muted = true; if (v.paused) v.play().catch(() => {}); });
  playAll();
  videos.forEach((v) => v.addEventListener("loadeddata", playAll, { once: true }));
  ["touchstart", "click", "scroll"].forEach((n) => window.addEventListener(n, playAll, { passive: true }));
  // Reveal on scroll — only armed when JS runs, so content is never stuck hidden.
  if ("IntersectionObserver" in window) {
    mobile.classList.add("is-armed");
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -10% 0px" });
    mobile.querySelectorAll("[data-cs-m-reveal]").forEach((el) => io.observe(el));
  }
}
```

## Video markup

```html
<video data-cs-m-video autoplay muted loop playsinline preload="metadata"
       poster="…/hero-phone-poster.webp" aria-hidden="true" tabindex="-1">
  <source src="…/hero-phone.mp4" type="video/mp4">
</video>
```

Lessons from production:
- Starting videos only from JavaScript (`preload="none"` + `play()`) left them frozen for visitors whose phone had cached the previous version of the script. The `autoplay` attribute makes the HTML self-sufficient.
- iOS refuses autoplay in Low Power Mode; the touch/scroll retry starts it on first interaction, and the poster means the phone never shows a blank screen meanwhile.
- Chrome pauses off-screen muted autoplay videos until they're visible — that's expected, not a bug.

## Caching

GitHub Pages and most CDNs cache CSS/JS for ~10 minutes, phones sometimes longer. Whenever you change the shared CSS or JS, bump a query string on every page that links it (`case-study.js?v=3`). When telling the person to check a deploy, say to wait a couple of minutes and reopen the tab.

## Verification checklist

Run `scripts/phone_preview.cjs <url> <out-dir>` (defaults: 390×844, DPR 2, touch). Then confirm:
- [ ] No horizontal scroll (`scrollWidth` = 390).
- [ ] Every video reports `paused=false` with `currentTime` advancing (off-screen ones may be paused until scrolled to).
- [ ] Reveal sections are all visible after scrolling to the bottom.
- [ ] Text sizes: nothing a reader needs below 13px.
- [ ] Crops have no stray annotation lines or cut-off UI.
- [ ] At 1440×900 the desktop deck renders as before and `.cs-mobile` is `display: none`.
- [ ] Desktop video (if any) still plays.

Send the person the phone-framed screenshots and the scroll recording. Ship only after approval; follow the repo's PR conventions; after merge, tell them roughly how long until it's live.
