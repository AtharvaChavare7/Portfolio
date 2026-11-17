/* Site-wide "soft shutter" page transition (originally the case-study opening).
   Two white drawers slide in from the top and bottom and meet in the middle on the
   page you're leaving; the next page starts with them closed and opens them.
   Load this synchronously in <head> so arriving pages are covered from the first paint. */
(() => {
  const root = document.documentElement;
  const ARRIVE_KEY = "soft-shutter:arrive";
  const CLOSE_MS = 720; // 40% of the original 1800ms timeline
  const HOLD_MS = 260;
  const OPEN_MS = 720;
  const EASE = "cubic-bezier(0.77, 0, 0.18, 1)";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const css = `
    .soft-shutter { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }
    .soft-shutter[data-state="idle"] { display: none; }
    .soft-shutter__panel {
      position: absolute; left: 0; width: 100%; height: 50.5%;
      background: #fffefe; will-change: transform;
      transition: transform ${CLOSE_MS}ms ${EASE};
    }
    .soft-shutter__panel--top { top: 0; border-bottom: 1px solid #e0e0e0; transform: translateY(-101%); }
    .soft-shutter__panel--bottom { bottom: 0; border-top: 1px solid #e0e0e0; transform: translateY(101%); }
    .soft-shutter[data-state="closed"] .soft-shutter__panel,
    .soft-shutter[data-state="closing"] .soft-shutter__panel { transform: translateY(0); }
    .soft-shutter[data-state="closed"] .soft-shutter__panel { transition: none; }
    .soft-shutter[data-state="opening"] .soft-shutter__panel { transition-duration: ${OPEN_MS}ms; }
    .soft-shutter[data-state="closing"],
    .soft-shutter[data-state="closed"] { pointer-events: auto; }
    .soft-shutter__handle {
      position: absolute; left: 50%;
      width: clamp(72px, 7.5231vw, 130px); aspect-ratio: 130 / 32;
      border-radius: 11.5385% / 46.875%;
      background: #bebebe; box-shadow: inset 0 1px 15.7px rgba(0, 0, 0, 0.25);
      transform: translateX(-50%);
    }
    .soft-shutter__panel--top .soft-shutter__handle { bottom: 6.36%; }
    .soft-shutter__panel--bottom .soft-shutter__handle { top: 6.54%; }
    html.soft-shutter-arriving body { visibility: hidden; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  let shutter = null;
  function build() {
    if (shutter) {
      return shutter;
    }
    shutter = document.createElement("div");
    shutter.className = "soft-shutter";
    shutter.setAttribute("aria-hidden", "true");
    shutter.dataset.state = "idle";
    shutter.innerHTML =
      '<div class="soft-shutter__panel soft-shutter__panel--top"><span class="soft-shutter__handle"></span></div>' +
      '<div class="soft-shutter__panel soft-shutter__panel--bottom"><span class="soft-shutter__handle"></span></div>';
    // In <head> there is no body yet; the drawers can live on <html> until then.
    (document.body || root).appendChild(shutter);
    return shutter;
  }

  let arriving = false;
  try {
    const t = Number(sessionStorage.getItem(ARRIVE_KEY));
    sessionStorage.removeItem(ARRIVE_KEY);
    arriving = t > 0 && Date.now() - t < 8000;
  } catch {
    arriving = false;
  }
  if (arriving) {
    root.classList.add("soft-shutter-arriving");
    build().dataset.state = "closed";
    // Never leave the page hidden if something below fails.
    window.setTimeout(() => root.classList.remove("soft-shutter-arriving"), 3000);
  }

  function open() {
    const s = build();
    s.dataset.state = "closed";
    root.classList.remove("soft-shutter-arriving");
    window.setTimeout(() => {
      s.dataset.state = "opening";
      window.setTimeout(() => {
        s.dataset.state = "idle";
      }, OPEN_MS + 40);
    }, HOLD_MS);
  }

  function shouldTransition(link, event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (link.target && link.target !== "_self") {
      return false;
    }
    if (link.hasAttribute("download") || link.dataset.noTransition !== undefined) {
      return false;
    }
    const raw = link.getAttribute("href");
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) {
      return false;
    }
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) {
      return false;
    }
    // Same page, different hash: let the page scroll instead.
    const here = location.pathname.replace(/index\.html$/, "");
    const there = url.pathname.replace(/index\.html$/, "");
    if (there === here && url.search === location.search) {
      return false;
    }
    return true;
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || !shouldTransition(link, event)) {
      return;
    }
    event.preventDefault();
    const s = build();
    // Show the drawers at their open (off-screen) position first, then close them on
    // the next frame so the transition runs.
    s.dataset.state = "ready";
    void s.offsetWidth;
    requestAnimationFrame(() => {
      s.dataset.state = "closing";
    });
    try {
      sessionStorage.setItem(ARRIVE_KEY, String(Date.now()));
    } catch {
      // Without storage the next page simply appears without the opening half.
    }
    window.setTimeout(() => {
      location.href = link.href;
    }, CLOSE_MS);
  });

  // Coming back through the back/forward cache: don't leave the drawers shut.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && shutter) {
      shutter.dataset.state = "idle";
      root.classList.remove("soft-shutter-arriving");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      build();
      if (arriving) {
        open();
      }
    });
  } else {
    build();
    if (arriving) {
      open();
    }
  }
})();
