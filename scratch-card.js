(function createViewportConfetti() {
  const COLORS = ["#1f55ff", "#cee800", "#ff9393", "#49d2fc", "#cdb0ed", "#ffe37d", "#ff6b6b", "#00c853"];
  let canvas = null;
  let ctx = null;
  let animationId = null;

  function ensureCanvas() {
    if (canvas) {
      return;
    }

    canvas = document.createElement("canvas");
    canvas.id = "site-confetti";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99999";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  function resizeCanvas() {
    if (!canvas || !ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.launchSiteConfetti = function launchSiteConfetti(anchorEl) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    if (typeof window.playConfettiPopSound === "function") {
      window.playConfettiPopSound();
    }

    ensureCanvas();
    resizeCanvas();

    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    const particles = [];
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    for (let index = 0; index < 220; index += 1) {
      particles.push({
        x: Math.random() * viewW,
        y: Math.random() * -viewH * 0.35 - 20,
        vx: (Math.random() - 0.5) * 2.4,
        vy: Math.random() * 2.5 + 2.5,
        w: Math.random() * 9 + 6,
        h: Math.random() * 5 + 4,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.22,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
      });
    }

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      for (let index = 0; index < 160; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 14 + 5;

        particles.push({
          x: originX + (Math.random() - 0.5) * 24,
          y: originY + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 8,
          w: Math.random() * 10 + 7,
          h: Math.random() * 6 + 4,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.28,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
        });
      }
    }

    let frame = 0;

    function animate() {
      ctx.clearRect(0, 0, viewW, viewH);
      let alive = false;

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.28;
        particle.vx *= 0.992;
        particle.rotation += particle.spin;
        particle.life -= 0.0035;

        if (particle.life <= 0 || particle.y > viewH + 40) {
          return;
        }

        alive = true;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = Math.min(1, particle.life * 1.15);
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h);
        ctx.restore();
      });

      frame += 1;

      if (alive && frame < 420) {
        animationId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, viewW, viewH);
        animationId = null;
      }
    }

    animate();
  };

  window.addEventListener("resize", resizeCanvas);
})();

(function createScratchAudio() {
  let audioContext = null;
  let grainBuffer = null;
  let isActive = false;
  let travelSinceGrain = 0;
  let lastGrainAt = 0;

  function isEnabled() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  function resumeContext() {
    const context = getContext();
    if (context.state === "suspended") {
      context.resume();
    }
  }

  function buildGrainBuffer() {
    if (grainBuffer) {
      return grainBuffer;
    }

    const context = getContext();
    const sampleRate = context.sampleRate;
    const duration = 0.24;
    const frameCount = Math.floor(sampleRate * duration);
    grainBuffer = context.createBuffer(1, frameCount, sampleRate);
    const channel = grainBuffer.getChannelData(0);
    let pink = 0;

    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      pink = pink * 0.92 + white * 0.08;
      const crackle = Math.random() > 0.93 ? (Math.random() * 2 - 1) * 2.4 : 0;
      const t = index / frameCount;
      const envelope = Math.pow(Math.sin(t * Math.PI), 1.35);
      channel[index] = (pink * 0.75 + crackle * 0.25) * envelope;
    }

    return grainBuffer;
  }

  function emitPaperGrain(intensity, delay = 0) {
    const context = getContext();
    const now = context.currentTime + delay;
    const normalized = Math.min(2.4, Math.max(0.2, intensity));
    const duration = 0.05 + Math.random() * 0.05;
    const source = context.createBufferSource();
    source.buffer = buildGrainBuffer();
    source.playbackRate.value = 0.65 + normalized * 0.35;

    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1100 + Math.random() * 1200;
    bandpass.Q.value = 0.7 + Math.random() * 0.8;

    const gain = context.createGain();
    const peak = 0.3;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.min(0.52, peak * normalized), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + duration + 0.01);
  }

  function maybeEmitGrains(intensity, force = false) {
    if (!isEnabled()) {
      return;
    }

    resumeContext();

    const now = performance.now();
    travelSinceGrain += intensity * 6;

    if (force) {
      emitPaperGrain(intensity);
      travelSinceGrain = 0;
      lastGrainAt = now;
      return;
    }

    const minTravel = Math.max(5, 14 - intensity * 4);
    const minGap = Math.max(14, 26 - intensity * 8);

    if (travelSinceGrain < minTravel || now - lastGrainAt < minGap) {
      return;
    }

    travelSinceGrain = 0;
    lastGrainAt = now;
    emitPaperGrain(intensity);
  }

  window.scratchSoundStart = function scratchSoundStart(speed = 0.4) {
    isActive = true;
    maybeEmitGrains(speed, true);
  };

  window.scratchSoundUpdate = function scratchSoundUpdate(speed) {
    if (!isActive) {
      return;
    }

    maybeEmitGrains(speed);
  };

  window.scratchSoundStop = function scratchSoundStop() {
    isActive = false;
    travelSinceGrain = 0;
  };

  window.playConfettiPopSound = function playConfettiPopSound() {
    if (!isEnabled()) {
      return;
    }

    resumeContext();

    const context = getContext();
    const now = context.currentTime;

    const pop = context.createOscillator();
    pop.type = "sine";
    pop.frequency.setValueAtTime(220, now);
    pop.frequency.exponentialRampToValueAtTime(72, now + 0.11);

    const popGain = context.createGain();
    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.exponentialRampToValueAtTime(0.34, now + 0.008);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    const popClick = context.createOscillator();
    popClick.type = "triangle";
    popClick.frequency.setValueAtTime(920, now);
    popClick.frequency.exponentialRampToValueAtTime(520, now + 0.05);

    const clickGain = context.createGain();
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.1, now + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    pop.connect(popGain);
    popGain.connect(context.destination);
    popClick.connect(clickGain);
    clickGain.connect(context.destination);
    pop.start(now);
    pop.stop(now + 0.14);
    popClick.start(now);
    popClick.stop(now + 0.07);

    [740, 988, 1318].forEach((frequency, index) => {
      const start = now + 0.055 + index * 0.055;
      const fin = context.createOscillator();
      fin.type = "sine";
      fin.frequency.setValueAtTime(frequency, start);

      const finGain = context.createGain();
      finGain.gain.setValueAtTime(0.0001, start);
      finGain.gain.exponentialRampToValueAtTime(0.09 - index * 0.012, start + 0.008);
      finGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);

      fin.connect(finGain);
      finGain.connect(context.destination);
      fin.start(start);
      fin.stop(start + 0.12);
    });
  };
})();


