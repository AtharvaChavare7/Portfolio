/* Home page: the light page turns dark while the SpendTrack (Fiserv) card is in view,
   and light again for the next card. Several reveal styles are available behind a
   small switcher (bottom-left) so they can be compared; the choice is remembered.
   Every style is driven by the same scroll progress, smoothed with a lerp so the
   reveal glides instead of tracking the wheel 1:1. */
(() => {
  const root = document.documentElement;
  const darkSection = document.getElementById("case-wongdoody");
  const nextSection = document.getElementById("case-fiserv");
  const overlay = document.querySelector(".site-bg-transition");

  if (!darkSection || !overlay) {
    return;
  }

  const darkCard = darkSection.querySelector(".work-card__grid") || darkSection;
  const anchor = darkSection.querySelector(".work-card__column--wongdoody + *") || darkCard;

  const VARIANTS = [
    { id: "bloom", label: "Card bloom" },
    { id: "tide", label: "Tide" },
    { id: "dusk", label: "Dusk" },
    { id: "depth", label: "Depth" },
    { id: "columns", label: "Columns" },
    { id: "aperture", label: "Aperture" },
    { id: "iris", label: "Original" },
  ];
  const variantIds = new Set(VARIANTS.map((v) => v.id));
  const STORAGE_KEY = "home-bg-transition";
  const COLUMN_COUNT = 7;

  const phoneQuery = window.matchMedia("(max-width: 720px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let variant = "bloom";
  let shown = 0; // smoothed progress actually rendered
  let target = 0;
  let phase = "in";
  let rafId = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  // Columns need their own strips inside the overlay.
  const columns = [];
  for (let i = 0; i < COLUMN_COUNT; i += 1) {
    const strip = document.createElement("span");
    strip.className = "site-bg-transition__column";
    overlay.appendChild(strip);
    columns.push(strip);
  }

  // Progress 0 -> 1 as `el`'s top travels from `from` to `to` (fractions of the viewport).
  function travel(el, vh, from, to) {
    const top = el.getBoundingClientRect().top;
    return clamp((vh * from - top) / (vh * (from - to)), 0, 1);
  }

  function measure() {
    const vh = window.innerHeight;
    const enter = travel(darkSection, vh, 0.92, 0.18);
    const leave = nextSection ? travel(nextSection, vh, 0.92, 0.2) : 0;
    phase = leave > 0 ? "out" : "in";
    target = phase === "in" ? enter : 1 - leave;

    // Geometry used by the card-anchored styles.
    const vw = window.innerWidth;
    const card = darkCard.getBoundingClientRect();
    root.style.setProperty("--bg-card-t", `${clamp(card.top, 0, vh)}px`);
    root.style.setProperty("--bg-card-b", `${clamp(vh - card.bottom, 0, vh)}px`);
    root.style.setProperty("--bg-card-l", `${clamp(card.left, 0, vw)}px`);
    root.style.setProperty("--bg-card-r", `${clamp(vw - card.right, 0, vw)}px`);
    const a = anchor.getBoundingClientRect();
    root.style.setProperty("--bg-anchor-x", `${a.left + a.width / 2}px`);
    root.style.setProperty("--bg-anchor-y", `${a.top + a.height / 2}px`);
  }

  function render() {
    const p = easeInOut(clamp(shown, 0, 1));
    root.style.setProperty("--bg-p", p.toFixed(4));
    root.style.setProperty("--site-bg-reveal", p.toFixed(4));
    root.dataset.bgPhase = phase;
    root.dataset.siteTone = p > 0.55 ? "dark" : "light";

    if (variant === "columns") {
      columns.forEach((strip, i) => {
        // Strips start one after another; on the way out they leave in the same order.
        const delay = (i / (COLUMN_COUNT - 1)) * 0.45;
        const s = clamp((p - delay) / 0.55, 0, 1);
        strip.style.transform = `scaleY(${easeInOut(s).toFixed(4)})`;
      });
    }
  }

  function tick() {
    rafId = 0;
    if (phoneQuery.matches) {
      shown = 0;
      target = 0;
      render();
      return;
    }
    measure();
    const smoothing = reducedMotion.matches ? 1 : 0.14;
    shown += (target - shown) * smoothing;
    if (Math.abs(target - shown) < 0.0008) {
      shown = target;
    }
    render();
    if (shown !== target) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function queue() {
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  // ---- switcher ----
  function select(id, { save = true } = {}) {
    if (!variantIds.has(id)) {
      return;
    }
    variant = id;
    root.dataset.bgVariant = id;
    switcher?.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.bgVariant === id;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // The choice still applies for this visit.
      }
    }
    render();
    queue();
  }

  const switcher = document.createElement("div");
  switcher.className = "bg-variant-switch";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "Background transition style");
  switcher.innerHTML =
    '<span class="bg-variant-switch__label">Transition</span>' +
    VARIANTS.map(
      (v, i) =>
        `<button type="button" data-bg-variant="${v.id}" aria-pressed="false"><span class="bg-variant-switch__num">${i + 1}</span>${v.label}</button>`
    ).join("");
  switcher.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-bg-variant]");
    if (b) {
      select(b.dataset.bgVariant);
    }
  });
  document.body.appendChild(switcher);

  const fromUrl = new URLSearchParams(location.search).get("bg");
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  select(variantIds.has(fromUrl) ? fromUrl : variantIds.has(saved) ? saved : variant, { save: false });

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  phoneQuery.addEventListener?.("change", queue);
  measure();
  shown = target;
  render();
})();
