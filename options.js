const defaultConfig = {
  provider: "googletranslate",
  apiUrl: "https://translate.googleapis.com",
  apiKey: "",
  apiKeyByProvider: {},
  model: "gpt-6-luna",
  modelByProvider: {},
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

async function migrateLegacyModelConfig(config) {
  const migrated = migrateModelConfig(config);
  if (migrated === config) return config;
  try {
    const current = await chrome.storage.sync.get({ provider: "", model: "" });
    if (current.provider === config.provider && current.model === config.model) {
      await chrome.storage.sync.set(modelMigrationPatch(config, migrated));
    }
  } catch (_) {
    // The migrated selection remains usable if syncing fails.
  }
  return migrated;
}

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    apiUrl: "https://api.openai.com/v1",
    models: MODEL_PRESETS.openai
  },
  claude: {
    label: "Claude",
    apiUrl: "https://api.anthropic.com",
    models: MODEL_PRESETS.claude
  },
  gemini: {
    label: "Gemini",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: MODEL_PRESETS.gemini
  },
  deepseek: {
    label: "DeepSeek",
    apiUrl: "https://api.deepseek.com",
    models: MODEL_PRESETS.deepseek
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
    models: MODEL_PRESETS.openrouter
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
const modelCatalogNoticeEl = document.getElementById("modelCatalogNotice");
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

let savedCustomApiUrl = "";
let savedCustomModel = "";
let savedModelsByProvider = {};
let storedSyncApiKeys = false;
let settingsBusy = true;
let providerGeneration = 0;
let modelRequestGeneration = 0;
let displayedProvider = null;
const saveButton = document.getElementById("save");
saveButton.disabled = true;
providerSelect.disabled = true;
syncApiKeysCheckbox.disabled = true;

const OPENROUTER_CACHE_KEY = "openrouter_models_cache_v2";
const OPENROUTER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OPENAI_CACHE_KEY = "openai_models_cache_v2";
const OPENAI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEEPSEEK_CACHE_KEY = "deepseek_models_cache_v2";
const DEEPSEEK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CLAUDE_CACHE_KEY = "claude_models_cache_v2";
const CLAUDE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEMINI_CACHE_KEY = "gemini_models_cache_v2";
const GEMINI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const YANDEX_CACHE_KEY = "yandex_models_cache";
const YANDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function fetchModelCatalog(url, options) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
}

