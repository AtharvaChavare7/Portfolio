(function initBannerPhysics() {
  const panel = document.querySelector(".work-card__panel--main");
  const stage = panel?.querySelector(".work-card__banner-stage");

  if (!panel || !stage || typeof Matter === "undefined") {
    return;
  }

  const {
    Engine,
    Runner,
    Bodies,
    Body,
    Composite,
    Events,
    Mouse,
    MouseConstraint,
  } = Matter;

  const PANEL_W = 654;
  const PANEL_H = 730;
  const SLANT = 0.085;

  const PHONE = {
    x: 155,
    y: 0,
    w: 343.92,
    h: 519.38,
  };

  const DROP_ZONE_TOP = PHONE.y + PHONE.h + 6;
  const STACK_X = 327;

  const banners = [
    { src: "assets/card/banners/banner-1.png", w: 317.55, h: 46, slant: 1 },
    { src: "assets/card/banners/banner-2.png", w: 317.55, h: 46, slant: -1 },
    { src: "assets/card/banners/banner-3.png", w: 317.55, h: 70.65, slant: 1 },
    { src: "assets/card/banners/banner-4.png", w: 317.55, h: 46.38, slant: -1 },
    { src: "assets/card/banners/banner-5.png", w: 317.55, h: 46.38, slant: 1 },
  ];

  const engine = Engine.create({
    gravity: { x: 0, y: 1.2 },
    enableSleeping: true,
  });

  const wall = { isStatic: true, friction: 0.95, restitution: 0.05 };
  const thickness = 40;

  Composite.add(engine.world, [
    Bodies.rectangle(PANEL_W / 2, PANEL_H + thickness / 2, PANEL_W + 80, thickness, wall),
    Bodies.rectangle(-thickness / 2, PANEL_H / 2, thickness, PANEL_H * 2, wall),
    Bodies.rectangle(PANEL_W + thickness / 2, PANEL_H / 2, thickness, PANEL_H * 2, wall),
    Bodies.rectangle(
      PHONE.x + PHONE.w / 2,
      PHONE.y + PHONE.h / 2,
      PHONE.w,
      PHONE.h,
      wall
    ),
  ]);

  const items = [];
  let hasDropped = false;

  function slantAngle(direction) {
    return direction > 0 ? SLANT : -SLANT;
  }

  function dropBanners() {
    if (hasDropped) {
      return;
    }

    hasDropped = true;

    banners.forEach((banner, index) => {
      window.setTimeout(() => {
        const angle = slantAngle(banner.slant);
        const x = STACK_X + (banner.slant > 0 ? 16 : -16);
        const y = DROP_ZONE_TOP + 40 - index * 10;

        const img = document.createElement("img");
        img.src = banner.src;
        img.className = "work-card__banner";
        img.alt = "";
        img.width = banner.w;
        img.height = banner.h;
        img.style.width = `${banner.w}px`;
        img.style.height = `${banner.h}px`;
        stage.appendChild(img);

        const body = Bodies.rectangle(x, y, banner.w, banner.h, {
          angle,
          restitution: 0.1,
          friction: 0.95,
          frictionAir: 0.04,
          density: 0.0024,
          chamfer: { radius: 4 },
          slop: 0.02,
        });

        Body.setInertia(body, body.inertia * 10);
        Body.setAngularVelocity(body, 0);
        Composite.add(engine.world, body);
        items.push({ body, img, targetSlant: banner.slant });
      }, index * 220);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          dropBanners();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
  );

  observer.observe(panel);

  const mouse = Mouse.create(stage);
  mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
  mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.16,
      damping: 0.1,
    },
  });

  Composite.add(engine.world, mouseConstraint);

  const runner = Runner.create();
  Runner.run(runner, engine);

  Events.on(engine, "beforeUpdate", () => {
    items.forEach(({ body, targetSlant }) => {
      const targetAngle = slantAngle(targetSlant);
      const speed = body.speed;
      const angularSpeed = Math.abs(body.angularVelocity);

      if (speed < 0.4 && angularSpeed > 0.004) {
        Body.setAngularVelocity(body, body.angularVelocity * 0.8);
      }

      if (Math.abs(body.angle) > 0.2) {
        Body.setAngle(body, Math.max(-0.2, Math.min(0.2, body.angle)));
        Body.setAngularVelocity(body, body.angularVelocity * 0.4);
      }

      if (body.isSleeping || (speed < 0.06 && angularSpeed < 0.008)) {
        Body.setAngle(body, body.angle + (targetAngle - body.angle) * 0.05);
        Body.setAngularVelocity(body, 0);
      }
    });
  });

  Events.on(engine, "afterUpdate", () => {
    items.forEach(({ body, img }) => {
      img.style.left = `${body.position.x}px`;
      img.style.top = `${body.position.y}px`;
      img.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
    });
  });
})();
