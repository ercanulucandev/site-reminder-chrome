# Site Notları

Her web sitesi için notlar, yapılacaklar ve hatırlatıcılar tutan Chrome eklentisi (Manifest V3).

## Özellikler

- **Site veya sayfa bazlı** notlar ve görevler (alan adının tamamı ya da yalnızca o adres)
- **Hatırlatıcılar**: hazır seçenekler (30 dk, 1 saat, bu akşam, yarın sabah, gelecek hafta) veya özel tarih/saat. Bildirimde "Siteyi aç" ve "Ertele" düğmeleri bulunur. Tarayıcı kapalıyken kaçırılan hatırlatıcılar açılışta gösterilir.
- **Rozet**: araç çubuğu simgesinde o sitedeki açık görev sayısı görünür; gecikmiş görev varsa kırmızı olur.
- **Popup** (hızlı erişim), **yan panel** (sayfanın yanında açık kalır) ve **tüm notlar** paneli (arama, filtreler, site listesi)
- Öncelik, `#etiket` desteği, metindeki bağlantılar tıklanabilir
- Sağ tık menüsü: "Bu sayfaya not / görev ekle", "Seçili metni not olarak kaydet"
- Kısayollar: `Alt+Shift+N` popup, `Alt+Shift+S` yan panel (`chrome://extensions/shortcuts` adresinden değiştirilebilir)
- Açık / koyu / sistem teması, silmede "Geri al", JSON dışa/içe aktarma
- Tüm veriler yalnızca tarayıcıda (`chrome.storage.local`) saklanır

## Kurulum (geliştirme)

```bash
npm install
npm run build
```

1. Chrome'da `chrome://extensions` adresini aç
2. Sağ üstten **Geliştirici modu**nu aç
3. **Paketlenmemiş öğe yükle** → `dist` klasörünü seç

Geliştirme sırasında `npm run dev` değişiklikleri izleyip `dist`'i yeniden üretir; ardından eklentiler sayfasında eklentiyi yenile.

İkonları yeniden üretmek için: `node scripts/make-icons.mjs`

## Yapı

```
public/manifest.json        Manifest V3 tanımı
src/background.ts           Service worker: alarmlar, bildirimler, rozet, sağ tık menüsü, kısayollar
src/lib/                    Veri modeli, depolama, URL eşleme, zaman biçimlendirme, React hook'ları
src/components/             Ortak arayüz bileşenleri (SiteView, Composer, ItemRow, ReminderMenu…)
src/entries/                popup, yan panel ve gösterge paneli giriş noktaları
```

Teknolojiler: React 19, TypeScript, Vite, Tailwind CSS v4, lucide-react.