async function getApiKeyFingerprint(apiKey) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
    ar: {
      intro: "يستخدم Google Translate نقطة وصول ويب مجانية ولا يتطلب مفتاح API.",
      warning: "تجنب إرسال نصوص حساسة، إذ قد تُفرض قيود على نقطة الوصول المجانية أو قد تصبح غير متاحة."
    },
    zh: {
      intro: "Google Translate 使用免费的 Web 端点，无需 API 密钥。",
      warning: "请避免发送敏感文本，因为此免费 Web 端点可能受到限流或变得不可用。"
    },
    en: {
      intro: "Google Translate uses a free web endpoint and does not require an API key.",
      warning: "Avoid sending sensitive text because this free web endpoint may be rate-limited or unavailable."
    },
    fr: {
      intro: "Google Translate utilise un endpoint Web gratuit et ne nécessite pas de clé API.",
      warning: "Évitez d’envoyer des textes sensibles, car cet endpoint Web gratuit peut être soumis à des limites ou devenir indisponible."
    },
    de: {
      intro: "Google Translate verwendet einen kostenlosen Web-Endpunkt und benötigt keinen API-Schlüssel.",
      warning: "Senden Sie keine vertraulichen Texte, da dieser kostenlose Web-Endpunkt eingeschränkt werden oder nicht verfügbar sein kann."
    },
    el: {
      intro: "Το Google Translate χρησιμοποιεί ένα δωρεάν web endpoint και δεν απαιτεί κλειδί API.",
      warning: "Αποφύγετε την αποστολή ευαίσθητου κειμένου, καθώς αυτό το δωρεάν web endpoint μπορεί να υποβληθεί σε περιορισμούς ή να μην είναι διαθέσιμο."
    },
    he: {
      intro: "Google Translate משתמש בנקודת קצה חינמית באינטרנט ואינו דורש מפתח API.",
      warning: "הימנעו משליחת טקסט רגיש, מכיוון שנקודת הקצה החינמית עשויה להיות מוגבלת או לא זמינה."
    },
    it: {
      intro: "Google Translate utilizza un endpoint web gratuito e non richiede una chiave API.",
      warning: "Evita di inviare testi sensibili, perché questo endpoint web gratuito potrebbe essere soggetto a limitazioni o diventare non disponibile."
    },
    ja: {
      intro: "Google Translate は無料のウェブエンドポイントを使用し、API キーは必要ありません。",
      warning: "この無料ウェブエンドポイントは利用制限を受けたり利用できなくなったりする可能性があるため、機密性の高いテキストは送信しないでください。"
    },
    ko: {
      intro: "Google Translate는 무료 웹 엔드포인트를 사용하며 API 키가 필요하지 않습니다.",
      warning: "이 무료 웹 엔드포인트는 요청이 제한되거나 사용할 수 없게 될 수 있으므로 민감한 텍스트를 보내지 마세요."
    },
    pt: {
      intro: "O Google Translate usa um endpoint web gratuito e não exige uma chave de API.",
      warning: "Evite enviar textos confidenciais, pois este endpoint web gratuito pode sofrer limitações ou ficar indisponível."
    },
    ru: {
      intro: "Google Translate использует бесплатный веб-эндпоинт, API-ключ не требуется.",
      warning: "Не отправляйте конфиденциальный текст: бесплатный веб-эндпоинт может ограничиваться или становиться недоступным."
    },
    es: {
      intro: "Google Translate utiliza un endpoint web gratuito y no requiere una clave API.",
      warning: "Evita enviar texto confidencial, ya que este endpoint web gratuito puede estar sujeto a límites o dejar de estar disponible."
    },
    th: {
      intro: "Google Translate ใช้เว็บเอนด์พอยต์ฟรีและไม่ต้องใช้คีย์ API",
      warning: "หลีกเลี่ยงการส่งข้อความที่ละเอียดอ่อน เนื่องจากเว็บเอนด์พอยต์ฟรีนี้อาจถูกจำกัดการใช้งานหรือไม่พร้อมให้บริการ"
    },
    tr: {
      intro: "Google Translate ücretsiz bir web uç noktası kullanır ve API anahtarı gerektirmez.",
      warning: "Bu ücretsiz web uç noktası kısıtlanabileceği veya kullanılamaz hâle gelebileceği için hassas metinler göndermeyin."
    },
    uk: {
      intro: "Google Translate використовує безкоштовний веб-ендпойнт і не потребує API-ключа.",
      warning: "Не надсилайте конфіденційний текст, оскільки цей безкоштовний веб-ендпойнт може обмежуватися або стати недоступним."
    }
  },
  deepl: {
    ar: {
      intro: "يتطلب DeepL API Free مفتاح API مجانيًا من DeepL.",
      warning: "تطبق DeepL حصتها وشروطها الخاصة بالخطة المجانية. احفظ المفتاح محليًا، ما لم تكن بحاجة إلى المزامنة."
    },
    zh: {
      intro: "DeepL API Free 需要免费的 DeepL API 密钥。",
      warning: "DeepL 对免费方案设有自己的配额和条款。如非必要同步，请将密钥存储在本地。"
    },
    en: {
      intro: "DeepL API Free requires a free DeepL API key.",
      warning: "DeepL applies its own free-plan quota and terms. Store the key locally unless sync is needed."
    },
    fr: {
      intro: "DeepL API Free nécessite une clé API DeepL gratuite.",
      warning: "DeepL applique ses propres quotas et conditions pour l’offre gratuite. Conservez la clé localement, sauf si la synchronisation est nécessaire."
    },
    de: {
      intro: "DeepL API Free erfordert einen kostenlosen DeepL-API-Schlüssel.",
      warning: "DeepL verwendet eigene Kontingente und Bedingungen für den kostenlosen Tarif. Speichern Sie den Schlüssel lokal, sofern keine Synchronisierung erforderlich ist."
    },
    el: {
      intro: "Το DeepL API Free απαιτεί ένα δωρεάν κλειδί API της DeepL.",
      warning: "Η DeepL εφαρμόζει τη δική της ποσόστωση και τους δικούς της όρους για το δωρεάν πρόγραμμα. Αποθηκεύστε το κλειδί τοπικά, εκτός αν χρειάζεστε συγχρονισμό."
    },
    he: {
      intro: "DeepL API Free דורש מפתח API חינמי של DeepL.",
      warning: "DeepL מחילה מכסה ותנאים משלה על התוכנית החינמית. שמרו את המפתח באופן מקומי, אלא אם יש צורך בסנכרון."
    },
    it: {
      intro: "DeepL API Free richiede una chiave API gratuita di DeepL.",
      warning: "DeepL applica quote e condizioni proprie al piano gratuito. Conserva la chiave localmente, a meno che non sia necessaria la sincronizzazione."
    },
    ja: {
      intro: "DeepL API Free では、無料の DeepL API キーが必要です。",
      warning: "DeepL では無料プラン固有の利用上限と利用条件が適用されます。同期が必要な場合を除き、キーはローカルに保存してください。"
    },
    ko: {
      intro: "DeepL API Free를 사용하려면 무료 DeepL API 키가 필요합니다.",
      warning: "DeepL은 무료 요금제에 자체 할당량과 약관을 적용합니다. 동기화가 필요하지 않다면 키를 로컬에 저장하세요."
    },
    pt: {
      intro: "O DeepL API Free exige uma chave de API gratuita da DeepL.",
      warning: "A DeepL aplica sua própria cota e seus próprios termos ao plano gratuito. Armazene a chave localmente, a menos que a sincronização seja necessária."
    },
    ru: {
      intro: "Для DeepL API Free нужен бесплатный API-ключ DeepL.",
      warning: "На DeepL распространяются ограничения и условия бесплатного плана. Храните ключ локально, если синхронизация не нужна."
    },
    es: {
      intro: "DeepL API Free requiere una clave API gratuita de DeepL.",
      warning: "DeepL aplica su propia cuota y sus propios términos al plan gratuito. Guarda la clave localmente, salvo que necesites sincronizarla."
    },
    th: {
      intro: "DeepL API Free ต้องใช้คีย์ API ฟรีจาก DeepL",
      warning: "DeepL ใช้โควตาและข้อกำหนดของตนเองสำหรับแพ็กเกจฟรี ให้เก็บคีย์ไว้ในเครื่อง เว้นแต่จำเป็นต้องซิงก์"
    },
    tr: {
      intro: "DeepL API Free için ücretsiz bir DeepL API anahtarı gerekir.",
      warning: "DeepL, ücretsiz planı için kendi kotasını ve koşullarını uygular. Senkronizasyon gerekmiyorsa anahtarı yerel olarak saklayın."
    },
    uk: {
      intro: "Для DeepL API Free потрібен безкоштовний API-ключ DeepL.",
      warning: "DeepL застосовує власну квоту й умови безкоштовного плану. Зберігайте ключ локально, якщо синхронізація не потрібна."
    }
  }
};

