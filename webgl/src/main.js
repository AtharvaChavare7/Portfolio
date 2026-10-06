const canvas = document.querySelector(".shader-canvas");
const card = document.querySelector(".shader-card");
const controls = document.querySelector(".controls");
const controlsBody = document.querySelector(".controls-body");
const controlsDisclosure = document.querySelector(".controls-disclosure");
const status = document.querySelector(".status");
const studyName = document.querySelector("[data-study-name]");
const panelTitle = document.querySelector("[data-panel-title]");

const studyNames = [
  "Aurora field",
  "Topographic drift",
  "Living glass",
  "Luminous silk",
];
const palettes = [
  [[0.32, 0.48, 0.47], [0.87, 0.61, 0.46], [0.76, 0.80, 0.68]],
  [[0.43, 0.39, 0.65], [0.84, 0.63, 0.71], [0.56, 0.72, 0.76]],
  [[0.70, 0.74, 0.39], [0.90, 0.53, 0.37], [0.50, 0.68, 0.57]],
];

const isAboutPage = Boolean(document.querySelector("main.about .shader-card"));
const DEFAULT_BASE_HEX = "#e7e5e2";

function hexToRgb(hex) {
  let normalized = hex.trim().replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6) {
    return hexToRgb(DEFAULT_BASE_HEX);
  }
  const value = Number.parseInt(normalized, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function activeBaseColor() {
  return hexToRgb(state.baseColor);
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function setAccentColorsFromPalette(index) {
  const palette = palettes[index];
  state.colorA = rgbToHex(palette[0]);
  state.colorB = rgbToHex(palette[1]);
  state.colorC = rgbToHex(palette[2]);
}

const state = {
  mode: 0,
  palette: 0,
  speed: 0.45,
  scale: 1.25,
  warp: 0.62,
  grain: 0.06,
  effectStrength: 1,
  baseColor: DEFAULT_BASE_HEX,
  colorA: rgbToHex(palettes[0][0]),
  colorB: rgbToHex(palettes[0][1]),
  colorC: rgbToHex(palettes[0][2]),
  paused: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  hover: 0,
  hoverTarget: 0,
  pointer: [0.68, 0.48],
  pointerTarget: [0.68, 0.48],
  center: [0.72, 0.48],
};

if (isAboutPage) {
  Object.assign(state, {
    mode: 0,
    palette: 1,
    speed: 1.2,
    scale: 3,
    warp: 1.5,
    grain: 0,
    effectStrength: 1,
  });
  setAccentColorsFromPalette(1);
}

function activePalette() {
  return [hexToRgb(state.colorA), hexToRgb(state.colorB), hexToRgb(state.colorC)];
}

const controlsAlwaysOpen = controls?.classList.contains("controls--always-open");

function syncControlsFromState() {
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    if (!(input.name in state)) {
      return;
    }
    const output = document.querySelector(`output[for="${input.id}"]`);
    input.value = String(state[input.name]);
    if (output) {
      output.value = Number(state[input.name]).toFixed(2);
    }
    updateRangeFill(input);
  });
  document.querySelectorAll('input[type="color"][data-base-color]').forEach((input) => {
    input.value = state.baseColor;
  });
  document.querySelectorAll('input[type="color"][data-accent-color]').forEach((input) => {
    if (input.name in state) {
      input.value = state[input.name];
    }
  });
}

function syncBaseColorPickers(value) {
  state.baseColor = value;
  document.querySelectorAll('input[type="color"][data-base-color]').forEach((input) => {
    input.value = value;
  });
}

function syncAccentColorPickers(name, value) {
  if (name && value) {
    state[name] = value;
  }
  document.querySelectorAll('input[type="color"][data-accent-color]').forEach((input) => {
    if (input.name in state) {
      input.value = state[input.name];
    }
  });
}

