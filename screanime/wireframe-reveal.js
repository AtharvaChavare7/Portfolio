const FRAME_VIEWBOX = { width: 397, height: 856 };

const HIFI_ALIGN_X = -0.25;
const HIFI_ALIGN_Y = -3.35;

const FOCUS = {
  originX: "50%",
  originY: "92.5%",
  liftY: -220,
  scale: 1.55,
  liftDuration: 0.8,
  zoomDuration: 1.15,
  zoomOutDuration: 1.05,
};

const PHASE_LABELS = {
  draw: "Drawing wireframe",
  zoomIn: "Zooming in",
  reveal: "Revealing hi-fi",
  zoomOut: "Zooming out",
  hold: "Hold",
};

const root = document.querySelector("[data-ui-reveal]");

if (root) {
  const ASSET_BASE = root.dataset.assetBase || "";
  const WIREFRAME_URL = `${ASSET_BASE}wireframe1.svg`;

  const host = root.querySelector("[data-wireframe-host]");
  const strokeLayer = root.querySelector("[data-stroke-layer]");
  const hifi = root.querySelector(".ui-reveal__hifi");
  const viewport = root.querySelector(".ui-reveal__viewport");
  const phaseLabel = root.querySelector("[data-phase-label]");
  const replayBtn = root.querySelector("[data-replay]");
  const loopToggle = root.querySelector("[data-loop]");

  let timeline = null;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function shouldLoop() {
    return loopToggle?.checked || root.hasAttribute("data-loop");
  }

function setPhase(key) {
  if (phaseLabel && PHASE_LABELS[key]) {
    phaseLabel.textContent = PHASE_LABELS[key];
  }
}

function getElementArea(element) {
  if (typeof element.getBBox !== "function") {
    return 0;
  }

  try {
    const box = element.getBBox();
    return Math.max(0, box.width * box.height);
  } catch {
    return 0;
  }
}

function isRecentsCardShellPath(element) {
  if (element.tagName.toLowerCase() !== "path") {
    return false;
  }

  const d = element.getAttribute("d") || "";
  return d.startsWith("M22 591.968") || d.startsWith("M22 746.257");
}

function isTextLikePath(element) {
  if (element.tagName.toLowerCase() !== "path") {
    return false;
  }

  if (isRecentsCardShellPath(element)) {
    return false;
  }

  const area = getElementArea(element);
  const d = element.getAttribute("d") || "";

  return area < 900 || d.length > 400;
}

function measureStrokeLength(node) {
  if (typeof node.getTotalLength !== "function") {
    return 0;
  }

  try {
    return node.getTotalLength();
  } catch {
    return 0;
  }
}

const COLUMN_GRID = { width: 74, height: 861 };

function parseTranslate(element) {
  const transform = element.getAttribute("transform") || "";
  const match = transform.match(/translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/);

  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2] || "0"),
    };
  }

  return {
    x: parseFloat(element.getAttribute("x") || "0"),
    y: parseFloat(element.getAttribute("y") || "0"),
  };
}

function isColumnGridRect(element) {
  if (element.tagName.toLowerCase() !== "rect") {
    return false;
  }

  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");

  return (
    Math.abs(width - COLUMN_GRID.width) < 0.1 &&
    Math.abs(height - COLUMN_GRID.height) < 0.1
  );
}

function isLeftmostColumnGridRect(element) {
  return isColumnGridRect(element) && Math.abs(parseTranslate(element).x - 22) < 0.1;
}

function isRightmostColumnGridRect(element) {
  return isColumnGridRect(element) && Math.abs(parseTranslate(element).x - 304) < 0.1;
}

function isMarginGuideLine(element) {
  if (element.tagName.toLowerCase() !== "line") {
    return false;
  }

  const x1 = parseFloat(element.getAttribute("x1") || "0");
  return x1 <= 22 || x1 >= 376;
}

function isPhoneFrameRect(element) {
  if (element.tagName.toLowerCase() !== "rect") {
    return false;
  }

  const x = parseFloat(element.getAttribute("x") || "0");
  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");
  const rx = parseFloat(element.getAttribute("rx") || element.getAttribute("ry") || "0");

  return (
    Math.abs(x - 1) < 0.1 &&
    Math.abs(width - 395) < 0.1 &&
    Math.abs(height - 854) < 0.1 &&
    Math.abs(rx - 47) < 0.1
  );
}

