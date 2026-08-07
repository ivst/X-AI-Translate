(function () {
  const providerConfig = {
    openai: {
      providerKey: "subscription_instructions_provider_openai",
      installCommand: "npm install -g @openai/codex",
      loginCommand: "codex login"
    },
    claude: {
      providerKey: "subscription_instructions_provider_claude",
      installCommand: "npm install -g @anthropic-ai/claude-code",
      loginCommand: "claude"
    }
  };

  function applyTranslations(strings, lang) {
    document.documentElement.lang = lang || "en";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (strings[key]) element.textContent = strings[key];
    });
  }

  function render(lang, provider) {
    const strings = window.AITranslateI18n.getOptionsStrings(lang);
    const config = providerConfig[provider] || providerConfig.openai;
    const platform = `${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
    const bridgeCommand = platform.includes("win")
      ? "powershell -ExecutionPolicy Bypass -File bridge/install-windows.ps1"
      : platform.includes("mac")
        ? "bash bridge/install-macos.sh"
        : "node bridge/server.mjs";
    applyTranslations(strings, lang);
    document.getElementById("subscriptionInstructionsProvider").textContent =
      strings[config.providerKey] || strings.subscription_instructions_provider_openai;
    document.getElementById("subscriptionInstructionsInstallCommand").textContent = config.installCommand;
    document.getElementById("subscriptionInstructionsLoginCommand").textContent = config.loginCommand;
    document.getElementById("subscriptionInstructionsBridgeCommand").textContent = bridgeCommand;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedProvider = params.get("provider");
  const provider = providerConfig[requestedProvider] ? requestedProvider : "openai";
  const requestedLang = params.get("lang");

  if (requestedLang) {
    render(requestedLang, provider);
  } else {
    chrome.storage.sync.get({ uiLang: "en" }, (data) => {
      render(data.uiLang || "en", provider);
    });
  }
})();
