(() => {
const projects = [
  {
    id: "interactions",
    filename: "InteractionsLibrary.tsx",
    name: "Interaction Hub",
    slug: "/interactions-library",
    liveUrl: "https://interaction-eta.vercel.app/",
    icon: "assets/interaction-library/app-blue.svg",
  },
  {
    id: "dataviz",
    filename: "DataVizTool.tsx",
    name: "DataViz Tool",
    slug: "/dataviz-tool",
    liveUrl: "https://cactus-pacing-60443488.figma.site",
    icon: "assets/interaction-library/app-black.svg",
  },
  {
    id: "resume",
    filename: "ResumeEditor.tsx",
    name: "Resume Editor",
    slug: "/resume-editor",
    liveUrl: "https://resumeoptimizer12.figma.site",
    icon: "assets/interaction-library/app-document.svg",
  },
  {
    id: "racket",
    filename: "RacketFinder.tsx",
    name: "Racket Finder",
    slug: "/racket-finder",
    liveUrl: "https://brook-door-80592568.figma.site",
    icon: "assets/interaction-library/app-orange.svg",
  },
  {
    id: "shape",
    filename: "3dShapeGenerator.tsx",
    name: "3d Shape Generator",
    slug: "/3d-shape-generator",
    liveUrl: "https://false-ajar-78657721.figma.site",
    icon: "assets/interaction-library/app-purple.svg",
  },
  {
    id: "notes",
    filename: "NoteTaking.tsx",
    name: "NoteTaking Tool",
    slug: "/notetaking-tool",
    liveUrl: "https://seam-learn-15421336.figma.site",
    icon: "assets/interaction-library/app-pink.svg",
  },
];

const state = {
  mode: "launcher",
  open: [],
  active: null,
  loadToken: 0,
};

const launcher = document.querySelector("#playground-launcher");
const launcherGrid = launcher.querySelector(".launcher-grid");
const shell = document.querySelector(".workspace-shell");
const workspace = shell.querySelector(".workspace");
const projectRows = [...workspace.querySelectorAll(".project")];
const tabs = workspace.querySelector(".tabs");
const address = workspace.querySelector(".address");
const reloadButton = workspace.querySelector("[data-action='reload']");
const visitLink = workspace.querySelector(".visit");
const preview = workspace.querySelector(".viewport");
const splash = workspace.querySelector(".project-splash");
const splashIcon = splash.querySelector(".project-splash__icon img");
const frame = workspace.querySelector(".project-frame");
const picker = workspace.querySelector(".picker-overlay");
const pickerGrid = picker.querySelector(".picker-grid");
const mobileProject = document.querySelector("#mobile-project");
const mobileTitle = mobileProject.querySelector(".mobile-project__title");
const mobileFrame = mobileProject.querySelector(".mobile-project__frame");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function projectById(id) {
  return projects.find((project) => project.id === id);
}

function iconMarkup(project, className = "app-icon exported") {
  return `<span class="${className}" aria-hidden="true"><img src="${project.icon}" alt=""></span>`;
}

function renderLauncherButtons(target, className) {
  target.innerHTML = projects.map((project) => `
    <button class="${className}" type="button" data-project="${project.id}" aria-label="Open ${project.name}">
      ${iconMarkup(project, `${className}__icon app-icon exported`)}
      <span class="${className}__name">${project.name}</span>
    </button>
  `).join("");
}

function renderLauncher() {
  renderLauncherButtons(launcherGrid, "launcher-app");
  renderLauncherButtons(pickerGrid, "picker-app");

  launcherGrid.querySelectorAll(".launcher-app").forEach((button) => {
    button.addEventListener("click", () => enterWorkspace(button.dataset.project, button));
  });

  pickerGrid.querySelectorAll(".picker-app").forEach((button) => {
    button.addEventListener("click", () => {
      closePicker();
      openProject(button.dataset.project, true);
    });
  });
}

function renderSidebar() {
  projectRows.forEach((row, index) => {
    const project = projects[index];
    const isOpen = state.open.includes(project.id);
    const isFocused = state.active === project.id;

    row.dataset.project = project.id;
    row.classList.remove("is-selected");
    row.classList.toggle("is-open", isOpen && !isFocused);
    row.classList.toggle("is-focused", isFocused);
    row.classList.toggle("is-closed", !isOpen);
    row.setAttribute("aria-current", isFocused ? "page" : "false");
  });
}

function renderTabs() {
  const controls = `
    <button class="tab-control tab-control--home" type="button" data-action="home" aria-label="Return to launcher">⌂</button>
    <button class="tab-control tab-control--add" type="button" data-action="add" aria-label="Open another project">+</button>
  `;

  const openTabs = state.open.map((id) => {
    const project = projectById(id);
    const active = id === state.active;
    return `
      <div class="tab-wrap ${active ? "is-active" : ""}" data-project="${id}">
        <button class="tab ${active ? "is-selected" : ""}" type="button" role="tab" aria-selected="${active}">
          ${iconMarkup(project)}
          <span class="tab__label">${project.filename}</span>
        </button>
        <button class="tab-close" type="button" aria-label="Close ${project.filename}">×</button>
      </div>
    `;
  }).join("");

  tabs.innerHTML = controls + openTabs;
  tabs.querySelector("[data-action='home']").addEventListener("click", showLauncher);
  tabs.querySelector("[data-action='add']").addEventListener("click", openPicker);

  tabs.querySelectorAll(".tab-wrap").forEach((tab) => {
    const id = tab.dataset.project;
    tab.querySelector(".tab").addEventListener("click", () => focusProject(id));
    tab.querySelector(".tab-close").addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(id);
    });
  });
}

