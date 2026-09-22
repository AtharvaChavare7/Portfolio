const caseStudyNavEmbed = document.querySelector(".case-study-embed");
let caseStudyNavDeck = caseStudyNavEmbed?.querySelector(".case-study-deck.is-active");
const caseStudyNavRoot = caseStudyNavEmbed?.querySelector(".case-study-nav");
const caseStudyNavTicks = caseStudyNavRoot?.querySelector(".case-study-nav__ticks");
const caseStudyNavList = caseStudyNavRoot?.querySelector(".case-study-nav__list");
const caseStudyNavChaptersToggle = caseStudyNavRoot?.querySelector(
  ".case-study-nav__chapters-toggle"
);
const caseStudyNavProgress = caseStudyNavRoot?.querySelector(
  ".case-study-nav__timeline-progress"
);
const caseStudyNavStyleOptions = document.querySelectorAll("[data-nav-style-option]");

const CASE_STUDY_DECK_SECTIONS = {
  "cross-sell": [
    { id: "overview", label: "Overview" },
    { id: "problem", label: "Problem" },
    { id: "research", label: "Research" },
    { id: "ideation", label: "Ideation" },
    { id: "interventions", label: "Interventions" },
    { id: "learnings", label: "Learnings" },
  ],
  spendtrack: [
    { id: "introduction", label: "Introduction" },
    { id: "problem", label: "Problem" },
    { id: "insights", label: "Insights" },
    { id: "data-analysis", label: "Data Analysis" },
    { id: "constraints", label: "Constraints" },
    { id: "solution", label: "Solution" },
    { id: "opportunity", label: "Opportunity" },
    { id: "design-tenets", label: "Design Tenets" },
    { id: "ideation", label: "Ideation" },
    { id: "solution-breakdown", label: "Solution Breakdown" },
    { id: "learnings", label: "Learnings" },
  ],
  snakesafe: [
    { id: "overview", label: "Overview" },
    { id: "problem", label: "Problem" },
    { id: "research", label: "Research" },
    { id: "ideation", label: "Ideation" },
    { id: "solution", label: "Solution" },
    { id: "design", label: "Design" },
    { id: "learnings", label: "Learnings" },
  ],
};

const CASE_STUDY_DECK_DETAILED_SECTIONS = {
  "cross-sell": [
    { id: "overview", label: "Overview", index: "01" },
    { id: "problem", label: "Problem", index: "02" },
    { id: "impact", label: "Impact", index: "03" },
    { id: "research", label: "Research", index: "04" },
    { id: "ideation", label: "Ideation", index: "05" },
    { id: "interventions", label: "Interventions", index: "06" },
    { id: "learnings", label: "Learnings", index: "07" },
  ],
  spendtrack: [
    { id: "introduction", label: "Introduction", index: "01" },
    { id: "problem", label: "Problem", index: "02" },
    { id: "insights", label: "Insights", index: "03" },
    { id: "data-analysis", label: "Data Analysis", index: "04" },
    { id: "constraints", label: "Constraints", index: "05" },
    { id: "solution", label: "Solution", index: "06" },
    { id: "opportunity", label: "Opportunity", index: "07" },
    { id: "design-tenets", label: "Design Tenets", index: "08" },
    { id: "ideation", label: "Ideation", index: "09" },
    { id: "solution-breakdown", label: "Solution Breakdown", index: "10" },
    { id: "learnings", label: "Learnings", index: "11" },
  ],
  snakesafe: [
    { id: "overview", label: "Overview", index: "01" },
    { id: "problem", label: "Problem", index: "02" },
    { id: "research", label: "Research", index: "03" },
    { id: "ideation", label: "Ideation", index: "04" },
    { id: "solution", label: "Solution", index: "05" },
    { id: "design", label: "Design", index: "06" },
    { id: "learnings", label: "Learnings", index: "07" },
  ],
};

const CASE_STUDY_DECK_HAS_NAV = new Set(["cross-sell", "spendtrack", "snakesafe"]);

function getActiveCaseStudyDeckId() {
  return caseStudyNavEmbed?.dataset.activeDeck || "cross-sell";
}

function getCaseStudyMainSections() {
  return (
    CASE_STUDY_DECK_SECTIONS[getActiveCaseStudyDeckId()] ??
    CASE_STUDY_DECK_SECTIONS["cross-sell"]
  );
}

function getCaseStudyDetailedSections() {
  return (
    CASE_STUDY_DECK_DETAILED_SECTIONS[getActiveCaseStudyDeckId()] ??
    CASE_STUDY_DECK_DETAILED_SECTIONS["cross-sell"]
  );
}

