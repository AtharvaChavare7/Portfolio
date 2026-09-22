const panelWrap = document.querySelector(".work-card__panel-wrap--main");

const caseStudyEmbed = document.querySelector(".case-study-embed");
const caseStudyDecks = caseStudyEmbed
  ? [...caseStudyEmbed.querySelectorAll(".case-study-deck")]
  : [];
const caseStudyEmbedClose = caseStudyEmbed?.querySelector(".case-study-embed__close");
const caseStudyEmbedStage = caseStudyEmbed?.querySelector(".case-study-embed__stage");
const caseStudyCoverVideo = caseStudyEmbed?.querySelector(
  ".case-study-deck[data-deck-id='cross-sell'] .case-study-deck__phone-video video"
);
const researchPopupTriggers = caseStudyEmbed
  ? [...caseStudyEmbed.querySelectorAll("[data-research-popup]")]
  : [];
const researchPopupPanels = caseStudyEmbed
  ? [...caseStudyEmbed.querySelectorAll("[data-research-popup-panel]")]
  : [];
const beforeAfterSliders = document.querySelectorAll("[data-before-after-slider]");
let activeResearchPopup = null;
let activeResearchPopupTrigger = null;
const caseStudyShaderCanvas = caseStudyEmbed?.querySelector(
  ".case-study-transition-fx__shader"
);
const transitionNames = new Set([
  "fade",
  "rise",
  "zoom",
  "wipe",
  "iris",
  "shutter",
  "soft-shutter",
  "industrial-shutter",
  "blinds",
  "portal",
  "page-turn",
  "liquid",
  "chromatic",
]);
function getActiveCaseStudyDeck() {
  return caseStudyEmbed?.querySelector(".case-study-deck.is-active") ?? null;
}

function activateCaseStudyDeck(deckId) {
  const nextDeckId = deckId || "cross-sell";

  caseStudyDecks.forEach((deck) => {
    const isActive = deck.dataset.deckId === nextDeckId;
    deck.classList.toggle("is-active", isActive);
    deck.hidden = !isActive;

    if (!isActive) {
      deck.scrollTop = 0;
    }
  });

  caseStudyEmbed?.setAttribute("data-active-deck", nextDeckId);
  document.dispatchEvent(
    new CustomEvent("case-study-deck-change", {
      detail: { deckId: nextDeckId },
    })
  );

  return getActiveCaseStudyDeck();
}

function resetCaseStudyDecks() {
  caseStudyDecks.forEach((deck) => {
    deck.scrollTop = 0;
  });
}
let selectedCaseStudyTransition = "soft-shutter";
let caseStudyShaderAnimationFrame = 0;
let caseStudyTransitionTimer = 0;
let caseStudySwapTimer = 0;

function selectCaseStudyTransition(transition) {
  if (!transitionNames.has(transition)) {
    return;
  }

  selectedCaseStudyTransition = transition;
  caseStudyEmbed?.setAttribute("data-transition", transition);
}

selectCaseStudyTransition(selectedCaseStudyTransition);

function stopCaseStudyShader() {
  if (caseStudyShaderAnimationFrame) {
    cancelAnimationFrame(caseStudyShaderAnimationFrame);
    caseStudyShaderAnimationFrame = 0;
  }
}

function compileCaseStudyShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function fallBackFromCaseStudyShader() {
  caseStudyEmbed?.setAttribute("data-transition", "iris");
  window.clearTimeout(caseStudyTransitionTimer);
  caseStudyTransitionTimer = window.setTimeout(() => {
    caseStudyEmbed?.classList.remove("is-entering");
  }, 1000);
}

