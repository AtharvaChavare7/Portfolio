# Image, SVG or code?

Decide per element, by what it *is*, not by how it was drawn in Figma. Everything in Figma is technically vector; that doesn't make it a good SVG.

## Decision guide

**Live HTML text** — any text a person reads: headings, paragraphs, labels, numbers in stat cards, quotes, list items, captions.
Why: it reflows, stays sharp at every DPR, is selectable, works with screen readers and search, and can be edited later without re-exporting. Text inside an exported image is fixed-size — exactly the problem that makes desktop slides unreadable on phones.
Exception: text that is *part of a picture* (the UI inside a phone mockup, a logo) stays in the picture.

**Code (CSS/HTML, or hand-written inline SVG)** — simple data graphics and structural decoration: stat cards, funnels, progress bars, step numbers, dividers, simple timelines, coloured bands, badges.
Why: few shapes, needs to stay legible at narrow widths, often worth animating. Rebuilding a 3-bar funnel takes minutes; exporting it gives tiny fixed labels.

**Raster image (WebP)** — designed UI screens and mockups, screenshots, photos, 3D renders, rich illustrations with gradients/textures/shadows, noisy or textured backgrounds.
Why: they are pictures of your designs. Recreating a phone screen in code is slow, never quite faithful, and doesn't make the point better. Export at 2× the displayed CSS width (a mockup shown at 340px → ~700px wide file; full-bleed card images ~800–1000px; wide multi-phone rows ~1400px). WebP quality ~80–85 typically gives 30–120 KB per mockup.

**SVG export** — genuinely flat vector art: icons, logos, wordmarks, line illustrations, simple diagrams, decorative blobs/waves.
Why: tiny, crisp, recolourable. Check the export size: if an "SVG" is mostly `<image href="data:image/png;base64,…">`, it's a raster in disguise — export a WebP instead.

**Video (MP4, H.264, yuv420p, `+faststart`)** — prototype recordings, animated covers, interactions that matter to the story.
Crop to the phone screen (`ffmpeg -vf "crop=w:h:x:y,scale=..."`) so the file is small and the frame fits a phone-shaped container; ~500px wide is plenty for a mockup-sized video. Always extract a poster frame (WebP) at a meaningful moment (not frame 0 if it's blank).

## Exporting from Figma

- **Best: export the node itself.** Find the phone frame / illustration node in the metadata (often named `iPhone 13 & 14 - 38`, `Frame 2147…`, `Comp …`) and export just that node as PNG at 2–3× (`download_assets`, or `GET /v1/images/:fileKey?ids=<nodeIds>&format=png&scale=3`). This avoids annotation dots, dotted callout lines and neighbouring elements that sneak into region crops.
- **Fallback: crop from slide exports.** If the site already has 4× slide PNGs, crop with `scripts/crop_assets.py`. Work out boxes on a gridded thumbnail; then *look at every crop*.
- **SVG with live text**: the MCP export outlines all text. The REST endpoint with `format=svg&svg_outline_text=false` keeps `<text>`, but needs a personal access token from the person (store it only in the environment/session, never in the repo, and suggest revoking it after). An SVG used via `<img>` cannot use page `@font-face` fonts — inline it if its text must use the brand font. Licensed desktop fonts (e.g. Gilroy) may not be licensed for web use; ask before self-hosting them, otherwise pick a close web font (e.g. Plus Jakarta Sans for Gilroy-style geometric sans).

## Mockups with blank screens

A mockup whose screen is blank (flat light fill) in the deck almost always had a video or prototype composited on top on desktop (look for a `<video>` positioned over that slide in the site's code, or a "Comp …" node in Figma). Reuse that video in the mobile version: overlay it on the image, positioned in percentages of the image box so it scales:

```css
.media { position: relative; }
.media video { position: absolute; top: 10.29%; left: 9.2%; width: 30.5%; height: 78.71%; object-fit: cover; border-radius: 13% / 6%; }
```

Measure the screen rectangle on the exported image (scan for the bezel's dark pixels along a row and a column) and divide by the image size.

## Size budget

Mobile visitors are often on cellular. Aim for under ~1–1.5 MB for the whole mobile version (excluding desktop assets). Lazy-load everything below the hero (`loading="lazy" decoding="async"`), give every `<img>` its `width`/`height` to prevent layout shift, and keep videos `preload="metadata"` with a poster.