const DIRECT_PROVIDER_HINT_I18N = {
  googletranslate: {
    ar: "يستخدم نقطة وصول الويب المجانية من Google Translate. لا يلزم مفتاح API.",
    zh: "使用 Google Translate 的免费 Web 端点。无需 API 密钥。",
    en: "Uses Google Translate's free web endpoint. No API key is required.",
    fr: "Utilise l’endpoint Web gratuit de Google Translate. Aucune clé API n’est requise.",
    de: "Verwendet den kostenlosen Web-Endpunkt von Google Translate. Kein API-Schlüssel erforderlich.",
    el: "Χρησιμοποιεί το δωρεάν web endpoint του Google Translate. Δεν απαιτείται κλειδί API.",
    he: "משתמש בנקודת הקצה החינמית של Google Translate באינטרנט. אין צורך במפתח API.",
    it: "Utilizza l’endpoint web gratuito di Google Translate. Non è richiesta alcuna chiave API.",
    ja: "Google Translate の無料ウェブエンドポイントを使用します。API キーは必要ありません。",
    ko: "Google Translate의 무료 웹 엔드포인트를 사용합니다. API 키가 필요하지 않습니다.",
    pt: "Usa o endpoint web gratuito do Google Translate. Não é necessária uma chave de API.",
    ru: "Использует бесплатный веб-эндпоинт Google Translate. API-ключ не требуется.",
    es: "Usa el endpoint web gratuito de Google Translate. No se requiere una clave API.",
    th: "ใช้เว็บเอนด์พอยต์ฟรีของ Google Translate ไม่ต้องใช้คีย์ API",
    tr: "Google Translate'in ücretsiz web uç noktasını kullanır. API anahtarı gerekmez.",
    uk: "Використовує безкоштовний веб-ендпойнт Google Translate. API-ключ не потрібен."
  },
  deepl: {
    ar: "يستخدم نقطة وصول DeepL API Free. أنشئ مفتاح API مجانيًا من DeepL للبدء.",
    zh: "使用 DeepL API Free 端点。创建免费的 DeepL API 密钥即可开始使用。",
    en: "Uses the DeepL API Free endpoint. Create a free DeepL API key to get started.",
    fr: "Utilise l’endpoint DeepL API Free. Créez une clé API DeepL gratuite pour commencer.",
    de: "Verwendet den DeepL-API-Free-Endpunkt. Erstellen Sie einen kostenlosen DeepL-API-Schlüssel, um zu beginnen.",
    el: "Χρησιμοποιεί το endpoint του DeepL API Free. Δημιουργήστε ένα δωρεάν κλειδί API της DeepL για να ξεκινήσετε.",
    he: "משתמש בנקודת הקצה של DeepL API Free. צרו מפתח API חינמי של DeepL כדי להתחיל.",
    it: "Utilizza l’endpoint DeepL API Free. Crea una chiave API gratuita di DeepL per iniziare.",
    ja: "DeepL API Free のエンドポイントを使用します。開始するには無料の DeepL API キーを作成してください。",
    ko: "DeepL API Free 엔드포인트를 사용합니다. 시작하려면 무료 DeepL API 키를 만드세요.",
    pt: "Usa o endpoint do DeepL API Free. Crie uma chave de API gratuita da DeepL para começar.",
    ru: "Использует эндпоинт DeepL API Free. Для начала создайте бесплатный API-ключ DeepL.",
    es: "Usa el endpoint de DeepL API Free. Crea una clave API gratuita de DeepL para empezar.",
    th: "ใช้เอนด์พอยต์ DeepL API Free สร้างคีย์ API ฟรีจาก DeepL เพื่อเริ่มใช้งาน",
    tr: "DeepL API Free uç noktasını kullanır. Başlamak için ücretsiz bir DeepL API anahtarı oluşturun.",
    uk: "Використовує endpoint DeepL API Free. Створіть безкоштовний API-ключ DeepL, щоб почати."
  }
};

