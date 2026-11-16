---
name: figma-case-study-mobile
description: Turn a desktop case-study presentation designed in Figma (1920x1080 slides) into a short, phone-friendly version — first as mobile frames in Figma, then as a responsive page in code. Use this whenever someone wants a case study, portfolio project, pitch or presentation deck from Figma to work on mobile, says the slides look tiny or unreadable on a phone, asks for a "mobile version", "shorter version for phones" or "responsive case study", or shares a Figma deck link and mentions phones, mobile or responsiveness — even if they don't say "skill" or name every step.
---

# Figma case study → mobile

A desktop case-study deck shrunk onto a phone is unreadable: 1920px slides scale to ~20% and body text ends up around 4px. The fix is not to scale the slides, it's to **re-edit and re-lay out** the story for a phone: fewer, tighter sections that keep the deck's visual identity (colours, type, illustration style, mockups) but use layouts that are native to a 390px-wide screen.

The result is a *short version*. Someone on a phone should get the whole story — problem, what was found, what was designed, what changed — in about a minute of scrolling, and know the full case study is on desktop.

**The non-negotiable: the mobile version is made of the deck, not inspired by it.** Its headlines, highlight colours, illustrations, cards, numbered steps, callout pills, decorative shapes, logos, mockups and copy are the deck's own elements, cut and re-stacked for a narrow screen. Do not invent new UI — no generic stat cards, chips, pills, buttons, gradients, shadows or "kicker" labels that the deck doesn't have, and no rewritten copy in a new voice. The person designed the deck with care; a mobile version built from fresh generic components reads as AI slop even when it's tidy (that was the verdict on our first SnakeSafe attempt). When in doubt, ask "where in the deck does this come from?" — if there's no answer, it doesn't belong.

The work has four phases. Do them in order, because each one is cheaper to change than the next:

1. **Understand the deck** — read every slide, its text and its visuals.
2. **Edit** — decide what stays, what goes, what merges. Write the mobile outline.
3. **Design in Figma** — build 390px mobile frames next to the deck, try layout options for the hard slides, pick one. Get the person's review.
4. **Build in code** — implement the approved frames, with each element built the right way (image, SVG or code). Preview on a phone viewport, then ship only when approved.

Show the person something at the end of phases 2, 3 and 4. Never ship (merge, deploy, publish) without their explicit go-ahead.

---

## Phase 1 — Understand the deck

Goal: know what every slide *says* and what every visual *is*, without guessing from thumbnails.

