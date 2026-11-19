// Shared by the service worker and options page. Only migrate known legacy IDs.
const MODEL_REPLACEMENTS = {
  openai: {
    "gpt-4o-mini": "gpt-6-luna",
    "gpt-4o-mini-2024-07-18": "gpt-6-luna",
    "gpt-4o": "gpt-6-luna",
    "gpt-4o-2024-08-06": "gpt-6-luna",
    "gpt-4o-2024-11-20": "gpt-6-luna"
  },
  claude: {
    "claude-3-5-haiku-latest": "claude-haiku-5-5",
    "claude-3-5-haiku-20241022": "claude-haiku-5-5",
    "claude-3-7-sonnet-latest": "claude-sonnet-5-5",
    "claude-3-7-sonnet-20250219": "claude-sonnet-5-5"
  },
  gemini: {
    "gemini-2.0-flash": "gemini-3.8-flash",
    "gemini-2.0-flash-001": "gemini-3.8-flash",
    "gemini-2.0-flash-lite": "gemini-3.5-flash-lite",
    "gemini-2.0-flash-lite-001": "gemini-3.5-flash-lite",
    "gemini-1.5-pro": "gemini-3.8-flash",
    "gemini-1.5-pro-001": "gemini-3.8-flash",
    "gemini-1.5-pro-002": "gemini-3.8-flash"
  },
  deepseek: {
    "deepseek-chat": "deepseek-flash",
    "deepseek-reasoner": "deepseek-flash",
    "deepseek-v4-flash": "deepseek-flash",
    "deepseek-v4-flash-vision-exp": "deepseek-flash"
  }
};

const MODEL_PRESETS = {
  openai: ["gpt-6-luna", "gpt-6.2-sol"],
  claude: ["claude-haiku-5-5", "claude-sonnet-5-5"],
  gemini: ["gemini-3.5-flash-lite", "gemini-3.8-flash"],
  deepseek: ["deepseek-flash", "deepseek-v4-pro"],
  openrouter: ["openrouter/free"]
};

const MODEL_MIGRATION_VERSION = 1;
const MODEL_MIGRATION_HOSTS = {
  openai: "api.openai.com",
  claude: "api.anthropic.com",
  gemini: "generativelanguage.googleapis.com",
  deepseek: "api.deepseek.com"
};

function migratedModelId(provider, model) {
  const replacements = MODEL_REPLACEMENTS[provider];
  return replacements && Object.hasOwn(replacements, model) ? replacements[model] : model;
}

function migrateModelConfig(config) {
  if (config.modelMigrationVersion >= MODEL_MIGRATION_VERSION) return config;
  // Only migrate old saved settings on their native API, never a compatible
  // endpoint or an explicitly saved model from a verified catalog.
  try {
    const url = new URL(config.apiUrl);
    if (url.protocol !== "https:" || url.hostname !== MODEL_MIGRATION_HOSTS[config.provider]) return config;
  } catch (_) {
    return config;
  }
  const model = migratedModelId(config.provider, config.model);
  if (model === config.model) return config;
  const migrated = { ...config, model, modelMigrationVersion: MODEL_MIGRATION_VERSION };
  if (config.provider === "deepseek") {
    if (config.model === "deepseek-chat") migrated.deepseekThinkingEnabled = false;
    if (config.model === "deepseek-reasoner") migrated.deepseekThinkingEnabled = true;
  }
  return migrated;
}

function modelMigrationPatch(config, migrated) {
  if (config === migrated) return {};
  const patch = { model: migrated.model, modelMigrationVersion: migrated.modelMigrationVersion };
  if (config.deepseekThinkingEnabled !== migrated.deepseekThinkingEnabled) {
    patch.deepseekThinkingEnabled = migrated.deepseekThinkingEnabled;
  }
  return patch;
}