(function initScratchCards() {
  const scratchWraps = document.querySelectorAll(".work-card__scratch-wrap");

  if (!scratchWraps.length) {
    return;
  }

  const REVEAL_THRESHOLD = 70;
  const BRUSH_SRC = "assets/card/scratch-stroke.svg";
  const BRUSH_WIDTH = 58;

  const brushImage = new Image();
  let brushReady = false;

  brushImage.addEventListener("load", () => {
    brushReady = true;
  });
  brushImage.src = BRUSH_SRC;

  scratchWraps.forEach((wrap) => {
    const canvas = wrap.querySelector(".work-card__scratch-surface");
    const panel = wrap.closest(".work-card__panel--gift");
    const giftFrame = wrap.closest(".work-card__gift-frame");
    const frontSrc = wrap.dataset.front;

    if (!canvas || !frontSrc || !panel) {
      return;
    }

    const TILT_MAX_X = 8;
    const TILT_MAX_Y = 10;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const frontImage = new Image();
    let isDrawing = false;
    let isRevealed = false;
    let lastPoint = null;
    let lastAngle = 0;
    let estimatedCoverage = 0;
    let hasInteracted = false;

    function setCanvasSize() {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFront() {
      setCanvasSize();
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight);
      ctx.drawImage(frontImage, 0, 0, wrap.clientWidth, wrap.clientHeight);
    }

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function scratchStamp(x, y, angle) {
      ctx.globalCompositeOperation = "destination-out";

      if (!brushReady) {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        estimatedCoverage += ((Math.PI * 20 * 20) / (wrap.clientWidth * wrap.clientHeight)) * 100 * 0.45;
        return;
      }

      const width = BRUSH_WIDTH * (0.9 + Math.random() * 0.2);
      const height = (brushImage.naturalHeight / brushImage.naturalWidth) * width;
      const jitterX = (Math.random() - 0.5) * 7;
      const jitterY = (Math.random() - 0.5) * 5;
      const jitterAngle = (Math.random() - 0.5) * 0.4;
      const flip = Math.random() > 0.5 ? -1 : 1;

      ctx.save();
      ctx.translate(x + jitterX, y + jitterY);
      ctx.rotate(angle + jitterAngle);
      ctx.scale(flip, 1);
      ctx.drawImage(brushImage, -width / 2, -height / 2, width, height);
      ctx.restore();

      estimatedCoverage += ((width * height) / (wrap.clientWidth * wrap.clientHeight)) * 100 * 0.5;
    }

    function scratchAt(x, y, angle = lastAngle) {
      scratchStamp(x, y, angle);
      lastAngle = angle;
    }

    function scratchLine(from, to) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const step = BRUSH_WIDTH * 0.26;
      const steps = Math.max(1, Math.ceil(distance / step));

      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        scratchStamp(from.x + dx * t, from.y + dy * t, angle);
      }

      lastAngle = angle;
    }

    function scratchedPercentFromPixels() {
      try {
        const { width, height } = canvas;
        const step = Math.max(4, Math.floor(window.devicePixelRatio || 1) * 4);
        const imageData = ctx.getImageData(0, 0, width, height).data;
        let transparent = 0;
        let total = 0;

        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            const alpha = imageData[(y * width + x) * 4 + 3];
            total += 1;
            if (alpha < 40) {
              transparent += 1;
            }
          }
        }

        return total ? (transparent / total) * 100 : 0;
      } catch {
        return 0;
      }
    }

    function scratchedPercent() {
      const pixelPercent = scratchedPercentFromPixels();
      if (pixelPercent > 0) {
        return pixelPercent;
      }
      return Math.min(100, estimatedCoverage);
    }

    function launchConfetti() {
      if (typeof window.launchSiteConfetti === "function") {
        window.launchSiteConfetti(wrap);
      }
    }

    function stopAttention() {
      wrap.classList.remove("is-attention");
    }

    function markInteraction() {
      if (hasInteracted) {
        return;
      }

      hasInteracted = true;
      wrap.classList.add("is-hint-hidden");
      stopAttention();
    }

    function getScratchSpeed(point, isNewStroke) {
      if (isNewStroke || !lastPoint) {
        return 0.4;
      }

      return Math.min(2.2, Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) / 5);
    }

    function startScratchSound(speed) {
      if (typeof window.scratchSoundStart === "function") {
        window.scratchSoundStart(speed);
      }
    }

    function updateScratchSound(speed) {
      if (typeof window.scratchSoundUpdate === "function") {
        window.scratchSoundUpdate(speed);
      }
    }

    function stopScratchSound() {
      if (typeof window.scratchSoundStop === "function") {
        window.scratchSoundStop();
      }
    }

    function updateCardTilt(point) {
      if (!giftFrame || prefersReducedMotion || isRevealed) {
        return;
      }

      const width = wrap.clientWidth || 1;
      const height = wrap.clientHeight || 1;
      const nx = (point.x / width) * 2 - 1;
      const ny = (point.y / height) * 2 - 1;
      const rotateX = -ny * TILT_MAX_X;
      const rotateY = nx * TILT_MAX_Y;
      const pressDepth = 2 + Math.hypot(nx, ny) * 2.5;

      giftFrame.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      giftFrame.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
      giftFrame.style.setProperty("--tilt-z", `-${pressDepth.toFixed(2)}px`);
    }

    function resetCardTilt() {
      if (!giftFrame) {
        return;
      }

      giftFrame.classList.remove("is-scratching");
      giftFrame.style.setProperty("--tilt-x", "0deg");
      giftFrame.style.setProperty("--tilt-y", "0deg");
      giftFrame.style.setProperty("--tilt-z", "0px");
    }

    function revealCard() {
      if (isRevealed) {
        return;
      }

      isRevealed = true;
      stopScratchSound();
      resetCardTilt();
      wrap.classList.add("is-revealed");
      panel.classList.add("is-revealed");
      if (giftFrame) {
        giftFrame.classList.add("is-revealed");
      }
      wrap.classList.remove("is-scratching", "is-attention");
      wrap.classList.add("is-hint-hidden");
      ctx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight);
      wrap.setAttribute("aria-label", "Coupon revealed: Flat 15% off on stays");
      launchConfetti();
    }

    function tryRevealOnRelease() {
      if (isRevealed) {
        return;
      }

      if (scratchedPercent() >= REVEAL_THRESHOLD) {
        revealCard();
      }
    }

    function applyScratchPoint(point, isNewStroke) {
      const speed = getScratchSpeed(point, isNewStroke);

      if (isNewStroke) {
        startScratchSound(speed);
      } else {
        updateScratchSound(speed);
      }

      markInteraction();
      wrap.classList.add("is-scratching");
      if (giftFrame) {
        giftFrame.classList.add("is-scratching");
      }
      updateCardTilt(point);

      if (isNewStroke || !lastPoint) {
        scratchAt(point.x, point.y, lastAngle + (Math.random() - 0.5) * 0.6);
      } else {
        scratchLine(lastPoint, point);
      }

      lastPoint = point;
    }

    function startDrawing(event) {
      if (isRevealed) {
        return;
      }

      isDrawing = true;
      lastPoint = null;
      applyScratchPoint(getPoint(event), true);
      event.preventDefault();
    }

    function drawMove(event) {
      if (!isDrawing || isRevealed) {
        return;
      }

      applyScratchPoint(getPoint(event), false);
      event.preventDefault();
    }

    function stopDrawing() {
      if (!isDrawing) {
        return;
      }

      isDrawing = false;
      lastPoint = null;
      wrap.classList.remove("is-scratching");
      stopScratchSound();
      resetCardTilt();
      tryRevealOnRelease();
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrap.classList.add("is-attention");
    }

    frontImage.addEventListener("load", drawFront);
    frontImage.src = frontSrc;

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", drawMove);
    window.addEventListener("mouseup", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", drawMove, { passive: false });
    window.addEventListener("touchend", stopDrawing);

    window.addEventListener("resize", () => {
      if (!isRevealed && frontImage.complete) {
        drawFront();
      }
    });
  });
})();
