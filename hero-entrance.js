(() => {
  const hero = document.querySelector(".hero");

  if (!hero || typeof gsap === "undefined") {
    hero?.classList.add("hero--revealed");
    return;
  }

  const intro = hero.querySelector(".hero__intro");
  const lines = hero.querySelectorAll(".hero__title > .hero__line");
  const words = hero.querySelectorAll(".hero__word");
  const stage = hero.querySelector(".hero__stage");
  const pills = hero.querySelectorAll(".hero__pill");

  if (!intro || !stage || lines.length === 0 || pills.length === 0) {
    hero.classList.add("hero--revealed");
    return;
  }

  const textModes = new Set([
    "line-rise",
    "word-cascade",
    "soft-focus",
    "clip-reveal",
    "scale-settle",
    "alternating-slide",
    "grid-blocks",
  ]);

  function getTextMode() {
    return "scale-settle";
  }

  function addTextAnimation(timeline, mode, position = 0) {
    hero.classList.toggle("hero--grid-entry", mode === "grid-blocks");

    timeline.fromTo(
      intro,
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.38, ease: "power3.out" },
      position
    );

    if (mode === "grid-blocks") {
      timeline
        .set(
          lines,
          {
            overflow: "hidden",
            backgroundColor: "#050505",
            color: "#ffffff",
          },
          position
        )
        .fromTo(
          hero,
          { "--hero-grid-opacity": 0 },
          {
            "--hero-grid-opacity": 1,
            duration: 0.3,
            ease: "power2.out",
          },
          position
        )
        .fromTo(
          words,
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 0.5,
            stagger: 0.035,
            ease: "power3.out",
          },
          position + 0.1
        )
        .to(
          lines,
          {
            backgroundColor: "rgba(5,5,5,0)",
            color: "#424242",
            duration: 0.38,
            stagger: 0.045,
            ease: "power2.inOut",
          },
          position + 0.68
        )
        .to(
          hero,
          {
            "--hero-grid-opacity": 0,
            duration: 0.42,
            ease: "power2.inOut",
          },
          position + 0.68
        );
      return;
    }

    if (mode === "word-cascade") {
      timeline.fromTo(
        words,
        { autoAlpha: 0, y: 22, rotationX: -18 },
        {
          autoAlpha: 1,
          y: 0,
          rotationX: 0,
          duration: 0.42,
          stagger: 0.035,
          ease: "power3.out",
        },
        position + 0.03
      );
      return;
    }

    if (mode === "soft-focus") {
      timeline.fromTo(
        lines,
        { autoAlpha: 0, y: 10, filter: "blur(12px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.58,
          stagger: 0.065,
          ease: "power2.out",
        },
        position + 0.03
      );
      return;
    }

    if (mode === "clip-reveal") {
      timeline
        .set(lines, { overflow: "hidden" }, position)
        .fromTo(
          words,
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 0.52,
            stagger: 0.035,
            ease: "power3.out",
          },
          position + 0.03
        );
      return;
    }

    if (mode === "scale-settle") {
      const gradientColors = [
        "#cdb0ed",
        "#49d2fc",
        "#cee800",
        "#ffe37d",
        "#ff9393",
      ];

      timeline
        .fromTo(
          lines,
          {
            autoAlpha: 0,
            y: 8,
            scale: 0.9,
            transformOrigin: "left bottom",
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.52,
            stagger: 0.07,
            ease: "back.out(1.45)",
          },
          position + 0.03
        )
        .to(
          words,
          {
            color: (index) => gradientColors[index % gradientColors.length],
            duration: 0.3,
            stagger: 0.04,
            ease: "sine.inOut",
          },
          position + 0.08
        )
        .to(
          words,
          {
            color: "#424242",
            duration: 0.38,
            stagger: 0.04,
            ease: "sine.inOut",
          },
          position + 0.34
        );
      return;
    }

    if (mode === "alternating-slide") {
      timeline.fromTo(
        lines,
        {
          autoAlpha: 0,
          x: (index) => (index % 2 === 0 ? -38 : 38),
        },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.48,
          stagger: 0.065,
          ease: "power3.out",
        },
        position + 0.03
      );
      return;
    }

    timeline.fromTo(
      lines,
      { autoAlpha: 0, y: 22 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.48,
        stagger: 0.055,
        ease: "power3.out",
      },
      position + 0.03
    );
  }

  window.previewHeroTextAnimation = (mode = getTextMode()) => {
    if (!textModes.has(mode)) return;

    const targets = [intro, ...lines, ...words];
    gsap.killTweensOf(targets);
    gsap.set(targets, {
      clearProps:
        "opacity,visibility,transform,transform-origin,filter,will-change,color",
    });
    gsap.set(lines, {
      clearProps: "overflow,background-color,color,width",
    });
    gsap.set(hero, { clearProps: "--hero-grid-opacity" });
    hero.classList.remove("hero--grid-entry");

    const preview = gsap.timeline({
      onComplete: () => {
        gsap.set(targets, {
          clearProps:
            "opacity,visibility,transform,transform-origin,filter,will-change,color",
        });
        gsap.set(lines, {
          clearProps: "overflow,background-color,color,width",
        });
        gsap.set(hero, { clearProps: "--hero-grid-opacity" });
        hero.classList.remove("hero--grid-entry");
      },
    });

    addTextAnimation(preview, mode);
  };

  const initialSpecs = [
    {
      src: "PURPLEinitail.svg",
      alt: "Crafting animations",
      nativeWidth: 157,
      nativeHeight: 40,
      targetLeft: 388.228,
      targetTop: -0.849,
      targetWidth: 198.403,
      targetHeight: 49.835,
    },
    {
      src: "GREENinitial.svg",
      alt: "Shipping PRs",
      nativeWidth: 103,
      nativeHeight: 37,
      targetLeft: 657.153,
      targetTop: 66,
      targetWidth: 128.499,
      targetHeight: 46.171,
    },
    {
      src: "YELLOWinitial.svg",
      alt: "Detail obsessed",
      nativeWidth: 126,
      nativeHeight: 43,
      targetLeft: 710.267,
      targetTop: 218.978,
      targetWidth: 158.435,
      targetHeight: 52.87,
    },
    {
      src: "BLUEinitial.svg",
      alt: "Agent workflow",
      nativeWidth: 136,
      nativeHeight: 43,
      targetLeft: 0,
      targetTop: 287.201,
      targetWidth: 172.406,
      targetHeight: 54.231,
    },
    {
      src: "REDinitial.svg",
      alt: "Design system nerd",
      nativeWidth: 149,
      nativeHeight: 40,
      targetLeft: 475.529,
      targetTop: 288.675,
      targetWidth: 187.418,
      targetHeight: 49.259,
    },
  ];

  const initialPills = initialSpecs.map((spec) => {
    const image = document.createElement("img");
    const centerX = spec.targetLeft + spec.targetWidth / 2;
    const centerY = spec.targetTop + spec.targetHeight / 2;

    image.className = "hero__pill-initial";
    image.src = spec.src;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.width = spec.nativeWidth;
    image.height = spec.nativeHeight;
    image.style.left = `${centerX - spec.nativeWidth / 2}px`;
    image.style.top = `${centerY - spec.nativeHeight / 2}px`;
    image.style.width = `${spec.nativeWidth}px`;
    stage.append(image);

    return image;
  });

  hero.classList.add("hero--animating");

  const mm = gsap.matchMedia();

  mm.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      allowMotion: "(prefers-reduced-motion: no-preference)",
    },
    (context) => {
      if (context.conditions.reduceMotion) {
        initialPills.forEach((pill) => pill.remove());
        hero.classList.remove("hero--animating");
        hero.classList.add("hero--revealed");
        return undefined;
      }

      gsap.set(initialPills, {
        autoAlpha: 0,
        scale: 0.94,
        transformOrigin: "50% 50%",
      });
      gsap.set(pills, {
        autoAlpha: 0,
        scale: 1,
        transformOrigin: "50% 50%",
      });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          initialPills.forEach((pill) => pill.remove());
          gsap.set([intro, lines, words, pills], {
            clearProps:
              "opacity,visibility,transform,transform-origin,will-change,color",
          });
          gsap.set(lines, {
            clearProps: "overflow,background-color,color,width",
          });
          gsap.set(hero, { clearProps: "--hero-grid-opacity" });
          hero.classList.remove("hero--grid-entry");
          hero.classList.remove("hero--animating");
          hero.classList.add("hero--revealed");
        },
      });

      timeline
        .addLabel("copy", 0);

      addTextAnimation(timeline, getTextMode(), 0);

      initialPills.forEach((initialPill, index) => {
        const finalPill = pills[index];
        const targetScale =
          initialSpecs[index].targetWidth / initialSpecs[index].nativeWidth;
        const start =
          (getTextMode() === "grid-blocks" ? 0.92 : 0.08) + index * 0.1;

        timeline
          .to(
            initialPill,
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.18,
              ease: "power2.out",
            },
            start
          )
          .to(
            initialPill,
            {
              scale: targetScale * 1.045,
              duration: 0.32,
              ease: "power3.inOut",
            },
            start + 0.12
          )
          .to(
            initialPill,
            {
              scale: targetScale,
              duration: 0.16,
              ease: "sine.inOut",
            },
            start + 0.37
          )
          .to(
            finalPill,
            {
              autoAlpha: 1,
              duration: 0.14,
              ease: "sine.inOut",
            },
            start + 0.44
          )
          .to(
            initialPill,
            {
              autoAlpha: 0,
              duration: 0.14,
              ease: "sine.inOut",
            },
            start + 0.44
          );
      });

      return () => timeline.kill();
    }
  );

  window.addEventListener(
    "pagehide",
    () => {
      mm.revert();
      initialPills.forEach((pill) => pill.remove());
      gsap.set(hero, { clearProps: "--hero-grid-opacity" });
      hero.classList.remove("hero--grid-entry");
      hero.classList.remove("hero--animating");
      hero.classList.add("hero--revealed");
    },
    { once: true }
  );
})();
