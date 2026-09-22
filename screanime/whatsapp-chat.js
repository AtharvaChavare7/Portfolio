(() => {
const PHASE_LABELS = {
  start: "Starting conversation",
  userTypes: "User typing",
  botTypes: "Snake Rescue replying",
  userChooses: "User selecting an option",
  location: "Sharing live location",
  searching: "Searching for rescuers",
  confirmed: "Rescuer booked",
  hold: "Hold",
};

const TAIL_PATHS = {
  in: "M0 7.5C4.012 5.709 5.719 4.011 8 0V10.5C4.425 10.442 2.698 9.733 0 7.5Z",
  out: "M8 7.5C3.988 5.709 2.281 4.011 0 0V10.5C3.575 10.442 5.302 9.733 8 7.5Z",
};

const TAIL_SIZE = { width: 8, height: 11 };

const RESCUER_BOOKED_COPY = [
  "Your request has been accepted! Here are the details of the rescuer who will be assisting you:",
  "<strong>Rescuer Name:</strong> Sanjay Pawar",
  "<strong>Contact Number:</strong> 9283823928",
  "<strong>Estimated Time of Arrival:</strong> 3 min",
  'Track your rescuer at <a href="#">live location</a>.',
  "Please stay prepared to provide any additional information or assistance required for a smooth rescue process.",
];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createWaDemo(root) {
  const assetBase = root.dataset.assetBase || "";
  const asset = (path) => `${assetBase}${path}`;

  const track = root.querySelector("[data-wa-messages]");
  const composerText = root.querySelector("[data-wa-composer-text]");
  const sendBtn = root.querySelector("[data-wa-send]");
  const micBtn = root.querySelector("[data-wa-mic]");
  const phaseLabel = root.querySelector("[data-wa-phase]");
  const replayBtn = root.querySelector("[data-wa-replay]");
  const loopToggle = root.querySelector("[data-wa-loop]");

  const receiveIcon = asset("whatsapp-assets/UI/Icon/Checkmark/Receive.svg");

  let timeline = null;
  let typingNode = null;

  function shouldLoop() {
    if (loopToggle) {
      return loopToggle.checked;
    }

    return root.hasAttribute("data-wa-loop");
  }

  function setPhase(key) {
    if (phaseLabel && PHASE_LABELS[key]) {
      phaseLabel.textContent = PHASE_LABELS[key];
    }
  }

  function formatTime(time) {
    return time.replace(":", ". ");
  }

  function buildMetaFooter(time, read = true) {
    const footer = document.createElement("div");
    footer.className = "wa-bubble__footer";

    const meta = document.createElement("div");
    meta.className = "wa-bubble__meta";
    meta.innerHTML = `<time>${formatTime(time)}</time>${
      read ? `<img src="${receiveIcon}" alt="" width="15" height="14">` : ""
    }`;

    footer.appendChild(meta);
    return footer;
  }

  function buildBubbleTail(variant = "out") {
    const tail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tail.setAttribute("class", `wa-bubble__tail wa-bubble__tail--${variant}`);
    tail.setAttribute("width", String(TAIL_SIZE.width));
    tail.setAttribute("height", String(TAIL_SIZE.height));
    tail.setAttribute("viewBox", `0 0 ${TAIL_SIZE.width} ${TAIL_SIZE.height}`);
    tail.setAttribute("fill", "none");
    tail.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", TAIL_PATHS[variant]);
    path.setAttribute("fill", "currentColor");
    tail.appendChild(path);

    return tail;
  }

  function wrapIncomingBubble(bubbleEl) {
    const wrap = document.createElement("div");
    wrap.className = "wa-bubble-wrap wa-bubble-wrap--in";
    wrap.appendChild(buildBubbleTail("in"));
    wrap.appendChild(bubbleEl);
    return wrap;
  }

  function buildUserBubble(text, time = "9:41 AM", read = true) {
    const msg = document.createElement("div");
    msg.className = "wa-msg wa-msg--out";
    msg.setAttribute("data-wa-msg", "");
    msg.innerHTML = `
      <div class="wa-bubble-wrap">
        <div class="wa-bubble wa-bubble--out">
          <div class="wa-bubble__body">
            <p class="wa-bubble__text"></p>
          </div>
        </div>
      </div>
    `;

    msg.querySelector(".wa-bubble-wrap").appendChild(buildBubbleTail("out"));

    const body = msg.querySelector(".wa-bubble__body");
    msg.querySelector(".wa-bubble__text").textContent = text;
    body.appendChild(buildMetaFooter(time, read));
    track.appendChild(msg);
    gsap.set(msg, { opacity: 0, y: 18, scale: 0.94 });
    return msg;
  }

  function buildBotBubble({ paragraphs = [], time = "11.14 AM", actions = [] } = {}) {
    const msg = document.createElement("div");
    msg.className = "wa-msg wa-msg--in";
    msg.setAttribute("data-wa-msg", "");

    const botMessage = document.createElement("div");
    botMessage.className = "wa-bot-message";

    const bubble = document.createElement("div");
    bubble.className = "wa-bubble wa-bubble--in";

    const content = document.createElement("div");
    content.className = "wa-bubble__content";
    paragraphs.forEach((html) => {
      const p = document.createElement("p");
      p.innerHTML = html;
      content.appendChild(p);
    });

    bubble.appendChild(content);
    bubble.appendChild(buildMetaFooter(time, true));
    botMessage.appendChild(wrapIncomingBubble(bubble));

    if (actions.length) {
      const actionsEl = document.createElement("div");
      actionsEl.className = "wa-bot-actions";
      actions.forEach((label) => {
        const btn = document.createElement("button");
        btn.className = "wa-bot-action";
        btn.type = "button";
        btn.tabIndex = -1;
        btn.textContent = label;
        actionsEl.appendChild(btn);
      });
      botMessage.appendChild(actionsEl);
    }

    msg.appendChild(botMessage);
    track.appendChild(msg);
    gsap.set(msg, { opacity: 0, y: 18, scale: 0.94 });
    return msg;
  }

  function buildBotWelcome() {
    return buildBotBubble({
      paragraphs: [
        "Hello! 👋 Welcome to <strong>Snake Rescue Assistance</strong>! ✨",
        "🐍 Spotted a snake? Share your 📍 location and I'll connect you with a certified rescuer nearby.",
        "Want me to find a rescuer now?",
      ],
      time: "11.14 AM",
      actions: ["👍🏻 Yes", "👎🏻 No"],
    });
  }

  function buildRescuerBookedMessage(time = "9:43 AM") {
    return buildBotBubble({
      paragraphs: RESCUER_BOOKED_COPY,
      time,
    });
  }

  function slideStackUp(msg) {
    const prevMsgs = [...track.children].filter((node) => node !== msg);
    const tops = prevMsgs.map((node) => node.getBoundingClientRect().top);

    gsap.set(msg, { opacity: 0, y: 20, scale: 0.94 });

    requestAnimationFrame(() => {
      prevMsgs.forEach((node, index) => {
        const delta = tops[index] - node.getBoundingClientRect().top;

        if (delta > 0.5) {
          gsap.fromTo(
            node,
            { y: delta },
            { y: 0, duration: 0.48, ease: "power2.out", overwrite: "auto" }
          );
        }
      });

      gsap.to(msg, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.38,
        ease: "back.out(1.5)",
      });
    });
  }

  function popInMessage(msg) {
    if (reducedMotion) {
      gsap.set(msg, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    slideStackUp(msg);
  }

  function buildLocationBubble() {
    const msg = buildUserBubble("📍 Live location shared", "9:42 AM", true);
    msg.querySelector(".wa-bubble").classList.add("wa-bubble--location");
    return msg;
  }

  function showTypingIndicator() {
    if (typingNode?.isConnected) {
      typingNode.remove();
    }

    const msg = document.createElement("div");
    msg.className = "wa-msg wa-msg--in wa-msg--typing";
    msg.setAttribute("data-wa-msg", "");
    msg.innerHTML = `
      <div class="wa-bot-message">
        <div class="wa-bubble-wrap wa-bubble-wrap--in">
          <div class="wa-bubble wa-bubble--in">
            <div class="wa-typing-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    `;

    msg.querySelector(".wa-bubble-wrap").prepend(buildBubbleTail("in"));
    track.appendChild(msg);
    gsap.set(msg, { opacity: 0, y: 12, scale: 0.96 });
    popInMessage(msg);
    typingNode = msg;
    return msg;
  }

  function hideTypingIndicator() {
    if (!typingNode?.isConnected) {
      typingNode = null;
      return;
    }

    const node = typingNode;
    typingNode = null;

    gsap.to(node, {
      opacity: 0,
      y: -8,
      scale: 0.96,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => node.remove(),
    });
  }

  function setComposerTyping(text) {
    if (!composerText) {
      return;
    }

    const hasText = text.length > 0;
    composerText.hidden = !hasText;
    composerText.innerHTML = hasText ? `${text}<span class="wa-composer__caret"></span>` : "";

    if (sendBtn && micBtn) {
      sendBtn.hidden = !hasText;
      micBtn.hidden = hasText;
    }
  }

  function clearComposer() {
    setComposerTyping("");
  }

  function addComposerTyping(tl, time, text, duration = 1.35) {
    const cursor = { index: 0 };

    tl.add(() => setComposerTyping(""), time);
    tl.to(
      cursor,
      {
        index: text.length,
        duration,
        ease: "none",
        onUpdate: () => {
          setComposerTyping(text.slice(0, Math.round(cursor.index)));
        },
      },
      time
    );
  }

  function addSendPress(tl, time) {
    tl.add(() => sendBtn?.classList.add("is-pressed"), time);
    tl.add(() => sendBtn?.classList.remove("is-pressed"), time + 0.12);
  }

  function addUserSend(tl, time, text, timestamp) {
    addSendPress(tl, time);
    tl.add(() => clearComposer(), time + 0.14);
    tl.add(() => popInMessage(buildUserBubble(text, timestamp, true)), time + 0.28);
  }

  function addBotTyping(tl, time, duration = 1.15) {
    tl.add(() => showTypingIndicator(), time);
    tl.add(() => hideTypingIndicator(), time + duration);
  }

  function addBotMessage(tl, time, buildFn) {
    tl.add(() => popInMessage(buildFn()), time);
  }

  function clearChat() {
    if (track) {
      track.innerHTML = "";
    }

    typingNode = null;
    clearComposer();
  }

  function buildStaticConversation() {
    [
      buildUserBubble("Spotted a snake near my home. Need help!", "9.40 AM", true),
      buildBotWelcome(),
      buildUserBubble("👍🏻 Yes", "9.41 AM", true),
      buildBotBubble({
        paragraphs: ["Share your 📍 live location so we can find a nearby rescuer."],
        time: "9.42 AM",
      }),
      buildLocationBubble(),
      buildRescuerBookedMessage("9.43 AM"),
    ].forEach((msg) => gsap.set(msg, { opacity: 1, y: 0, scale: 1 }));
  }

  function buildTimeline() {
    if (!track) {
      return null;
    }

    if (timeline) {
      timeline.kill();
    }

    clearChat();

    timeline = gsap.timeline({
      repeat: shouldLoop() ? -1 : 0,
      repeatDelay: 2.4,
      onRepeat: () => {
        clearChat();
        setPhase("start");
      },
    });

    if (reducedMotion) {
      setPhase("confirmed");
      buildStaticConversation();
      return timeline;
    }

    let t = 0.5;

    timeline.add(() => setPhase("userTypes"), t);
    addComposerTyping(timeline, t, "Spotted a snake near my home. Need help!", 1.35);
    t += 1.75;
    addUserSend(timeline, t, "Spotted a snake near my home. Need help!", "9:40 AM");
    t += 1.15;

    timeline.add(() => setPhase("botTypes"), t);
    addBotTyping(timeline, t, 1.2);
    t += 1.3;
    addBotMessage(timeline, t, () => buildBotWelcome());
    t += 2.6;

    timeline.add(() => setPhase("userChooses"), t);
    addComposerTyping(timeline, t, "👍🏻 Yes", 0.8);
    t += 1.1;
    addUserSend(timeline, t, "👍🏻 Yes", "9:41 AM");
    t += 1.05;

    timeline.add(() => setPhase("botTypes"), t);
    addBotTyping(timeline, t, 1.1);
    t += 1.2;
    addBotMessage(
      timeline,
      t,
      () =>
        buildBotBubble({
          paragraphs: ["Share your 📍 live location so we can find a nearby rescuer."],
          time: "9:42 AM",
        })
    );
    t += 2.3;

    timeline.add(() => setPhase("location"), t);
    addComposerTyping(timeline, t, "📍 Share live location", 0.8);
    t += 1.2;
    addUserSend(timeline, t, "📍 Live location shared", "9:42 AM");
    t += 1.2;

    timeline.add(() => setPhase("confirmed"), t);
    addBotTyping(timeline, t, 1.4);
    t += 1.5;
    addBotMessage(timeline, t, () => buildRescuerBookedMessage("9:43 AM"));
    t += 4.5;

    timeline.add(() => setPhase("hold"), t);
    timeline.to({}, { duration: 1.5 }, t);

    return timeline;
  }

  function replay() {
    if (!timeline) {
      buildTimeline();
    }

    if (!timeline) {
      return;
    }

    timeline.restart(true, false);
    setPhase("start");
  }

  replayBtn?.addEventListener("click", replay);

  loopToggle?.addEventListener("change", () => {
    if (timeline) {
      timeline.repeat(loopToggle.checked ? -1 : 0);
    }
  });

  return {
    buildTimeline,
    replay,
    clearChat,
    buildUserBubble,
    buildBotBubble,
    buildBotWelcome,
    buildRescuerBookedMessage,
  };
}

function bootWaDemo(root) {
  if (root.dataset.waReady === "true") {
    return root._waDemo || null;
  }

  if (typeof gsap === "undefined") {
    console.warn("[WaChat] GSAP is not available — chat animation cannot start.");
    return null;
  }

  try {
    const demo = createWaDemo(root);
    demo.replay();
    root.dataset.waReady = "true";
    root._waDemo = demo;
    return demo;
  } catch (error) {
    console.error("[WaChat] Failed to start chat animation.", error);
    return null;
  }
}

function getWaRoot() {
  return document.querySelector("#case-fiserv [data-wa-demo]");
}

function launchWaChat({ replay = false } = {}) {
  const root = getWaRoot();
  if (!root) {
    return null;
  }

  if (root.dataset.waReady !== "true") {
    return bootWaDemo(root);
  }

  if (replay && root._waDemo?.replay) {
    root._waDemo.replay();
  }

  return root._waDemo || null;
}

function deferWaDemo(root) {
  const observeTarget =
    document.getElementById(root.dataset.deferTarget || "") ||
    root.closest(".work-card__panel--fiserv-top") ||
    document.getElementById("case-fiserv") ||
    root;

  function launch() {
    if (root.dataset.waReady === "true") {
      return;
    }

    bootWaDemo(root);
  }

  function isTargetVisible(target) {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    return rect.top < viewportHeight * 0.92 && rect.bottom > viewportHeight * 0.08;
  }

  function checkVisible() {
    if (root.dataset.waReady !== "true" && isTargetVisible(observeTarget)) {
      launch();
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          launch();
        }
      });
    },
    { threshold: [0, 0.12, 0.25], rootMargin: "0px" }
  );

  observer.observe(observeTarget);
  window.addEventListener("scroll", checkVisible, { passive: true });
  window.addEventListener("resize", checkVisible);
  checkVisible();
}

function shouldAutoplay(root) {
  return (
    root.hasAttribute("data-wa-autoplay") ||
    document.documentElement.hasAttribute("data-wa-autoplay")
  );
}

function initWaDemos() {
  document.querySelectorAll("[data-wa-demo]").forEach((root) => {
    if (root.dataset.waReady === "true") {
      return;
    }

    if (root.hasAttribute("data-defer-until-visible")) {
      deferWaDemo(root);
      return;
    }

    if (shouldAutoplay(root)) {
      bootWaDemo(root);
    }
  });
}

initWaDemos();

document.querySelectorAll('.work-nav__button[data-target="case-fiserv"]').forEach((button) => {
  button.addEventListener("click", () => {
    launchWaChat({ replay: true });
  });
});

window.WaChat = {
  init: initWaDemos,
  boot: bootWaDemo,
  launch: launchWaChat,
  create: createWaDemo,
};
})();
