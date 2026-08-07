const defaultConfig = {
  provider: "googletranslate",
  apiUrl: "https://translate.googleapis.com",
  apiKey: "",
  apiKeyByProvider: {},
  authMode: "apiKey",
  authModeByProvider: {},
  model: "gpt-4o-mini",
  targetLang: "en",
  sourceLang: "auto",
  uiLang: "en",
  overlayMode: "center",
  overlayDuration: 6,
  selectionShortcut: false,
  enableXInlineTranslation: true,
  enableYoutubeInlineTranslation: true,
  enableXAutoTranslation: false,
  enableYoutubeAutoTranslation: false,
  syncApiKeys: false,
  openrouterFreeOnly: true,
  openrouterSource: "user",
  deepseekThinkingEnabled: false,
  yandexFolderId: "",
  customApiUrl: "",
  customModel: ""
};

const DEEPSEEK_LEGACY_MODEL_CONFIG = {
  "deepseek-chat": {
    model: "deepseek-v4-flash",
    thinkingEnabled: false
  },
  "deepseek-reasoner": {
    model: "deepseek-v4-flash",
    thinkingEnabled: true
  }
};

function migrateLegacyDeepSeekConfig(config) {
  if (config.provider !== "deepseek") return config;
  const migration = DEEPSEEK_LEGACY_MODEL_CONFIG[config.model];
  if (!migration) return config;
  const migrated = {
    ...config,
    model: migration.model,
    deepseekThinkingEnabled: migration.thinkingEnabled
  };
  chrome.storage.sync.set({
    model: migrated.model,
    deepseekThinkingEnabled: migrated.deepseekThinkingEnabled
  });
  return migrated;
}

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    apiUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o"]
  },
  claude: {
    label: "Claude",
    apiUrl: "https://api.anthropic.com",
    models: ["claude-3-5-haiku-latest", "claude-3-7-sonnet-latest"]
  },
  gemini: {
    label: "Gemini",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"]
  },
  deepseek: {
    label: "DeepSeek",
    apiUrl: "https://api.deepseek.com",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"]
  },
  googletranslate: {
    label: "Google Translate (free)",
    apiUrl: "https://translate.googleapis.com",
    models: ["google-translate"],
    direct: true,
    requiresApiKey: false
  },
  deepl: {
    label: "DeepL API Free",
    apiUrl: "https://api-free.deepl.com",
    models: ["deepl-translation"],
    direct: true,
    requiresApiKey: true
  },
  yandexgpt: {
    label: "YandexGPT",
    apiUrl: "https://llm.api.cloud.yandex.net/v1",
    models: ["yandexgpt-lite/latest", "yandexgpt/latest"]
  },
  openrouter: {
    label: "OpenRouter",
    apiUrl: "https://openrouter.ai/api/v1",
    models: [
      "qwen/qwen-2.5-7b-instruct",
      "qwen/qwen-2.5-coder-7b-instruct",
      "deepseek/deepseek-r1-distill-llama-70b"
    ]
  },
  custom: {
    label: "Custom",
    apiUrl: "",
    models: []
  }
};



const providerSelect = document.getElementById("provider");
const apiUrlInput = document.getElementById("apiUrl");
const apiKeyInput = document.getElementById("apiKey");
const modelSelect = document.getElementById("model");
const modelCustomInput = document.getElementById("modelCustom");
const apiUrlControl = document.getElementById("apiUrlControl");
const apiKeyControl = document.getElementById("apiKeyControl");
const modelControl = document.getElementById("modelControl");
const providerHint = document.getElementById("providerHint");
const targetLangSelect = document.getElementById("targetLang");
const sourceLangSelect = document.getElementById("sourceLang");
const overlayModeSelect = document.getElementById("overlayMode");
const overlayDurationInput = document.getElementById("overlayDuration");
const selectionShortcutCheckbox = document.getElementById("selectionShortcut");
const enableXInlineTranslationCheckbox = document.getElementById("enableXInlineTranslation");
const enableYoutubeInlineTranslationCheckbox = document.getElementById("enableYoutubeInlineTranslation");
const enableXAutoTranslationCheckbox = document.getElementById("enableXAutoTranslation");
const enableYoutubeAutoTranslationCheckbox = document.getElementById("enableYoutubeAutoTranslation");
const statusEl = document.getElementById("status");
const openrouterControls = document.getElementById("openrouterControls");
const openrouterFreeOnlyCheckbox = document.getElementById("openrouterFreeOnly");
const openrouterSourceSelect = document.getElementById("openrouterSource");
const refreshOpenrouterBtn = document.getElementById("refreshOpenrouter");
const refreshYandexBtn = document.getElementById("refreshYandex");
const uiLangSelect = document.getElementById("uiLang");
const deepseekControls = document.getElementById("deepseekControls");
const deepseekThinkingCheckbox = document.getElementById("deepseekThinkingEnabled");
const yandexControls = document.getElementById("yandexControls");
const yandexFolderInput = document.getElementById("yandexFolderId");
const setupNoteIntro = document.getElementById("setupNoteIntro");
const setupNoteWarning = document.getElementById("setupNoteWarning");
const setupNoteLinksLabel = document.getElementById("setupNoteLinksLabel");
const setupLinkOpenAI = document.getElementById("setupLinkOpenAI");
const setupLinkClaude = document.getElementById("setupLinkClaude");
const setupLinkGemini = document.getElementById("setupLinkGemini");
const setupLinkDeepSeek = document.getElementById("setupLinkDeepSeek");
const setupLinkDeepL = document.getElementById("setupLinkDeepL");
const setupLinkOpenRouter = document.getElementById("setupLinkOpenRouter");
const setupLinkYandex = document.getElementById("setupLinkYandex");
const syncApiKeysCheckbox = document.getElementById("syncApiKeys");
const syncApiKeysLabel = document.getElementById("syncApiKeysLabel");
const syncApiKeysHelp = document.getElementById("syncApiKeysHelp");
const authModeControl = document.getElementById("authModeControl");
const authModeInputs = Array.from(document.querySelectorAll("input[name='authMode']"));
const subscriptionControls = document.getElementById("subscriptionControls");
const subscriptionStatus = document.getElementById("subscriptionStatus");
const subscriptionHint = document.getElementById("subscriptionHint");
const subscriptionConnectButton = document.getElementById("subscriptionConnect");
const subscriptionDisconnectButton = document.getElementById("subscriptionDisconnect");
const subscriptionHelpButton = document.getElementById("subscriptionHelp");
const subscriptionInstructionsDialog = document.getElementById("subscriptionInstructionsDialog");
const subscriptionInstructionsProvider = document.getElementById("subscriptionInstructionsProvider");
const subscriptionInstructionsInstallCommand = document.getElementById("subscriptionInstructionsInstallCommand");
const subscriptionInstructionsLoginCommand = document.getElementById("subscriptionInstructionsLoginCommand");
const subscriptionInstructionsOpenTabButton = document.getElementById("subscriptionInstructionsOpenTab");
const subscriptionInstructionsCloseButton = document.getElementById("subscriptionInstructionsClose");
const subscriptionInstructionsCloseIcon = document.getElementById("subscriptionInstructionsCloseIcon");

let savedCustomApiUrl = "";
let savedCustomModel = "";
let currentAuthMode = "apiKey";
let savedAuthModes = {};

