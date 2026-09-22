(() => {
  const root = document.documentElement;
  const wongdoodySection = document.getElementById("case-wongdoody");
  const fiservSection = document.getElementById("case-fiserv");
  const makemytripSection = document.getElementById("case-makemytrip");
  const modeOptions = [...document.querySelectorAll("[data-bg-mode-option]")];
  const animateOptions = [...document.querySelectorAll("[data-bg-animate-option]")];
  const hasLabControls = modeOptions.length > 0;

  if (!wongdoodySection) {
    return;
  }

  const modeNames = new Set([
    "section",
    "backdrop",
    "threshold",
    "snap",
    "masked",
    "content",
  ]);
  const animateNames = new Set([
    "fade",
    "rise",
    "wipe",
    "iris",
    "curtain",
    "dissolve",
  ]);

  let selectedMode = "threshold";
  let selectedAnimate = "iris";
  let ticking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeOutCubic(value) {
    return 1 - (1 - value) ** 3;
  }

  function getEntryReveal(rect, viewportHeight) {
    const start = viewportHeight * 0.94;
    const end = viewportHeight * 0.06;
    return easeOutCubic(clamp((start - rect.top) / (start - end), 0, 1));
  }

  function getThresholdReveal(rect, viewportHeight) {
    const start = viewportHeight * 0.94;
    const end = viewportHeight * 0.06;

    if (rect.top >= start) {
      return 0;
    }

    if (rect.top <= end) {
      return 1;
    }

    return easeOutCubic((start - rect.top) / (start - end));
  }

  function getMmtHoldback(rect, viewportHeight) {
    const start = viewportHeight * 0.94;
    const end = viewportHeight * 0.06;

    if (rect.bottom >= start) {
      return 1;
    }

    if (rect.bottom <= end) {
      return 0;
    }

    return easeOutCubic((rect.bottom - end) / (start - end));
  }

  function getExitReveal(rect, viewportHeight) {
    const start = viewportHeight * 0.94;
    const end = viewportHeight * 0.06;
    return easeOutCubic(clamp((start - rect.top) / (start - end), 0, 1));
  }

  function getSectionActive(rect, viewportHeight) {
    const centerY = rect.top + rect.height / 2;
    return centerY > viewportHeight * 0.22 && centerY < viewportHeight * 0.78;
  }

  function getMaskedReveal(rect, viewportHeight) {
    const visibleTop = clamp(rect.top, 0, viewportHeight);
    const visibleBottom = clamp(rect.bottom, 0, viewportHeight);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const ratio = visibleHeight / Math.min(rect.height, viewportHeight);
    return easeOutCubic(clamp(ratio * 1.35, 0, 1));
  }

  function computeReveal(mode, wongRect, fiservRect, mmtRect, viewportHeight) {
    const entryReveal =
      mode === "threshold" || mode === "backdrop" || mode === "snap"
        ? getThresholdReveal(wongRect, viewportHeight)
        : mode === "masked"
          ? getMaskedReveal(wongRect, viewportHeight)
          : getEntryReveal(wongRect, viewportHeight);

    const exitReveal =
      fiservRect && fiservRect.top < viewportHeight * 0.92
        ? getExitReveal(fiservRect, viewportHeight)
        : 0;

    const mmtHoldback =
      mmtRect && (mode === "threshold" || mode === "backdrop" || mode === "snap")
        ? getMmtHoldback(mmtRect, viewportHeight)
        : 0;

    if (mode === "content") {
      return 0;
    }

    if (mode === "snap") {
      return getSectionActive(wongRect, viewportHeight) && exitReveal < 0.42 && mmtHoldback < 0.42
        ? 1
        : 0;
    }

    if (mode === "backdrop") {
      const dominant = entryReveal > 0.58 ? easeOutCubic((entryReveal - 0.58) / 0.42) : 0;
      return dominant * (1 - exitReveal) * (1 - mmtHoldback);
    }

    return entryReveal * (1 - exitReveal) * (1 - mmtHoldback);
  }

  function updateSiteBackground() {
    ticking = false;

    const viewportHeight = window.innerHeight;
    const wongRect = wongdoodySection.getBoundingClientRect();
    const fiservRect = fiservSection?.getBoundingClientRect() ?? null;
    const mmtRect = makemytripSection?.getBoundingClientRect() ?? null;
    const reveal = computeReveal(selectedMode, wongRect, fiservRect, mmtRect, viewportHeight);
    const isDark =
      selectedMode === "content"
        ? getSectionActive(wongRect, viewportHeight)
        : reveal > 0.72;

    root.style.setProperty("--site-bg-reveal", reveal.toFixed(3));
    root.dataset.siteTone = isDark ? "dark" : "light";
    wongdoodySection.dataset.bgActive = reveal > 0.08 ? "true" : "false";
  }

  function queueSiteBackgroundUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateSiteBackground);
    }
  }

  function setActiveOption(options, value, dataKey) {
    options.forEach((option) => {
      const isActive = option.dataset[dataKey] === value;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });
  }

  function selectMode(mode) {
    if (!modeNames.has(mode)) {
      return;
    }

    selectedMode = mode;
    root.dataset.bgTransitionMode = mode;
    setActiveOption(modeOptions, mode, "bgModeOption");

    try {
      localStorage.setItem("site-bg-transition-mode", mode);
    } catch {
      // Keep the selection for this page view if storage is unavailable.
    }

    queueSiteBackgroundUpdate();
  }

  function selectAnimate(animation) {
    if (!animateNames.has(animation)) {
      return;
    }

    selectedAnimate = animation;
    root.dataset.bgTransitionAnimate = animation;
    setActiveOption(animateOptions, animation, "bgAnimateOption");

    try {
      localStorage.setItem("site-bg-transition-animate", animation);
    } catch {
      // Keep the selection for this page view if storage is unavailable.
    }
  }

  if (hasLabControls) {
    try {
      const savedMode = localStorage.getItem("site-bg-transition-mode");
      const savedAnimate = localStorage.getItem("site-bg-transition-animate");

      if (modeNames.has(savedMode)) {
        selectedMode = savedMode;
      }

      if (animateNames.has(savedAnimate)) {
        selectedAnimate = savedAnimate;
      }
    } catch {
      // Preview still works when browser storage is unavailable.
    }

    modeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        selectMode(option.dataset.bgModeOption);
      });
    });

    animateOptions.forEach((option) => {
      option.addEventListener("click", () => {
        selectAnimate(option.dataset.bgAnimateOption);
      });
    });
  }

  selectMode(selectedMode);
  selectAnimate(selectedAnimate);

  window.addEventListener("scroll", queueSiteBackgroundUpdate, { passive: true });
  window.addEventListener("resize", queueSiteBackgroundUpdate);
  queueSiteBackgroundUpdate();
})();