function getCaseStudyNavDeck() {
  return caseStudyNavEmbed?.querySelector(".case-study-deck.is-active") ?? null;
}

function bindCaseStudyNavDeckScroll() {
  const deck = getCaseStudyNavDeck();

  if (!deck || deck.dataset.navScrollBound === "true") {
    return;
  }

  deck.dataset.navScrollBound = "true";
  deck.addEventListener("scroll", queueCaseStudyNavScrollSync, {
    passive: true,
  });
}

function refreshCaseStudyNavDeck() {
  caseStudyNavDeck = getCaseStudyNavDeck();
  caseStudyNavLastScrollTop = caseStudyNavDeck?.scrollTop ?? 0;
  caseStudyNavRoot?.classList.remove("is-scrolling-up");
  buildCaseStudyNav();
  bindCaseStudyNavDeckScroll();
  measureCaseStudySections();
  syncCaseStudyNavFromScroll();
}

const CASE_STUDY_NAV_STYLES = new Set([
  "ticks",
  "rail",
  "tabs",
  "chapters",
  "dots",
  "chips",
  "timeline",
]);

let selectedCaseStudyNavStyle = "ticks";
let caseStudyNavScrollFrame = 0;
let caseStudyNavChaptersOpen = false;
let caseStudyNavLastScrollTop = 0;
let caseStudyNavSectionMetrics = [];
let caseStudyNavToneMix = 0;

const NAV_SURFACE_BLEND_DISTANCE = 160;
const NAV_SURFACE_TONE_LERP = 0.22;
let caseStudyNavSurfaceToneState = "light";

function isTicksNavStyle() {
  return selectedCaseStudyNavStyle === "ticks";
}

function getReducedMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setCaseStudyNavVisible(isVisible) {
  caseStudyNavRoot?.classList.toggle("is-visible", isVisible);
  caseStudyNavEmbed?.classList.toggle("has-case-study-nav", isVisible);

  if (!isVisible) {
    closeCaseStudyNavChapters();
    caseStudyNavRoot?.classList.remove("is-scrolling-up");
    caseStudyNavToneMix = 0;
    caseStudyNavSurfaceToneState = "light";
    caseStudyNavRoot?.removeAttribute("data-surface-tone");
    caseStudyNavEmbed?.removeAttribute("data-nav-surface-tone");
  }
}

function closeCaseStudyNavChapters() {
  caseStudyNavChaptersOpen = false;
  caseStudyNavRoot?.classList.remove("is-chapters-open");
  caseStudyNavChaptersToggle?.setAttribute("aria-expanded", "false");
}

function openCaseStudyNavChapters() {
  caseStudyNavChaptersOpen = true;
  caseStudyNavRoot?.classList.add("is-chapters-open");
  caseStudyNavChaptersToggle?.setAttribute("aria-expanded", "true");
}

function toggleCaseStudyNavChapters() {
  if (caseStudyNavChaptersOpen) {
    closeCaseStudyNavChapters();
    return;
  }

  openCaseStudyNavChapters();
}

function selectCaseStudyNavStyle(style) {
  if (!CASE_STUDY_NAV_STYLES.has(style)) {
    return;
  }

  selectedCaseStudyNavStyle = style;
  caseStudyNavEmbed?.setAttribute("data-nav-style", style);
  closeCaseStudyNavChapters();
  buildCaseStudyNav();
  measureCaseStudySections();
  syncCaseStudyNavFromScroll();

  caseStudyNavStyleOptions.forEach((option) => {
    const isActive = option.dataset.navStyleOption === style;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });

  try {
    localStorage.setItem("case-study-nav-style", style);
  } catch {
    // Keep the selection for this page view if storage is unavailable.
  }
}

function getCaseStudySectionAnchor(sectionId) {
  return caseStudyNavDeck?.querySelector(`[data-section-start="${sectionId}"]`);
}

function measureCaseStudySections() {
  if (!caseStudyNavDeck) {
    caseStudyNavSectionMetrics = [];
    return;
  }

  const deckHeight = caseStudyNavDeck.scrollHeight;

  caseStudyNavSectionMetrics = getCaseStudyMainSections().map((section, index) => {
    const startElement = getCaseStudySectionAnchor(section.id);
    const start = startElement?.offsetTop ?? 0;
    const nextSection = getCaseStudyMainSections()[index + 1];
    const nextStartElement = nextSection
      ? getCaseStudySectionAnchor(nextSection.id)
      : null;
    const end = nextStartElement?.offsetTop ?? deckHeight;

    return {
      ...section,
      start,
      end: Math.max(end, start + 1),
    };
  });
}

