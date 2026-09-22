(function initTimeOfDayFavicon() {
  const PHASES = {
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
  };

  const ICONS = {
    [PHASES.morning]: "assets/favicon/morning.svg",
    [PHASES.afternoon]: "assets/favicon/afternoon.svg",
    [PHASES.evening]: "assets/favicon/evening.svg",
    [PHASES.night]: "assets/favicon/night.svg",
  };

  /** @type {HTMLLinkElement | null} */
  let iconLink = null;
  /** @type {string | null} */
  let activePhase = null;

  const script = document.currentScript;
  const assetBase = script?.src ? new URL("./", script.src).href : "";

  function iconUrl(phase) {
    const path = ICONS[phase];
    if (!path) return "";
    if (assetBase) return new URL(path, assetBase).href;
    return path;
  }

  function phaseForHour(hour) {
    if (hour >= 5 && hour < 12) return PHASES.morning;
    if (hour >= 12 && hour < 17) return PHASES.afternoon;
    if (hour >= 17 && hour < 21) return PHASES.evening;
    return PHASES.night;
  }

  function setFavicon(phase) {
    if (phase === activePhase) return;
    activePhase = phase;

    const href = iconUrl(phase);
    if (!href) return;

    if (!iconLink) {
      iconLink =
        document.querySelector('link[rel="icon"][data-time-favicon]') ||
        document.querySelector('link[rel="icon"]');
      if (!iconLink) {
        iconLink = document.createElement("link");
        iconLink.rel = "icon";
        iconLink.type = "image/svg+xml";
        document.head.appendChild(iconLink);
      }
      iconLink.dataset.timeFavicon = "true";
    }

    iconLink.href = href;

    let apple = document.querySelector('link[rel="apple-touch-icon"][data-time-favicon]');
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.dataset.timeFavicon = "true";
      document.head.appendChild(apple);
    }
    apple.href = href;
  }

  function refresh() {
    setFavicon(phaseForHour(new Date().getHours()));
  }

  let timerId = 0;

  function msUntilNextPhaseBoundary() {
    const now = new Date();
    const hour = now.getHours();
    const boundaries = [5, 12, 17, 21];
    let nextHour = boundaries.find((h) => h > hour);
    const next = new Date(now);
    if (nextHour === undefined) {
      next.setDate(next.getDate() + 1);
      next.setHours(5, 0, 0, 0);
    } else {
      next.setHours(nextHour, 0, 0, 0);
    }
    return Math.max(1000, next.getTime() - now.getTime());
  }

  function schedule() {
    refresh();
    window.clearTimeout(timerId);
    timerId = window.setTimeout(schedule, msUntilNextPhaseBoundary());
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  refresh();
  schedule();
})();
