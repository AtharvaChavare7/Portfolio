/* Interactions for the dedicated case-study pages.
   A self-contained port of the three deck behaviours that live in the home
   page's script.js (which is too coupled to index.html to load here):
   the before/after comparison slider, the research pop-ups (cross-sell), and
   autoplay of the cover phone video. All scoped to the current page. */
(function initCaseStudyPage() {
  const embed = document.querySelector(".case-study-embed");

  /* --- Before/after comparison slider --- */
  document.querySelectorAll("[data-before-after-slider]").forEach((slider) => {
    const input = slider.querySelector("[data-before-after-input]");
    if (!input) {
      return;
    }

    const setPosition = (value) => {
      const position = Math.min(100, Math.max(0, Number(value)));
      slider.style.setProperty("--comparison-position", `${position}%`);
      input.value = String(position);
    };

    input.addEventListener("input", () => setPosition(input.value));

    slider.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      slider.setPointerCapture(event.pointerId);
      const bounds = slider.getBoundingClientRect();
      setPosition(((event.clientX - bounds.left) / bounds.width) * 100);
    });

    slider.addEventListener("pointermove", (event) => {
      if (!slider.hasPointerCapture(event.pointerId)) {
        return;
      }
      const bounds = slider.getBoundingClientRect();
      setPosition(((event.clientX - bounds.left) / bounds.width) * 100);
    });

    ["pointerup", "pointercancel"].forEach((name) => {
      slider.addEventListener(name, (event) => {
        if (slider.hasPointerCapture(event.pointerId)) {
          slider.releasePointerCapture(event.pointerId);
        }
      });
    });

    setPosition(input.value);
  });

  /* --- Research pop-ups (screener / discussion guide) --- */
  const popupPanels = [...document.querySelectorAll("[data-research-popup-panel]")];
  let activePopup = null;
  let activeTrigger = null;

  function openPopup(popupId, trigger) {
    const popup = popupPanels.find(
      (candidate) => candidate.dataset.researchPopupPanel === popupId
    );
    if (!popup) {
      return;
    }
    activePopup?.setAttribute("hidden", "");
    activePopup = popup;
    activeTrigger = trigger;
    popup.removeAttribute("hidden");
    embed?.classList.add("is-research-popup-open");
    popup.querySelector(".research-popup__close")?.focus({ preventScroll: true });
  }

  function closePopup(restoreFocus = true) {
    if (!activePopup) {
      return;
    }
    activePopup.setAttribute("hidden", "");
    embed?.classList.remove("is-research-popup-open");
    const trigger = activeTrigger;
    activePopup = null;
    activeTrigger = null;
    if (restoreFocus) {
      trigger?.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll("[data-research-popup]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      trigger.classList.add("is-pressed");
      window.setTimeout(() => {
        trigger.classList.remove("is-pressed");
        openPopup(trigger.dataset.researchPopup, trigger);
      }, 110);
    });
  });

  popupPanels.forEach((popup) => {
    popup.querySelectorAll("[data-research-popup-close]").forEach((button) => {
      button.addEventListener("click", () => closePopup());
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activePopup) {
      closePopup();
    }
  });

  /* --- Autoplay the cover phone video (muted, looping) --- */
  document
    .querySelectorAll(".case-study-deck__phone-video video")
    .forEach((video) => {
      video.muted = true;
      const play = () => video.play().catch(() => {});
      if (video.readyState >= 2) {
        play();
      } else {
        video.addEventListener("loadeddata", play, { once: true });
      }
    });
  /* --- Phone-only short version (.cs-mobile) --- */
  const mobile = document.querySelector(".cs-mobile");
  if (mobile && window.matchMedia("(max-width: 720px)").matches) {
    const heroVideo = mobile.querySelector("[data-cs-m-video]");
    if (heroVideo) {
      heroVideo.muted = true;
      heroVideo.preload = "auto";
      heroVideo.play().catch(() => {});
    }

    const reveals = mobile.querySelectorAll("[data-cs-m-reveal]");
    if ("IntersectionObserver" in window && reveals.length) {
      mobile.classList.add("is-armed");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px" }
      );
      reveals.forEach((element) => observer.observe(element));
    }

    const copyButton = mobile.querySelector("[data-cs-m-copy]");
    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        const url = window.location.href.split("#")[0];
        try {
          if (navigator.share) {
            await navigator.share({ title: document.title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          copyButton.textContent = "Link copied";
        } catch (error) {
          /* Share sheet dismissed or clipboard blocked: leave the label as is. */
        }
      });
    }
  }
})();