const OPENROUTER_CACHE_KEY = "openrouter_models_cache";
const OPENROUTER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OPENAI_CACHE_KEY = "openai_models_cache";
const OPENAI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEEPSEEK_CACHE_KEY = "deepseek_models_cache";
const DEEPSEEK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CLAUDE_CACHE_KEY = "claude_models_cache";
const CLAUDE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEMINI_CACHE_KEY = "gemini_models_cache";
const GEMINI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const YANDEX_CACHE_KEY = "yandex_models_cache";
const YANDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const SETUP_NOTE_I18N = {
  ar: {
    intro: "يتطلب استخدام الإضافة التسجيل ومفتاح API من أي مزود متوافق مع OpenAI.",
    warning: "للأمان، استخدم مفتاح API منفصلًا بأقل صلاحيات وحد ميزانية.",
    links: "روابط إعداد المفاتيح الرسمية:"
  },
  zh: {
    intro: "要使用扩展，需要注册并获取任意兼容 OpenAI 的提供商 API 密钥。",
    warning: "为安全起见，请使用单独的 API 密钥，并限制权限和预算。",
    links: "官方密钥获取："
  },
  en: {
    intro: "Registration and an API key are required to use the extension with any OpenAI-compatible provider.",
    warning: "For security, use a separate API key with minimal permissions and a limited budget.",
    links: "Official key setup:"
  },
  fr: {
    intro: "Pour utiliser l'extension, une inscription et une clé API d'un fournisseur compatible OpenAI sont nécessaires.",
    warning: "Pour la sécurité, utilisez une clé API distincte avec des droits minimaux et un budget limité.",
    links: "Configuration officielle des clés :"
  },
  de: {
    intro: "Für die Nutzung der Erweiterung sind eine Registrierung und ein API-Schlüssel eines OpenAI-kompatiblen Anbieters erforderlich.",
    warning: "Aus Sicherheitsgründen sollten Sie einen separaten API-Schlüssel mit minimalen Rechten und begrenztem Budget verwenden.",
    links: "Offizielle Schlüssel-Einrichtung:"
  },
  el: {
    intro: "Για να χρησιμοποιήσετε την επέκταση, απαιτούνται εγγραφή και κλειδί API από πάροχο συμβατό με OpenAI.",
    warning: "Για ασφάλεια, χρησιμοποιήστε ξεχωριστό κλειδί API με ελάχιστα δικαιώματα και περιορισμένο budget.",
    links: "Επίσημη ρύθμιση κλειδιών:"
  },
  he: {
    intro: "כדי להשתמש בתוסף נדרשים הרשמה ומפתח API מכל ספק תואם OpenAI.",
    warning: "למען האבטחה, השתמשו במפתח API נפרד עם הרשאות מינימליות ותקציב מוגבל.",
    links: "הגדרת מפתחות רשמית:"
  },
  it: {
    intro: "Per usare l'estensione sono necessari registrazione e una chiave API di un provider compatibile con OpenAI.",
    warning: "Per sicurezza, usa una chiave API separata con permessi minimi e budget limitato.",
    links: "Configurazione ufficiale delle chiavi:"
  },
  ja: {
    intro: "拡張機能を使用するには、OpenAI 互換プロバイダーでの登録と API キーが必要です。",
    warning: "セキュリティのため、権限を最小限にし、予算を制限した専用の API キーを使用してください。",
    links: "公式のキー取得先:"
  },
  ko: {
    intro: "확장 프로그램을 사용하려면 OpenAI 호환 제공자의 계정 등록과 API 키가 필요합니다.",
    warning: "보안을 위해 최소 권한과 제한된 예산으로 별도의 API 키를 사용하세요.",
    links: "공식 키 발급 안내:"
  },
  pt: {
    intro: "Para usar a extensão, é necessário cadastro e chave de API de qualquer provedor compatível com OpenAI.",
    warning: "Por segurança, use uma chave de API separada com permissões mínimas e orçamento limitado.",
    links: "Configuração oficial de chaves:"
  },
  ru: {
    intro: "Для работы расширения нужна регистрация и API-ключ любого OpenAI-совместимого провайдера.",
    warning: "Для безопасности используйте отдельный API-ключ с минимальными правами и ограниченным бюджетом.",
    links: "Официальные инструкции по ключам:"
  },
  es: {
    intro: "Para usar la extensión, se requiere registro y una clave API de cualquier proveedor compatible con OpenAI.",
    warning: "Por seguridad, usa una clave API independiente con permisos mínimos y presupuesto limitado.",
    links: "Configuración oficial de claves:"
  },
  th: {
    intro: "การใช้งานส่วนขยายต้องมีการสมัครและคีย์ API จากผู้ให้บริการที่รองรับ OpenAI",
    warning: "เพื่อความปลอดภัย ให้ใช้คีย์ API แยกต่างหาก โดยจำกัดสิทธิ์และงบประมาณ",
    links: "ลิงก์ทางการสำหรับรับคีย์:"
  },
  tr: {
    intro: "Eklentiyi kullanmak için OpenAI uyumlu bir sağlayıcıdan kayıt ve API anahtarı gerekir.",
    warning: "Güvenlik için minimum yetkili ve bütçesi sınırlı ayrı bir API anahtarı kullanın.",
    links: "Resmi anahtar alma bağlantıları:"
  },
  uk: {
    intro: "Для роботи розширення потрібні реєстрація та API-ключ будь-якого OpenAI-сумісного постачальника.",
    warning: "Для безпеки використовуйте окремий API-ключ із мінімальними правами та обмеженим бюджетом.",
    links: "Офіційні інструкції для отримання ключів:"
  }
};

const SYNC_KEYS_I18N = {
  ar: {
    label: "مزامنة مفاتيح API عبر الأجهزة",
    warning: "الأمان أقل: سيتم حفظ مفاتيح API في Chrome Sync ومزامنتها مع الأجهزة المرتبطة بالحساب. استخدم هذا الخيار فقط إذا كنت تثق بجميع أجهزتك."
  },
  zh: {
    label: "在设备间同步 API 密钥",
    warning: "安全性较低：API 密钥会存储在 Chrome 同步中，并同步到该账号下的设备。仅在你信任所有设备时启用。"
  },
  en: {
    label: "Sync API keys across devices",
    warning: "Less secure: API keys will be stored in Chrome Sync and synchronized to devices connected to your account. Enable only if you trust all those devices."
  },
  fr: {
    label: "Synchroniser les clés API entre appareils",
    warning: "Moins sûr : les clés API seront stockées dans Chrome Sync et synchronisées sur les appareils liés à votre compte. Activez uniquement si vous faites confiance à tous ces appareils."
  },
  de: {
    label: "API-Schlüssel zwischen Geräten synchronisieren",
    warning: "Weniger sicher: API-Schlüssel werden in Chrome Sync gespeichert und auf Geräte Ihres Kontos synchronisiert. Nur aktivieren, wenn Sie allen diesen Geräten vertrauen."
  },
  el: {
    label: "Συγχρονισμός κλειδιών API μεταξύ συσκευών",
    warning: "Λιγότερο ασφαλές: τα κλειδιά API αποθηκεύονται στο Chrome Sync και συγχρονίζονται σε συσκευές του λογαριασμού σας. Ενεργοποιήστε το μόνο αν εμπιστεύεστε όλες αυτές τις συσκευές."
  },
  he: {
    label: "סנכרון מפתחות API בין מכשירים",
    warning: "פחות מאובטח: מפתחות API יישמרו ב-Chrome Sync ויסונכרנו למכשירים המחוברים לחשבון. הפעל רק אם אתה סומך על כל המכשירים האלה."
  },
  it: {
    label: "Sincronizza le chiavi API tra dispositivi",
    warning: "Meno sicuro: le chiavi API verranno archiviate in Chrome Sync e sincronizzate sui dispositivi del tuo account. Attiva solo se ti fidi di tutti questi dispositivi."
  },
  ja: {
    label: "APIキーをデバイス間で同期する",
    warning: "安全性は低下します: APIキーは Chrome Sync に保存され、同じアカウントのデバイスへ同期されます。すべてのデバイスを信頼できる場合のみ有効にしてください。"
  },
  ko: {
    label: "기기 간 API 키 동기화",
    warning: "보안 수준이 낮아집니다: API 키가 Chrome Sync에 저장되고 계정에 연결된 기기로 동기화됩니다. 모든 기기를 신뢰할 때만 사용하세요."
  },
  pt: {
    label: "Sincronizar chaves de API entre dispositivos",
    warning: "Menos seguro: as chaves de API serão armazenadas no Chrome Sync e sincronizadas com os dispositivos da sua conta. Ative apenas se confiar em todos esses dispositivos."
  },
  ru: {
    label: "Синхронизировать API-ключи между устройствами",
    warning: "Менее безопасно: API-ключи будут храниться в Chrome Sync и синхронизироваться на устройства вашего аккаунта. Включайте только если доверяете всем этим устройствам."
  },
  es: {
    label: "Sincronizar claves API entre dispositivos",
    warning: "Menos seguro: las claves API se guardarán en Chrome Sync y se sincronizarán con los dispositivos de tu cuenta. Actívalo solo si confías en todos esos dispositivos."
  },
  th: {
    label: "ซิงก์คีย์ API ระหว่างอุปกรณ์",
    warning: "ความปลอดภัยลดลง: คีย์ API จะถูกเก็บใน Chrome Sync และซิงก์ไปยังอุปกรณ์ในบัญชีของคุณ เปิดใช้เฉพาะเมื่อเชื่อถือทุกอุปกรณ์ดังกล่าว"
  },
  tr: {
    label: "API anahtarlarını cihazlar arasında senkronize et",
    warning: "Daha az güvenli: API anahtarları Chrome Sync'te saklanır ve hesabınıza bağlı cihazlara eşitlenir. Yalnızca bu cihazların tümüne güveniyorsanız açın."
  },
  uk: {
    label: "Синхронізувати API-ключі між пристроями",
    warning: "Менш безпечно: API-ключі зберігатимуться в Chrome Sync і синхронізуватимуться на пристрої вашого акаунта. Увімкніть лише якщо довіряєте всім цим пристроям."
  }
};