function getLocaleStrings(lang) {
  return window.AITranslateI18n.getOptionsStrings(lang);
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
}

function applySetupNoteTranslations(lang) {
  const strings = SETUP_NOTE_I18N[lang] || SETUP_NOTE_I18N.en;
  const syncStrings = SYNC_KEYS_I18N[lang] || SYNC_KEYS_I18N.en;
  const directNote = DIRECT_PROVIDER_SETUP_NOTE_I18N[providerSelect.value]?.[lang]
    || DIRECT_PROVIDER_SETUP_NOTE_I18N[providerSelect.value]?.en;
  setupNoteIntro.textContent = directNote?.intro || strings.intro;
  setupNoteWarning.textContent = directNote?.warning || strings.warning;
  setupNoteWarning.hidden = false;
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

async function migrateLegacyKeyData(syncData, localData) {
  const provider = syncData.provider || defaultConfig.provider;
  const rawSyncMap = { ...(syncData.apiKeyByProvider || {}) };
  const rawLocalMap = { ...(localData.apiKeyByProvider || {}) };
  const hasMappedKeys = Object.keys(rawSyncMap).length > 0 || Object.keys(rawLocalMap).length > 0;
  const syncMap = hasMappedKeys ? rawSyncMap : includeLegacyKey(rawSyncMap, syncData.apiKey, provider);
  const localMap = hasMappedKeys ? rawLocalMap : includeLegacyKey(rawLocalMap, localData.apiKey, provider);
  if (syncData.syncApiKeys) {
    const mergedSyncMap = { ...localMap, ...syncMap };
    await chrome.storage.sync.set({ apiKeyByProvider: mergedSyncMap, apiKey: "" });
    await chrome.storage.local.set({ apiKeyByProvider: {}, apiKey: "" });
    return {
      syncData: { ...syncData, apiKeyByProvider: mergedSyncMap, apiKey: "" },
      localData: { ...localData, apiKeyByProvider: {}, apiKey: "" }
    };
  }
  const mergedLocalMap = { ...syncMap, ...localMap };
  await chrome.storage.local.set({ apiKeyByProvider: mergedLocalMap, apiKey: "" });
  await chrome.storage.sync.set({ apiKeyByProvider: {}, apiKey: "" });
  return {
    syncData: { ...syncData, apiKeyByProvider: {}, apiKey: "" },
    localData: { ...localData, apiKeyByProvider: mergedLocalMap, apiKey: "" }
  };
}

async function migrateKeyStorage(useSyncKeys, currentProvider, done) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get({ apiKeyByProvider: {}, apiKey: "" }),
    chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" })
  ]);
  const syncMap = { ...(syncData.apiKeyByProvider || {}) };
  const localMap = { ...(localData.apiKeyByProvider || {}) };
  const hasMappedKeys = Object.keys(syncMap).length > 0 || Object.keys(localMap).length > 0;
  const migratedSyncMap = hasMappedKeys ? syncMap : includeLegacyKey(syncMap, syncData.apiKey, currentProvider);
  const migratedLocalMap = hasMappedKeys ? localMap : includeLegacyKey(localMap, localData.apiKey, currentProvider);
  const nextMap = { ...migratedLocalMap, ...migratedSyncMap };
  if (useSyncKeys) {
    await chrome.storage.sync.set({ syncApiKeys: true, apiKeyByProvider: nextMap, apiKey: "" });
    await chrome.storage.local.set({ apiKeyByProvider: {}, apiKey: "" });
  } else {
    await chrome.storage.local.set({ apiKeyByProvider: nextMap, apiKey: "" });
    await chrome.storage.sync.set({ syncApiKeys: false, apiKeyByProvider: {}, apiKey: "" });
  }
  done?.();
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

let modelCatalogNotice = null;

function renderModelCatalogNotice() {
  const strings = getLocaleStrings(uiLangSelect.value);
  const messages = [];
  if (modelCatalogNotice?.fallback) messages.push(strings.model_catalog_fallback);
  if (modelCatalogNotice?.unavailable) {
    messages.push(strings.model_catalog_unavailable.replace("{model}", () => modelCatalogNotice.unavailable));
  }
  modelCatalogNoticeEl.textContent = messages.join(" ");
  modelCatalogNoticeEl.style.display = messages.length ? "block" : "none";
}