const vertexSource = `#version 300 es
precision highp float;

const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec2 uCenter;
uniform float uTime;
uniform float uScale;
uniform float uWarp;
uniform float uGrain;
uniform float uHover;
uniform int uMode;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uBaseColor;
uniform float uEffectStrength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 0.17;
    amplitude *= 0.5;
  }
  return value;
}

vec3 aurora(vec2 p, float time) {
  vec2 q = vec2(fbm(p + time * 0.08), fbm(p + vec2(3.1, 1.7) - time * 0.06));
  vec2 r = vec2(
    fbm(p + uWarp * q + vec2(1.7, 9.2) + time * 0.11),
    fbm(p + uWarp * q + vec2(8.3, 2.8) - time * 0.09)
  );
  float f = fbm(p + r * (1.1 + uWarp));
  vec3 color = mix(uBaseColor, uColorA, smoothstep(0.18, 0.9, f) * 0.68);
  color = mix(color, uColorB, smoothstep(0.47, 0.86, length(q - r)) * 0.68);
  color = mix(color, uColorC, smoothstep(0.60, 0.95, f + r.x * 0.35) * 0.34);
  return color;
}

vec3 silk(vec2 p, float time) {
  float drift = time * 0.10;
  vec2 flow = vec2(
    fbm(p * 0.72 + vec2(drift, 2.4)),
    fbm(p * 0.88 + vec2(6.7, -drift * 0.8))
  ) - 0.5;
  vec2 warped = p + flow * (0.72 + uWarp * 0.58);

  float foldA = sin(warped.y * 5.2 + warped.x * 1.3 + drift * 2.2);
  float foldB = sin(warped.y * 3.1 - warped.x * 2.0 - drift * 1.5);
  float weave = foldA * 0.62 + foldB * 0.38;
  float ribbon = pow(0.5 + 0.5 * weave, 2.1);
  float light = pow(1.0 - abs(weave), 5.0);
  float veil = smoothstep(0.18, 0.88, fbm(warped * 1.25 + drift));

  vec3 color = mix(uBaseColor, uColorA, ribbon * 0.64);
  color = mix(color, uColorB, light * (0.46 + veil * 0.32));
  color = mix(color, uColorC, veil * 0.34);
  return color;
}

vec3 contours(vec2 p, float time) {
  float terrain = fbm(p * 0.72 + vec2(time * 0.05, -time * 0.04));
  terrain += sin(p.x * 1.7 + sin(p.y + time * 0.14)) * 0.11 * uWarp;
  float lines = 1.0 - smoothstep(0.035, 0.095, abs(fract(terrain * 9.0) - 0.5));
  float bands = smoothstep(0.20, 0.82, terrain);
  vec3 color = mix(uBaseColor, uColorC, bands * 0.48);
  color = mix(color, uColorA, lines * 0.72);
  color = mix(color, uColorB, smoothstep(0.66, 0.92, terrain) * 0.40);
  return color;
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec3 livingGlass(vec2 p, float time) {
  vec2 pointer = (uPointer - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * uScale;
  vec2 fromPointer = p - pointer;
  float hover = exp(-4.2 * length(fromPointer)) * uHover;
  vec2 tangent = vec2(-fromPointer.y, fromPointer.x);
  vec2 glassUv = p * (2.15 + uWarp * 0.28);
  glassUv += tangent * hover * (0.62 + uWarp * 0.42);
  glassUv -= fromPointer * hover * 0.24;
  vec2 cell = floor(glassUv);
  vec2 local = fract(glassUv);
  float nearest = 10.0;
  float secondNearest = 10.0;
  vec2 nearestId = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 id = cell + offset;
      vec2 seed = hash22(id);
      vec2 breathingPoint = 0.5 + 0.32 * sin(
        time * (0.28 + seed.x * 0.18) + 6.2831 * seed
      );
      float distanceToPoint = length(offset + breathingPoint - local);
      if (distanceToPoint < nearest) {
        secondNearest = nearest;
        nearest = distanceToPoint;
        nearestId = id;
      } else if (distanceToPoint < secondNearest) {
        secondNearest = distanceToPoint;
      }
    }
  }

  float seamDistance = secondNearest - nearest;
  float seam = 1.0 - smoothstep(0.025, 0.11, seamDistance);
  float softSeam = 1.0 - smoothstep(0.04, 0.24, seamDistance);
  float cellTone = hash22(nearestId).x;
  float refraction = 0.5 + 0.5 * sin(
    nearest * 11.0 - time * 0.34 + cellTone * 6.2831
  );
  float glint = pow(refraction, 7.0) * (1.0 - seam);
  float cursorShimmer = 0.5 + 0.5 * sin(
    atan(fromPointer.y, fromPointer.x) * 4.0 - time * 0.8
  );

  vec3 pane = mix(uColorA, uColorC, cellTone);
  pane = mix(pane, uColorB, refraction * 0.34);
  vec3 color = mix(uBaseColor, pane, 0.46);
  color = mix(color, uColorB, softSeam * 0.28);
  color = mix(color, vec3(0.98), seam * 0.76 + glint * 0.34);
  color = mix(color, uColorC, hover * cursorShimmer * 0.22);
  color = mix(color, vec3(1.0), hover * seam * 0.38);
  color -= seam * seam * 0.05;
  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / uResolution.y;
  vec2 pointer = (uPointer - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float influence = exp(-3.4 * length(p - pointer));
  p += (p - pointer) * influence * 0.16 * uWarp;
  p *= uScale;

  vec3 color;
  if (uMode == 0) {
    color = aurora(p, uTime);
  } else if (uMode == 1) {
    color = contours(p, uTime);
  } else if (uMode == 2) {
    color = livingGlass(p, uTime);
  } else {
    color = silk(p, uTime);
  }

  float edgeFade = smoothstep(0.03, 0.52, uv.x);
  float effectBlend = mix(0.0, 0.30 + edgeFade * 0.70, uEffectStrength);
  color = mix(uBaseColor, color, effectBlend);
  color += (hash(gl_FragCoord.xy + uTime) - 0.5) * uGrain;
  fragColor = vec4(color, 1.0);
}`;

