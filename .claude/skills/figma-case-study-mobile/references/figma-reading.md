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
- **The deck's fonts may not load in the plugin runtime.** Licensed desktop fonts installed on the designer's machine (Gilroy, GT Super trial…) fail `loadFontAsync`. Test each one first; if it fails, pick the closest available stand-in from `listAvailableFontsAsync()` (GT Super → Fraunces Bold, Gilroy → Urbanist), and tell the person which stand-ins you used so they can swap them back locally.
- **Mockups: export, don't rescale clones.** Cloning a phone and calling `rescale()` touches text in fonts that may not be loadable. Instead `exportAsync({format:'PNG', constraint:{type:'SCALE', value:2}})` the node, `figma.createImage(bytes)`, and use the hash as an `IMAGE` fill (`scaleMode: 'FIT'`) on a rectangle sized to the slot. This matches how it will be built in code ([img]).
- **Export the innermost phone node.** Deck "MOCKUP" frames usually also contain callout dots and lines, and shadow wrappers add transparent margin that makes the phone render tiny. Walk 2 levels into the mockup and export the node that is just the phone/screen; if that loses the bezel, add `cornerRadius` + a dark `OUTSIDE` stroke to the rectangle.
- Name every element with its build method (`Cover phone [img]`, `Wordmark [svg]`, `Timeline [code]`) so phase 4 is mechanical.

Take one screenshot of the wrapper after building (`get_screenshot` with `maxDimension: 3000`, then download and crop to inspect sections), fix specific problems, screenshot once more, then show the person.