const DIRECT_PROVIDER_SETUP_NOTE_I18N = {
  googletranslate: {
    en: {
      intro: "Google Translate uses a free web endpoint and does not require an API key.",
      warning: "This endpoint is unofficial and may be rate-limited by Google. Avoid sending sensitive text."
    },
    ru: {
      intro: "Google Translate использует бесплатный веб-эндпоинт, API-ключ не требуется.",
      warning: "Эндпоинт неофициальный и может ограничиваться Google. Не отправляйте конфиденциальный текст."
    }
  },
  deepl: {
    en: {
      intro: "DeepL API Free requires a free DeepL API key.",
      warning: "DeepL applies its own free-plan quota and terms. Store the key locally unless sync is needed."
    },
    ru: {
      intro: "Для DeepL API Free нужен бесплатный API-ключ DeepL.",
      warning: "На DeepL распространяются ограничения и условия бесплатного плана. Храните ключ локально, если синхронизация не нужна."
    }
  }
};

const DIRECT_PROVIDER_HINT_I18N = {
  googletranslate: {
    en: "Uses Google Translate's free web endpoint. No API key is required.",
    ru: "Использует бесплатный веб-эндпоинт Google Translate. API-ключ не требуется."
  },
  deepl: {
    en: "Uses the DeepL API Free endpoint. Create a free DeepL API key to get started.",
    ru: "Использует эндпоинт DeepL API Free. Для начала создайте бесплатный API-ключ DeepL."
  }
};

const SUBSCRIPTION_PROVIDERS = new Set(["openai", "claude"]);
const SUBSCRIPTION_HINT_I18N = {
  openai: {
    en: "Uses your ChatGPT plan through the local Codex bridge. API-key mode remains available.",
    ru: "Использует ваш план ChatGPT через локальный bridge Codex. Режим API-ключа остаётся доступным."
  },
  claude: {
    en: "Uses your Claude Pro/Max plan through the local Claude Code bridge. API-key mode remains available.",
    ru: "Использует ваш план Claude Pro/Max через локальный bridge Claude Code. Режим API-ключа остаётся доступным."
  }
};
const SUBSCRIPTION_SETUP_NOTE_I18N = {
  openai: {
    en: {
      intro: "Subscription mode uses the local Codex bridge and your ChatGPT plan.",
      warning: "The bridge must be running on this computer. API-key mode remains available."
    },
    ru: {
      intro: "Режим подписки использует локальный bridge Codex и ваш план ChatGPT.",
      warning: "Bridge должен быть запущен на этом компьютере. Режим API-ключа остаётся доступным."
    }
  },
  claude: {
    en: {
      intro: "Subscription mode uses the local Claude Code bridge and your Claude Pro/Max plan.",
      warning: "The bridge must be running on this computer. API-key mode remains available."
    },
    ru: {
      intro: "Режим подписки использует локальный bridge Claude Code и ваш план Claude Pro/Max.",
      warning: "Bridge должен быть запущен на этом компьютере. Режим API-ключа остаётся доступным."
    }
  }
};

function supportsSubscription(provider) {
  return SUBSCRIPTION_PROVIDERS.has(provider);
}

function getAuthModeForProvider(data, provider) {
  const configured = data.authModeByProvider?.[provider]
    || (data.provider === provider ? data.authMode : "apiKey");
  return supportsSubscription(provider) && configured === "subscription"
    ? "subscription"
    : "apiKey";
}

function sendSubscriptionMessage(action, provider) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, provider }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Subscription bridge request failed."));
        return;
      }
      resolve(response);
    });
  });
}

function setSubscriptionStatus(text, isError = false, connected = false) {
  if (!subscriptionStatus) return;
  subscriptionStatus.textContent = text;
  subscriptionStatus.style.color = isError ? "#b42318" : "";
  if (subscriptionConnectButton) {
    subscriptionConnectButton.style.display = connected ? "none" : "inline-block";
  }
  if (subscriptionDisconnectButton) {
    subscriptionDisconnectButton.style.display = connected ? "inline-block" : "none";
  }
}

function refreshSubscriptionStatus(provider) {
  if (!supportsSubscription(provider) || currentAuthMode !== "subscription") return;
  const strings = getLocaleStrings(uiLangSelect?.value || "en");
  setSubscriptionStatus(strings.subscription_status_checking || "Checking connection...", false, false);
  sendSubscriptionMessage("subscriptionStatus", provider)
    .then((data) => {
      if (data.authenticated === true) {
        const account = data.account ? ` (${data.account})` : "";
        setSubscriptionStatus(
          `${strings.subscription_status_connected || "Connected"}${account}`,
          false,
          true
        );
      } else if (data.authenticated === false) {
        setSubscriptionStatus(
          strings.subscription_status_login_required || "Login required",
          false,
          false
        );
      } else {
        setSubscriptionStatus(
          strings.subscription_status_not_verified || "Install and sign in to the provider CLI",
          false,
          false
        );
      }
    })
    .catch((err) => {
      setSubscriptionStatus(err.message || strings.subscription_status_bridge_unavailable, true, false);
    });
}

async function updateSubscriptionStatusAfterLogin(provider) {
  const strings = getLocaleStrings(uiLangSelect?.value || "en");
  try {
    const result = await sendSubscriptionMessage("subscriptionLogin", provider);
    setSubscriptionStatus(
      result.message || strings.subscription_status_login_started || "Login started in the local bridge.",
      false,
      false
    );
    window.setTimeout(() => refreshSubscriptionStatus(provider), 1500);
  } catch (err) {
    setSubscriptionStatus(err.message || "Subscription login failed.", true, false);
  }
}

