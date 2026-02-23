# X ve YouTube için AI Çeviri

[![AI Translate in Chrome Web Store](ai-adv-large.png)](https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji)

Chrome Web Store: https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji

## Özellikler
- Seçilen metni içerik menüsü veya `Alt+Shift+T` (akış çıkışı) kısayol tuşu aracılığıyla çevirin.
- X gönderi/yanıt ve YouTube yorumlarının (akış çıktısı) altındaki satır içi çeviri düğmesi.
- Metin seçiminin yanında isteğe bağlı hızlı çeviri düğmesi.
- Dil çifti anahtarı, kaydedilen son giriş/çıkış ve kaydedilen dil çifti ile açılır hızlı çeviri bloğu.
- OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter ve özel OpenAI uyumlu uç noktaları destekler.
- Yalnızca ücretsiz filtre ve önbelleğe sahip OpenRouter model listesi.
- OpenAI, Claude, Gemini, OpenRouter ve YandexGPT için model listelerinin otomatik olarak yüklenmesi.
- Çıkış modları: sağ alt tost veya ortalanmış mod (uzantı açılır çıkışı yok).
- Hedef + kaynak dil seçimi (otomatik algılama mevcuttur).
- API anahtarları yerel olarak depolanabilir (varsayılan) veya cihazlar arasında senkronize edilebilir (isteğe bağlı, daha az güvenli).
- Sonuçlar açılır pencerede "Son çeviri / Son hata" bölümüne kaydedildi.

## Kullanım
1. Açılır pencereyi açın → **Settings** (seçenekler sayfası) öğesine tıklayın.
2. API temel URL'sini, anahtarını, modelini, dillerini ve çıkış modunu yapılandırın.
3. Herhangi bir sayfada metni seçin ve içerik menüsünü veya kısayol tuşunu kullanın.
4. X ve YouTube yorumlarında, desteklenen içerik altında “Metni çevir” düğmesine tıklayarak satır içi çeviriyi görüntüleyin. Bu düğmeler Settings içinden kapatılabilir.

## Ayarlar (Seçenekler sayfası)
- Sağlayıcı ön ayarları ve özel uç nokta.
- OpenAI, Claude, Gemini, OpenRouter (kullanıcı/genel, yalnızca ücretsiz) ve YandexGPT için model yenileme/yükleme.
- Çıkış modu + katmanlama süresi.
- Hızlı seçim düğmesi geçişi.
- X ve YouTube için çeviri düğmelerini ayrı ayrı gösterme/gizleme anahtarları.
- Güvenlik uyarısı ile cihazlar arasında isteğe bağlı API anahtarı senkronizasyonu.

## İzinler
- content script, metin seçimini algılamak ve desteklenen yerlerde satır içi çeviri arayüzünü göstermek için `<all_urls>` üzerinde çalışır.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Yapılandırılmış API sağlayıcıları ve X/Twitter API'leri için ana bilgisayar izinleri

## Gelişim
- `chrome://extensions` içine paketlenmemiş olarak yükleyin
- Giriş dosyaları: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Mahremiyet
Seçilen metin yalnızca yapılandırdığınız API uç noktasına gönderilir.
Bkz. `PRIVACY_POLICY.md`.

## Temas etmek
- E-posta: `xtran@msk.onl`


