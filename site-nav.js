(function initSiteNav() {
  const siteNav = document.querySelector(".site-nav");

  if (!siteNav) {
    return;
  }

  const menuButton = siteNav.querySelector(".site-nav__menu");
  const closeButton = siteNav.querySelector(".site-nav__close");
  const panel = siteNav.querySelector(".site-nav__panel");
  const scrim = document.querySelector(".site-nav__scrim");
  const linksNav = siteNav.querySelector(".site-nav__links");
  const links = siteNav.querySelectorAll(".site-nav__link");
  const menuLetters = menuButton?.querySelectorAll(".site-nav__menu-letter");
  const hoverDot = document.createElement("span");
  const dotGap = 20;
  const dotSize = 16;
  let activeHoverLink = null;
  let isHoverDotReady = false;
  hoverDot.className = "site-nav__hover-dot";
  hoverDot.setAttribute("aria-hidden", "true");
  linksNav?.appendChild(hoverDot);
  const motionDuration = 670;
  const closeLeadDuration = 670;
  const settleDuration = 650;
  const menuWaveDuration = 520;
  const menuWaveStagger = 42;
  const menuWaveTotal =
    menuWaveDuration +
    menuWaveStagger * Math.max((menuLetters?.length ?? 1) - 1, 0);
  let motionTimer = 0;
  let menuWaveTimer = 0;
  let closingWaveTimer = 0;
  let isMenuWaveRunning = false;

  function positionHoverDot(link, shouldAnimate) {
    if (!linksNav || !link) {
      return;
    }

    const containerRect = linksNav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const x = linkRect.right - containerRect.left + dotGap;
    const y = linkRect.top - containerRect.top + (linkRect.height - dotSize) / 2;

    hoverDot.style.transition = shouldAnimate
      ? "transform 90ms linear, opacity 0s"
      : "none";
    hoverDot.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    if (!shouldAnimate) {
      requestAnimationFrame(() => {
        hoverDot.style.transition = "transform 90ms linear, opacity 0s";
        isHoverDotReady = true;
      });
      return;
    }

    isHoverDotReady = true;
  }

  function setActiveHoverLink(link) {
    if (!linksNav || !link) {
      return;
    }

    const shouldAnimate = isHoverDotReady && activeHoverLink !== null;
    activeHoverLink = link;
    linksNav.classList.add("is-link-hovered");
    links.forEach((item) => {
      item.classList.toggle("is-hovered", item === link);
    });
    positionHoverDot(link, shouldAnimate);
  }

  function clearActiveHoverLink() {
    activeHoverLink = null;
    isHoverDotReady = false;
    linksNav?.classList.remove("is-link-hovered");
    links.forEach((item) => {
      item.classList.remove("is-hovered");
    });
    hoverDot.style.transition = "none";
  }

  function runMenuLetterWave(shouldRestart = false) {
    if (
      !menuButton ||
      !menuLetters?.length ||
      (isMenuWaveRunning && !shouldRestart)
    ) {
      return;
    }

    isMenuWaveRunning = true;

    menuLetters.forEach((letter) => {
      letter.classList.remove("is-waving");
    });

    // Force reflow so each hover replay restarts the full wave.
    void menuButton.offsetWidth;

    menuLetters.forEach((letter) => {
      letter.classList.add("is-waving");
    });

    window.clearTimeout(menuWaveTimer);
    menuWaveTimer = window.setTimeout(() => {
      menuLetters.forEach((letter) => {
        letter.classList.remove("is-waving");
      });
      isMenuWaveRunning = false;
    }, menuWaveTotal + 40);
  }

  function setSiteNavOpen(isOpen, shouldMoveFocus = false) {
    window.clearTimeout(motionTimer);
    window.clearTimeout(closingWaveTimer);
    menuButton?.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("is-site-nav-open", isOpen);

    if (isOpen) {
      if (panel) {
        panel.hidden = false;
      }
      if (scrim) {
        scrim.hidden = false;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          siteNav.dataset.state = "opening";
          scrim?.classList.add("is-visible");
        });
      });

      motionTimer = window.setTimeout(() => {
        if (siteNav.dataset.state === "opening") {
          siteNav.dataset.state = "open";
          if (shouldMoveFocus) {
            closeButton?.focus({ preventScroll: true });
          }
        }
      }, motionDuration);
      return;
    }

    siteNav.dataset.state = "closing";
    scrim?.classList.remove("is-visible");
    clearActiveHoverLink();
    closingWaveTimer = window.setTimeout(() => {
      runMenuLetterWave(true);
    }, Math.round(closeLeadDuration * 0.56));

    motionTimer = window.setTimeout(() => {
      if (siteNav.dataset.state !== "closing") {
        return;
      }

      siteNav.dataset.state = "closed";
      if (panel) {
        panel.hidden = true;
      }
      if (scrim) {
        scrim.hidden = true;
      }
      if (shouldMoveFocus) {
        menuButton?.focus({ preventScroll: true });
      }
    }, closeLeadDuration + settleDuration);
  }

  function openSiteNav(event) {
    if (
      siteNav.dataset.state === "open" ||
      siteNav.dataset.state === "opening"
    ) {
      return;
    }
    setSiteNavOpen(true, event?.detail === 0);
  }

  function closeSiteNav(event, forceFocus = false) {
    if (
      siteNav.dataset.state === "closed" ||
      siteNav.dataset.state === "closing"
    ) {
      return;
    }
    setSiteNavOpen(false, forceFocus || event?.detail === 0);
  }

  menuButton?.addEventListener("pointerenter", () => {
    runMenuLetterWave();
  });

  menuButton?.addEventListener("click", openSiteNav);

  closeButton?.addEventListener("click", closeSiteNav);

  scrim?.addEventListener("click", closeSiteNav);

  links.forEach((link) => {
    link.addEventListener("click", () => {
      closeSiteNav(undefined, true);
    });

    link.addEventListener("pointerenter", () => {
      setActiveHoverLink(link);
    });

    link.addEventListener("focus", () => {
      setActiveHoverLink(link);
    });
  });

  linksNav?.addEventListener("pointerleave", clearActiveHoverLink);

  linksNav?.addEventListener("focusout", (event) => {
    if (!linksNav.contains(event.relatedTarget)) {
      clearActiveHoverLink();
    }
  });

  window.addEventListener("resize", () => {
    if (activeHoverLink) {
      positionHoverDot(activeHoverLink, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      (siteNav.dataset.state === "open" ||
        siteNav.dataset.state === "opening")
    ) {
      closeSiteNav();
    }
  });

  siteNav.dataset.state = "closed";
  panel.hidden = true;
  scrim.hidden = true;
  menuButton?.setAttribute("aria-expanded", "false");
})();
