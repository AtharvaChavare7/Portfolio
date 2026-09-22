(function () {
  var frame = document.querySelector("[data-agent-carousel]");
  var backdrop = frame && frame.querySelector("[data-agent-carousel-backdrop]");
  if (!frame || !backdrop) return;

  var canvas = document.createElement("canvas");
  canvas.className = "particle-sphere";
  canvas.setAttribute("aria-hidden", "true");
  backdrop.appendChild(canvas);

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var BASE_DIAMETER = 580;
  var BASE_FRAME_WIDTH = 621;
  var PARTICLE_COUNT = 2450;
  var SIZE_SCALE = 1.05;
  var OPACITY_SCALE = 0.45;
  var HOVER_RADIUS = 90;
  var RIPPLE_SPEED = 220;
  var RIPPLE_WIDTH = 28;
  var RIPPLE_DURATION = 1400;

  var particles = [];
  var ripples = [];
  var rotation = { x: 0.32, y: 0 };
  var time = 0;
  var mouse = { x: 0, y: 0, active: false };
  var layoutCache = { diameter: 0, cx: 0, cy: 0 };

  function buildSphere() {
    particles = [];
    var guard = 0;

    while (particles.length < PARTICLE_COUNT && guard < PARTICLE_COUNT * 50) {
      guard += 1;

      var x = Math.random() * 2 - 1;
      var y = Math.random() * 2 - 1;
      var z = Math.random() * 2 - 1;
      var len = Math.sqrt(x * x + y * y + z * z);
      if (len < 0.001) continue;

      x /= len;
      y /= len;
      z /= len;

      var rim = Math.sqrt(x * x + y * y);
      var core = Math.abs(z);
      var accept = Math.random() < 0.18 + rim * rim * 1.15 + Math.random() * 0.22;
      if (core > 0.72 && Math.random() < core * 0.55) accept = false;
      if (!accept) continue;

      var jitter = 0.05 + Math.random() * 0.09;
      x += (Math.random() - 0.5) * jitter;
      y += (Math.random() - 0.5) * jitter;
      z += (Math.random() - 0.5) * jitter;
      len = Math.sqrt(x * x + y * y + z * z);
      x /= len;
      y /= len;
      z /= len;

      particles.push({
        bx: x,
        by: y,
        bz: z,
        x: x,
        y: y,
        z: z,
        noise: Math.random(),
      });
    }
  }

  function rotateY(x, y, z, a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    return { x: x * c + z * s, y: y, z: -x * s + z * c };
  }

  function rotateX(x, y, z, a) {
    var c = Math.cos(a);
    var s = Math.sin(a);
    return { x: x, y: y * c - z * s, z: y * s + z * c };
  }

  function getFixedLayout() {
    var fw = backdrop.clientWidth;
    var fh = backdrop.clientHeight;
    var scale = frame.clientWidth / BASE_FRAME_WIDTH;
    var diameter = BASE_DIAMETER * scale * 0.94;
    return {
      diameter: diameter,
      radius: diameter * 0.5,
      cx: fw * 0.5,
      cy: fh * 0.49,
    };
  }

  function applyCanvasLayout(layout) {
    var size = Math.ceil(layout.diameter);
    canvas.style.left = layout.cx - layout.radius + "px";
    canvas.style.top = layout.cy - layout.radius + "px";

    if (layoutCache.diameter === size) return;

    layoutCache.diameter = size;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function canvasPointFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function drawDot(x, y, radius, alpha) {
    if (radius < 0.55) {
      ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
      ctx.fillRect(x, y, 1, 1);
      return;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
    ctx.fill();
  }

  function applyRipples(px, py, pz, sx, sy, reactOut) {
    var now = performance.now();

    ripples = ripples.filter(function (ripple) {
      return now - ripple.start < RIPPLE_DURATION;
    });

    ripples.forEach(function (ripple) {
      var age = (now - ripple.start) / 1000;
      var waveR = age * RIPPLE_SPEED;
      var dx = sx - ripple.x;
      var dy = sy - ripple.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var band = Math.abs(dist - waveR);

      if (band > RIPPLE_WIDTH) return;

      var falloff = 1 - band / RIPPLE_WIDTH;
      var fade = 1 - age / (RIPPLE_DURATION / 1000);
      var force = falloff * falloff * fade * 0.28;
      var len = Math.sqrt(px * px + py * py + pz * pz) || 1;

      reactOut.x += (px / len) * force;
      reactOut.y += (py / len) * force;
      reactOut.z += (pz / len) * force;
    });
  }

  function draw() {
    var layout = getFixedLayout();
    applyCanvasLayout(layout);

    var radius = layout.radius;
    var size = layout.diameter;
    var cx = size * 0.5;
    var cy = size * 0.5;

    ctx.clearRect(0, 0, size, size);

    rotation.y += 0.0018;
    rotation.x = 0.32 + Math.sin(time * 0.00055) * 0.035;
    time += 16;

    var projected = [];

    particles.forEach(function (p, i) {
      p.x += (p.bx - p.x) * 0.07;
      p.y += (p.by - p.y) * 0.07;
      p.z += (p.bz - p.z) * 0.07;

      var pulse = Math.sin(time * 0.0012 + i * 0.08) * 0.006;
      var px = p.x + pulse;
      var py = p.y + pulse * 0.6;
      var pz = p.z;
      var react = 0;

      var r1 = rotateY(px, py, pz, rotation.y);
      var r2 = rotateX(r1.x, r1.y, r1.z, rotation.x);
      var sx = cx + r2.x * radius;
      var sy = cy + r2.y * radius;

      if (mouse.active) {
        var mdx = sx - mouse.x;
        var mdy = sy - mouse.y;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mdist < HOVER_RADIUS) {
          react = 1 - mdist / HOVER_RADIUS;
          react = react * react;
          var len = Math.sqrt(r2.x * r2.x + r2.y * r2.y + r2.z * r2.z) || 1;
          p.x += (r2.x / len) * react * 0.18;
          p.y += (r2.y / len) * react * 0.18;
          p.z += (r2.z / len) * react * 0.18;
          px = p.x + pulse;
          py = p.y + pulse * 0.6;
          pz = p.z;
          r1 = rotateY(px, py, pz, rotation.y);
          r2 = rotateX(r1.x, r1.y, r1.z, rotation.x);
          sx = cx + r2.x * radius;
          sy = cy + r2.y * radius;
        }
      }

      var ripplePush = { x: 0, y: 0, z: 0 };
      applyRipples(px, py, pz, sx, sy, ripplePush);
      if (ripplePush.x || ripplePush.y || ripplePush.z) {
        p.x += ripplePush.x;
        p.y += ripplePush.y;
        p.z += ripplePush.z;
        r1 = rotateY(p.x, p.y, p.z, rotation.y);
        r2 = rotateX(r1.x, r1.y, r1.z, rotation.x);
        sx = cx + r2.x * radius;
        sy = cy + r2.y * radius;
      }

      var dx = sx - cx;
      var dy = sy - cy;
      var distFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distFromCenter > radius) return;

      projected.push({
        sx: sx,
        sy: sy,
        z: r2.z,
        react: react,
        noise: p.noise,
        edgeDist: radius - distFromCenter,
      });
    });

    projected.sort(function (a, b) {
      return a.z - b.z;
    });

    projected.forEach(function (pr) {
      var depth = (pr.z + 1) * 0.5;
      var edgeFade = Math.min(1, pr.edgeDist / 16);
      var alpha =
        (0.2 + depth * 0.58 + pr.react * 0.22 + (pr.noise - 0.5) * 0.1) *
        OPACITY_SCALE *
        edgeFade;
      var dotRadius = (0.4 + depth * 0.62 + (pr.noise - 0.5) * 0.12) * SIZE_SCALE;
      drawDot(pr.sx, pr.sy, dotRadius, Math.min(0.92, alpha));
    });

    requestAnimationFrame(draw);
  }

  frame.addEventListener("mousemove", function (e) {
    var pt = canvasPointFromEvent(e);
    mouse.x = pt.x;
    mouse.y = pt.y;
    mouse.active = true;
  });

  frame.addEventListener("mouseleave", function () {
    mouse.active = false;
  });

  frame.addEventListener("click", function (e) {
    var pt = canvasPointFromEvent(e);
    ripples.push({ x: pt.x, y: pt.y, start: performance.now() });
  });

  buildSphere();
  requestAnimationFrame(draw);

  window.addEventListener("resize", function () {
    layoutCache.diameter = 0;
  });
})();