function populateModels(models, selected, provider = providerSelect.value, { preserveUnlisted = false, requireSelection = false } = {}) {
  // Preserve saved IDs when displaying presets, but never reinsert an ID
  // excluded by a successfully loaded, filtered catalog.
  if (preserveUnlisted && selected && !models.includes(selected) && provider !== "custom" && !isDirectProvider(provider)
    && !(provider === "openrouter" && openrouterFreeOnlyCheckbox.checked)) {
    models = [...models, selected];
  }
  modelSelect.innerHTML = "";
  const hasModels = models.length > 0;
  if (hasModels) {
    if (requireSelection && !models.includes(selected)) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = getLocaleStrings(uiLangSelect.value).model_catalog_select;
      placeholder.disabled = true;
      modelSelect.appendChild(placeholder);
    }
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = getModelLabel(model, provider);
      modelSelect.appendChild(option);
    });
    modelSelect.style.display = "block";
    modelSelect.disabled = false;
    modelCustomInput.style.display = "none";
    modelSelect.value = models.includes(selected) ? selected : requireSelection ? "" : models[0];
  } else if (provider === "custom") {
    modelSelect.style.display = "none";
    modelSelect.disabled = true;
    modelCustomInput.style.display = "block";
    modelCustomInput.value = selected || "";
  } else {
    modelSelect.style.display = "block";
    modelSelect.disabled = true;
    modelCustomInput.style.display = "none";
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

  apiUrlControl.style.display = isGoogle ? "none" : "block";
  apiKeyControl.style.display = preset.requiresApiKey === false ? "none" : "block";
  modelControl.style.display = isDirect ? "none" : "block";
  deepseekControls.style.display = provider === "deepseek" ? "block" : "none";
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
  modelCatalogNotice = null;
  renderModelCatalogNotice();
  const preset = PROVIDERS[provider] || PROVIDERS.custom;
  if (provider === "custom") {
    apiUrlInput.value = savedCustomApiUrl || "";
    populateModels([], savedCustomModel || "");
    setProviderControls(provider);
    return;
  }
  apiUrlInput.value = preset.apiUrl || "";
  populateModels(preset.models, currentModel, provider, { preserveUnlisted: true });
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
  if (/audio|realtime|transcrib|translat|tts|embedding|image|moderation|search|deep-research/i.test(id)) return false;
  return /^(gpt-|chatgpt-|o[1-9]\d*($|-)|o\d($|-))/i.test(id);
}

async function fetchOpenAIModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const response = await fetchModelCatalog(endpoint, {
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
  return [...new Set(ids.filter(isLikelyOpenAIChatModel).map((id) => migratedModelId("openai", id)))].sort();
}

function loadOpenAICache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [OPENAI_CACHE_KEY]: null }, (data) => {
      resolve(data[OPENAI_CACHE_KEY]);
    });
  });
}

async function getOpenAIModels(apiUrl, apiKey, forceRefresh = false, isCurrent = () => true) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const keyFingerprint = await getApiKeyFingerprint(apiKey);
  const cache = await loadOpenAICache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.keyFingerprint === keyFingerprint &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < OPENAI_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchOpenAIModels(normalizedUrl, apiKey);
  const ids = filterOpenAIModels(models);
  if (isCurrent()) chrome.storage.local.set({
    [OPENAI_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      keyFingerprint,
      models: ids
    }
  });
  return ids;
}

async function fetchDeepSeekModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const response = await fetchModelCatalog(endpoint, {
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
  return [...new Set(models
    .map((m) => m.id)
    .filter((id) => /^deepseek-/i.test(String(id)))
    .map((id) => migratedModelId("deepseek", id)))]
    .sort();
}

function loadDeepSeekCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [DEEPSEEK_CACHE_KEY]: null }, (data) => {
      resolve(data[DEEPSEEK_CACHE_KEY]);
    });
  });
}

async function getDeepSeekModels(apiUrl, apiKey, forceRefresh = false, isCurrent = () => true) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const keyFingerprint = await getApiKeyFingerprint(apiKey);
  const cache = await loadDeepSeekCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.keyFingerprint === keyFingerprint &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < DEEPSEEK_CACHE_TTL_MS
  ) {
    return filterDeepSeekModels(cache.models.map((id) => ({ id })));
  }
  const models = await fetchDeepSeekModels(normalizedUrl, apiKey);
  const ids = filterDeepSeekModels(models);
  if (isCurrent()) chrome.storage.local.set({
    [DEEPSEEK_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      keyFingerprint,
      models: ids
    }
  });
  return ids;
}

