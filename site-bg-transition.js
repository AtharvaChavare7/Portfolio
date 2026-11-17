/* Home page: the light page turns dark while the SpendTrack card is in view, and
   light again for the next card. The reveal is "Dusk": a soft horizon with a 35vh
   feather that drifts up the page on the way in and recedes upward on the way out.
   Progress is smoothed with a lerp so the horizon glides instead of tracking the
   wheel 1:1.

   Light cards that the horizon passes over (the first case study on the way in,
   the next one on the way out) have their footer text eased to white at exactly
   the darkness the backdrop has behind it, so it stays readable mid-transition. */
(() => {
  const root = document.documentElement;
  const darkSection = document.getElementById("case-wongdoody");
  const nextSection = document.getElementById("case-fiserv");
  const overlay = document.querySelector(".site-bg-transition");

  if (!darkSection || !overlay) {
    return;
  }

  // Keep in sync with the dusk mask in styles.css: the horizon travels 135% of the
  // viewport and fades over the last 35%.
  const TRAVEL = 1.35;
  const FEATHER = 0.35;

  const inkTargets = ["case-makemytrip", "case-fiserv"]
    .map((id) => document.querySelector(`#${id} .work-card__title`))
    .filter(Boolean);

  const phoneQuery = window.matchMedia("(max-width: 720px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let shown = 0; // smoothed progress actually rendered
  let target = 0;
  let phase = "in";
  let rafId = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

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
  }

  // How dark the backdrop is (0..1) at viewport y for eased progress p.
  function darknessAt(y, vh, p) {
    // Distance from the edge the horizon starts at, as a fraction of the viewport.
    const f = phase === "in" ? (vh - y) / vh : y / vh;
    return clamp((p * TRAVEL - f) / FEATHER, 0, 1);
  }

  function render() {
    const p = easeInOut(clamp(shown, 0, 1));
    root.style.setProperty("--bg-p", p.toFixed(4));
    root.style.setProperty("--site-bg-reveal", p.toFixed(4));
    root.dataset.bgPhase = phase;
    root.dataset.siteTone = p > 0.55 ? "dark" : "light";

    const vh = window.innerHeight;
    inkTargets.forEach((el) => {
      const r = el.getBoundingClientRect();
      const ink = p > 0 && r.bottom > 0 && r.top < vh ? darknessAt(r.top + r.height / 2, vh, p) : 0;
      el.style.setProperty("--dusk-ink", ink.toFixed(3));
    });
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

  root.dataset.bgVariant = "dusk";

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  phoneQuery.addEventListener?.("change", queue);
  measure();
  shown = target;
  render();
})();
