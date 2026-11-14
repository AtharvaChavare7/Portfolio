# Reading a Figma deck

## Setup

- URL `figma.com/design/<fileKey>/<name>?node-id=59-10865` → `fileKey`, `nodeId = "59:10865"` (dash → colon). Branch URLs: use the branch key as fileKey.
- Call `create_session` with the fileKey and a short task description before any other file tool, and pass its id as `sessionId` afterwards.
- The node in the link is usually a big parent frame holding all slides stacked vertically, each slide a child frame ~1920 wide.

## Extracting every slide's copy

`get_metadata` on the parent usually exceeds the tool result limit and is saved to a file. It's a JSON array of `{type, text}`; one entry's text is the XML tree (`<frame id=… name=… x= y= width= height=>` with `<text>`, `<rectangle>`, `<vector>`… children). Text nodes' `name` is their content (truncated for long paragraphs).

```bash
F=<saved tool-result path>
python3 - "$F" <<'PY'
import json, sys, xml.etree.ElementTree as ET
items = json.load(open(sys.argv[1]))
xml = next(i["text"] for i in items if i.get("text","").lstrip().startswith("<"))
root = ET.fromstring(xml)
for slide in root:
    print("=====", slide.get("id"), slide.get("name"), slide.get("width"), "x", slide.get("height"))
    seen = set()
    for t in slide.iter("text"):
        n = (t.get("name") or "").strip().replace("\n", " ")
        if len(n) > 2 and n not in seen:
            seen.add(n); print("  -", n[:200])
PY
```

Expect noise: UI text from inside phone mockups ("9:41", "Button Label", hotel names). The slide's own copy is usually the larger, sentence-like strings plus the eyebrow/kicker in caps. Long paragraphs are truncated in names — when you need the full text, use `get_design_context` on that text node or read it off a screenshot.

To find exportable nodes (phones, illustrations), walk with absolute offsets and filter by size/name:

```python
def walk(n, d, ox, oy):
    x = ox + float(n.get("x", 0)); y = oy + float(n.get("y", 0))
    w = float(n.get("width", 0)); h = float(n.get("height", 0))
    if d and 150 <= w < 900 and h >= 250:
        print("  " * d, n.tag, n.get("id"), n.get("name"), round(x), round(y), round(w), round(h))
    for c in n: walk(c, d + 1, x, y)
```

## Seeing the slides

- `get_screenshot` on each slide node gives an image you can view directly.
- If the website already has slide exports (e.g. `assets/case-study-<slug>/slide-NN.png`, often 4× = 7680 wide), make 1200px-wide thumbnails and stack them into one or two contact sheets to see the whole deck at once. Overlay a 100px labelled grid when you need crop coordinates (thumbnail coords × 6.4 = 4× slide pixels for a 7680-wide export).

## Exporting nodes

- `download_assets` for PNG/SVG of specific node ids. Its SVG output outlines text.
- REST: `GET https://api.figma.com/v1/images/<fileKey>?ids=<id1>,<id2>&format=png&scale=3` (or `format=svg&svg_outline_text=false`) with header `X-Figma-Token: <token>`. Returns S3 URLs to download. Needs `api.figma.com` and the S3 host allowed in the environment's network settings and a token the person supplies — don't commit it.

## Writing mobile frames

Load the `figma-use` skill (and `figma-generate-design` for visible changes) before `use_figma`. Use `search_design_system` and `get_variable_defs` to reuse the deck's colour/text styles and components; decks often have none, in which case read fonts and colours straight off the deck's text nodes (`getStyledTextSegments(['fontName','fontSize','fills'])`, tallied by character count) and the brand colour off the wordmark.

Place one wrapper (horizontal auto-layout, 80 gap) to the right of the deck (x = deck right edge + 400, same y) holding one 390-wide vertical auto-layout frame per section, named `01 Hero`, `02 The problem`… Check nothing else on the page occupies that space first.

Things that bit us:
- **The deck's fonts may not load in the plugin runtime.** Licensed desktop fonts installed on the designer's machine (Gilroy, GT Super trial…) fail `loadFontAsync`. You can still `clone()` and `rescale()` nodes that use them (they render correctly), but you can't change their text, size or wrapping. For text that must re-wrap, swap just those families for the closest available ones (GT Super → Fraunces Bold, Gilroy → Urbanist) and tell the person which stand-ins you used.
- **Swapping fonts on a clone keeps its styling.** `setRangeFontName` per styled segment preserves per-range colours (e.g. red highlight words), line height and letter spacing. First `loadFontAsync` every font already in the node (e.g. a Poppins range mixed into a GT Super headline) or the call throws "unloaded font".

```js
const SUB = {'Gilroy':'Urbanist','GT Super Ds Trial':'Fraunces'};
const STY = s => ({'Semibold':'SemiBold','Bd':'Bold','Bold':'Bold','Medium':'Medium','Regular':'Regular'}[s] || 'Medium');
async function swapFonts(t) {
  const segs = t.getStyledTextSegments(['fontName']);
  for (const s of segs) if (!SUB[s.fontName.family]) await figma.loadFontAsync(s.fontName);
  for (const s of segs) {
    const f0 = s.fontName; if (!SUB[f0.family]) continue;
    const f = {family: SUB[f0.family], style: f0.family.startsWith('GT') ? 'Bold' : STY(f0.style)};
    await figma.loadFontAsync(f); t.setRangeFontName(s.start, s.end, f);
  }
}
// re-flowing deck text into a mobile column
const t = (await figma.getNodeByIdAsync(id)).clone(); await swapFonts(t);
t.fontSize = 28;                      // only for headlines; keep body at its deck size if it's already 15-17px
column.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL';
```
- **Visual blocks: clone + `rescale`.** Mockups, illustrations, cards, step markers and pills keep their exact look this way. Don't swap fonts inside phone mockups (they use SF Pro etc., which may not load, and don't need re-wrapping).
- **Export the innermost phone node when a mockup frame carries callouts.** Deck "MOCKUP" frames often also contain callout dots/lines and shadow wrappers. Walk 2 levels in and clone the node that is just the phone; put the deck's callout pills underneath as a wrapped row instead.
- **Use auto-layout sections, not manual y-positions.** Clones' visual bounds (shadows, overflowing text) differ from their frames, so hand-stacking overlaps. Decorations go in as `layoutPositioning = 'ABSOLUTE'` children inserted at index 0, placed in corners or behind phones, never under text.
- Name sections `01 Hero`, `02 The problem`… and keep the deck's layer names on clones, so the person can trace every element back to its slide.

Take one screenshot of the wrapper after building (`get_screenshot` with `maxDimension: 3000`, then download and crop to inspect sections), fix specific problems, screenshot once more, then show the person.