function getSectionFill(section, scrollTop, viewportHeight) {
  const leadingEdge = scrollTop + viewportHeight * 0.32;
  const range = section.end - section.start;

  if (leadingEdge <= section.start) {
    return 0;
  }

  if (leadingEdge >= section.end) {
    return 1;
  }

  return (leadingEdge - section.start) / range;
}

function isSlideNavSurfaceDark(slide) {
  return slide?.dataset.navSurface === "dark";
}

function getNavSurfaceToneAtSample(sampleY) {
  if (!caseStudyNavDeck) {
    return 0;
  }

  const slides = [...caseStudyNavDeck.querySelectorAll(".case-study-deck__slide")];

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];
    const top = slide.offsetTop;
    const bottom = top + slide.offsetHeight;

    if (sampleY < top || sampleY >= bottom) {
      continue;
    }

    const previousSlide = slides[index - 1];
    const nextSlide = slides[index + 1];
    let tone = isSlideNavSurfaceDark(slide) ? 1 : 0;

    if (isSlideNavSurfaceDark(slide)) {
      if (previousSlide && !isSlideNavSurfaceDark(previousSlide)) {
        const distanceIntoSlide = sampleY - top;

        if (distanceIntoSlide < NAV_SURFACE_BLEND_DISTANCE) {
          tone = distanceIntoSlide / NAV_SURFACE_BLEND_DISTANCE;
        }
      }

      if (nextSlide && !isSlideNavSurfaceDark(nextSlide)) {
        const distanceToEnd = bottom - sampleY;

        if (distanceToEnd < NAV_SURFACE_BLEND_DISTANCE) {
          tone = Math.min(tone, distanceToEnd / NAV_SURFACE_BLEND_DISTANCE);
        }
      }
    } else if (previousSlide && isSlideNavSurfaceDark(previousSlide)) {
      const distanceIntoSlide = sampleY - top;

      if (distanceIntoSlide < NAV_SURFACE_BLEND_DISTANCE) {
        tone = 1 - distanceIntoSlide / NAV_SURFACE_BLEND_DISTANCE;
      }
    } else if (nextSlide && isSlideNavSurfaceDark(nextSlide)) {
      const distanceToEnd = bottom - sampleY;

      if (distanceToEnd < NAV_SURFACE_BLEND_DISTANCE) {
        tone = Math.max(tone, 1 - distanceToEnd / NAV_SURFACE_BLEND_DISTANCE);
      }
    }

    return Math.min(1, Math.max(0, tone));
  }

  return 0;
}

function resolveNavSurfaceToneState(mix) {
  if (mix >= 0.72) {
    return "dark";
  }

  if (mix <= 0.28) {
    return "light";
  }

  if (caseStudyNavSurfaceToneState === "dark" && mix > 0.56) {
    return "dark";
  }

  if (caseStudyNavSurfaceToneState === "light" && mix < 0.44) {
    return "light";
  }

  return "blend";
}

function updateCaseStudyNavSurfaceTone(scrollTop, viewportHeight) {
  if (!caseStudyNavRoot || !isTicksNavStyle()) {
    return;
  }

  const sampleY = scrollTop + viewportHeight * 0.5;
  const targetTone = getNavSurfaceToneAtSample(sampleY);

  if (getReducedMotionPreference()) {
    caseStudyNavToneMix = targetTone;
  } else {
    caseStudyNavToneMix +=
      (targetTone - caseStudyNavToneMix) * NAV_SURFACE_TONE_LERP;
  }

  const mix = Math.min(1, Math.max(0, caseStudyNavToneMix));
  const surfaceTone = resolveNavSurfaceToneState(mix);

  caseStudyNavSurfaceToneState = surfaceTone;
  caseStudyNavRoot.dataset.surfaceTone = surfaceTone;
  caseStudyNavEmbed?.setAttribute("data-nav-surface-tone", surfaceTone);
}

function updateCaseStudyScrollDirection(scrollTop) {
  const delta = scrollTop - caseStudyNavLastScrollTop;
  const threshold = 2;

  if (delta < -threshold) {
    caseStudyNavRoot?.classList.add("is-scrolling-up");
  } else if (delta > threshold) {
    caseStudyNavRoot?.classList.remove("is-scrolling-up");
  }

  caseStudyNavLastScrollTop = scrollTop;
}

