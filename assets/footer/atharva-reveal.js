(function initAtharvaNameReveal() {
  const footer = document.querySelector(".name-footer");
  const stage = footer?.querySelector(".name-footer__stage");
  const media = footer?.querySelector(".name-footer__media");
  const video = footer?.querySelector(".name-footer__video");
  const canvas = footer?.querySelector(".name-footer__canvas");
  const cursor = footer?.querySelector(".name-footer__cursor");
  const fallback = footer?.querySelector(".name-footer__fallback");
  const themeButtons = document.querySelectorAll("[data-name-reveal-theme]");
  const copyEmailButton = document.querySelector("[data-copy-email]");

  if (!footer || !stage || !media || !video || !canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const spots = [];
  const TEXT = "ATHARVA";
  const FIGMA = {
    frameWidth: 1919.404,
    frameHeight: 835.296,
    textSize: 466.89,
    textCenterY: 647.578,
    letterSpacing: -13.1642,
  };
  const BRUSH_RADIUS = 72;
  const SPOT_LIFE_MS = 3200;
  const MIN_SPOT_GAP = 6;
  const MAX_SPOTS = 420;
  const STROKE_BREAK_MS = 140;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let fontSize = 120;
  let letterSpacing = -3;
  let textY = 0;
  let rafId = 0;
  let lastSpotX = -9999;
  let lastSpotY = -9999;
  let lastMoveAt = 0;
  let strokeId = 0;
  let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let fontsReady = false;

  function computeLayout() {
    const rect = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    fontSize = Math.max(64, width * (FIGMA.textSize / FIGMA.frameWidth));
    letterSpacing = FIGMA.letterSpacing * (fontSize / FIGMA.textSize);
    textY = height * (FIGMA.textCenterY / FIGMA.frameHeight);
  }

  function paintText(targetCtx) {
    targetCtx.font = `800 ${fontSize}px "Bricolage Grotesque", system-ui, sans-serif`;
    targetCtx.textAlign = "left";
    targetCtx.textBaseline = "middle";

    if ("letterSpacing" in targetCtx) {
      targetCtx.textAlign = "center";
      targetCtx.letterSpacing = `${letterSpacing}px`;
      targetCtx.fillText(TEXT, width / 2, textY);
      return;
    }

    const chars = TEXT.split("");
    const widths = chars.map((char) => targetCtx.measureText(char).width);
    const totalWidth =
      widths.reduce((sum, value) => sum + value, 0) + letterSpacing * (chars.length - 1);
    let x = width / 2 - totalWidth / 2;

    chars.forEach((char, index) => {
      targetCtx.fillText(char, x, textY);
      x += widths[index] + (index < chars.length - 1 ? letterSpacing : 0);
    });
  }

  function punchReveal(stroke, now) {
    if (!stroke.length) {
      return;
    }

    const lastIndex = stroke.length - 1;
    const edges = [];
    let previousNormal = { x: 0, y: -1 };

    stroke.forEach((spot, index) => {
      const previous = stroke[Math.max(0, index - 1)];
      const next = stroke[Math.min(lastIndex, index + 1)];
      const deltaX = next.x - previous.x;
      const deltaY = next.y - previous.y;
      const length = Math.hypot(deltaX, deltaY);
      const normal =
        length > 0.01
          ? { x: -deltaY / length, y: deltaX / length }
          : previousNormal;
      previousNormal = normal;

      const progress = (now - spot.born) / SPOT_LIFE_MS;
      const startTaper = Math.min(1, index / 10);
      const endTaper = Math.min(1, (lastIndex - index) / 10);
      const tipTaper = Math.max(0.08, Math.min(startTaper, endTaper));
      const closingScale = Math.pow(1 - progress, 0.68);
      const radius = BRUSH_RADIUS * tipTaper * closingScale;

      edges.push({
        left: { x: spot.x + normal.x * radius, y: spot.y + normal.y * radius },
        right: { x: spot.x - normal.x * radius, y: spot.y - normal.y * radius },
      });
    });

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(edges[0].left.x, edges[0].left.y);

    for (let index = 1; index < edges.length - 1; index += 1) {
      const midpoint = {
        x: (edges[index].left.x + edges[index + 1].left.x) / 2,
        y: (edges[index].left.y + edges[index + 1].left.y) / 2,
      };
      ctx.quadraticCurveTo(edges[index].left.x, edges[index].left.y, midpoint.x, midpoint.y);
    }

    ctx.lineTo(edges[lastIndex].left.x, edges[lastIndex].left.y);
    ctx.lineTo(edges[lastIndex].right.x, edges[lastIndex].right.y);

    for (let index = lastIndex - 1; index > 0; index -= 1) {
      const midpoint = {
        x: (edges[index].right.x + edges[index - 1].right.x) / 2,
        y: (edges[index].right.y + edges[index - 1].right.y) / 2,
      };
      ctx.quadraticCurveTo(edges[index].right.x, edges[index].right.y, midpoint.x, midpoint.y);
    }

    ctx.lineTo(edges[0].right.x, edges[0].right.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawForeground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const isInverted = footer.classList.contains("name-footer--inverted");
    ctx.fillStyle = isInverted ? "#fdfdfd" : "#010101";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = isInverted ? "#010101" : "#fdfdfd";
    paintText(ctx);
  }

  function drawTrails(now) {
    while (spots.length && now - spots[0].born > SPOT_LIFE_MS) {
      spots.shift();
    }

    let strokeStart = 0;
    for (let index = 1; index <= spots.length; index += 1) {
      if (index === spots.length || spots[index].strokeId !== spots[strokeStart].strokeId) {
        punchReveal(spots.slice(strokeStart, index), now);
        strokeStart = index;
      }
    }
  }

  function renderFrame(now) {
    if (!fontsReady) {
      rafId = requestAnimationFrame(renderFrame);
      return;
    }

    drawForeground();

    if (!reduceMotion) {
      drawTrails(now);
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  function addSpot(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return;
    }

    if (Math.hypot(x - lastSpotX, y - lastSpotY) < MIN_SPOT_GAP) {
      return;
    }

    const now = performance.now();
    if (now - lastMoveAt > STROKE_BREAK_MS) {
      strokeId += 1;
    }

    lastSpotX = x;
    lastSpotY = y;
    lastMoveAt = now;
    spots.push({ x, y, born: now, strokeId });

    if (spots.length > MAX_SPOTS) {
      spots.splice(0, spots.length - MAX_SPOTS);
    }
  }

  function moveCursor(clientX, clientY) {
    if (!cursor) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    cursor.classList.add("is-active");
  }

  function onPointerMove(event) {
    if (reduceMotion) {
      return;
    }

    stage.classList.remove("is-idle");
    addSpot(event.clientX, event.clientY);
    moveCursor(event.clientX, event.clientY);
  }

  function onPointerLeave() {
    stage.classList.add("is-idle");
    cursor?.classList.remove("is-active");
    lastSpotX = -9999;
    lastSpotY = -9999;
    lastMoveAt = 0;
  }

  function showFallback(message) {
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = message;
    }
  }

  video.addEventListener("error", () => {
    showFallback("Video failed to load. Check assets/footer/firefly.mp4.");
  });

  video.addEventListener("loadeddata", () => {
    if (fallback) {
      fallback.hidden = true;
    }

    video.play().catch(() => {
      showFallback("Tap or click the footer to start the texture video.");
    });
  });

  stage.addEventListener("pointerdown", () => {
    if (video.paused) {
      video.play().catch(() => {});
    }
  });

  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerleave", onPointerLeave);

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isInverted = button.dataset.nameRevealTheme === "inverted";
      footer.classList.toggle("name-footer--inverted", isInverted);
      spots.length = 0;
      themeButtons.forEach((candidate) => {
        const selected = candidate === button;
        candidate.classList.toggle("is-selected", selected);
        candidate.setAttribute("aria-pressed", String(selected));
      });
    });
  });

  if (copyEmailButton) {
    let resetCopyStateTimer;

    copyEmailButton.addEventListener("click", async () => {
      const email = copyEmailButton.dataset.copyEmail;

      if (!email) {
        return;
      }

      try {
        await navigator.clipboard.writeText(email);
        window.clearTimeout(resetCopyStateTimer);
        copyEmailButton.classList.add("is-copied");
        copyEmailButton.setAttribute("aria-label", "Email copied");

        resetCopyStateTimer = window.setTimeout(() => {
          copyEmailButton.classList.remove("is-copied");
          copyEmailButton.setAttribute("aria-label", "Copy Email ID");
        }, 2200);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  }

  window.addEventListener("resize", computeLayout);

  document.fonts.ready.then(() => {
    fontsReady = true;
    computeLayout();
    media.classList.add("is-ready");
  });

  computeLayout();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(renderFrame);
})();

(function initFolderBurst() {
  const folderWrap = document.querySelector(".footer-panel__folder-wrap");

  if (!folderWrap) {
    return;
  }

  folderWrap.addEventListener("click", () => {
    folderWrap.classList.toggle("is-open");
  });

  document.addEventListener("click", (event) => {
    if (!folderWrap.contains(event.target)) {
      folderWrap.classList.remove("is-open");
    }
  });
})();