function announce(message) {
  if (status) {
    status.textContent = message;
  }
}

function setControlsOpen(open, shouldAnnounce = true) {
  if (controlsAlwaysOpen) {
    open = true;
  }
  controls.classList.toggle("is-open", open);
  if (controlsDisclosure) {
    controlsDisclosure.setAttribute("aria-expanded", String(open));
    controlsDisclosure.setAttribute(
      "aria-label",
      open ? "Close controls" : "Open shader controls",
    );
  }
  if (controlsBody) {
    controlsBody.inert = !open;
  }
  if (open) {
    requestAnimationFrame(() => {
      requestAnimationFrame(positionStudyIndicator);
    });
  }
  if (shouldAnnounce) announce(open ? "Controls expanded" : "Controls collapsed");
}

if (controlsDisclosure) {
  controlsDisclosure.addEventListener("click", () => {
    setControlsOpen(!controls.classList.contains("is-open"));
  });
}

if (controls && controlsDisclosure) {
  controls.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && controls.classList.contains("is-open")) {
      setControlsOpen(false);
      controlsDisclosure.focus();
    }
  });
}

if (isAboutPage) {
  syncControlsFromState();
  syncAccentColorPickers();
  document.querySelectorAll("[data-palette]").forEach((item) => {
    item.setAttribute(
      "aria-pressed",
      String(Number(item.dataset.palette) === state.palette),
    );
  });
}
setControlsOpen(controlsAlwaysOpen || controls?.classList.contains("is-open"), false);

const studyPicker = document.querySelector(".study-picker");
const studyPickerIndicator = studyPicker?.querySelector(".study-picker-indicator");

function positionStudyIndicator() {
  if (!studyPicker || !studyPickerIndicator) {
    return;
  }
  const button = studyPicker.querySelector(`[data-mode="${state.mode}"]`);
  if (!button || button.offsetWidth === 0) {
    return;
  }
  studyPickerIndicator.style.width = `${button.offsetWidth}px`;
  studyPickerIndicator.style.transform = `translate3d(${button.offsetLeft}px, 0, 0)`;
}

function setStudyPickerActive(index) {
  state.mode = index;
  document.querySelectorAll("[data-mode]").forEach((item) => {
    item.setAttribute("aria-pressed", String(Number(item.dataset.mode) === index));
  });
  positionStudyIndicator();
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = Number(button.dataset.mode);
    if (next === state.mode) {
      return;
    }
    setStudyPickerActive(next);
    if (studyName) studyName.textContent = studyNames[state.mode];
    if (panelTitle) panelTitle.textContent = studyNames[state.mode];
    announce(`${studyNames[state.mode]} selected`);
  });
});

setStudyPickerActive(state.mode);

if (studyPicker && typeof ResizeObserver !== "undefined") {
  const studyPickerResizeObserver = new ResizeObserver(() => positionStudyIndicator());
  studyPickerResizeObserver.observe(studyPicker);
}

window.addEventListener("resize", positionStudyIndicator);

document.querySelectorAll("[data-palette]").forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.palette);
    state.palette = index;
    setAccentColorsFromPalette(index);
    syncAccentColorPickers();
    document.querySelectorAll("[data-palette]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    announce(`${button.getAttribute("aria-label")} selected`);
  });
});

function updateRangeFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  input.style.setProperty("--range-fill", `${percent}%`);
}

document.querySelectorAll('input[type="range"]').forEach((input) => {
  const output = document.querySelector(`output[for="${input.id}"]`);
  updateRangeFill(input);
  input.addEventListener("input", () => {
    state[input.name] = Number(input.value);
    if (output) {
      output.value = Number(input.value).toFixed(2);
    }
    updateRangeFill(input);
  });
});