- Parse the Figma URL: `figma.com/design/<fileKey>/...?node-id=1-8090` → fileKey, nodeId `1:8090`. Call `create_session` first (the Figma MCP requires it).
- `get_metadata` on the deck's parent frame. On real decks this is often hundreds of KB and gets saved to a file instead of returned. That's fine: parse it with Python/`jq` (it's XML inside a JSON array; the XML is usually in the element whose text starts with `<frame`). Walk the top-level children — each is a slide — and list every `<text>` node's `name` per slide. Text-node names are the text content, so this gives you the full copy of the deck cheaply.
- Get visuals: `get_screenshot` per slide, or if the site already has slide exports (e.g. `slide-04.png` at 4x), make small thumbnails and a contact sheet and look at them. Draw a labelled grid over a thumbnail when you need coordinates for crops.
- Write a one-line inventory per slide: *section · what it claims · key numbers · visuals it contains (phone mocks, charts, illustrations, photos, video)*.

See `references/figma-reading.md` for the parsing snippets and gotchas (huge metadata, text names that are placeholder labels from components, nested slides).

## Phase 2 — Edit: what stays, what goes

This is the most important judgement in the whole job. A desktop deck is written for a reviewer who has 20 minutes; the phone reader has one. Read `references/editorial.md` before cutting — it has the full reasoning and a worked example. The core rules:

- **Keep the spine**: who/what (hero) → the problem, with its number → impact/outcome → the 2–3 insights that *caused* the design decisions → the "how might we" → the solution, one card per touchpoint or flow → one short learnings list.
- **Put the outcome early.** Numbers like "+22% CTR" belong near the top; on desktop they may sit on slide 3 but a phone reader may never reach slide 14.
- **Choose insights by consequence, not by order.** Of five insights, keep the ones that (a) have a hard number, (b) directly justify a design decision shown later, or (c) are surprising. Drop ones that restate another, or are generic ("users want it simple").
- **Choose screens by flow.** Keep final, shipped designs of the main flow, one representative screen per step. Drop wireframes, explorations, discarded concepts, component sheets and near-duplicate states — unless the before/after *is* the point.
- **Cut process detail**: research plans, screener criteria, discussion guides, methodology diagrams, stakeholder maps, tool logos. Mention method in one line if at all.
- **Cut by choosing, not by rewriting.** Shorten by picking which of the deck's own paragraphs, cards and screens to keep. Keep the author's wording; only trim a sentence when a kept block is genuinely too long for a phone, and then edit it lightly in the same voice. Never round, invent or "improve" a metric.
- One visible note near the top: it's the short version and the full one is on desktop. Don't add an end card repeating it (people find it redundant).

Deliverable: a mobile outline — numbered sections, each with its kept copy (rewritten), which visuals it uses, and what was dropped. Show it to the person briefly before designing; a 30-second "does this cut look right?" saves a redesign.

## Phase 3 — Design the mobile frames in Figma

Work *in the same Figma file*, on frames placed beside the desktop deck, so the person can compare and edit. Load the `figma-use` skill (and `figma-generate-design`) before calling `use_figma`.

**Build every frame by cloning the deck's nodes**, not by drawing new ones. For each kept block, find its node id in the metadata and `clone()` it into a 390-wide vertical auto-layout section:
- **Visual blocks** (phone mockups, illustrations, cards, numbered step markers, callout pills, logo columns, buttons, wordmark/title groups): clone and `rescale(targetWidth / node.width)`. `rescale` works even when the deck's fonts can't be loaded, and it keeps the block pixel-identical. Choose the target width so text inside stays ≥ ~12px.
- **Text that must re-wrap** (headlines and paragraphs written for a 1300–1900px line): clone the text node, swap only the unloadable font families for the closest available ones (keeping weights, per-range colours such as highlighted words, line height and spacing), set a mobile font size if needed (headline ~28–34, body ~15–17), then `textAutoResize = 'HEIGHT'` and fill the column width. Load every font already in the node before calling `setRangeFontName`, or it throws. Details in `references/figma-reading.md`.
- **Decorations** (blobs, leaves, waves, textures): clone them as absolutely-positioned children behind content, pushed into corners or behind phones — never under text.
- **Section backgrounds**: copy the deck section's fill (e.g. the dark Home Screen band), don't pick new colours.
- **Rows** (meta row, phone pairs, 2×2 phone grids): horizontal auto-layout of clones. If a row's labels collide at phone width, rebuild it from the deck's own label/value text nodes in narrower columns.

Then:
- Frame: 390 wide (iPhone 12–15 logical width), one auto-layout frame per section, side by side in a wrapper next to the deck. Use auto-layout for stacking — manual y-positioning of clones overlaps because clones' visual bounds (shadows, overflowing text) differ from their frames.
- The layout changes; the look doesn't. If a deck slide is 4 phones in a row, the mobile version is the same 4 phones as a 2×2 grid with the same title and caption — not a new card design.
- Keep text legible: body ≥ 15px, labels ≥ 12px, side gutters 20. If rescaling a block would push its text below that, re-flow its text instead (clone texts individually into a vertical stack).
- If the deck's fonts aren't available to the plugin (licensed local fonts), say which stand-ins you used so the person can swap them back on their machine; the code build uses the real fonts or the agreed web equivalent.
- **For each slide whose layout doesn't stack trivially, sketch 2–3 options** and pick one using the criteria in `references/layouts.md` (one idea per screen-height, phone mocks ≥ ~60% of width, no text over busy images, reading order top-to-bottom). That file lists the proven desktop→mobile transformations: side-by-side → stacked, annotated phone with callouts → phone + numbered list, card grids → stack or snap carousel, stat rows → 2-up grid, funnels → horizontal bars, before/after → stacked pair or slider.
- Mark every element with how it will be built (see Phase 4 table): name layers with a suffix like `[img]`, `[svg]`, `[code]` or note it in the frame. This removes guesswork during the build.
- `get_screenshot` the frames and show them. Iterate here — moving rectangles in Figma is far cheaper than rewriting CSS.

## Phase 4 — Build in code

### Decide how each element is built

| What it is | Build it as | Why |
|---|---|---|
| Headings, body copy, labels, quotes, lists, numbers | **Live HTML text** | Reflows to any width, stays sharp, selectable, accessible, searchable. Never bake reading text into an image. |
| Simple data visuals: stat cards, progress/funnel bars, step numbers, timelines, simple charts | **Code (HTML/CSS, or inline SVG drawn by hand)** | Few shapes, needs to be legible and can animate. |
| App/UI screens you designed (phone mockups, desktop screenshots), photos, 3D renders, textured or illustrative backgrounds | **Raster image (WebP, PNG fallback only if needed)** | They are pictures of designs; recoding them is wasted effort and less faithful. Export at 2× the displayed size. |
| Flat vector art: icons, logos, line illustrations, diagrams, decorative shapes | **SVG export** | Small, crisp at any size, can be recoloured. Outlined text is fine for logos/wordmarks only. |
| Motion: prototype recordings, animated covers | **Video (H.264 MP4)** cropped to the phone screen, with a poster frame | Smaller than GIF, plays inline. |

Edge cases and how to decide them are in `references/assets.md`. The big two:
- A Figma SVG export of a mockup is *not* better than a PNG: phone screens are full of raster photos, so the SVG just wraps base64 images (we've seen a single slide hit 98 MB). Use SVG only where the content is genuinely vector.
- The Figma MCP's SVG export always outlines text. If you need an SVG with live `<text>`, use the REST images endpoint with `svg_outline_text=false` (needs a personal access token the person provides — never commit it), and remember an SVG loaded via `<img>` can't use the page's web fonts; inline it instead.

### Get the assets

Preferred: export the specific Figma node (the phone frame itself, not the slide region) as PNG at 2–3× via `download_assets` or the REST images endpoint — this avoids picking up annotation lines, callout dots and neighbouring elements. Fallback: crop from existing high-res slide exports with `scripts/crop_assets.py` (takes boxes in thumbnail or slide coordinates, writes resized WebP). Check every crop visually; dotted callout lines creeping into the edges are the common miss.

Mockups with a **blank screen** in the deck usually had a video or prototype composited over them on desktop. Find that video and overlay it in the mobile version too (position it in % of the image so it scales). Ask if you can't find it.

### Implement

`references/code-build.md` has the full pattern and the gotchas we hit. In short:
- Same URL, one page: keep the desktop deck and add a sibling `<article class="cs-mobile">`. Below 720px hide the deck and show the article; above, the reverse. `assets/case-study-mobile.css` is a working stylesheet to start from (it is the one used on the live Hotel Cross Sell page) — copy it, then retheme the custom properties to the deck's colours/fonts.
- Videos: `autoplay muted loop playsinline` **plus** a `poster`, and a small script that retries `play()` on scroll/touch/visibility. Relying on script alone left videos frozen for people whose browser had an older cached script; iOS Low Power Mode also refuses autoplay until a touch.
- Bump `?v=N` on the stylesheet/script URLs whenever they change, so phones don't run stale cached copies against new HTML.
- Hidden desktop images still download unless they're lazy; keep mobile assets small (WebP, a few hundred KB total per section).

### Preview, then ship on approval

Run `scripts/phone_preview.cjs` (Playwright, 390×844, touch, 2× DPR): it saves phone-framed screenshots of every screen-height of the page, plus a scroll-through recording, and reports horizontal overflow and whether each `<video>` is actually playing. Also load the page at 1440px and confirm the desktop deck is untouched. Send the screenshots and recording to the person — they generally can't see branch changes on their live site, so screenshots are how they review.

Only after they say ship: commit, open a PR, merge (respect the repo's branch/PR conventions), then tell them it may take a minute or two to appear and to reopen the tab.

---

## Repeating for more case studies

When a site has several case studies, build the first one fully, then reuse its stylesheet and patterns for the rest — the editing and layout judgement still has to be done fresh per deck, but the CSS components (hero, stat grid, insight list, step cards, learnings) carry over. Keep component class names generic (`cs-m-*`) rather than case-study-specific.

## Reference files

- `references/figma-reading.md` — parsing big metadata, extracting slide copy, screenshots, exporting nodes, REST API notes.
- `references/editorial.md` — how to choose what stays: insights, screens, process, copy rewriting; worked example.
- `references/layouts.md` — desktop→mobile layout transformations and how to choose between options.
- `references/assets.md` — image vs SVG vs code, export settings, cropping, video handling, sizes.
- `references/code-build.md` — the HTML/CSS/JS pattern, video autoplay, caching, verification checklist.
- `scripts/crop_assets.py` — crop and resize regions from slide exports into WebP.
- `scripts/phone_preview.cjs` — phone-viewport screenshots, scroll recording, overflow and video checks.
- `assets/case-study-mobile.css` — the starting stylesheet.
