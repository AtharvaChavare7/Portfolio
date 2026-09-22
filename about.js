(function initAboutTune() {
  const root = document.querySelector(".about");
  const tune = document.querySelector("[data-about-tune]");
  if (!root || !tune) return;

  const STORAGE_KEY = "about-page-tune-v2";
  const toggle = tune.querySelector(".about-tune__toggle");
  const panel = tune.querySelector(".about-tune__panel");
  const inputs = tune.querySelectorAll("input[data-var]");
  const resetButton = tune.querySelector('[data-action="reset"]');
  const copyButton = tune.querySelector('[data-action="copy"]');

  const defaults = {};
  inputs.forEach((input) => {
    defaults[input.dataset.var] = input.value;
  });

  function formatValue(name, value) {
    const input = tune.querySelector(`input[data-var="${name}"]`);
    const unit = input?.dataset.unit || "px";
    if (unit === "s") return `${value}s`;
    if (name.includes("scale")) return Number(value).toFixed(2);
    return `${value}${unit}`;
  }

  function cssValue(name, value) {
    const input = tune.querySelector(`input[data-var="${name}"]`);
    const unit = input?.dataset.unit || "px";
    if (unit === "s") return `${value}s`;
    if (name.includes("scale")) return String(value);
    return `${value}px`;
  }

  function applyVar(name, value) {
    root.style.setProperty(`--${name}`, cssValue(name, value));
    const output = tune.querySelector(`output[data-for="${name}"]`);
    if (output) output.textContent = formatValue(name, value);
  }

  function readState() {
    const state = {};
    inputs.forEach((input) => {
      state[input.dataset.var] = input.value;
    });
    return state;
  }

  function applyState(state) {
    inputs.forEach((input) => {
      const value = state[input.dataset.var] ?? defaults[input.dataset.var];
      input.value = value;
      applyVar(input.dataset.var, value);
    });
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readState()));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") applyState(saved);
      else applyState(defaults);
    } catch {
      applyState(defaults);
    }
  }

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      applyVar(input.dataset.var, input.value);
      saveState();
    });
  });

  resetButton?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    applyState(defaults);
  });

  copyButton?.addEventListener("click", async () => {
    const lines = Object.entries(readState()).map(
      ([name, value]) => `  --${name}: ${cssValue(name, value)};`,
    );
    const text = `.about {\n${lines.join("\n")}\n}`;
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy CSS";
      }, 1400);
    } catch {
      copyButton.textContent = "Copy failed";
    }
  });

  toggle?.addEventListener("click", () => {
    const open = !tune.classList.contains("is-open");
    tune.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  });

  loadState();
})();