document.querySelectorAll('input[type="color"][data-base-color]').forEach((input) => {
  input.addEventListener("input", () => {
    syncBaseColorPickers(input.value);
  });
});

document.querySelectorAll('input[type="color"][data-accent-color]').forEach((input) => {
  input.addEventListener("input", () => {
    syncAccentColorPickers(input.name, input.value);
  });
});

document.querySelector('[data-action="randomize"]')?.addEventListener("click", () => {
  state.mode = Math.floor(Math.random() * studyNames.length);
  state.palette = Math.floor(Math.random() * palettes.length);
  state.scale = 0.7 + Math.random() * 1.8;
  state.warp = 0.25 + Math.random() * 1.15;
  setAccentColorsFromPalette(state.palette);

  setStudyPickerActive(state.mode);
  document.querySelectorAll("[data-palette]").forEach((item) => {
    item.setAttribute("aria-pressed", String(Number(item.dataset.palette) === state.palette));
  });
  syncAccentColorPickers();
  ["scale", "warp"].forEach((name) => {
    const input = document.querySelector(`#${name}`);
    input.value = state[name];
    document.querySelector(`output[for="${name}"]`).value = state[name].toFixed(2);
    updateRangeFill(input);
  });
  if (studyName) studyName.textContent = studyNames[state.mode];
  if (panelTitle) panelTitle.textContent = studyNames[state.mode];
  announce("Shader settings randomized");
});

function updatePointer(event) {
  const rect = card.getBoundingClientRect();
  state.pointerTarget = [
    (event.clientX - rect.left) / rect.width,
    1 - (event.clientY - rect.top) / rect.height,
  ];
}

canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("pointerenter", () => {
  state.hoverTarget = 1;
});
canvas.addEventListener("pointerleave", () => {
  state.hoverTarget = 0;
});
canvas.addEventListener("pointerdown", (event) => {
  updatePointer(event);
  state.center = [...state.pointerTarget];
  state.palette = (state.palette + 1) % palettes.length;
  setAccentColorsFromPalette(state.palette);
  syncAccentColorPickers();
  document.querySelectorAll("[data-palette]").forEach((item) => {
    item.setAttribute("aria-pressed", String(Number(item.dataset.palette) === state.palette));
  });
  announce("Shader center and palette shifted");
});

const gl = canvas.getContext("webgl2", {
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});

if (!gl) {
  card.classList.add("webgl-fallback");
  controls.querySelectorAll("input, button").forEach((element) => {
    element.disabled = true;
  });
  announce("WebGL is unavailable. A static background is shown.");
} else {
  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Shader compilation failed");
    }
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Shader linking failed");
  }

  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());

  const uniforms = Object.fromEntries(
    [
      "uResolution", "uPointer", "uCenter", "uTime", "uScale", "uWarp",
      "uGrain", "uHover", "uMode", "uColorA", "uColorB", "uColorC", "uBaseColor",
      "uEffectStrength",
    ].map((name) => [name, gl.getUniformLocation(program, name)]),
  );

  const resizeObserver = new ResizeObserver(() => {
    const density = Math.min(window.devicePixelRatio, 2);
    const width = Math.round(canvas.clientWidth * density);
    const height = Math.round(canvas.clientHeight * density);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  });
  resizeObserver.observe(canvas);

  let animationTime = 0;
  let previousTime = performance.now();

  function render(now) {
    const delta = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    if (!state.paused) animationTime += delta * state.speed;

    state.pointer[0] += (state.pointerTarget[0] - state.pointer[0]) * 0.055;
    state.pointer[1] += (state.pointerTarget[1] - state.pointer[1]) * 0.055;
    state.hover += (state.hoverTarget - state.hover) * 0.08;

    const palette = activePalette();
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform2fv(uniforms.uPointer, state.pointer);
    gl.uniform2fv(uniforms.uCenter, state.center);
    gl.uniform1f(uniforms.uTime, animationTime);
    gl.uniform1f(uniforms.uScale, state.scale);
    gl.uniform1f(uniforms.uWarp, state.warp);
    gl.uniform1f(uniforms.uGrain, state.grain);
    gl.uniform1f(uniforms.uHover, state.hover);
    gl.uniform1i(uniforms.uMode, state.mode);
    gl.uniform3fv(uniforms.uColorA, palette[0]);
    gl.uniform3fv(uniforms.uColorB, palette[1]);
    gl.uniform3fv(uniforms.uColorC, palette[2]);
    gl.uniform3fv(uniforms.uBaseColor, activeBaseColor());
    gl.uniform1f(uniforms.uEffectStrength, state.effectStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