function updateCaseStudyTicks() {
  if (!caseStudyNavTicks || !caseStudyNavDeck) {
    return;
  }

  const scrollTop = caseStudyNavDeck.scrollTop;
  const viewportHeight = caseStudyNavDeck.clientHeight;

  updateCaseStudyScrollDirection(scrollTop);
  updateCaseStudyNavSurfaceTone(scrollTop, viewportHeight);

  caseStudyNavTicks.querySelectorAll("[data-section]").forEach((button) => {
    const section = caseStudyNavSectionMetrics.find(
      (entry) => entry.id === button.dataset.section
    );

    if (!section) {
      return;
    }

    const fill = getSectionFill(section, scrollTop, viewportHeight);
    const fillElement = button.querySelector(".case-study-nav__tick-fill");

    button.style.setProperty("--tick-fill", String(fill));
    fillElement?.style.setProperty("--tick-fill", String(fill));

    const isActive = fill > 0 && fill < 1;
    const isComplete = fill >= 1;
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-complete", isComplete);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function setActiveLegacySection(sectionId) {
  if (!sectionId) {
    return;
  }

  const activeSection = getCaseStudyDetailedSections().find(
    (section) => section.id === sectionId
  );

  caseStudyNavList
    ?.querySelectorAll("[data-section]")
    .forEach((button) => {
      const isActive = button.dataset.section === sectionId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "true" : "false");
    });

  if (caseStudyNavChaptersToggle && activeSection) {
    caseStudyNavChaptersToggle.textContent = `${activeSection.index} · ${activeSection.label}`;
  }
}

function getActiveLegacySectionFromScroll() {
  const detailedSections = getCaseStudyDetailedSections();

  if (!caseStudyNavDeck) {
    return detailedSections[0].id;
  }

  const scrollTop = caseStudyNavDeck.scrollTop;
  const viewportAnchor = scrollTop + Math.min(caseStudyNavDeck.clientHeight * 0.28, 220);
  let activeSection = detailedSections[0].id;

  detailedSections.forEach((section) => {
    const anchor = getCaseStudySectionAnchor(section.id);

    if (anchor && anchor.offsetTop <= viewportAnchor) {
      activeSection = section.id;
    }
  });

  return activeSection;
}

function updateCaseStudyNavProgress() {
  if (!caseStudyNavDeck || !caseStudyNavProgress) {
    return;
  }

  const maxScroll = Math.max(
    caseStudyNavDeck.scrollHeight - caseStudyNavDeck.clientHeight,
    1
  );
  const progress = caseStudyNavDeck.scrollTop / maxScroll;

  caseStudyNavProgress.style.setProperty("--nav-progress", String(progress));
  caseStudyNavEmbed?.style.setProperty("--case-study-nav-progress", String(progress));
}

function syncCaseStudyNavFromScroll() {
  caseStudyNavScrollFrame = 0;

  if (isTicksNavStyle()) {
    updateCaseStudyTicks();
    return;
  }

  setActiveLegacySection(getActiveLegacySectionFromScroll());
  updateCaseStudyNavProgress();
}

function queueCaseStudyNavScrollSync() {
  if (caseStudyNavScrollFrame) {
    return;
  }

  caseStudyNavScrollFrame = window.requestAnimationFrame(syncCaseStudyNavFromScroll);
}

function scrollToCaseStudySection(sectionId) {
  const anchor = getCaseStudySectionAnchor(sectionId);

  if (!anchor || !caseStudyNavDeck) {
    return;
  }

  closeCaseStudyNavChapters();
  anchor.scrollIntoView({
    behavior: getReducedMotionPreference() ? "auto" : "smooth",
    block: "start",
  });

  window.setTimeout(() => {
    measureCaseStudySections();
    syncCaseStudyNavFromScroll();
  }, getReducedMotionPreference() ? 0 : 420);
}

function buildCaseStudyTicks() {
  if (!caseStudyNavTicks) {
    return;
  }

  caseStudyNavTicks.replaceChildren();

  getCaseStudyMainSections().forEach((section) => {
    const item = document.createElement("li");
    item.className = "case-study-nav__tick-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "case-study-nav__tick-button";
    button.dataset.section = section.id;
    button.setAttribute("aria-label", section.label);

    const line = document.createElement("span");
    line.className = "case-study-nav__tick-line";
    line.setAttribute("aria-hidden", "true");

    const fill = document.createElement("span");
    fill.className = "case-study-nav__tick-fill";
    line.append(fill);

    const label = document.createElement("span");
    label.className = "case-study-nav__tick-label";
    label.textContent = section.label;

    button.append(line, label);
    button.addEventListener("click", () => {
      scrollToCaseStudySection(section.id);
    });

    item.append(button);
    caseStudyNavTicks.append(item);
  });
}

function buildCaseStudyLegacyNav() {
  if (!caseStudyNavList) {
    return;
  }

  caseStudyNavList.replaceChildren();

  getCaseStudyDetailedSections().forEach((section) => {
    const item = document.createElement("li");
    item.className = "case-study-nav__item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "case-study-nav__button";
    button.dataset.section = section.id;
    button.setAttribute(
      "aria-current",
      section.id === getActiveLegacySectionFromScroll() ? "true" : "false"
    );

    const index = document.createElement("span");
    index.className = "case-study-nav__index";
    index.textContent = section.index;

    const label = document.createElement("span");
    label.className = "case-study-nav__label";
    label.textContent = section.label;

    button.append(index, label);
    button.addEventListener("click", () => {
      scrollToCaseStudySection(section.id);
    });

    item.append(button);
    caseStudyNavList.append(item);
  });
}

function buildCaseStudyNav() {
  buildCaseStudyTicks();
  buildCaseStudyLegacyNav();
}

function initCaseStudyNavStorage() {
  try {
    const savedStyle = localStorage.getItem("case-study-nav-style");

    if (CASE_STUDY_NAV_STYLES.has(savedStyle)) {
      selectedCaseStudyNavStyle = savedStyle;
    }
  } catch {
    // The preview still works when browser storage is unavailable.
  }
}

function initCaseStudyNav() {
  if (!caseStudyNavEmbed || !caseStudyNavRoot || !caseStudyNavTicks) {
    return;
  }

  caseStudyNavDeck = getCaseStudyNavDeck();
  initCaseStudyNavStorage();
  buildCaseStudyNav();
  selectCaseStudyNavStyle(selectedCaseStudyNavStyle);

  caseStudyNavStyleOptions.forEach((option) => {
    option.addEventListener("click", () => {
      selectCaseStudyNavStyle(option.dataset.navStyleOption);
    });
  });

  caseStudyNavChaptersToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleCaseStudyNavChapters();
  });

  caseStudyNavRoot.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    closeCaseStudyNavChapters();
  });

  bindCaseStudyNavDeckScroll();

  document.addEventListener("case-study-deck-change", () => {
    refreshCaseStudyNavDeck();
  });

  caseStudyNavEmbed.addEventListener("close", () => {
    setCaseStudyNavVisible(false);
    caseStudyNavEmbed.querySelectorAll(".case-study-deck").forEach((deck) => {
      deck.scrollTop = 0;
    });
    caseStudyNavLastScrollTop = 0;
    window.setTimeout(() => {
      refreshCaseStudyNavDeck();
    }, 0);
  });

  const revealNav = () => {
    if (!caseStudyNavEmbed.open) {
      return;
    }

    const activeDeckId = caseStudyNavEmbed.dataset.activeDeck || "cross-sell";

    if (!CASE_STUDY_DECK_HAS_NAV.has(activeDeckId)) {
      setCaseStudyNavVisible(false);
      return;
    }

    const isEntering = caseStudyNavEmbed.classList.contains("is-entering");
    const isContentReady = caseStudyNavEmbed.classList.contains("is-content-ready");
    const usesShutter =
      caseStudyNavEmbed.dataset.transition === "soft-shutter" ||
      caseStudyNavEmbed.dataset.transition === "industrial-shutter";

    if (isEntering && (!usesShutter || !isContentReady)) {
      return;
    }

    refreshCaseStudyNavDeck();
    selectCaseStudyNavStyle(
      activeDeckId === "spendtrack" || activeDeckId === "snakesafe"
        ? "ticks"
        : selectedCaseStudyNavStyle
    );
    setCaseStudyNavVisible(true);
  };

  document.querySelectorAll("[data-case-study-deck]").forEach((button) => {
    button.addEventListener("click", revealNav);
  });

  caseStudyNavEmbed.addEventListener("animationend", revealNav);

  const navObserver = new MutationObserver(revealNav);

  navObserver.observe(caseStudyNavEmbed, {
    attributes: true,
    attributeFilter: ["class", "open"],
  });

  window.addEventListener("resize", () => {
    measureCaseStudySections();
    queueCaseStudyNavScrollSync();
  });

  caseStudyNavEmbed.querySelectorAll(".case-study-deck img").forEach((image) => {
    if (image.complete) {
      return;
    }

    image.addEventListener(
      "load",
      () => {
        measureCaseStudySections();
        syncCaseStudyNavFromScroll();
      },
      { once: true }
    );
  });

  refreshCaseStudyNavDeck();
}

initCaseStudyNav();
