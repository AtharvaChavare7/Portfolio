#!/usr/bin/env node
/*
  Phone preview of a page: screen-by-screen screenshots in phone frames,
  a scroll-through recording, and quick health checks.

  Usage: node phone_preview.cjs <url> <out-dir> [width=390] [height=844]

  Writes to <out-dir>:
    screen-NN.png        one screenshot per screen-height while scrolling
    phones-N.png         screenshots composed 4-up inside phone frames (send these to the person)
    scroll.webm          recording of the scroll (convert with ffmpeg to mp4 if needed)
  Prints: page width vs viewport (horizontal overflow), every <video>'s
  playing state, and whether the desktop layout is hidden at mobile width.

  Needs Playwright (require('playwright') or a global install). Composing the
  phone sheets uses Python + Pillow if available; otherwise only raw screens are written.
*/
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function loadPlaywright() {
  const candidates = ["playwright", "/opt/node22/lib/node_modules/playwright"];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try next */ }
  }
  throw new Error("Playwright not found");
}

(async () => {
  const [url, outDir, w = "390", h = "844"] = process.argv.slice(2);
  if (!url || !outDir) {
    console.error("Usage: node phone_preview.cjs <url> <out-dir> [width] [height]");
    process.exit(1);
  }
  const width = Number(w), height = Number(h);
  fs.mkdirSync(outDir, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    recordVideo: { dir: path.join(outDir, "video-tmp"), size: { width, height } },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const shots = [];
  for (let y = 0, i = 0; ; y += height - 84, i++) {
    const top = Math.min(y, total - height);
    await page.evaluate((t) => window.scrollTo({ top: t, behavior: "smooth" }), top);
    await page.waitForTimeout(1400);
    const file = path.join(outDir, `screen-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
    if (top >= total - height) break;
  }

  const report = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    videos: [...document.querySelectorAll("video")].map((v) => ({
      where: v.className || (v.parentElement && v.parentElement.className) || "video",
      visible: !!(v.offsetWidth || v.offsetHeight),
      paused: v.paused,
      time: Number(v.currentTime.toFixed(2)),
      ready: v.readyState,
    })),
    hiddenReveals: [...document.querySelectorAll("[data-cs-m-reveal]")]
      .filter((el) => el.offsetParent && getComputedStyle(el).opacity === "0").length,
  }));
  console.log(`viewport ${width}px, page scrollWidth ${report.scrollWidth}px` +
    (report.scrollWidth > width ? "  <-- HORIZONTAL OVERFLOW" : "  (ok)"));
  console.log(`reveal sections still hidden after scrolling: ${report.hiddenReveals}`);
  for (const v of report.videos) console.log("video", JSON.stringify(v));

  await context.close();
  const vids = fs.readdirSync(path.join(outDir, "video-tmp"));
  if (vids.length) fs.renameSync(path.join(outDir, "video-tmp", vids[0]), path.join(outDir, "scroll.webm"));
  fs.rmSync(path.join(outDir, "video-tmp"), { recursive: true, force: true });
  await browser.close();

  const py = `
import sys
from PIL import Image, ImageDraw
files = sys.argv[2:]; out = sys.argv[1]
W, H = ${width}, ${height}
def frame(f):
    im = Image.open(f).convert("RGB").resize((W, H))
    fr = Image.new("RGBA", (W + 24, H + 24), (0, 0, 0, 0)); d = ImageDraw.Draw(fr)
    d.rounded_rectangle((0, 0, W + 23, H + 23), 56, fill=(18, 18, 20))
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), 46, fill=255)
    fr.paste(im, (12, 12), m); return fr
for k in range(0, len(files), 4):
    grp = files[k:k + 4]
    c = Image.new("RGB", (4 * (W + 24) + 5 * 40, H + 24 + 80), (238, 240, 245))
    for i, f in enumerate(grp):
        fr = frame(f); c.paste(fr, (40 + i * (W + 64), 40), fr)
    c.save(f"{out}/phones-{k // 4 + 1}.png")
`;
  try {
    execFileSync("python3", ["-c", py, outDir, ...shots], { stdio: "inherit" });
    console.log(`phone sheets written to ${outDir}/phones-*.png`);
  } catch (e) {
    console.log("Pillow not available; raw screens only.");
  }
})();
