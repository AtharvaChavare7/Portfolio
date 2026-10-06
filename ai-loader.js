(function initAiLoader() {
  const LOADER_MARKUP = `
    <div class="ai-loader ai-loader--ring-pulse" aria-hidden="true">
      <svg class="ai-loader__ring-svg" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
        <circle class="ai-loader__ring" cx="15" cy="15" r="10.5" />
      </svg>
      <span class="ai-loader__ring-dot" aria-hidden="true"></span>
    </div>
  `;

  function buildLoaderHost(size = "md") {
    return `
      <div class="ai-loader-host ai-loader-host--${size}" aria-hidden="true">
        ${LOADER_MARKUP}
      </div>
    `;
  }

  function buildTypingMarkup() {
    return `
      <div class="spend-chat__typing">
        ${buildLoaderHost("md")}
      </div>
    `;
  }

  window.buildAiLoaderHost = buildLoaderHost;
  window.buildAiLoaderMarkup = buildTypingMarkup;
})();
