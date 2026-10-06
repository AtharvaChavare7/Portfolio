(function () {
  var frame = document.querySelector("[data-agent-carousel]");
  if (!frame) return;

  var track = frame.querySelector("[data-agent-carousel-track]");
  if (!track) return;

  var ITEMS = ["Valid receipt", "Under $75", "In-policy"];

  var REVIEW_LOADER_HTML =
    '<span class="ai-loader ai-loader--dots" aria-hidden="true">' +
    "<span></span><span></span><span></span></span>";

  var LOADER_PERIOD = 1;
  var LOADER_STAGGERS = [0, 0.12, 0.24];
  var loaderEpoch = performance.now();

  var timers = [];
  var loopId = 0;

  var ICONS = {
    check:
      '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10.2l2.4 2.4L14 7.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn:
      '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M10 6v5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="13.5" r="1" fill="#fff"/></svg>',
  };

  var PRESETS = {
    reviewing: { type: "review", text: "Agent reviewing", results: ["pending", "pending", "pending"] },
    approved: { type: "approved", text: "Agent approved", results: ["ok", "ok", "ok"] },
    flagged: { type: "flagged", text: "Flagged for review", results: ["ok", "fail", "pending"] },
  };

  function reviewIconMarkup() {
    return '<span class="pill-icon pill-icon--loader">' + REVIEW_LOADER_HTML + "</span>";
  }

  function syncReviewLoader(card) {
    var loader = card.querySelector(".ai-loader--dots");
    if (!loader) return;

    var elapsed = (performance.now() - loaderEpoch) / 1000;
    var base = -(elapsed % LOADER_PERIOD);

    loader.querySelectorAll("span").forEach(function (dot, i) {
      dot.style.animationDelay = base + LOADER_STAGGERS[i] + "s";
    });
  }

  function syncAllReviewLoaders() {
    frame.querySelectorAll(".pill-review .ai-loader--dots").forEach(function (loader) {
      var card = loader.closest(".agent-card");
      if (card) syncReviewLoader(card);
    });
  }

  function pillTextMarkup(text) {
    return (
      '<span class="pill-text-viewport">' +
      '<span class="pill-text-layer is-current">' +
      text +
      "</span></span>"
    );
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      timers.push(setTimeout(resolve, ms));
    });
  }

  function clearAll() {
    loopId += 1;
    timers.forEach(clearTimeout);
    timers = [];
    track.classList.remove("is-sliding");
    track.style.transition = "";
  }

  function isActive(id) {
    return id === loopId;
  }

  async function typePillText(viewport, newText) {
    var current = viewport.querySelector(".pill-text-layer.is-current");
    if (!current || current.textContent === newText) return;

    current.style.transition = "opacity 0.22s ease";
    current.style.opacity = "0";
    await wait(220);
    if (!viewport.isConnected || !isActive(loopId)) return;

    current.textContent = "";
    current.style.opacity = "1";
    current.classList.add("is-typing");

    for (var i = 0; i < newText.length; i++) {
      if (!viewport.isConnected || !isActive(loopId)) return;
      current.textContent = newText.slice(0, i + 1);
      await wait(38);
    }

    current.classList.remove("is-typing");
    current.style.transition = "";
  }

  function getRefs() {
    return {
      left: track.querySelector("[data-agent-card='left']"),
      center: track.querySelector("[data-agent-card='center']"),
      right: track.querySelector("[data-agent-card='right']"),
    };
  }

  function getMetrics() {
    var styles = getComputedStyle(frame);
    var cardW = parseFloat(styles.getPropertyValue("--card-width"));
    var gap = parseFloat(styles.getPropertyValue("--card-gap"));
    return { cardW: cardW, gap: gap, step: cardW + gap };
  }

  function centerOffset(centerIndex) {
    var viewport = track.parentElement;
    var vw = viewport.getBoundingClientRect().width;
    var m = getMetrics();
    return vw / 2 - (centerIndex * m.step + m.cardW / 2);
  }

  function applyTrackPosition(centerIndex, animate) {
    if (animate) {
      track.classList.add("is-sliding");
    } else {
      track.classList.remove("is-sliding");
      track.style.transition = "none";
    }
    track.style.transform = "translateX(" + centerOffset(centerIndex) + "px)";
    if (!animate) {
      void track.offsetHeight;
      track.style.transition = "";
    }
  }

  function buildCardHTML(pillType, pillText, results) {
    var iconHTML =
      pillType === "review"
        ? reviewIconMarkup()
        : '<span class="pill-icon">' + ICONS[pillType === "approved" ? "check" : "warn"] + "</span>";
    var bodyHTML = ITEMS.map(function (label, i) {
      var r = results[i];
      if (!r || r === "pending") {
        return (
          '<div class="check-item" data-index="' +
          i +
          '">' +
          '<span class="item-icon skeleton-dot"></span>' +
          '<span class="item-label skeleton-bar"></span></div>'
        );
      }
      var cls = r === "fail" ? "fail" : "done";
      var iconCls = r === "fail" ? "fail" : "ok";
      return (
        '<div class="check-item ' +
        cls +
        '">' +
        '<span class="item-icon ' +
        iconCls +
        '"></span>' +
        '<span class="item-label">' +
        label +
        "</span></div>"
      );
    }).join("");

    return (
      '<div class="pill pill-' +
      pillType +
      '">' +
      iconHTML +
      pillTextMarkup(pillText) +
      '</div><div class="card-body">' +
      bodyHTML +
      "</div>"
    );
  }

  function setCard(card, preset) {
    card.innerHTML = buildCardHTML(preset.type, preset.text, preset.results);
    if (preset.type === "review") syncReviewLoader(card);
  }

  function setCardRole(card, role) {
    card.classList.remove("active", "ghost");
    card.classList.add(role);
    card.setAttribute("aria-hidden", role === "ghost" ? "true" : "false");
  }

  function createGhostCard(preset) {
    var card = document.createElement("div");
    card.className = "agent-card ghost";
    card.setAttribute("aria-hidden", "true");
    setCard(card, preset);
    return card;
  }

  async function setCenterPill(type, text) {
    var center = getRefs().center;
    var pill = center.querySelector(".pill");
    pill.className = "pill pill-" + type;

    if (type === "review") {
      center.querySelector(".pill-icon").outerHTML = reviewIconMarkup();
      syncReviewLoader(center);
    } else {
      center.querySelector(".pill-icon").className = "pill-icon";
      center.querySelector(".pill-icon").innerHTML = ICONS[type === "approved" ? "check" : "warn"];
    }

    var textHost = pill.querySelector(".pill-text-viewport");
    await typePillText(textHost, text);
  }

  async function resolveItem(index, label, status, id) {
    var items = getRefs().center.querySelectorAll(".check-item");
    var el = items[index];
    if (!el || !isActive(id)) return;

    el.classList.add("resolving");
    await wait(80);
    if (!isActive(id)) return;

    var icon = el.querySelector(".item-icon");
    var text = el.querySelector(".item-label");

    icon.classList.remove("skeleton-dot");
    icon.classList.add(status === "fail" ? "fail" : "ok");
    text.classList.remove("skeleton-bar");
    text.textContent = label;
    el.classList.add(status === "fail" ? "fail" : "done");

    await wait(280);
    el.classList.remove("resolving");
  }

  function waitForTransition(el) {
    return new Promise(function (resolve) {
      function done(e) {
        if (e && e.propertyName !== "transform") return;
        el.removeEventListener("transitionend", done);
        resolve();
      }
      el.addEventListener("transitionend", done);
      timers.push(setTimeout(resolve, 900));
    });
  }

  async function slideLeft(id, incomingRightPreset) {
    var r = getRefs();
    var m = getMetrics();
    var restX = centerOffset(1);
    var slideX = restX - m.step;

    var newRight = createGhostCard(incomingRightPreset);
    newRight.classList.add("entering");
    newRight.setAttribute("data-agent-card", "right");
    track.appendChild(newRight);

    void newRight.offsetHeight;
    newRight.classList.remove("entering");

    r.center.classList.remove("active");
    r.center.classList.add("ghost");
    r.right.classList.remove("ghost");
    r.right.classList.add("active");

    void track.offsetHeight;

    track.classList.add("is-sliding");
    track.style.transform = "translateX(" + slideX + "px)";
    await waitForTransition(track);
    if (!isActive(id)) return;

    r.left.remove();

    r.center.setAttribute("aria-hidden", "true");
    r.center.setAttribute("data-agent-card", "left");
    r.right.setAttribute("aria-hidden", "false");
    r.right.setAttribute("data-agent-card", "center");
    newRight.setAttribute("aria-hidden", "true");
    newRight.setAttribute("data-agent-card", "right");

    track.classList.remove("is-sliding");
    track.style.transition = "none";
    track.style.transform = "translateX(" + restX + "px)";
    void track.offsetHeight;
    track.style.transition = "";
  }

  async function runApproveFlow(id) {
    setCardRole(getRefs().center, "active");
    await wait(500);
    if (!isActive(id)) return;

    await resolveItem(0, ITEMS[0], "ok", id);
    await wait(350);
    if (!isActive(id)) return;
    await resolveItem(1, ITEMS[1], "ok", id);
    await wait(350);
    if (!isActive(id)) return;
    await resolveItem(2, ITEMS[2], "ok", id);
    await wait(450);
    if (!isActive(id)) return;

    await setCenterPill("approved", "Agent approved");
    await wait(900);
  }

  async function runFlagFlow(id) {
    setCardRole(getRefs().center, "active");
    await wait(500);
    if (!isActive(id)) return;

    await resolveItem(0, ITEMS[0], "ok", id);
    await wait(350);
    if (!isActive(id)) return;
    await resolveItem(1, ITEMS[1], "fail", id);
    await wait(450);
    if (!isActive(id)) return;

    await setCenterPill("flagged", "Flagged for review");
    await wait(1000);
  }

  async function runLoop() {
    var id = loopId;

    while (isActive(id)) {
      await runApproveFlow(id);
      if (!isActive(id)) break;

      await slideLeft(id, PRESETS.reviewing);
      if (!isActive(id)) break;

      await runFlagFlow(id);
      if (!isActive(id)) break;

      await slideLeft(id, PRESETS.reviewing);
      if (!isActive(id)) break;
    }
  }

  function resetCarousel() {
    clearAll();
    track.innerHTML = "";

    var left = createGhostCard(PRESETS.flagged);
    var center = document.createElement("div");
    var right = createGhostCard(PRESETS.reviewing);

    left.setAttribute("data-agent-card", "left");
    center.className = "agent-card active";
    center.setAttribute("data-agent-card", "center");
    center.setAttribute("aria-hidden", "false");
    right.setAttribute("data-agent-card", "right");

    setCard(center, PRESETS.reviewing);

    track.appendChild(left);
    track.appendChild(center);
    track.appendChild(right);

    applyTrackPosition(1, false);
    syncAllReviewLoaders();
  }

  window.addEventListener("resize", function () {
    applyTrackPosition(1, false);
  });

  resetCarousel();
  runLoop();
})();