function getLocaleStrings(lang) {
  return window.AITranslateI18n.getOptionsStrings(lang);
}

const SUBSCRIPTION_INSTRUCTION_CONFIG = {
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

function getSubscriptionInstructionConfig(provider) {
  return SUBSCRIPTION_INSTRUCTION_CONFIG[provider] || SUBSCRIPTION_INSTRUCTION_CONFIG.openai;
}

function getSubscriptionInstructionsUrl(provider) {
  const lang = encodeURIComponent(uiLangSelect?.value || "en");
  const selectedProvider = encodeURIComponent(
    SUBSCRIPTION_INSTRUCTION_CONFIG[provider] ? provider : "openai"
  );
  return `${chrome.runtime.getURL("bridge-instructions.html")}?provider=${selectedProvider}&lang=${lang}`;
}

function applySubscriptionInstructionContent(lang, provider) {
  if (!subscriptionInstructionsDialog) return;
  const strings = getLocaleStrings(lang || "en");
  const config = getSubscriptionInstructionConfig(provider);
  if (subscriptionInstructionsProvider) {
    subscriptionInstructionsProvider.textContent = strings[config.providerKey] || strings.subscription_instructions_provider_openai;
  }
  if (subscriptionInstructionsInstallCommand) {
    subscriptionInstructionsInstallCommand.textContent = config.installCommand;
  }
  if (subscriptionInstructionsLoginCommand) {
    subscriptionInstructionsLoginCommand.textContent = config.loginCommand;
  }
}

function openSubscriptionInstructionsTab() {
  window.open(getSubscriptionInstructionsUrl(providerSelect.value), "_blank", "noopener,noreferrer");
}

function openSubscriptionInstructionsDialog() {
  applySubscriptionInstructionContent(uiLangSelect.value, providerSelect.value);
  if (typeof subscriptionInstructionsDialog?.showModal === "function") {
    subscriptionInstructionsDialog.showModal();
  }
}

function closeSubscriptionInstructionsDialog() {
  if (typeof subscriptionInstructionsDialog?.close === "function" && subscriptionInstructionsDialog.open) {
    subscriptionInstructionsDialog.close();
  }
}

function applyTranslations(lang) {
  document.documentElement.lang = lang || "en";
  const strings = getLocaleStrings(lang);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (strings[key]) {
      el.textContent = strings[key];
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (strings[key]) {
      el.setAttribute("placeholder", strings[key]);
    }
  });
  applySubscriptionInstructionContent(lang, providerSelect?.value);
}

function applySetupNoteTranslations(lang) {
  const strings = SETUP_NOTE_I18N[lang] || SETUP_NOTE_I18N.en;
  const syncStrings = SYNC_KEYS_I18N[lang] || SYNC_KEYS_I18N.en;
  const subscriptionNote = currentAuthMode === "subscription"
    ? SUBSCRIPTION_SETUP_NOTE_I18N[providerSelect.value]?.[lang]
      || SUBSCRIPTION_SETUP_NOTE_I18N[providerSelect.value]?.en
    : null;
  const directNote = DIRECT_PROVIDER_SETUP_NOTE_I18N[providerSelect.value]?.[lang]
    || DIRECT_PROVIDER_SETUP_NOTE_I18N[providerSelect.value]?.en;
  const note = subscriptionNote || directNote;
  setupNoteIntro.textContent = note?.intro || strings.intro;
  setupNoteWarning.textContent = note?.warning || strings.warning;
  setupNoteLinksLabel.textContent = strings.links;
  setupLinkOpenAI.textContent = "OpenAI";
  if (setupLinkClaude) {
    setupLinkClaude.textContent = "Claude";
  }
  if (setupLinkGemini) {
    setupLinkGemini.textContent = "Gemini";
  }
  setupLinkDeepSeek.textContent = "DeepSeek";
  if (setupLinkDeepL) {
    setupLinkDeepL.textContent = "DeepL";
  }
  setupLinkOpenRouter.textContent = "OpenRouter";
  setupLinkYandex.textContent = "YandexGPT";
  if (syncApiKeysLabel) {
    syncApiKeysLabel.textContent = syncStrings.label;
  }
  if (syncApiKeysHelp) {
    syncApiKeysHelp.dataset.tooltip = syncStrings.warning;
    syncApiKeysHelp.removeAttribute("title");
    syncApiKeysHelp.setAttribute("aria-label", syncStrings.label);
    syncApiKeysHelp.setAttribute("aria-description", syncStrings.warning);
  }
}

function getKeyByProviderFromStore(provider, syncData, localData, useSyncKeys) {
  if (useSyncKeys) {
    const map = syncData.apiKeyByProvider || {};
    return map[provider] || "";
  }
  const map = localData.apiKeyByProvider || {};
  return map[provider] || "";
}

function includeLegacyKey(keyMap, legacyKey, provider) {
  const migrated = { ...(keyMap || {}) };
  if (legacyKey && provider && Object.keys(migrated).length === 0) {
    migrated[provider] = legacyKey;
  }
  return migrated;
}

function migrateLegacyKeyData(syncData, localData) {
  const provider = syncData.provider || defaultConfig.provider;
  const rawSyncMap = { ...(syncData.apiKeyByProvider || {}) };
  const rawLocalMap = { ...(localData.apiKeyByProvider || {}) };
  const hasMappedKeys = Object.keys(rawSyncMap).length > 0 || Object.keys(rawLocalMap).length > 0;
  const syncMap = hasMappedKeys
    ? rawSyncMap
    : includeLegacyKey(rawSyncMap, syncData.apiKey, provider);
  const localMap = hasMappedKeys
    ? rawLocalMap
    : includeLegacyKey(rawLocalMap, localData.apiKey, provider);

  if (syncData.syncApiKeys) {
    const mergedSyncMap = { ...localMap, ...syncMap };
    chrome.storage.sync.set({ apiKeyByProvider: mergedSyncMap, apiKey: "" });
    chrome.storage.local.set({ apiKeyByProvider: {}, apiKey: "" });
    return {
      syncData: { ...syncData, apiKeyByProvider: mergedSyncMap, apiKey: "" },
      localData: { ...localData, apiKeyByProvider: {}, apiKey: "" }
    };
  }

  const mergedLocalMap = { ...syncMap, ...localMap };
  chrome.storage.local.set({ apiKeyByProvider: mergedLocalMap, apiKey: "" });
  chrome.storage.sync.set({ apiKeyByProvider: {}, apiKey: "" });
  return {
    syncData: { ...syncData, apiKeyByProvider: {}, apiKey: "" },
    localData: { ...localData, apiKeyByProvider: mergedLocalMap, apiKey: "" }
  };
}

function migrateKeyStorage(useSyncKeys, currentProvider, done) {
  chrome.storage.sync.get({ apiKeyByProvider: {}, apiKey: "" }, (syncData) => {
    chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
      const syncMap = { ...(syncData.apiKeyByProvider || {}) };
      const localMap = { ...(localData.apiKeyByProvider || {}) };
      const hasMappedKeys = Object.keys(syncMap).length > 0 || Object.keys(localMap).length > 0;
      const migratedSyncMap = hasMappedKeys
        ? syncMap
        : includeLegacyKey(syncMap, syncData.apiKey, currentProvider);
      const migratedLocalMap = hasMappedKeys
        ? localMap
        : includeLegacyKey(localMap, localData.apiKey, currentProvider);
      if (useSyncKeys) {
        const nextSyncMap = { ...migratedLocalMap, ...migratedSyncMap };
        chrome.storage.sync.set(
          {
            syncApiKeys: true,
            apiKeyByProvider: nextSyncMap,
            apiKey: ""
          },
          () => {
            chrome.storage.local.set(
              { apiKeyByProvider: {}, apiKey: "" },
              () => done?.()
            );
          }
        );
        return;
      }
      const nextLocalMap = { ...migratedLocalMap, ...migratedSyncMap };
      chrome.storage.local.set(
        {
          apiKeyByProvider: nextLocalMap,
          apiKey: ""
        },
        () => {
          chrome.storage.sync.set(
            {
              syncApiKeys: false,
              apiKeyByProvider: {},
              apiKey: ""
            },
            () => done?.()
          );
        }
      );
    });
  });
}

