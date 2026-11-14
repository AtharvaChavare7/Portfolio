# Desktop → mobile layouts

A 1920×1080 slide is landscape and wide; a phone is a narrow column read top to bottom. Most slides can't keep their arrangement — they need a different one that keeps the same visual language.

## Choosing between options

For any slide that doesn't simply stack, mock 2–3 options in Figma and pick using these, roughly in priority order:

1. **Legible without zooming** — body ≥ 15px, labels ≥ 11px, screenshots large enough that the UI detail you're pointing at can be seen. A phone mockup under ~55% of the screen width usually fails this.
2. **One idea per screen-height** (~700px of a 390×844 viewport). If a reader has to hold a callout in mind while scrolling to find the thing it points at, the layout is wrong.
3. **Reading order is the story order** — claim, then evidence, then visual (or visual then caption), never zig-zag.
4. **Faithful to the deck's look** — same colours, type, card style, imagery. A reader who has seen the desktop version should recognise it.
5. **Least effort that meets the above** — a single well-cropped image + live text beats a re-coded diagram.

## Transformations that work

| Desktop pattern | Mobile layout |
|---|---|
| Text left, image right (or reverse) | Stack: kicker → heading → body → image full-bleed within a card |
| Big title slide with meta row (role, team, tools…) | Centered hero; meta as a 2×2 grid of label/value pairs |
| Phone mockup in the centre with 4 annotation callouts around it | Phone image (callouts cropped out) + 1–2 sentences that distil the callouts, or a numbered list of at most 3 points |
| Grid of 3–9 insight cards | Vertical list of the 2–3 kept insights; each a row of *big number / short sentence* |
| Row of 3–5 cards (steps, principles) | Vertical stack of cards; or a horizontal scroll-snap carousel if the items are parallel and the person likes carousels (stacks are safer: they don't hide content) |
| Row of stats | 2-up grid of stat cards; 3 stats → 1 + 2 or 3 stacked |
| Funnel / progress bar / comparison bar | Horizontal bars in CSS, one per stage, label under each; animate width on reveal |
| Before/after pair | Stacked with "Before"/"After" labels, or a single image with both if it reads at width; a drag slider is fine on desktop but fiddly on touch |
| Three phones in a row (a flow) | One card per step if each matters; otherwise keep the row as one image and explain in text |
| Full-bleed coloured section with content | Keep the colour band; content stacks inside it with 20px gutters |
| Quote / HMW statement | Coloured card with large (19–22px) semibold text |
| Process diagram with arrows | Vertical numbered list; arrows become step numbers |
| Table | Cards per row, or a 2-column definition list |

## Spacing and type (logical px at 390 wide)

- Side gutters 20; section vertical padding 48–64; gap between cards 12–20.
- Display 40–52 (tight tracking, -0.03em), H2 26–30 (-0.025em), card H3 18–20, body 15–17 with 1.4–1.5 line height, kicker/labels 11–13 uppercase with 0.12–0.16em tracking.
- Corner radius and shadows: reuse the deck's. If the deck has none defined, 16–20px radius and soft, low-opacity layered shadows.
- Full-bleed images inside cards: let the image run edge-to-edge of the card (negative margins) so screenshots get the maximum width.

## Motion

Subtle fade-up on scroll (opacity + ~18px translate, ~0.7s, ease-out) and bars that grow on reveal are enough. Respect `prefers-reduced-motion`. Only arm reveal styles from JavaScript, so a script failure never leaves content invisible.
