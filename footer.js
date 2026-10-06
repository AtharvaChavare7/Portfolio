(function initFooterLab() {
  const lab = document.querySelector(".footer-lab");

  if (!lab) {
    return;
  }

  const options = [...lab.querySelectorAll("[data-footer-option]")];
  const concepts = [...lab.querySelectorAll("[data-footer-concept]")];

  function selectConcept(conceptId) {
    options.forEach((option) => {
      const isActive = option.dataset.footerOption === conceptId;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    concepts.forEach((concept) => {
      const isActive = concept.dataset.footerConcept === conceptId;
      concept.classList.toggle("is-active", isActive);
      concept.hidden = !isActive;
    });
  }

  options.forEach((option) => {
    option.addEventListener("click", () => {
      selectConcept(option.dataset.footerOption);
    });
  });

  selectConcept("1");
})();
(function initExploreWorkspace() {
  const workspace = document.querySelector(".explore-workspace");

  if (!workspace) {
    return;
  }

  const folderOpenSrc = "assets/footer/folder-open.svg";
  const folderClosedSrc = "assets/footer/folder-simple.svg";
  const caretDownSrc = "assets/footer/caret-down.svg";
  const caretRightSrc = "assets/footer/caret-right.svg";
  const tabInactiveSrc = "assets/footer/file-stack-inactive.svg";
  const tabActiveSrc = "assets/footer/file-stack-active.svg";

  workspace.querySelectorAll(".explore-workspace__group").forEach((group) => {
    const folderBtn = group.querySelector(".explore-workspace__folder");
    const filesPanel = group.querySelector(".explore-workspace__group-files");
    const folderIcon = folderBtn?.querySelector(".explore-workspace__folder-icon");
    const caret = folderBtn?.querySelector(".explore-workspace__caret");

    if (!folderBtn || !filesPanel) {
      return;
    }

    const setExpanded = (expanded) => {
      group.dataset.expanded = String(expanded);
      filesPanel.hidden = !expanded;

      if (folderIcon) {
        folderIcon.src = expanded ? folderOpenSrc : folderClosedSrc;
        folderIcon.classList.toggle("explore-workspace__folder-icon--open", expanded);
      }

      if (caret) {
        caret.src = expanded ? caretDownSrc : caretRightSrc;
        caret.classList.toggle("explore-workspace__caret--collapsed", !expanded);
      }

      folderBtn.setAttribute("aria-expanded", String(expanded));
    };

    setExpanded(group.dataset.expanded !== "false");

    folderBtn.addEventListener("click", () => {
      setExpanded(group.dataset.expanded !== "true");
    });
  });

  workspace.querySelectorAll(".explore-workspace__file").forEach((fileBtn) => {
    fileBtn.addEventListener("click", () => {
      workspace.querySelectorAll(".explore-workspace__file.is-active").forEach((activeFile) => {
        activeFile.classList.remove("is-active");
        activeFile.setAttribute("aria-current", "false");
      });

      fileBtn.classList.add("is-active");
      fileBtn.setAttribute("aria-current", "true");
    });
  });

  workspace.querySelectorAll(".explore-workspace__tab").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      workspace.querySelectorAll(".explore-workspace__tab").forEach((tab) => {
        const isActive = tab === tabBtn;
        const icon = tab.querySelector("img");

        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));

        if (icon) {
          icon.src = isActive ? tabActiveSrc : tabInactiveSrc;
        }
      });
    });
  });
})();