function playCaseStudyShader(mode) {
  if (
    !caseStudyShaderCanvas ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    caseStudyEmbed?.classList.remove("is-entering");
    return;
  }

  stopCaseStudyShader();

  const gl = caseStudyShaderCanvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });

  if (!gl) {
    fallBackFromCaseStudyShader();
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform vec2 u_origin;
    uniform float u_progress;
    uniform float u_time;
    uniform float u_mode;
    uniform float u_max_distance;

    float random(vec2 point) {
      return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 point) {
      vec2 cell = floor(point);
      vec2 local = fract(point);
      local = local * local * (3.0 - 2.0 * local);

      return mix(
        mix(random(cell), random(cell + vec2(1.0, 0.0)), local.x),
        mix(random(cell + vec2(0.0, 1.0)), random(cell + vec2(1.0)), local.x),
        local.y
      );
    }

    float fbm(vec2 point) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int index = 0; index < 5; index++) {
        value += amplitude * noise(point);
        point = point * 2.03 + vec2(13.7, 9.2);
        amplitude *= 0.5;
      }

      return value;
    }

    vec3 spectral(float value) {
      return 0.55 + 0.45 * cos(6.28318 * (value + vec3(0.0, 0.34, 0.67)));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      vec2 ratioUv = uv - u_origin;
      ratioUv.x *= u_resolution.x / u_resolution.y;
      float grain = fbm(uv * 5.0 + vec2(u_time * 0.08, -u_time * 0.05));
      float metric;
      vec3 color;

      if (u_mode < 0.5) {
        float ripple = sin(length(ratioUv) * 42.0 - u_time * 8.0) * 0.025;
        metric = length(ratioUv) / u_max_distance;
        metric += (grain - 0.5) * 0.18 * (1.0 - u_progress) + ripple;
        color = mix(vec3(0.11, 0.075, 0.22), vec3(0.64, 0.42, 0.92), grain);
        color += vec3(0.1, 0.45, 0.7) * max(0.0, ripple * 18.0);
      } else {
        float columns = noise(vec2(floor(uv.x * 48.0), 2.0));
        float wave = sin(uv.x * 32.0 + u_time * 5.0) * 0.028;
        metric = uv.y + (columns - 0.5) * 0.2 + wave;
        color = spectral(uv.x * 1.4 + grain * 0.35 + u_time * 0.08);
        color *= 0.72 + 0.28 * sin((uv.y + grain) * 70.0);
      }

      float threshold = u_mode < 0.5 ? u_progress * 1.08 : u_progress * 1.18;
      float alpha = smoothstep(threshold - 0.045, threshold + 0.045, metric);
      float edge = 1.0 - smoothstep(0.0, 0.075, abs(metric - threshold));
      color += edge * (u_mode < 0.5 ? vec3(0.35, 0.8, 1.0) : vec3(1.0));

      gl_FragColor = vec4(color, alpha);
    }
  `;
  const vertexShader = compileCaseStudyShader(
    gl,
    gl.VERTEX_SHADER,
    vertexSource
  );
  const fragmentShader = compileCaseStudyShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentSource
  );

  if (!vertexShader || !fragmentShader) {
    fallBackFromCaseStudyShader();
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    fallBackFromCaseStudyShader();
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(caseStudyShaderCanvas.clientWidth * pixelRatio));
  const height = Math.max(
    1,
    Math.round(caseStudyShaderCanvas.clientHeight * pixelRatio)
  );

  caseStudyShaderCanvas.width = width;
  caseStudyShaderCanvas.height = height;
  gl.viewport(0, 0, width, height);
  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const originLocation = gl.getUniformLocation(program, "u_origin");
  const progressLocation = gl.getUniformLocation(program, "u_progress");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const modeLocation = gl.getUniformLocation(program, "u_mode");
  const maxDistanceLocation = gl.getUniformLocation(program, "u_max_distance");
  const originX =
    Number.parseFloat(
      caseStudyEmbed?.style.getPropertyValue("--transition-x")
    ) / window.innerWidth || 0.5;
  const originY =
    1 -
    (Number.parseFloat(
      caseStudyEmbed?.style.getPropertyValue("--transition-y")
    ) / window.innerHeight || 0.5);
  const aspect = width / height;
  const maxDistance = Math.max(
    Math.hypot(originX * aspect, originY),
    Math.hypot((1 - originX) * aspect, originY),
    Math.hypot(originX * aspect, 1 - originY),
    Math.hypot((1 - originX) * aspect, 1 - originY)
  );

  gl.uniform2f(resolutionLocation, width, height);
  gl.uniform2f(originLocation, originX, originY);
  gl.uniform1f(modeLocation, mode === "chromatic" ? 1 : 0);
  gl.uniform1f(maxDistanceLocation, maxDistance);

  const startedAt = performance.now();
  const duration = mode === "chromatic" ? 1250 : 1450;

  function renderShaderFrame(now) {
    const elapsed = now - startedAt;
    const linearProgress = Math.min(elapsed / duration, 1);
    const easedProgress = 1 - Math.pow(1 - linearProgress, 3);

    gl.uniform1f(progressLocation, easedProgress);
    gl.uniform1f(timeLocation, elapsed / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (linearProgress < 1) {
      caseStudyShaderAnimationFrame = requestAnimationFrame(renderShaderFrame);
      return;
    }

    caseStudyShaderAnimationFrame = 0;
    caseStudyEmbed?.classList.remove("is-entering");
  }

  renderShaderFrame(startedAt);
}

function closeCaseStudyEmbed() {
  if (!caseStudyEmbed?.open) {
    return;
  }

  stopCaseStudyShader();
  window.clearTimeout(caseStudyTransitionTimer);
  window.clearTimeout(caseStudySwapTimer);
  closeResearchPopup(false);
  caseStudyEmbed.close();
  caseStudyEmbed.classList.remove("is-entering", "is-content-ready");
  resetCaseStudyDecks();
  caseStudyCoverVideo?.pause();

  if (caseStudyCoverVideo) {
    caseStudyCoverVideo.currentTime = 0;
  }
}

function openResearchPopup(popupId, trigger) {
  const popup = researchPopupPanels.find(
    (candidate) => candidate.dataset.researchPopupPanel === popupId
  );

  if (!popup) {
    return;
  }

  activeResearchPopup?.setAttribute("hidden", "");
  activeResearchPopup = popup;
  activeResearchPopupTrigger = trigger;
  popup.removeAttribute("hidden");
  caseStudyEmbed?.classList.add("is-research-popup-open");
  popup.querySelector(".research-popup__close")?.focus({ preventScroll: true });
}

function closeResearchPopup(shouldRestoreFocus = true) {
  if (!activeResearchPopup) {
    return;
  }

  activeResearchPopup.setAttribute("hidden", "");
  caseStudyEmbed?.classList.remove("is-research-popup-open");
  const trigger = activeResearchPopupTrigger;
  activeResearchPopup = null;
  activeResearchPopupTrigger = null;

  if (shouldRestoreFocus) {
    trigger?.focus({ preventScroll: true });
  }
}

researchPopupTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    trigger.classList.add("is-pressed");
    window.setTimeout(() => {
      trigger.classList.remove("is-pressed");
      openResearchPopup(trigger.dataset.researchPopup, trigger);
    }, 110);
  });
});

researchPopupPanels.forEach((popup) => {
  popup.querySelectorAll("[data-research-popup-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeResearchPopup();
    });
  });
});

beforeAfterSliders.forEach((slider) => {
  const input = slider.querySelector("[data-before-after-input]");

  if (!input) {
    return;
  }

  const setComparisonPosition = (value) => {
    const position = Math.min(100, Math.max(0, Number(value)));
    slider.style.setProperty("--comparison-position", `${position}%`);
    input.value = String(position);
  };

  input.addEventListener("input", () => {
    setComparisonPosition(input.value);
  });

  slider.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    slider.setPointerCapture(event.pointerId);
    setComparisonPosition(
      ((event.clientX - slider.getBoundingClientRect().left) /
        slider.getBoundingClientRect().width) *
        100
    );
  });

  slider.addEventListener("pointermove", (event) => {
    if (!slider.hasPointerCapture(event.pointerId)) {
      return;
    }

    const bounds = slider.getBoundingClientRect();
    setComparisonPosition(((event.clientX - bounds.left) / bounds.width) * 100);
  });

  ["pointerup", "pointercancel"].forEach((eventName) => {
    slider.addEventListener(eventName, (event) => {
      if (slider.hasPointerCapture(event.pointerId)) {
        slider.releasePointerCapture(event.pointerId);
      }
    });
  });

  setComparisonPosition(input.value);
});

const magneticButtons = [...document.querySelectorAll("[data-magnetic-button]")];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const magnetRadius = 48;

function resetMagneticButton(button) {
  button.style.setProperty("--mag-x", "0px");
  button.style.setProperty("--mag-y", "0px");
  button.style.setProperty("--inner-x", "0px");
  button.style.setProperty("--inner-y", "0px");
}

function updateMagneticButton(button, clientX, clientY) {
  const bounds = button.getBoundingClientRect();
  const expanded = {
    left: bounds.left - magnetRadius,
    right: bounds.right + magnetRadius,
    top: bounds.top - magnetRadius,
    bottom: bounds.bottom + magnetRadius,
  };

  if (
    clientX < expanded.left ||
    clientX > expanded.right ||
    clientY < expanded.top ||
    clientY > expanded.bottom
  ) {
    resetMagneticButton(button);
    return;
  }

  const offsetX = clientX - (bounds.left + bounds.width / 2);
  const offsetY = clientY - (bounds.top + bounds.height / 2);

  button.style.setProperty("--mag-x", `${offsetX * 0.1}px`);
  button.style.setProperty("--mag-y", `${offsetY * 0.11}px`);
  button.style.setProperty("--inner-x", `${offsetX * 0.05}px`);
  button.style.setProperty("--inner-y", `${offsetY * 0.06}px`);
}

if (magneticButtons.length && !prefersReducedMotion) {
  document.addEventListener("pointermove", (event) => {
    magneticButtons.forEach((button) => {
      updateMagneticButton(button, event.clientX, event.clientY);
    });
  });
}

magneticButtons.forEach((button) => {
  button.addEventListener("pointerleave", () => {
    resetMagneticButton(button);
  });
});

if (caseStudyEmbed && caseStudyDecks.length && caseStudyEmbedClose) {
  document.querySelectorAll("[data-case-study-deck]").forEach((button) => {
    button.addEventListener("click", () => {
      const buttonRect = button.getBoundingClientRect();
      const deckId = button.dataset.caseStudyDeck || "cross-sell";
      const activeDeck = activateCaseStudyDeck(deckId);

      caseStudyEmbed.style.setProperty(
        "--transition-x",
        `${Math.round(buttonRect.left + buttonRect.width / 2)}px`
      );
      caseStudyEmbed.style.setProperty(
        "--transition-y",
        `${Math.round(buttonRect.top + buttonRect.height / 2)}px`
      );
      caseStudyEmbed.setAttribute("data-transition", selectedCaseStudyTransition);
      resetCaseStudyDecks();
      activeDeck && (activeDeck.scrollTop = 0);
      caseStudyEmbed.classList.remove("is-content-ready");
      caseStudyEmbed.classList.add("is-entering");
      caseStudyEmbed.showModal();
      window.clearTimeout(caseStudyTransitionTimer);
      window.clearTimeout(caseStudySwapTimer);

      if (
        selectedCaseStudyTransition === "soft-shutter" ||
        selectedCaseStudyTransition === "industrial-shutter"
      ) {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        const revealCaseStudy = () => {
          caseStudyEmbed.classList.add("is-content-ready");
          caseStudyCoverVideo?.play().catch(() => {});
        };

        if (reduceMotion) {
          revealCaseStudy();
        } else {
          caseStudySwapTimer = window.setTimeout(revealCaseStudy, 760);
        }

        caseStudyTransitionTimer = window.setTimeout(
          () => {
            caseStudyEmbed.classList.remove(
              "is-entering",
              "is-content-ready"
            );
          },
          reduceMotion ? 0 : 1850
        );
        return;
      }

      caseStudyCoverVideo?.play().catch(() => {});

      if (
        selectedCaseStudyTransition === "liquid" ||
        selectedCaseStudyTransition === "chromatic"
      ) {
        playCaseStudyShader(selectedCaseStudyTransition);
      } else {
        caseStudyTransitionTimer = window.setTimeout(() => {
          caseStudyEmbed.classList.remove("is-entering");
        }, 1500);
      }
    });
  });

  caseStudyEmbedClose.addEventListener("click", closeCaseStudyEmbed);

  caseStudyEmbed.addEventListener("cancel", (event) => {
    event.preventDefault();

    if (activeResearchPopup) {
      closeResearchPopup();
      return;
    }

    closeCaseStudyEmbed();
  });

  caseStudyEmbedStage?.addEventListener("animationend", (event) => {
    if (event.target === caseStudyEmbedStage) {
      caseStudyEmbed.classList.remove("is-entering");
    }
  });
}

if (panelWrap) {
  const phoneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          panelWrap.classList.add("is-arrived");
          phoneObserver.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );

  phoneObserver.observe(panelWrap);
}

const phonesScroll = document.querySelector(".work-card__phones-scroll");

if (phonesScroll) {
  let isDragging = false;
  let dragStartX = 0;
  let dragScrollLeft = 0;

  function centerMiddlePhone() {
    const centerPhone = phonesScroll.querySelector(".work-card__phone-center");

    if (!centerPhone) {
      return;
    }

    phonesScroll.scrollLeft =
      centerPhone.offsetLeft +
      centerPhone.offsetWidth / 2 -
      phonesScroll.clientWidth / 2;
  }

  phonesScroll.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  phonesScroll.addEventListener(
    "wheel",
    (event) => {
      if (phonesScroll.scrollWidth <= phonesScroll.clientWidth) {
        return;
      }

      const { deltaX, deltaY } = event;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Let vertical wheel pass through so the page can scroll between case studies.
      if (absY > absX) {
        return;
      }

      if (deltaX === 0) {
        return;
      }

      const maxScrollLeft = phonesScroll.scrollWidth - phonesScroll.clientWidth;
      const atLeft = phonesScroll.scrollLeft <= 0;
      const atRight = phonesScroll.scrollLeft >= maxScrollLeft - 1;

      if ((deltaX < 0 && atLeft) || (deltaX > 0 && atRight)) {
        return;
      }

      event.preventDefault();
      phonesScroll.scrollLeft += deltaX;
    },
    { passive: false }
  );

  phonesScroll.addEventListener("mousedown", (event) => {
    isDragging = true;
    dragStartX = event.clientX;
    dragScrollLeft = phonesScroll.scrollLeft;
    phonesScroll.classList.add("is-dragging");
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    phonesScroll.classList.remove("is-dragging");
  });

  phonesScroll.addEventListener("mouseleave", () => {
    isDragging = false;
    phonesScroll.classList.remove("is-dragging");
  });

  phonesScroll.addEventListener("mousemove", (event) => {
    if (!isDragging) {
      return;
    }

    event.preventDefault();
    const delta = event.clientX - dragStartX;
    phonesScroll.scrollLeft = dragScrollLeft - delta;
  });

  const phoneImages = phonesScroll.querySelectorAll("img");
  let loadedImages = 0;

  function onPhoneImageReady() {
    loadedImages += 1;

    if (loadedImages >= phoneImages.length) {
      centerMiddlePhone();
    }
  }

  phoneImages.forEach((image) => {
    if (image.complete) {
      onPhoneImageReady();
    } else {
      image.addEventListener("load", onPhoneImageReady);
    }
  });

  if (phoneImages.length === 0) {
    centerMiddlePhone();
  }

  requestAnimationFrame(centerMiddlePhone);
  window.addEventListener("resize", centerMiddlePhone);
}

const workArea = document.getElementById("work");
const workNav = document.querySelector(".work-nav");
const workNavButtons = document.querySelectorAll(".work-nav__button");
const caseStudies = document.querySelectorAll("[data-case-study]");
const heroScreen = document.querySelector(".hero-screen");
const siteFooter = document.querySelector(".demo-page");

if (workArea && workNav && caseStudies.length) {
  let isScrollingToCase = false;
  let scrollUnlockTimer = null;
  let exitTimer = null;
  let navTicking = false;

  function setActiveCase(id) {
    workNavButtons.forEach((button) => {
      const isActive = button.dataset.target === id;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", String(isActive));
    });
  }

  function setNavState(state) {
    if (workNav.dataset.state === state) {
      return;
    }

    clearTimeout(exitTimer);

    if (state === "exiting") {
      workNav.dataset.state = "exiting";
      workNav.setAttribute("aria-hidden", "true");

      exitTimer = window.setTimeout(() => {
        if (workNav.dataset.state === "exiting") {
          workNav.dataset.state = "hidden";
        }
      }, 180);
      return;
    }

    workNav.dataset.state = state;
    workNav.setAttribute("aria-hidden", String(state !== "visible"));
  }

  function updateNavVisibility() {
    navTicking = false;

    if (!heroScreen) {
      return;
    }

    const heroBottom = heroScreen.getBoundingClientRect().bottom;
    const footerTop = siteFooter?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
    const showThreshold = window.innerHeight * 0.22;
    const hideThreshold = window.innerHeight * 0.38;
    const footerHideThreshold = window.innerHeight * 0.82;
    const currentState = workNav.dataset.state;
    const isFooterVisible = footerTop <= footerHideThreshold;
    const shouldShow =
      !isFooterVisible &&
      (currentState === "visible"
        ? heroBottom <= hideThreshold
        : heroBottom <= showThreshold);

    if (shouldShow) {
      setNavState("visible");
    } else if (currentState === "visible") {
      setNavState("exiting");
    } else if (currentState !== "exiting") {
      setNavState("hidden");
    }
  }

  function queueNavVisibilityUpdate() {
    if (!navTicking) {
      navTicking = true;
      requestAnimationFrame(updateNavVisibility);
    }
  }

  function scrollToCase(id) {
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    isScrollingToCase = true;
    clearTimeout(scrollUnlockTimer);
    setActiveCase(id);

    target.scrollIntoView({ behavior: "smooth", block: "start" });

    scrollUnlockTimer = window.setTimeout(() => {
      isScrollingToCase = false;

      if (id === "case-fiserv") {
        window.WaChat?.launch?.({ replay: true });
      }
    }, 900);
  }

  workNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      scrollToCase(button.dataset.target);
    });
  });

  window.addEventListener("scroll", queueNavVisibilityUpdate, { passive: true });
  window.addEventListener("resize", queueNavVisibilityUpdate);
  queueNavVisibilityUpdate();

  const caseObserver = new IntersectionObserver(
    (entries) => {
      if (isScrollingToCase) {
        return;
      }

      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        const activeId = visible[0].target.id;
        setActiveCase(activeId);

        if (activeId === "case-fiserv") {
          window.WaChat?.launch?.();
        }
      }
    },
    {
      root: null,
      threshold: [0.25, 0.5, 0.75],
      rootMargin: "-20% 0px -20% 0px",
    }
  );

  caseStudies.forEach((section) => {
    caseObserver.observe(section);
  });
}

