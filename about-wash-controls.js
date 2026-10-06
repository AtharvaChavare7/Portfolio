(function initReadabilityWashControls() {
  const wash = document.querySelector(".about-hero .readability-wash");
  const panel = document.querySelector("[data-wash-controls]");
  if (!wash || !panel) return;

  function hexToRgb255(hex) {
    let normalized = hex.trim().replace("#", "");
    if (normalized.length === 3) {
      normalized = normalized
        .split("")
        .map((char) => char + char)
        .join("");
    }
    const value = Number.parseInt(normalized, 16);
    if (Number.isNaN(value)) {
      return { r: 250, g: 250, b: 250 };
    }
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }

  function readState() {
    const color = panel.querySelector("#washColor")?.value || "#fafafa";
    return {
      color,
      sideA: Number(panel.querySelector("#washSideA")?.value || 90) / 100,
      sideB: Number(panel.querySelector("#washSideB")?.value || 62) / 100,
      sideStop: Number(panel.querySelector("#washSideStop")?.value || 61),
      bottomA: Number(panel.querySelector("#washBottomA")?.value || 78) / 100,
      bottomStop: Number(panel.querySelector("#washBottomStop")?.value || 43),
      blur: Number(panel.querySelector("#washBlur")?.value || 0),
    };
  }

  function applyWash() {
    const state = readState();
    const { r, g, b } = hexToRgb255(state.color);
    wash.style.setProperty("--wash-r", String(r));
    wash.style.setProperty("--wash-g", String(g));
    wash.style.setProperty("--wash-b", String(b));
    wash.style.setProperty("--wash-side-a", String(state.sideA));
    wash.style.setProperty("--wash-side-b", String(state.sideB));
    wash.style.setProperty("--wash-side-stop", `${state.sideStop}%`);
    wash.style.setProperty("--wash-bottom-a", String(state.bottomA));
    wash.style.setProperty("--wash-bottom-stop", `${state.bottomStop}%`);
    wash.style.setProperty("--wash-blur", `${state.blur}px`);
  }

  panel.querySelectorAll("[data-wash-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const output = panel.querySelector(`output[for="${input.id}"]`);
      if (output) {
        output.textContent = input.type === "color" ? input.value : input.value;
      }
      applyWash();
    });
  });

  applyWash();
})();