function renderChrome() {
  renderSidebar();
  renderTabs();
  const project = projectById(state.active);
  if (!project) return;
  address.textContent = `localhost: 3001${project.slug}`;
  visitLink.href = project.liveUrl || project.slug;
  visitLink.setAttribute("aria-label", `Visit ${project.name}`);
}

function showSplash(project) {
  const token = ++state.loadToken;
  splashIcon.src = project.icon;
  splash.hidden = false;
  splash.classList.remove("is-leaving");
  frame.classList.remove("is-visible");
  frame.removeAttribute("src");

  requestAnimationFrame(() => {
    const separator = project.liveUrl?.includes("?") ? "&" : "?";
    frame.src = `${project.liveUrl || project.slug}${separator}playgroundLoad=${token}`;
  });
}

function loadActiveProject() {
  const project = projectById(state.active);
  if (!project) return;
  showSplash(project);
}

frame.addEventListener("load", () => {
  if (!state.active) return;
  splash.classList.add("is-leaving");
  frame.classList.add("is-visible");
  window.setTimeout(() => {
    if (splash.classList.contains("is-leaving")) splash.hidden = true;
  }, reduceMotion.matches ? 0 : 170);
});

function openProject(id, shouldLoad = true) {
  if (!state.open.includes(id)) state.open.push(id);
  state.active = id;
  state.mode = "workspace";
  renderChrome();
  if (shouldLoad) loadActiveProject();
}

function focusProject(id) {
  if (state.active === id) return;
  state.active = id;
  renderChrome();
  loadActiveProject();
}

function closeTab(id) {
  const index = state.open.indexOf(id);
  if (index === -1) return;
  const wasActive = state.active === id;
  state.open.splice(index, 1);

  if (!state.open.length) {
    state.active = null;
    showLauncher();
    return;
  }

  if (wasActive) {
    state.active = state.open[Math.min(index, state.open.length - 1)];
    renderChrome();
    loadActiveProject();
  } else {
    renderChrome();
  }
}

function setWorkspaceVisible(visible) {
  shell.hidden = false;
  workspace.classList.toggle("is-launcher", !visible);
  workspace.querySelector(".body").setAttribute("aria-hidden", String(!visible));
}

function expandProjectFolder() {
  const folder = workspace.querySelector(".folder");
  if (folder.getAttribute("aria-expanded") === "false") {
    folder.click();
  }
}

function showLauncher() {
  state.mode = "launcher";
  picker.hidden = true;
  picker.classList.remove("is-open");
  frame.removeAttribute("src");
  splash.hidden = true;
  setWorkspaceVisible(false);
  launcher.hidden = false;
  launcher.classList.remove("is-exiting");
}

function createFlightIcon(sourceButton) {
  const sourceIcon = sourceButton.querySelector(".launcher-app__icon");
  const rect = sourceIcon.getBoundingClientRect();
  const flight = sourceIcon.cloneNode(true);
  flight.className = "flight-icon app-icon exported";
  Object.assign(flight.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  document.body.appendChild(flight);
  return { flight, rect };
}

function enterWorkspace(id, sourceButton) {
  if (window.innerWidth <= 700) {
    openMobileProject(id);
    return;
  }

  if (reduceMotion.matches) {
    launcher.hidden = true;
    setWorkspaceVisible(true);
    expandProjectFolder();
    workspace.classList.add("is-ready");
    openProject(id);
    return;
  }

  const { flight, rect } = createFlightIcon(sourceButton);
  launcher.classList.add("is-exiting");
  window.setTimeout(() => {
    launcher.hidden = true;
    setWorkspaceVisible(true);
    expandProjectFolder();
    openProject(id, false);
    workspace.classList.add("is-assembling");

    requestAnimationFrame(() => {
      const target = tabs.querySelector(`.tab-wrap[data-project="${id}"] .app-icon`).getBoundingClientRect();
      const x = target.left - rect.left;
      const y = target.top - rect.top;
      const scale = target.width / rect.width;
      flight.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      workspace.classList.remove("is-assembling");
      workspace.classList.add("is-ready");
    });

    window.setTimeout(() => {
      flight.remove();
      loadActiveProject();
    }, 600);
  }, 120);
}

function openPicker() {
  picker.hidden = false;
  requestAnimationFrame(() => picker.classList.add("is-open"));
}

function closePicker() {
  picker.classList.remove("is-open");
  window.setTimeout(() => {
    if (!picker.classList.contains("is-open")) picker.hidden = true;
  }, reduceMotion.matches ? 0 : 150);
}

function reloadActiveProject() {
  if (!state.active) return;
  loadActiveProject();
}

function openMobileProject(id) {
  const project = projectById(id);
  launcher.hidden = true;
  mobileProject.hidden = false;
  mobileTitle.textContent = project.name;
  const separator = project.liveUrl?.includes("?") ? "&" : "?";
  mobileFrame.src = `${project.liveUrl || project.slug}${separator}mobilePlayground=1`;
}

function closeMobileProject() {
  mobileFrame.removeAttribute("src");
  mobileProject.hidden = true;
  launcher.hidden = false;
}

projectRows.forEach((row, index) => {
  row.addEventListener("click", () => openProject(projects[index].id));
});

reloadButton.addEventListener("click", reloadActiveProject);
mobileProject.querySelector(".mobile-project__back").addEventListener("click", closeMobileProject);
picker.querySelector(".picker-overlay__close").addEventListener("click", closePicker);
picker.addEventListener("click", (event) => {
  if (event.target === picker) closePicker();
});

renderLauncher();
renderSidebar();
showLauncher();
})();
