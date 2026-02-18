# AI Translate لـ X وYouTube

إضافة Chrome لترجمة النص المحدد ومنشورات X (Twitter) وتعليقات YouTube باستخدام مفتاح API الخاص بك (متوافق مع OpenAI ومزوّدات أصلية مدعومة).

## الميزات
- ترجمة النص المحدد عبر قائمة السياق أو اختصار `Alt+Shift+T` (إخراج streaming).
- زر ترجمة inline أسفل منشورات/ردود X وتعليقات YouTube (streaming).
- زر ترجمة سريع اختياري قرب التحديد.
- قسم ترجمة سريعة داخل popup مع تبديل زوج اللغات وحفظ آخر إدخال/إخراج وحفظ زوج اللغات.
- يدعم OpenAI وClaude وGemini وDeepSeek وYandexGPT وOpenRouter وendpoint مخصص متوافق مع OpenAI.
- قائمة نماذج OpenRouter مع فلتر Free-only وذاكرة cache.
- تحميل تلقائي لقوائم النماذج لـ OpenAI وClaude وGemini وOpenRouter وYandexGPT.
- أوضاع الإخراج: toast أسفل اليمين أو modal في المنتصف (بدون إخراج داخل popup الإضافة).
- اختيار لغة المصدر والهدف (autodetect متاح).
- يمكن حفظ مفاتيح API محليًا (افتراضيًا) أو مزامنتها بين الأجهزة (اختياري، أقل أمانًا).
- يتم حفظ النتائج كـ «Last translation / Last error» في popup.

## الاستخدام
1. افتح popup واضغط **Settings** (صفحة options).
2. اضبط API base URL والمفتاح والنموذج واللغات ووضع الإخراج.
3. في أي صفحة، حدّد النص واستخدم قائمة السياق أو الاختصار.
4. في X وتعليقات YouTube، اضغط «ترجمة النص» أسفل المحتوى المدعوم لعرض الترجمة المضمنة. يمكنك تعطيل هذه الأزرار من Settings.

## الإعدادات (صفحة Options)
- إعدادات مزود جاهزة وendpoint مخصص.
- تحديث/تحميل النماذج لـ OpenAI وClaude وGemini وOpenRouter ‏(user/public, free-only) وYandexGPT.
- وضع الإخراج + مدة overlay.
- مفتاح زر الترجمة السريع قرب التحديد.
- مزامنة اختيارية لمفاتيح API بين الأجهزة مع تحذير أمني.
- مفاتيح تبديل منفصلة لإظهار أو إخفاء أزرار الترجمة على X وYouTube.

## الأذونات
- يعمل content script على `<all_urls>` لاكتشاف تحديد النص وعرض واجهة الترجمة المضمنة حيثما كانت مدعومة.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- أذونات host لمزودي API المكوّنين وواجهات X/Twitter

## التطوير
- Load unpacked في `chrome://extensions`
- الملفات الأساسية: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## الخصوصية
يتم إرسال النص المحدد فقط إلى API endpoint الذي تقوم بتكوينه.
راجع `PRIVACY_POLICY.md`.

## التواصل
- البريد الإلكتروني: `xtran@msk.onl`