function isInnerScreenRect(element) {
  if (element.tagName.toLowerCase() !== "rect") {
    return false;
  }

  const x = parseFloat(element.getAttribute("x") || "0");
  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");
  const rx = parseFloat(element.getAttribute("rx") || element.getAttribute("ry") || "0");

  // Inset screen fills — same silhouette as the outer frame, but fill only.
  return (
    Math.abs(x - 2) < 0.1 &&
    Math.abs(width - 393) < 0.1 &&
    Math.abs(height - 852) < 0.1 &&
    Math.abs(rx - 46) < 0.1
  );
}

function isTopCardIconSquare(element) {
  if (element.tagName.toLowerCase() !== "rect") {
    return false;
  }

  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");
  const rx = parseFloat(element.getAttribute("rx") || element.getAttribute("ry") || "0");

  return (
    Math.abs(width - 17.2195) < 0.1 &&
    Math.abs(height - 17.2195) < 0.1 &&
    Math.abs(rx - 8) < 0.1
  );
}

function clonePhoneFrameStroke(element) {
  const x = parseFloat(element.getAttribute("x") || "0");
  const y = parseFloat(element.getAttribute("y") || "0");
  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");
  const r = parseFloat(element.getAttribute("rx") || element.getAttribute("ry") || "0");

  const left = x;
  const top = y;
  const right = x + width;
  const bottom = y + height;

  // Full loop: bottom-left → up/left/top/right/down → bottom-right → bottom edge → bottom-left.
  const d = [
    `M ${left + r} ${bottom}`,
    `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `L ${left} ${top + r}`,
    `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
    `L ${right - r} ${top}`,
    `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `L ${left + r} ${bottom}`,
  ].join(" ");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("data-wf-stroke", "");
  path.setAttribute("data-wf-stroke-weight", "native");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(255,255,255,0.82)");

  return path;
}

function preparePhoneFrameElement(element) {
  element.setAttribute("data-wf-phone-frame", "");
  element.dataset.wfNativeStroke = element.getAttribute("stroke") || "white";
  element.dataset.wfNativeStrokeWidth = element.getAttribute("stroke-width") || "2";
  element.setAttribute("fill", "none");
  element.setAttribute("stroke", "none");
}

function hidePhoneFrameStrokes(svgRoot) {
  svgRoot?.querySelectorAll("[data-wf-phone-frame]").forEach((element) => {
    element.setAttribute("stroke", "none");
  });
}

function restorePhoneFrameStrokes(svgRoot) {
  svgRoot?.querySelectorAll("[data-wf-phone-frame]").forEach((element) => {
    element.setAttribute("stroke", element.dataset.wfNativeStroke || "white");
    element.setAttribute("stroke-width", element.dataset.wfNativeStrokeWidth || "2");
  });
}

function cloneOuterColumnGridStroke(element, side) {
  const { x, y } = parseTranslate(element);
  const w = COLUMN_GRID.width;
  const h = COLUMN_GRID.height;
  const d =
    side === "left"
      ? `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h}`
      : `M ${x + w} ${y} L ${x} ${y} L ${x} ${y + h} L ${x + w} ${y + h}`;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("data-wf-stroke", "");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(255,255,255,0.82)");
  path.setAttribute("stroke-width", "1.25");

  return path;
}

function cloneForStroke(element) {
  const tag = element.tagName.toLowerCase();
  if (!["rect", "path", "line", "ellipse", "circle", "polyline", "polygon"].includes(tag)) {
    return null;
  }

  const clone = element.cloneNode(true);
  clone.removeAttribute("id");
  clone.removeAttribute("fill");
  clone.removeAttribute("filter");
  clone.setAttribute("data-wf-stroke", "");
  clone.setAttribute("fill", "none");
  clone.setAttribute("stroke", "rgba(255,255,255,0.82)");
  clone.setAttribute("stroke-width", "1.25");

  if (isMarginGuideLine(element)) {
    clone.setAttribute("data-wf-stroke-weight", "native");
  }

  return clone;
}

function createStrokeClone(element) {
  if (isPhoneFrameRect(element)) {
    return clonePhoneFrameStroke(element);
  }

  if (isLeftmostColumnGridRect(element)) {
    return cloneOuterColumnGridStroke(element, "left");
  }

  if (isRightmostColumnGridRect(element)) {
    return cloneOuterColumnGridStroke(element, "right");
  }

  return cloneForStroke(element);
}

function shouldSkipStroke(element) {
  const tag = element.tagName.toLowerCase();

  if (tag === "path") {
    const d = element.getAttribute("d") || "";
    // Bottom recents/footer outer card — fill only
    return d.startsWith("M22 746.257");
  }

  if (tag !== "rect") {
    return false;
  }

  if (isInnerScreenRect(element)) {
    return true;
  }

  const x = parseFloat(element.getAttribute("x") || "0");
  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");

  // Recents card icon squares (Urgent Alert, etc.) — fill only, no stroke trace
  return (
    Math.abs(x - 37.6895) < 0.1 &&
    Math.abs(width - 62.7556) < 0.1 &&
    Math.abs(height - 62.7556) < 0.1
  );
}

function prepareWireframe(svgRoot) {
  svgRoot.setAttribute("width", "100%");
  svgRoot.setAttribute("height", "100%");
  svgRoot.setAttribute("preserveAspectRatio", "xMidYMin meet");

  const candidates = [...svgRoot.querySelectorAll("rect, path, line, ellipse, circle")].filter((el) => {
    const fill = el.getAttribute("fill") || "";
    if (fill === "none" || fill.startsWith("url(")) {
      return false;
    }

    if (el.closest("defs") || el.closest("clipPath") || el.closest("mask")) {
      return false;
    }

    return true;
  });

  const structure = [];
  const detail = [];

  candidates.forEach((element) => {
    const area = getElementArea(element);
    const tag = element.tagName.toLowerCase();

    element.setAttribute("data-wf-fill", "");

    if (isPhoneFrameRect(element)) {
      preparePhoneFrameElement(element);
    }

    if (tag === "rect" && (area >= 500 || isTopCardIconSquare(element))) {
      structure.push(element);
      return;
    }

    if (tag === "path" && area >= 1800 && !isTextLikePath(element)) {
      structure.push(element);
      return;
    }

    if (tag === "line" || tag === "ellipse" || tag === "circle") {
      structure.push(element);
      return;
    }

    detail.push(element);
  });

  structure.sort((a, b) => {
    const ay = getElementArea(a) ? a.getBBox().y : 0;
    const by = getElementArea(b) ? b.getBBox().y : 0;
    return ay - by || getElementArea(b) - getElementArea(a);
  });

  const strokeNodes = [];

  structure.forEach((element) => {
    if (shouldSkipStroke(element)) {
      return;
    }

    const strokeClone = createStrokeClone(element);
    if (!strokeClone) {
      return;
    }

    strokeLayer.appendChild(strokeClone);

    const length = measureStrokeLength(strokeClone);
    if (length > 0) {
      strokeClone.style.strokeDasharray = `${length} ${length}`;
      strokeClone.style.strokeDashoffset = `${length}`;
      strokeNodes.push({ node: strokeClone, length });
    }
  });

  return { strokeNodes, fillStructure: structure, fillDetail: detail };
}

function importWireframeSvg(svgRoot) {
  const inlineSvg = document.importNode(svgRoot, true);
  host.innerHTML = "";
  host.appendChild(inlineSvg);
  return prepareWireframe(inlineSvg);
}

function loadWireframeFromObject(object) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      const doc = object.contentDocument;
      const svg = doc?.documentElement;

      if (!svg || svg.tagName.toLowerCase() !== "svg") {
        reject(new Error(`Could not read ${WIREFRAME_URL}`));
        return;
      }

      resolve(importWireframeSvg(svg));
    };

    if (object.contentDocument?.documentElement?.tagName?.toLowerCase() === "svg") {
      finish();
      return;
    }

    object.addEventListener("load", finish, { once: true });
    object.addEventListener(
      "error",
      () => {
        reject(new Error(`Failed to load ${WIREFRAME_URL}`));
      },
      { once: true }
    );
  });
}

async function loadWireframeViaFetch() {
  const response = await fetch(WIREFRAME_URL);
  if (!response.ok) {
    throw new Error(`Failed to load ${WIREFRAME_URL}`);
  }

  const markup = await response.text();
  host.innerHTML = markup;

  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("Wireframe SVG missing root element");
  }

  return prepareWireframe(svg);
}

async function loadWireframeFromInlineBundle() {
  if (typeof window.__WIREFRAME1_SVG__ !== "string") {
    return null;
  }

  host.innerHTML = window.__WIREFRAME1_SVG__;

  const svg = host.querySelector("svg");
  if (!svg) {
    throw new Error("Wireframe SVG missing root element");
  }

  return prepareWireframe(svg);
}

async function loadWireframe() {
  const inlineSvg = host.querySelector("svg");
  if (inlineSvg) {
    return prepareWireframe(inlineSvg);
  }

  const bundled = await loadWireframeFromInlineBundle();
  if (bundled) {
    return bundled;
  }

  const embeddedObject = host.querySelector("[data-wireframe-object]");

  if (embeddedObject) {
    try {
      return await loadWireframeFromObject(embeddedObject);
    } catch (objectError) {
      if (location.protocol === "file:") {
        throw objectError;
      }
    }
  }

  if (location.protocol === "file:") {
    throw new Error("Could not load wireframe1.svg from file://. Include screanime/wireframe1.inline.js before wireframe-reveal.js.");
  }

  return loadWireframeViaFetch();
}

function buildTimeline(layers) {
  const { strokeNodes, fillStructure, fillDetail } = layers;
  const svgRoot = host.querySelector("svg");

  if (timeline) {
    timeline.kill();
  }

  const strokeTargets = strokeNodes.map(({ node }) => node);
  const drawPhaseTotal = 2;
  const drawStagger = strokeNodes.length > 1 ? 0.048 : 0;
  const drawEach = Math.max(
    0.7,
    drawPhaseTotal - Math.max(0, strokeNodes.length - 1) * drawStagger
  );
  const drawPhaseEnd = drawEach + Math.max(0, strokeNodes.length - 1) * drawStagger;
  const fillStart = drawPhaseEnd + 0.2;
  const strokeFadeStart = fillStart + 0.55;
  const detailStart = fillStart + 0.35;
  const liftStart = strokeFadeStart + 0.55;
  const zoomStart = liftStart + FOCUS.liftDuration;
  const revealStart = zoomStart + FOCUS.zoomDuration * 0.82;
  const zoomOutStart = zoomStart + FOCUS.zoomDuration + 0.95;

  gsap.set(viewport, { scale: 1, x: 0, y: 0, transformOrigin: "50% 50%" });
  gsap.set(hifi, { opacity: 0, x: HIFI_ALIGN_X, y: HIFI_ALIGN_Y, filter: "brightness(1.08) saturate(1.05)" });
  gsap.set(host, { opacity: 1 });
  gsap.set(strokeTargets, {
    strokeDashoffset: (index) => strokeNodes[index].length,
    opacity: 1,
  });
  gsap.set(fillStructure, { opacity: 0, scale: 0.99 });
  gsap.set(fillDetail, { opacity: 0 });
  hidePhoneFrameStrokes(svgRoot);

  timeline = gsap.timeline({
    repeat: shouldLoop() ? -1 : 0,
    repeatDelay: 1.4,
    defaults: { ease: "power2.out" },
    onRepeat: () => {
      gsap.set(viewport, { transformOrigin: "50% 50%" });
      hidePhoneFrameStrokes(svgRoot);
      setPhase("draw");
    },
  });

  timeline
    .add(() => setPhase("draw"))
    .to(
      strokeTargets,
      {
        strokeDashoffset: 0,
        duration: drawEach,
        stagger: { each: drawStagger, from: "start" },
        ease: "none",
      },
      0
    )
    .to(
      fillStructure,
      {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        stagger: 0.028,
        ease: "power2.out",
      },
      fillStart
    )
    .to(
      fillDetail,
      {
        opacity: 1,
        duration: 0.5,
        stagger: { each: 0.007, from: "random" },
      },
      detailStart
    )
    .add(() => restorePhoneFrameStrokes(svgRoot), strokeFadeStart)
    .to(
      strokeTargets,
      {
        opacity: 0,
        duration: 0.45,
        ease: "power1.inOut",
      },
      strokeFadeStart
    )
    .add(() => setPhase("zoomIn"), liftStart)
    .to(
      viewport,
      {
        y: FOCUS.liftY,
        x: 0,
        duration: FOCUS.liftDuration,
        ease: "power2.inOut",
      },
      liftStart
    )
    .set(
      viewport,
      {
        transformOrigin: `${FOCUS.originX} ${FOCUS.originY}`,
      },
      zoomStart
    )
    .to(
      viewport,
      {
        scale: FOCUS.scale,
        y: FOCUS.liftY,
        x: 0,
        duration: FOCUS.zoomDuration,
        ease: "power3.inOut",
      },
      zoomStart
    )
    .add(() => setPhase("reveal"), revealStart)
    .to(
      host,
      {
        opacity: 0,
        duration: 0.65,
        ease: "power2.inOut",
      },
      revealStart
    )
    .to(
      hifi,
      {
        opacity: 1,
        x: HIFI_ALIGN_X,
        y: HIFI_ALIGN_Y,
        filter: "brightness(1) saturate(1)",
        duration: 0.95,
        ease: "power2.out",
      },
      revealStart + 0.05
    )
    .add(() => setPhase("zoomOut"), zoomOutStart)
    .to(
      viewport,
      {
        scale: 1,
        x: 0,
        y: 0,
        duration: FOCUS.zoomOutDuration,
        ease: "power2.inOut",
      },
      zoomOutStart
    )
    .set(
      viewport,
      {
        transformOrigin: "50% 50%",
      },
      zoomOutStart + FOCUS.zoomOutDuration
    )
    .add(() => setPhase("hold"), zoomOutStart + FOCUS.zoomOutDuration)
    .to({}, { duration: 0.8 }, zoomOutStart + FOCUS.zoomOutDuration);

  return timeline;
}

function replay() {
  if (reducedMotion || !timeline) {
    return;
  }

  timeline.restart(true, false);
  setPhase("draw");
}

function showLoadError(message) {
  console.error(message);
  root?.classList.add("ui-reveal--error");
  if (phaseLabel) {
    phaseLabel.textContent = message;
    phaseLabel.classList.add("ui-reveal__phase--error");
  }
}

function showStaticFallback() {
  if (hifi) {
    hifi.style.opacity = "1";
  }
}

async function init() {
  if (typeof gsap === "undefined") {
    showLoadError("GSAP did not load — check your internet connection");
    showStaticFallback();
    return;
  }

  if (reducedMotion) {
    hifi.style.opacity = "1";
    host.style.display = "none";
    strokeLayer.style.display = "none";
    return;
  }

  try {
    const layers = await loadWireframe();
    buildTimeline(layers);
  } catch (error) {
    showLoadError(error.message || "Could not load wireframe1.svg");
    showStaticFallback();
  }
}

  function isEmbed() {
    return root.classList.contains("ui-reveal--embed") || root.hasAttribute("data-defer-until-visible");
  }

  function getVisibilityTarget() {
    return document.getElementById("case-fiserv") || root.closest(".work-card__panel--fiserv-main") || root;
  }

  function isTargetVisible(target) {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    return rect.top < viewportHeight * 0.92 && rect.bottom > viewportHeight * 0.08;
  }

  function boot() {
    if (!isEmbed()) {
      init();
      return;
    }

    const observeTarget = getVisibilityTarget();
    let started = false;

    function launch() {
      if (started) {
        return;
      }

      started = true;
      init();
    }

    function checkVisible() {
      if (!started && isTargetVisible(observeTarget)) {
        launch();
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            launch();
          }
        });
      },
      { threshold: [0, 0.12, 0.25], rootMargin: "0px" }
    );

    observer.observe(observeTarget);
    window.addEventListener("scroll", checkVisible, { passive: true });
    window.addEventListener("resize", checkVisible);
    checkVisible();
  }

  replayBtn?.addEventListener("click", replay);

  if (!root.classList.contains("ui-reveal--embed")) {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space" && !event.target.closest("input, textarea, button")) {
        event.preventDefault();
        replay();
      }
    });
  }

  loopToggle?.addEventListener("change", () => {
    if (timeline) {
      timeline.repeat(shouldLoop() ? -1 : 0);
    }
  });

  boot();
}