function getLanguageDisplayName(code, uiLang) {
  return window.AITranslateI18n.getLanguageDisplayName(code, uiLang);
}

function buildLanguageOptions(selectEl, lang, selectedValue) {
  const strings = getLocaleStrings(lang);
  const autoLabel = strings.autodetect || "Autodetect";
  const hasAuto = selectEl.id === "sourceLang";
  const preferredValue = selectedValue || selectEl.value;
  selectEl.innerHTML = "";
  if (hasAuto) {
    const opt = document.createElement("option");
    opt.value = "auto";
    opt.textContent = autoLabel;
    selectEl.appendChild(opt);
  }
  window.AITranslateI18n.languageCodes.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = getLanguageDisplayName(code, lang);
    selectEl.appendChild(opt);
  });
  if (preferredValue && Array.from(selectEl.options).some((opt) => opt.value === preferredValue)) {
    selectEl.value = preferredValue;
  }
}

function buildUiLanguageOptions(selectEl) {
  const labels = window.AITranslateI18n.uiLanguageLabels;
  selectEl.innerHTML = "";
  window.AITranslateI18n.languageCodes.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = labels[code] || code;
    selectEl.appendChild(opt);
  });
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#0b6b0b";
  if (message) {
    setTimeout(() => {
      statusEl.textContent = "";
    }, 2500);
  }
}

function formatYandexModelLabel(modelId) {
  const text = (modelId || "").trim();
  if (!text) return modelId;
  const match = text.match(/^gpt:\/\/[^/]+\/(.+)$/i);
  if (match && match[1]) {
    return match[1];
  }
  return text;
}

function getModelLabel(modelId, provider) {
  if (provider === "yandexgpt") {
    return formatYandexModelLabel(modelId);
  }
  return modelId;
}

function populateModels(models, selected, provider = providerSelect.value) {
  modelSelect.innerHTML = "";
  const hasModels = models.length > 0;
  if (hasModels) {
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = getModelLabel(model, provider);
      modelSelect.appendChild(option);
    });
    modelSelect.style.display = "block";
    modelSelect.disabled = false;
    modelCustomInput.style.display = "none";
    modelSelect.value = selected && models.includes(selected) ? selected : models[0];
  } else {
    modelSelect.style.display = "none";
    modelSelect.disabled = true;
    modelCustomInput.style.display = "block";
    modelCustomInput.value = selected || "";
  }
}

function isDirectProvider(provider) {
  return Boolean(PROVIDERS[provider]?.direct);
}

function setProviderControls(provider) {
  const preset = PROVIDERS[provider] || PROVIDERS.custom;
  const isDirect = Boolean(preset.direct);
  const isGoogle = provider === "googletranslate";
  const uiLang = uiLangSelect?.value || "en";
  const strings = getLocaleStrings(uiLang);
  const apiUrlLabel = document.getElementById("apiUrlLabel");
  const apiUrlLabelKey = provider === "deepl"
    ? "api_base_url_deepl"
    : "api_base_url";
  const apiUrlPlaceholderKey = provider === "deepl"
    ? "api_base_url_placeholder_deepl"
    : "api_base_url_placeholder";
  const subscriptionSupported = supportsSubscription(provider);
  if (!subscriptionSupported && currentAuthMode === "subscription") {
    currentAuthMode = "apiKey";
  }
  const subscriptionSelected = subscriptionSupported && currentAuthMode === "subscription";

  apiUrlControl.style.display = isGoogle || subscriptionSelected ? "none" : "block";
  apiKeyControl.style.display = preset.requiresApiKey === false || subscriptionSelected
    ? "none"
    : "block";
  modelControl.style.display = isDirect || subscriptionSelected ? "none" : "block";
  deepseekControls.style.display = provider === "deepseek" ? "block" : "none";
  authModeControl.style.display = subscriptionSupported ? "block" : "none";
  subscriptionControls.style.display = subscriptionSelected ? "block" : "none";
  authModeInputs.forEach((input) => {
    input.checked = input.value === (subscriptionSelected ? "subscription" : "apiKey");
  });
  if (subscriptionSelected) {
    subscriptionHint.textContent = SUBSCRIPTION_HINT_I18N[provider]?.[uiLang]
      || SUBSCRIPTION_HINT_I18N[provider]?.en
      || strings.subscription_hint;
  }
  if (apiUrlLabel) {
    apiUrlLabel.textContent = strings[apiUrlLabelKey] || strings.api_base_url;
  }
  apiUrlInput.placeholder = strings[apiUrlPlaceholderKey]
    || strings.api_base_url_placeholder;
  providerHint.textContent = DIRECT_PROVIDER_HINT_I18N[provider]?.[uiLang]
    || DIRECT_PROVIDER_HINT_I18N[provider]?.en
    || "";
  providerHint.style.display = isDirect ? "block" : "none";
}

function applyProviderDefaults(provider, currentModel) {
  const preset = PROVIDERS[provider] || PROVIDERS.custom;
  if (provider === "custom") {
    apiUrlInput.value = savedCustomApiUrl || "";
    populateModels([], savedCustomModel || "");
    setProviderControls(provider);
    return;
  }
  apiUrlInput.value = preset.apiUrl || "";
  populateModels(preset.models, currentModel);
  setProviderControls(provider);
}

function setOpenrouterControlsVisible(visible) {
  openrouterControls.style.display = visible ? "block" : "none";
}

function setYandexControlsVisible(visible) {
  yandexControls.style.display = visible ? "block" : "none";
}

function normalizeApiBaseUrl(apiUrl) {
  return (apiUrl || "").trim().replace(/\/$/, "");
}

function normalizeProviderApiUrl(provider, apiUrl) {
  const base = normalizeApiBaseUrl(apiUrl);
  if (!base) return base;
  try {
    const url = new URL(base);
    if (provider === "openrouter" && url.hostname.toLowerCase() === "openrouter.ai") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "" || path === "/" || !path.startsWith("/api/")) {
        url.pathname = "/api/v1";
      }
    }
    if (provider === "yandexgpt" && /(^|\.)api\.cloud\.yandex\.net$/i.test(url.hostname)) {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "" || path === "/") {
        url.pathname = "/v1";
      }
    }
    if (provider === "gemini" && url.hostname.toLowerCase() === "generativelanguage.googleapis.com") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "" || path === "/" || path === "/v1beta") {
        url.pathname = "/v1beta/openai";
      }
    }
    if (provider === "claude" && url.hostname.toLowerCase() === "api.anthropic.com") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "/v1" || path === "/v1/messages" || path === "/v1/models") {
        url.pathname = "/";
      }
    }
    return url.toString().replace(/\/$/, "");
  } catch (_) {
    return base;
  }
}

function isLikelyOpenAIChatModel(id) {
  if (!id) return false;
  return /^(gpt-|chatgpt-|o[1-9]\d*($|-)|o\d($|-))/i.test(id);
}

async function fetchOpenAIModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterOpenAIModels(models) {
  const ids = models.map((m) => m.id).filter(Boolean);
  const chat = ids.filter((id) => isLikelyOpenAIChatModel(id)).sort();
  return chat.length ? chat : ids.sort();
}