async function fetchClaudeModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/v1/models`;
  const response = await fetchModelCatalog(endpoint, {
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
  return [...new Set(models
    .map((m) => m.id)
    .filter(Boolean)
    .filter((id) => /^claude-/i.test(String(id)))
    .map((id) => migratedModelId("claude", id)))].sort();
}

function loadClaudeCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CLAUDE_CACHE_KEY]: null }, (data) => {
      resolve(data[CLAUDE_CACHE_KEY]);
    });
  });
}

async function getClaudeModels(apiUrl, apiKey, forceRefresh = false, isCurrent = () => true) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const keyFingerprint = await getApiKeyFingerprint(apiKey);
  const cache = await loadClaudeCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.keyFingerprint === keyFingerprint &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < CLAUDE_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchClaudeModels(normalizedUrl, apiKey);
  const ids = filterClaudeModels(models);
  if (isCurrent()) chrome.storage.local.set({
    [CLAUDE_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      keyFingerprint,
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
  const response = await fetchModelCatalog(endpoint, {
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
  return [...new Set(models
    .filter((m) => {
      const name = String(m?.name || "");
      if (!name.startsWith("models/gemini") || /image|tts|live|embedding|audio/i.test(name)) return false;
      const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      return methods.length === 0 || methods.includes("generateContent");
    })
    .map((m) => String(m.name).replace(/^models\//, ""))
    .filter(Boolean)
    .map((id) => migratedModelId("gemini", id)))].sort();
}

function loadGeminiCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [GEMINI_CACHE_KEY]: null }, (data) => {
      resolve(data[GEMINI_CACHE_KEY]);
    });
  });
}

async function getGeminiModels(apiUrl, apiKey, forceRefresh = false, isCurrent = () => true) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const keyFingerprint = await getApiKeyFingerprint(apiKey);
  const cache = await loadGeminiCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.keyFingerprint === keyFingerprint &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < GEMINI_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchGeminiModels(normalizedUrl, apiKey);
  const ids = filterGeminiModels(models);
  if (isCurrent()) chrome.storage.local.set({
    [GEMINI_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      keyFingerprint,
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
  const response = await fetchModelCatalog(endpoint, { headers });
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

async function getYandexModels(apiUrl, apiKey, folderId, forceRefresh = false, isCurrent = () => true) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  const cleanFolderId = (folderId || "").trim();
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const keyFingerprint = await getApiKeyFingerprint(apiKey);
  const cache = await loadYandexCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.keyFingerprint === keyFingerprint &&
    cache.folderId === cleanFolderId &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < YANDEX_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchYandexModels(normalizedUrl, apiKey, cleanFolderId);
  const ids = filterYandexModels(models);
  if (isCurrent()) chrome.storage.local.set({
    [YANDEX_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      keyFingerprint,
      folderId: cleanFolderId,
      models: ids
    }
  });
  return ids;
}


function isFreeModel(pricing) {
  if (!pricing || pricing.prompt == null || pricing.completion == null) return false;
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
  return fields.every((key) => pricing[key] === undefined || (
    (typeof pricing[key] === "number" || (typeof pricing[key] === "string" && pricing[key].trim() !== ""))
    && Number(pricing[key]) === 0
  ));
}

async function fetchOpenrouterModels(apiKey, source) {
  const endpoints = source === "user"
    ? ["https://openrouter.ai/api/v1/models/user", "https://openrouter.ai/api/v1/models"]
    : ["https://openrouter.ai/api/v1/models"];

  let lastError = null;
  for (const endpoint of endpoints) {
    const response = await fetchModelCatalog(endpoint, {
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
  const textModels = models.filter((m) =>
    (!Array.isArray(m.architecture?.input_modalities) || m.architecture.input_modalities.includes("text"))
    && (!Array.isArray(m.architecture?.output_modalities) || m.architecture.output_modalities.includes("text"))
  );
  const filtered = freeOnly ? textModels.filter((m) => isFreeModel(m.pricing)) : textModels;
  return filtered.map((m) => m.id).filter(Boolean).sort();
}

function loadOpenrouterCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [OPENROUTER_CACHE_KEY]: null }, (data) => {
      resolve(data[OPENROUTER_CACHE_KEY]);
    });
  });
}

async function getOpenrouterModels(apiKey, freeOnly, source, forceRefresh = false, isCurrent = () => true) {
  const keyFingerprint = await getApiKeyFingerprint(apiKey);
  const cache = await loadOpenrouterCache();
  if (
    !forceRefresh && cache &&
    cache.keyFingerprint === keyFingerprint &&
    cache.freeOnly === freeOnly &&
    cache.source === source &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < OPENROUTER_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchOpenrouterModels(apiKey, source);
  const ids = filterOpenrouterModels(models, freeOnly);
  if (isCurrent()) chrome.storage.local.set({
    [OPENROUTER_CACHE_KEY]: {
      ts: Date.now(),
      keyFingerprint,
      freeOnly,
      source,
      models: ids
    }
  });
  return ids;
}


let keyLoadPending = false;

function updateSettingsControls() {
  saveButton.disabled = settingsBusy || keyLoadPending;
  providerSelect.disabled = settingsBusy;
  syncApiKeysCheckbox.disabled = settingsBusy || keyLoadPending;
  apiKeyInput.disabled = settingsBusy || keyLoadPending;
  apiUrlInput.disabled = settingsBusy || keyLoadPending;
  refreshOpenrouterBtn.disabled = settingsBusy || keyLoadPending;
  refreshYandexBtn.disabled = settingsBusy || keyLoadPending;
}

function isCurrentProvider(provider, generation) {
  return provider === providerSelect.value && generation === providerGeneration;
}

async function refreshProviderModels({ force = false, showStatus = false } = {}) {
  const provider = providerSelect.value;
  const generation = providerGeneration;
  const request = ++modelRequestGeneration;
  const key = apiKeyInput.value.trim();
  if (!key || settingsBusy || keyLoadPending) return;
  const apiUrl = apiUrlInput.value;
  const folderId = yandexFolderInput.value;
  const freeOnly = openrouterFreeOnlyCheckbox.checked;
  const source = openrouterSourceSelect.value;
  const isCurrent = () => isCurrentProvider(provider, generation) && request === modelRequestGeneration;
  const selected = modelSelect.value;
  const loaders = {
    openai: () => getOpenAIModels(apiUrl, key, force, isCurrent),
    deepseek: () => getDeepSeekModels(apiUrl, key, force, isCurrent),
    claude: () => getClaudeModels(apiUrl, key, force, isCurrent),
    gemini: () => getGeminiModels(apiUrl, key, force, isCurrent),
    yandexgpt: () => getYandexModels(apiUrl, key, folderId, force, isCurrent),
    openrouter: () => getOpenrouterModels(key, freeOnly, source, force, isCurrent)
  };
  if (!loaders[provider]) return;
  if (showStatus) setStatus(getLocaleStrings(uiLangSelect.value).status_refreshing, false);
  try {
    const models = await loaders[provider]();
    if (!isCurrent()) return;
    // An empty filtered catalog is not evidence that a previously selected ID
    // is safe. Offer only known presets, explicitly marked as unverified.
    const available = models.length ? models : PROVIDERS[provider].models;
    modelCatalogNotice = {
      fallback: !models.length,
      unavailable: available.includes(selected) ? "" : selected || modelCatalogNotice?.unavailable || ""
    };
    populateModels(available, selected, provider, { requireSelection: true });
    renderModelCatalogNotice();
    if (models.length) {
      if (showStatus) setStatus(getLocaleStrings(uiLangSelect.value).status_models_updated, false);
    } else if (showStatus) {
      setStatus(getLocaleStrings(uiLangSelect.value).status_no_models, true);
    }
  } catch (err) {
    if (!isCurrent()) return;
    // Preserve the selected model and the existing list after a temporary API failure.
    if (showStatus) setStatus(err.message || String(err), true);
  }
}

async function initializeOptions() {
  let data = await chrome.storage.sync.get(defaultConfig);
  data = await migrateLegacyModelConfig(data);
  const provider = data.provider || defaultConfig.provider;
  savedCustomApiUrl = data.customApiUrl || "";
  savedCustomModel = data.customModel || "";
  providerSelect.value = provider;
  displayedProvider = provider;
  savedModelsByProvider = { ...data.modelByProvider, [provider]: data.model };
  storedSyncApiKeys = Boolean(data.syncApiKeys);
  syncApiKeysCheckbox.checked = Boolean(data.syncApiKeys);
  openrouterFreeOnlyCheckbox.checked =
    typeof data.openrouterFreeOnly === "boolean"
      ? data.openrouterFreeOnly
      : defaultConfig.openrouterFreeOnly;
  const model = data.model || defaultConfig.model;
  applyProviderDefaults(provider, model);
  if (provider !== "custom" && data.apiUrl) apiUrlInput.value = data.apiUrl;
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
  document.getElementById("extVersion").textContent =
    "v" + chrome.runtime.getManifest().version;
  const localData = await chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" });
  const migrated = await migrateLegacyKeyData(data, localData);
  apiKeyInput.value = getKeyByProviderFromStore(
    provider, migrated.syncData, migrated.localData, storedSyncApiKeys
  );
}

updateSettingsControls();
initializeOptions().then(() => {
  settingsBusy = false;
  updateSettingsControls();
  refreshProviderModels();
}).catch((error) => {
  // Do not enable saving if the initial key read/migration failed.
  setStatus(error.message || String(error), true);
});

providerSelect.addEventListener("change", async () => {
  if (settingsBusy) return;
  const provider = providerSelect.value;
  if (displayedProvider && !isDirectProvider(displayedProvider)) {
    const previousModel = displayedProvider === "custom" ? modelCustomInput.value.trim() : modelSelect.value;
    if (previousModel) savedModelsByProvider[displayedProvider] = previousModel;
  }
  displayedProvider = provider;
  const generation = ++providerGeneration;
  ++modelRequestGeneration;
  keyLoadPending = true;
  apiKeyInput.value = "";
  updateSettingsControls();
  const selected = migratedModelId(provider, savedModelsByProvider[provider]);
  applyProviderDefaults(provider, selected);
  setOpenrouterControlsVisible(provider === "openrouter");
  setYandexControlsVisible(provider === "yandexgpt");
  applySetupNoteTranslations(uiLangSelect.value);
  try {
    const [data, localData] = await Promise.all([
      chrome.storage.sync.get(defaultConfig),
      chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" })
    ]);
    if (!isCurrentProvider(provider, generation)) return;
    storedSyncApiKeys = Boolean(data.syncApiKeys);
    apiKeyInput.value = getKeyByProviderFromStore(provider, data, localData, storedSyncApiKeys);
    yandexFolderInput.value = data.yandexFolderId || defaultConfig.yandexFolderId;
    if (provider !== "custom" && data.provider === provider && data.apiUrl) apiUrlInput.value = data.apiUrl;
    keyLoadPending = false;
    updateSettingsControls();
    refreshProviderModels();
  } catch (err) {
    if (!isCurrentProvider(provider, generation)) return;
    setStatus(err.message || String(err), true);
    // Keep save disabled; changing providers retries the key read.
  }
});

apiUrlInput.addEventListener("input", () => {
  ++modelRequestGeneration;
  if (providerSelect.value === "custom") savedCustomApiUrl = apiUrlInput.value.trim();
});
apiKeyInput.addEventListener("input", () => { ++modelRequestGeneration; });
modelSelect.addEventListener("change", () => {
  ++modelRequestGeneration;
  if (modelCatalogNotice && modelSelect.value) {
    modelCatalogNotice.unavailable = "";
    renderModelCatalogNotice();
  }
});
yandexFolderInput.addEventListener("input", () => { ++modelRequestGeneration; });
modelCustomInput.addEventListener("input", () => {
  if (providerSelect.value === "custom") savedCustomModel = modelCustomInput.value.trim();
});

uiLangSelect.addEventListener("change", () => {
  const uiLang = uiLangSelect.value;
  const currentTarget = targetLangSelect.value;
  const currentSource = sourceLangSelect.value;
  applyTranslations(uiLang);
  renderModelCatalogNotice();
  if (modelSelect.options[0]?.value === "") {
    modelSelect.options[0].textContent = getLocaleStrings(uiLang).model_catalog_select;
  }
  applySetupNoteTranslations(uiLang);
  setProviderControls(providerSelect.value);
  buildLanguageOptions(targetLangSelect, uiLang, currentTarget);
  buildLanguageOptions(sourceLangSelect, uiLang, currentSource);
  chrome.storage.sync.set({ uiLang });
});

openrouterFreeOnlyCheckbox.addEventListener("change", () => {
  ++modelRequestGeneration;
  chrome.storage.sync.set({ openrouterFreeOnly: openrouterFreeOnlyCheckbox.checked });
  if (providerSelect.value === "openrouter") {
    if (openrouterFreeOnlyCheckbox.checked) {
      const selected = modelSelect.value;
      const presets = PROVIDERS.openrouter.models;
      modelCatalogNotice = { fallback: false, unavailable: presets.includes(selected) ? "" : selected };
      populateModels(presets, selected, "openrouter", { requireSelection: true });
      renderModelCatalogNotice();
    }
    refreshProviderModels();
  }
});

openrouterSourceSelect.addEventListener("change", () => {
  ++modelRequestGeneration;
  chrome.storage.sync.set({ openrouterSource: openrouterSourceSelect.value });
  if (providerSelect.value === "openrouter") refreshProviderModels();
});

refreshOpenrouterBtn.addEventListener("click", () => {
  if (providerSelect.value !== "openrouter") return;
  if (!apiKeyInput.value.trim()) {
    setStatus(getLocaleStrings(uiLangSelect.value).status_set_openrouter_key, true);
    return;
  }
  refreshProviderModels({ force: true, showStatus: true });
});
refreshYandexBtn.addEventListener("click", () => {
  if (providerSelect.value !== "yandexgpt") return;
  if (!apiKeyInput.value.trim()) {
    setStatus(getLocaleStrings(uiLangSelect.value).status_set_yandex_key || "Set YandexGPT API key first.", true);
    return;
  }
  refreshProviderModels({ force: true, showStatus: true });
});

saveButton.addEventListener("click", async () => {
  if (settingsBusy || keyLoadPending) return;
  const provider = providerSelect.value;
  const isCustom = provider === "custom";
  const modelValue = isCustom ? modelCustomInput.value.trim() : modelSelect.value;
  const currentKey = apiKeyInput.value.trim();
  if (isCustom) {
    savedCustomApiUrl = apiUrlInput.value.trim();
    savedCustomModel = modelValue;
  }
  const syncApiKeys = syncApiKeysCheckbox.checked;
  const config = {
    provider,
    apiUrl: normalizeProviderApiUrl(provider, apiUrlInput.value),
    model: modelValue,
    modelByProvider: { ...savedModelsByProvider, [provider]: modelValue },
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
  settingsBusy = true;
  ++modelRequestGeneration;
  updateSettingsControls();
  let saved = false;
  try {
    if (storedSyncApiKeys !== syncApiKeys) {
      await migrateKeyStorage(syncApiKeys, provider);
      storedSyncApiKeys = syncApiKeys;
    }
    const area = syncApiKeys ? chrome.storage.sync : chrome.storage.local;
    const data = await area.get({ apiKeyByProvider: {} });
    await area.set({
      apiKeyByProvider: { ...data.apiKeyByProvider, [provider]: currentKey },
      apiKey: ""
    });
    await chrome.storage.sync.set(config);
    savedModelsByProvider = config.modelByProvider;
    setStatus(getLocaleStrings(uiLangSelect.value).status_saved, false);
    saved = true;
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    settingsBusy = false;
    updateSettingsControls();
  }
  if (saved) refreshProviderModels({ force: true });
});