(function initAboutTimeline() {
  const experience = document.querySelector(".about-experience");
  const timeline = document.querySelector("[data-timeline]");
  if (!experience || !timeline) return;

  const scroller = timeline.querySelector(".about-timeline__scroller");
  const track = timeline.querySelector(".about-timeline__track");
  const ticks = timeline.querySelector(".about-timeline__ticks");
  const roles = [...experience.querySelectorAll(".about-role")];
  const startYear = 2004;
  const endYear = 2027;
  const perYear = 12;
  const spacing = 17.103193;
  const count = (endYear - startYear + 1) * perYear;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const peakHeight = 96.7;
  const monthHeight = 47.36;
  const yearHeight = 55.26;
  const waveRadius = 10;
  const tickElements = [];
  const yearLabels = new Map();

  const marker = document.createElement("span");
  marker.className = "about-timeline__marker";
  marker.setAttribute("aria-hidden", "true");
  timeline.appendChild(marker);

  for (let index = 0; index < count; index += 1) {
    const tick = document.createElement("span");
    tick.className = "about-timeline__tick";
    const isYear = index % perYear === 0;
    tick.dataset.index = String(index);
    tick.dataset.baseHeight = String(isYear ? yearHeight : monthHeight);
    ticks.appendChild(tick);
    tickElements.push(tick);

    if (!isYear) continue;

    const year = document.createElement("span");
    year.className = "about-timeline__year";
    year.textContent = String(startYear + index / perYear);
    year.dataset.yearIndex = String(index);
    track.appendChild(year);
    yearLabels.set(index, year);
  }

  function focusIndexFromDatetime(datetime, timelineYear) {
    if (!datetime && !timelineYear) return 0;
    const focusYear = timelineYear || Number(datetime.slice(0, 4));
    const index = (focusYear - startYear) * perYear;
    return Math.min(count - 1, Math.max(0, Math.round(index)));
  }

  function scrollForIndex(index) {
    return Math.max(0, index * spacing);
  }

  function refreshGeometry() {
    const sidePadding = scroller.clientWidth / 2;
    track.style.width = `${sidePadding * 2 + (count - 1) * spacing}px`;

    tickElements.forEach((tick, index) => {
      tick.style.left = `${sidePadding + index * spacing}px`;
    });

    yearLabels.forEach((label, index) => {
      label.style.left = `${sidePadding + index * spacing}px`;
    });
  }

  function waveHeight(index, focusIndex) {
    const baseHeight = Number(tickElements[index].dataset.baseHeight);
    const distance = Math.abs(index - focusIndex);
    if (distance >= waveRadius) return baseHeight;

    const influence = 1 - distance / waveRadius;
    return baseHeight + (peakHeight - baseHeight) * influence;
  }

  function renderWave(focusIndex) {
    tickElements.forEach((tick, index) => {
      const distance = Math.abs(index - focusIndex);
      const height = waveHeight(index, focusIndex);
      const focus = Math.max(0, 1 - distance / waveRadius);
      tick.style.height = `${height}px`;
      tick.style.opacity = String(0.68 + focus * 0.32);
    });

    let closestYearIndex = 0;
    let closestYearDistance = Number.POSITIVE_INFINITY;

    yearLabels.forEach((label, index) => {
      const distance = Math.abs(index - focusIndex);
      const focus = Math.max(0, 1 - distance / (perYear * 1.25));
      label.style.setProperty("--year-lift", `${focus * -4}px`);
      label.style.setProperty("--year-scale", String(1 + focus * 0.08));
      label.style.opacity = String(0.62 + focus * 0.38);

      if (distance < closestYearDistance) {
        closestYearDistance = distance;
        closestYearIndex = index;
      }
    });

    yearLabels.forEach((label, index) => {
      label.classList.toggle("is-active", index === closestYearIndex);
    });
  }

  let activeIndex = 0;
  let displayedIndex = 0;
  let animFrame = 0;

  function applyIndex(index) {
    activeIndex = index;
    displayedIndex = index;
    scroller.scrollLeft = scrollForIndex(index);
    renderWave(index);
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - ((-2 * t + 2) ** 3) / 2;
  }

  function animateToIndex(targetIndex) {
    if (reduceMotion) {
      applyIndex(targetIndex);
      return;
    }

    window.cancelAnimationFrame(animFrame);

    const fromIndex = displayedIndex;
    const fromScroll = scroller.scrollLeft;
    const toScroll = scrollForIndex(targetIndex);
    const distance = Math.abs(targetIndex - fromIndex);
    const duration = Math.min(1100, Math.max(720, 620 + distance * 7));
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeInOutCubic(t);
      displayedIndex = fromIndex + (targetIndex - fromIndex) * eased;
      scroller.scrollLeft = fromScroll + (toScroll - fromScroll) * eased;
      renderWave(displayedIndex);

      if (t < 1) {
        animFrame = window.requestAnimationFrame(frame);
        return;
      }

      applyIndex(targetIndex);
    }

    animFrame = window.requestAnimationFrame(frame);
  }

  function setActiveRole(role, index) {
    roles.forEach((item) => {
      item.classList.toggle("is-active", item === role);
    });
    animateToIndex(index);
  }

  const roleTargets = roles.map((role) => ({
    role,
    index: focusIndexFromDatetime(
      role.querySelector("time")?.dateTime,
      Number(role.dataset.timelineYear) || null,
    ),
  }));

  roleTargets.forEach(({ role, index }) => {
    role.addEventListener("mouseenter", () => setActiveRole(role, index));
    role.addEventListener("focus", () => setActiveRole(role, index));
    role.addEventListener("click", () => setActiveRole(role, index));
  });

  experience.addEventListener("mouseleave", () => {
    if (roleTargets[0]) {
      setActiveRole(roleTargets[0].role, roleTargets[0].index);
    }
  });

  function recenterActive() {
    refreshGeometry();
    scroller.scrollLeft = scrollForIndex(activeIndex);
    renderWave(activeIndex);
  }

  refreshGeometry();

  if (roleTargets[0]) {
    roleTargets[0].role.classList.add("is-active");
    applyIndex(roleTargets[0].index);
  } else {
    applyIndex(0);
  }

  window.addEventListener("resize", recenterActive);
})();