function loadOpenAICache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [OPENAI_CACHE_KEY]: null }, (data) => {
      resolve(data[OPENAI_CACHE_KEY]);
    });
  });
}

async function getOpenAIModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadOpenAICache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < OPENAI_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchOpenAIModels(normalizedUrl, apiKey);
  const ids = filterOpenAIModels(models);
  chrome.storage.local.set({
    [OPENAI_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

async function fetchDeepSeekModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterDeepSeekModels(models) {
  return models
    .map((m) => m.id)
    .filter((id) => /^deepseek-/i.test(String(id)))
    .filter((id) => id !== "deepseek-chat" && id !== "deepseek-reasoner")
    .sort();
}

function loadDeepSeekCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [DEEPSEEK_CACHE_KEY]: null }, (data) => {
      resolve(data[DEEPSEEK_CACHE_KEY]);
    });
  });
}

async function getDeepSeekModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadDeepSeekCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < DEEPSEEK_CACHE_TTL_MS
  ) {
    return filterDeepSeekModels(cache.models.map((id) => ({ id })));
  }
  const models = await fetchDeepSeekModels(normalizedUrl, apiKey);
  const ids = filterDeepSeekModels(models);
  chrome.storage.local.set({
    [DEEPSEEK_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

async function fetchClaudeModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/v1/models`;
  const response = await fetch(endpoint, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterClaudeModels(models) {
  return models
    .map((m) => m.id)
    .filter(Boolean)
    .filter((id) => /^claude-/i.test(String(id)))
    .sort();
}

function loadClaudeCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CLAUDE_CACHE_KEY]: null }, (data) => {
      resolve(data[CLAUDE_CACHE_KEY]);
    });
  });
}

async function getClaudeModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadClaudeCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < CLAUDE_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchClaudeModels(normalizedUrl, apiKey);
  const ids = filterClaudeModels(models);
  chrome.storage.local.set({
    [CLAUDE_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

function getGeminiModelsEndpoint(apiUrl) {
  const normalized = normalizeApiBaseUrl(apiUrl);
  try {
    const url = new URL(normalized || "https://generativelanguage.googleapis.com/v1beta/openai");
    if (url.hostname.toLowerCase() === "generativelanguage.googleapis.com") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path.endsWith("/openai")) {
        url.pathname = path.slice(0, -"/openai".length) || "/v1beta";
      } else if (path === "" || path === "/") {
        url.pathname = "/v1beta";
      }
      return `${url.toString().replace(/\/$/, "")}/models`;
    }
  } catch (_) {
    // fall through
  }
  return "https://generativelanguage.googleapis.com/v1beta/models";
}

async function fetchGeminiModels(apiUrl, apiKey) {
  const endpoint = getGeminiModelsEndpoint(apiUrl);
  const response = await fetch(endpoint, {
    headers: {
      "x-goog-api-key": apiKey
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.models) ? json.models : [];
}

function filterGeminiModels(models) {
  return models
    .filter((m) => {
      const name = String(m?.name || "");
      if (!name.startsWith("models/gemini")) return false;
      const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      return methods.length === 0 || methods.includes("generateContent");
    })
    .map((m) => String(m.name).replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
}

function loadGeminiCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [GEMINI_CACHE_KEY]: null }, (data) => {
      resolve(data[GEMINI_CACHE_KEY]);
    });
  });
}

async function getGeminiModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadGeminiCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < GEMINI_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchGeminiModels(normalizedUrl, apiKey);
  const ids = filterGeminiModels(models);
  chrome.storage.local.set({
    [GEMINI_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

async function fetchYandexModels(apiUrl, apiKey, folderId) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const headers = {
    Authorization: `Bearer ${apiKey}`
  };
  const cleanFolderId = (folderId || "").trim();
  if (cleanFolderId) {
    headers["OpenAI-Project"] = cleanFolderId;
  }
  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yandex API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterYandexModels(models) {
  return models
    .map((m) => m.id)
    .filter(Boolean)
    .filter((id) => {
      const lower = String(id).toLowerCase();
      return !lower.startsWith("emb://") && !lower.includes("embedding");
    })
    .sort();
}

function loadYandexCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [YANDEX_CACHE_KEY]: null }, (data) => {
      resolve(data[YANDEX_CACHE_KEY]);
    });
  });
}

async function getYandexModels(apiUrl, apiKey, folderId, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  const cleanFolderId = (folderId || "").trim();
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadYandexCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.folderId === cleanFolderId &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < YANDEX_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchYandexModels(normalizedUrl, apiKey, cleanFolderId);
  const ids = filterYandexModels(models);
  chrome.storage.local.set({
    [YANDEX_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      folderId: cleanFolderId,
      models: ids
    }
  });
  return ids;
}


function isFreeModel(pricing) {
  if (!pricing) return false;
  const fields = [
    "prompt",
    "completion",
    "request",
    "image",
    "web_search",
    "internal_reasoning",
    "input_cache_read",
    "input_cache_write"
  ];
  return fields.every((key) => pricing[key] === "0" || pricing[key] === 0 || pricing[key] === undefined);
}

async function fetchOpenrouterModels(apiKey, source) {
  const endpoints = source === "user"
    ? ["https://openrouter.ai/api/v1/models/user", "https://openrouter.ai/api/v1/models"]
    : ["https://openrouter.ai/api/v1/models"];

  let lastError = null;
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (response.ok) {
      const json = await response.json();
      return Array.isArray(json?.data) ? json.data : [];
    }

    const errorText = await response.text();
    const isUserEndpoint = endpoint.endsWith("/models/user");
    const isCookieAuthError =
      response.status === 401 &&
      /auth cookie|no user or org id/i.test(errorText);

    if (isUserEndpoint && isCookieAuthError) {
      lastError = new Error("OpenRouter user models are unavailable for this key. Loaded public models.");
      continue;
    }

    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  throw lastError || new Error("OpenRouter API error: cannot load models.");
}

function filterOpenrouterModels(models, freeOnly) {
  const filtered = freeOnly ? models.filter((m) => isFreeModel(m.pricing)) : models;
  return filtered.map((m) => m.id).filter(Boolean).sort();
}

function saveOpenrouterCache(models, freeOnly) {
  chrome.storage.local.set({
    [OPENROUTER_CACHE_KEY]: {
      ts: Date.now(),
      freeOnly,
      models
    }
  });
}

function loadOpenrouterCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [OPENROUTER_CACHE_KEY]: null }, (data) => {
      resolve(data[OPENROUTER_CACHE_KEY]);
    });
  });
}

async function getOpenrouterModels(apiKey, freeOnly, source) {
  const cache = await loadOpenrouterCache();
  if (
    cache &&
    cache.freeOnly === freeOnly &&
    cache.source === source &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < OPENROUTER_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchOpenrouterModels(apiKey, source);
  const ids = filterOpenrouterModels(models, freeOnly);
  chrome.storage.local.set({
    [OPENROUTER_CACHE_KEY]: {
      ts: Date.now(),
      freeOnly,
      source,
      models: ids
    }
  });
  return ids;
}


chrome.storage.sync.get(defaultConfig, (data) => {
  data = migrateLegacyDeepSeekConfig(data);
  const provider = data.provider || defaultConfig.provider;
  savedAuthModes = { ...(data.authModeByProvider || {}) };
  currentAuthMode = getAuthModeForProvider(data, provider);
  savedCustomApiUrl = data.customApiUrl || "";
  savedCustomModel = data.customModel || "";
  providerSelect.value = provider;
  apiUrlInput.value = provider === "custom"
    ? savedCustomApiUrl
    : (data.apiUrl || defaultConfig.apiUrl);
  syncApiKeysCheckbox.checked = Boolean(data.syncApiKeys);
  const model = data.model || defaultConfig.model;
  applyProviderDefaults(provider, model);
  const uiLang = data.uiLang || defaultConfig.uiLang;
  buildUiLanguageOptions(uiLangSelect);
  uiLangSelect.value = uiLang;
  setProviderControls(provider);
  buildLanguageOptions(targetLangSelect, uiLang);
  buildLanguageOptions(sourceLangSelect, uiLang);
  targetLangSelect.value = data.targetLang || defaultConfig.targetLang;
  sourceLangSelect.value = data.sourceLang || defaultConfig.sourceLang;
  overlayModeSelect.value = data.overlayMode || defaultConfig.overlayMode;
  overlayDurationInput.value =
    typeof data.overlayDuration === "number"
      ? data.overlayDuration
      : defaultConfig.overlayDuration;
  selectionShortcutCheckbox.checked =
    typeof data.selectionShortcut === "boolean"
      ? data.selectionShortcut
      : defaultConfig.selectionShortcut;
  enableXInlineTranslationCheckbox.checked =
    typeof data.enableXInlineTranslation === "boolean"
      ? data.enableXInlineTranslation
      : defaultConfig.enableXInlineTranslation;
  enableYoutubeInlineTranslationCheckbox.checked =
    typeof data.enableYoutubeInlineTranslation === "boolean"
      ? data.enableYoutubeInlineTranslation
      : defaultConfig.enableYoutubeInlineTranslation;
  enableXAutoTranslationCheckbox.checked =
    typeof data.enableXAutoTranslation === "boolean"
      ? data.enableXAutoTranslation
      : defaultConfig.enableXAutoTranslation;
  enableYoutubeAutoTranslationCheckbox.checked =
    typeof data.enableYoutubeAutoTranslation === "boolean"
      ? data.enableYoutubeAutoTranslation
      : defaultConfig.enableYoutubeAutoTranslation;
  openrouterFreeOnlyCheckbox.checked =
    typeof data.openrouterFreeOnly === "boolean"
      ? data.openrouterFreeOnly
      : defaultConfig.openrouterFreeOnly;
  openrouterSourceSelect.value = data.openrouterSource || defaultConfig.openrouterSource;
  deepseekThinkingCheckbox.checked =
    typeof data.deepseekThinkingEnabled === "boolean"
      ? data.deepseekThinkingEnabled
      : defaultConfig.deepseekThinkingEnabled;
  yandexFolderInput.value = data.yandexFolderId || defaultConfig.yandexFolderId;
  setOpenrouterControlsVisible(provider === "openrouter");
  setYandexControlsVisible(provider === "yandexgpt");
  setProviderControls(provider);
  applyTranslations(uiLang);
  applySetupNoteTranslations(uiLang);
  setProviderControls(providerSelect.value);
  refreshSubscriptionStatus(providerSelect.value);
  document.getElementById("extVersion").textContent =
    "v" + chrome.runtime.getManifest().version;
  chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
    const migrated = migrateLegacyKeyData(data, localData);
    const key = getKeyByProviderFromStore(
      provider,
      migrated.syncData,
      migrated.localData,
      Boolean(data.syncApiKeys)
    );
    apiKeyInput.value = key;
    if (!key) return;
    if (provider === "openrouter") {
      getOpenrouterModels(key, openrouterFreeOnlyCheckbox.checked, openrouterSourceSelect.value)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          }
        })
        .catch((err) => {
          setStatus(err.message || String(err), true);
        });
    } else if (provider === "openai") {
      getOpenAIModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.openai.models, data.model || defaultConfig.model);
        });
    } else if (provider === "deepseek") {
      getDeepSeekModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || PROVIDERS.deepseek.models[0]);
          } else {
            populateModels(PROVIDERS.deepseek.models, data.model || PROVIDERS.deepseek.models[0]);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.deepseek.models, data.model || PROVIDERS.deepseek.models[0]);
        });
    } else if (provider === "claude") {
      getClaudeModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          } else {
            populateModels(PROVIDERS.claude.models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.claude.models, data.model || defaultConfig.model);
        });
    } else if (provider === "gemini") {
      getGeminiModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          } else {
            populateModels(PROVIDERS.gemini.models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.gemini.models, data.model || defaultConfig.model);
        });
    } else if (provider === "yandexgpt") {
      getYandexModels(apiUrlInput.value, key, yandexFolderInput.value)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          } else {
            populateModels(PROVIDERS.yandexgpt.models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.yandexgpt.models, data.model || defaultConfig.model);
        });
    }
  });
});

providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value;
  currentAuthMode = "apiKey";
  applyProviderDefaults(provider, provider === "custom" ? savedCustomModel : "");
  setOpenrouterControlsVisible(provider === "openrouter");
  setYandexControlsVisible(provider === "yandexgpt");
  setProviderControls(provider);
  applySetupNoteTranslations(uiLangSelect.value);
  chrome.storage.sync.get(defaultConfig, (data) => {
    chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
      savedCustomApiUrl = data.customApiUrl || savedCustomApiUrl;
      savedCustomModel = data.customModel || savedCustomModel;
      savedAuthModes = { ...(data.authModeByProvider || {}), ...savedAuthModes };
      currentAuthMode = savedAuthModes[provider] === "subscription"
        ? "subscription"
        : getAuthModeForProvider(data, provider);
      if (provider === "custom") {
        apiUrlInput.value = savedCustomApiUrl || "";
        modelCustomInput.value = savedCustomModel || "";
      }
      setProviderControls(provider);
      applySetupNoteTranslations(uiLangSelect.value);
      refreshSubscriptionStatus(provider);
      apiKeyInput.value = getKeyByProviderFromStore(provider, data, localData, Boolean(data.syncApiKeys));
      yandexFolderInput.value = data.yandexFolderId || defaultConfig.yandexFolderId;
      if (provider === "openai" && apiKeyInput.value.trim()) {
        getOpenAIModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.openai.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "deepseek" && apiKeyInput.value.trim()) {
        getDeepSeekModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.deepseek.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.deepseek.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "claude" && apiKeyInput.value.trim()) {
        getClaudeModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.claude.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.claude.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "gemini" && apiKeyInput.value.trim()) {
        getGeminiModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.gemini.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.gemini.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "yandexgpt" && apiKeyInput.value.trim()) {
        getYandexModels(apiUrlInput.value, apiKeyInput.value.trim(), yandexFolderInput.value)
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.yandexgpt.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.yandexgpt.models, modelSelect.value || modelCustomInput.value);
          });
      }
    });
  });
});

authModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    currentAuthMode = input.value === "subscription" ? "subscription" : "apiKey";
    savedAuthModes[providerSelect.value] = currentAuthMode;
    setProviderControls(providerSelect.value);
    applySetupNoteTranslations(uiLangSelect.value);
    if (currentAuthMode === "subscription") {
      refreshSubscriptionStatus(providerSelect.value);
    }
  });
});

subscriptionConnectButton.addEventListener("click", () => {
  updateSubscriptionStatusAfterLogin(providerSelect.value);
});

subscriptionDisconnectButton.addEventListener("click", async () => {
  const provider = providerSelect.value;
  const strings = getLocaleStrings(uiLangSelect.value);
  try {
    await sendSubscriptionMessage("subscriptionLogout", provider);
    setSubscriptionStatus(strings.subscription_status_not_connected || "Not connected", false, false);
  } catch (err) {
    setSubscriptionStatus(err.message || "Subscription logout failed.", true, false);
  }
});

subscriptionHelpButton.addEventListener("click", openSubscriptionInstructionsDialog);
subscriptionInstructionsOpenTabButton.addEventListener("click", openSubscriptionInstructionsTab);
subscriptionInstructionsCloseButton.addEventListener("click", closeSubscriptionInstructionsDialog);
subscriptionInstructionsCloseIcon.addEventListener("click", closeSubscriptionInstructionsDialog);
subscriptionInstructionsDialog.addEventListener("click", (event) => {
  if (event.target === subscriptionInstructionsDialog) {
    closeSubscriptionInstructionsDialog();
  }
});

apiUrlInput.addEventListener("input", () => {
  if (providerSelect.value === "custom") {
    savedCustomApiUrl = apiUrlInput.value.trim();
  }
});

modelCustomInput.addEventListener("input", () => {
  if (providerSelect.value === "custom") {
    savedCustomModel = modelCustomInput.value.trim();
  }
});

function refreshProviderModelsAfterSave(provider, apiUrl, apiKey, model, yandexFolderId, uiLang) {
  if (!apiKey) return;
  if (provider === "openrouter") {
    getOpenrouterModels(apiKey, openrouterFreeOnlyCheckbox.checked, openrouterSourceSelect.value)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
        }
      })
      .catch((err) => {
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "openai") {
    getOpenAIModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.openai.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "deepseek") {
    getDeepSeekModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.deepseek.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.deepseek.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "claude") {
    getClaudeModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.claude.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.claude.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "gemini") {
    getGeminiModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.gemini.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.gemini.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "yandexgpt") {
    getYandexModels(apiUrl, apiKey, yandexFolderId, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.yandexgpt.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.yandexgpt.models, model);
        setStatus(err.message || String(err), true);
      });
  }
}

syncApiKeysCheckbox.addEventListener("change", () => {
  const useSyncKeys = syncApiKeysCheckbox.checked;
  const currentProvider = providerSelect.value || defaultConfig.provider;
  migrateKeyStorage(useSyncKeys, currentProvider, () => {
    chrome.storage.sync.get(defaultConfig, (syncData) => {
      chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
        apiKeyInput.value = getKeyByProviderFromStore(currentProvider, syncData, localData, useSyncKeys);
      });
    });
  });
});

uiLangSelect.addEventListener("change", () => {
  const uiLang = uiLangSelect.value;
  const currentTarget = targetLangSelect.value;
  const currentSource = sourceLangSelect.value;
  applyTranslations(uiLang);
  applySetupNoteTranslations(uiLang);
  setProviderControls(providerSelect.value);
  buildLanguageOptions(targetLangSelect, uiLang, currentTarget);
  buildLanguageOptions(sourceLangSelect, uiLang, currentSource);
  chrome.storage.sync.set({ uiLang });
});

openrouterFreeOnlyCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ openrouterFreeOnly: openrouterFreeOnlyCheckbox.checked });
});

openrouterSourceSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ openrouterSource: openrouterSourceSelect.value });
});

refreshOpenrouterBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus(getLocaleStrings(uiLangSelect.value).status_set_openrouter_key, true);
    return;
  }
  try {
    setStatus(getLocaleStrings(uiLangSelect.value).status_refreshing, false);
    const models = await getOpenrouterModels(
      key,
      openrouterFreeOnlyCheckbox.checked,
      openrouterSourceSelect.value
    );
    if (!models.length) {
      setStatus(getLocaleStrings(uiLangSelect.value).status_no_models, true);
      return;
    }
    populateModels(models, modelSelect.value);
    setStatus(getLocaleStrings(uiLangSelect.value).status_models_updated, false);
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
});

refreshYandexBtn.addEventListener("click", async () => {
  const strings = getLocaleStrings(uiLangSelect.value);
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus(strings.status_set_yandex_key || "Set YandexGPT API key first.", true);
    return;
  }
  try {
    setStatus(strings.status_refreshing || "Refreshing models...", false);
    const models = await getYandexModels(
      apiUrlInput.value,
      key,
      yandexFolderInput.value,
      true
    );
    if (!models.length) {
      setStatus(getLocaleStrings(uiLangSelect.value).status_no_models, true);
      return;
    }
    populateModels(models, modelSelect.value);
    setStatus(getLocaleStrings(uiLangSelect.value).status_models_updated, false);
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
});

document.getElementById("save").addEventListener("click", () => {
  const provider = providerSelect.value;
  const isCustom = provider === "custom";
  const modelValue = isCustom ? modelCustomInput.value.trim() : modelSelect.value;
  if (isCustom) {
    savedCustomApiUrl = apiUrlInput.value.trim();
    savedCustomModel = modelValue;
  }
  const syncApiKeys = syncApiKeysCheckbox.checked;
  const config = {
    provider,
    apiUrl: normalizeProviderApiUrl(provider, apiUrlInput.value),
    model: modelValue,
    authMode: currentAuthMode,
    authModeByProvider: {
      ...savedAuthModes,
      [provider]: currentAuthMode
    },
    customApiUrl: savedCustomApiUrl,
    customModel: savedCustomModel,
    targetLang: targetLangSelect.value,
    sourceLang: sourceLangSelect.value,
    uiLang: uiLangSelect.value,
    overlayMode: overlayModeSelect.value,
    overlayDuration: Number(overlayDurationInput.value) || defaultConfig.overlayDuration,
    selectionShortcut: selectionShortcutCheckbox.checked,
    enableXInlineTranslation: enableXInlineTranslationCheckbox.checked,
    enableYoutubeInlineTranslation: enableYoutubeInlineTranslationCheckbox.checked,
    enableXAutoTranslation: enableXAutoTranslationCheckbox.checked,
    enableYoutubeAutoTranslation: enableYoutubeAutoTranslationCheckbox.checked,
    syncApiKeys,
    openrouterFreeOnly: openrouterFreeOnlyCheckbox.checked,
    openrouterSource: openrouterSourceSelect.value,
    deepseekThinkingEnabled: deepseekThinkingCheckbox.checked,
    yandexFolderId: yandexFolderInput.value.trim()
  };

  if (!config.apiUrl || (!isDirectProvider(provider) && !config.model)) {
    setStatus(getLocaleStrings(uiLangSelect.value).status_required, true);
    return;
  }

  chrome.storage.sync.set(config, () => {
    if (currentAuthMode === "subscription") {
      setStatus(getLocaleStrings(uiLangSelect.value).status_saved, false);
      return;
    }
    migrateKeyStorage(syncApiKeys, provider, () => {
      const currentKey = apiKeyInput.value.trim();
      if (syncApiKeys) {
        chrome.storage.sync.get({ apiKeyByProvider: {} }, (syncData) => {
          const keyMap = { ...(syncData.apiKeyByProvider || {}) };
          keyMap[provider] = currentKey;
          chrome.storage.sync.set({ apiKeyByProvider: keyMap, apiKey: "" }, () => {
            setStatus(getLocaleStrings(uiLangSelect.value).status_saved, false);
            refreshProviderModelsAfterSave(
              provider,
              config.apiUrl,
              currentKey,
              config.model,
              config.yandexFolderId,
              uiLangSelect.value
            );
          });
        });
      } else {
        chrome.storage.local.get({ apiKeyByProvider: {} }, (localData) => {
          const keyMap = { ...(localData.apiKeyByProvider || {}) };
          keyMap[provider] = currentKey;
          chrome.storage.local.set({ apiKeyByProvider: keyMap, apiKey: "" }, () => {
            chrome.storage.sync.set({ apiKeyByProvider: {}, apiKey: "" }, () => {
              setStatus(getLocaleStrings(uiLangSelect.value).status_saved, false);
              refreshProviderModelsAfterSave(
                provider,
                config.apiUrl,
                currentKey,
                config.model,
                config.yandexFolderId,
                uiLangSelect.value
              );
            });
          });
        });
      }
    });
  });
});

