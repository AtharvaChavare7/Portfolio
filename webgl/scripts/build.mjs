import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/src", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("figma-export.html", "dist/figma-export.html");
await cp("AIWork.html", "dist/AIWork.html");
await cp("src/main.js", "dist/src/main.js");
await cp("src/styles.css", "dist/src/styles.css");
await cp("assets", "dist/assets", { recursive: true });

console.log("Built static site in dist/");
