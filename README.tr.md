# X ve YouTube için AI Çeviri

<p align="center">
  <img src="icon.png" alt="AI Translate Logo" width="128" height="128" />
</p>

Seçilen metni, X (Twitter) gönderilerini ve YouTube yorumlarını kendi API anahtarınızı (OpenAI uyumlu ve desteklenen yerel sağlayıcılar) kullanarak çevirmek için Chrome uzantısı.

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
1. Açılır pencereyi açın → **Open settings** (seçenekler sayfası) öğesine tıklayın.
2. API temel URL'sini, anahtarını, modelini, dillerini ve çıkış modunu yapılandırın.
3. Herhangi bir sayfada metni seçin ve içerik menüsünü veya kısayol tuşunu kullanın.
4. X veya YouTube yorumlarında, satır içi çeviriyi görmek için içeriğin altındaki "Metni çevir"i tıklayın.

## Ayarlar (Seçenekler sayfası)
- Sağlayıcı ön ayarları ve özel uç nokta.
- OpenAI, Claude, Gemini, OpenRouter (kullanıcı/genel, yalnızca ücretsiz) ve YandexGPT için model yenileme/yükleme.
- Çıkış modu + katmanlama süresi.
- Hızlı seçim düğmesi geçişi.
- Güvenlik uyarısı ile cihazlar arasında isteğe bağlı API anahtarı senkronizasyonu.

## İzinler
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
