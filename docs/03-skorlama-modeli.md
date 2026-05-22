# Kelepir Skorlama Modeli v0 — Konut

**Status:** Draft (kullanıcı + piyasa eksperleriyle kalibrasyon bekliyor)
**Date:** 21 Mayıs 2026
**Scope:** Sadece konut (daire). Arsa, ofis, oto için ayrı modeller V0.2 / V2.

---

## 1. Felsefe & İlkeler

1. **Deterministik:** Aynı girdiyle her zaman aynı çıktıyı verir. LLM rasgeleliği yok.
2. **Açıklanabilir:** Her bileşen ayrı görülür, kullanıcıya "şu yüzden +12, şu yüzden -8" denilebilir.
3. **Normalize:** 0-100 ölçeğinde tek bir "Kelepir Skoru" + alt-skor bileşenleri.
4. **Karşılaştırmalı:** Mutlak ucuzluk değil, **benzer ilanlara göre göreceli ucuzluk + kalite kompozit**.
5. **LLM rolü:** Sadece **skor bileşenlerini doğal dilde sunmak** + müzakere ipuçları + pazarlama metni. Skorun **hiçbir sayısal bileşenine LLM dokunmaz.**

---

## 2. Skor Tanımı

### 2.1 Ana Formül

```
KelepirSkoru = w_p * FiyatAvantajı + w_q * KaliteSkoru + w_c * KonumSkoru + w_r * RiskSkoru
```

Burada:

| Sembol          | Anlam                                                         | Aralık |
| --------------- | ------------------------------------------------------------- | ------ |
| `FiyatAvantajı` | Benzer ilanlara göre fiyat sapması (negatif sapma = ucuz = +) | 0-100  |
| `KaliteSkoru`   | Fiziksel + tasarım kalitesi (m², yaş, kat, ısıtma, vs.)       | 0-100  |
| `KonumSkoru`    | Mahalle bağlamı (TÜİK + ulaşım + altyapı)                     | 0-100  |
| `RiskSkoru`     | Deprem + hukuki + ilan riskleri (yüksek = +)                  | 0-100  |

Varsayılan ağırlıklar (toplam = 1):

| Ağırlık                | Değer    | Açıklama                       |
| ---------------------- | -------- | ------------------------------ |
| `w_p` (fiyat avantajı) | **0.45** | Kelepir tanımının özü          |
| `w_q` (kalite)         | **0.25** | Kalite olmadan ucuz = kötü mal |
| `w_c` (konum)          | **0.20** | Lokasyon faktörü               |
| `w_r` (risk)           | **0.10** | Düşük risk = ekstra puan       |

> **Önemli:** Bu ağırlıklar **kalibrasyon gerektiriyor.** İlk 100 ilanda piyasa eksperinin "evet kelepir / hayır değil" değerlendirmesiyle Bayesian/grid search ile rafine edilecek. Kullanıcı kendi tercihini Settings'te yapabilir (örn. yatırımcı `w_p`'yi 0.6'ya çekebilir).

### 2.2 Yorum Bantları

| Skor   | Etiket           | Renk       | Anlam                                        |
| ------ | ---------------- | ---------- | -------------------------------------------- |
| 85-100 | **Kaçırılmaz**   | Koyu yeşil | İlan büyük olasılıkla saatler içinde gidecek |
| 70-84  | **Kelepir**      | Yeşil      | Güçlü fırsat, pazarlık şart                  |
| 55-69  | **İyi Fiyat**    | Açık yeşil | Piyasa altında, ama olağanüstü değil         |
| 40-54  | **Piyasa**       | Gri        | Adil fiyat                                   |
| 25-39  | **Pahalı**       | Turuncu    | Üstünde, dikkatli ol                         |
| 0-24   | **Aşırı Pahalı** | Kırmızı    | Şiddetle uzak dur                            |

---

## 3. Fiyat Avantajı (FiyatAvantajı) — Detay

### 3.1 Karşılaştırma havuzu seçimi

Aday ilan için **comparable set** şu kurallarla seçilir:

```sql
SELECT * FROM ilanlar
WHERE ilçe = :ilçe
  AND mahalle = :mahalle           -- önce mahalle, yoksa ilçe
  AND oda_sayısı = :oda_sayısı
  AND ABS(m2 - :m2) / :m2 <= 0.20  -- ±%20 m²
  AND yaş <= :yaş + 5 AND yaş >= :yaş - 5  -- ±5 yıl
  AND created_at >= NOW() - INTERVAL '90 days'
  AND status = 'aktif'
ORDER BY created_at DESC
LIMIT 50;
```

En az 5 karşılaştırılabilir ilan gerekli. Aksi takdirde mahalle yerine ilçe; o da yetmezse ilçe yerine il, ve "düşük güven" bayrağı.

### 3.2 Beklenen fiyat tahmini

```
İlanFiyatı_m2 = ilan_fiyatı / m2
Median_m2 = comparable_set.fiyat_m2.median()
P25_m2 = comparable_set.fiyat_m2.quantile(0.25)
P75_m2 = comparable_set.fiyat_m2.quantile(0.75)

ZScore = (Median_m2 - İlanFiyatı_m2) / (P75_m2 - P25_m2)
```

ZScore pozitif = ilan medyan altında = avantaj.

### 3.3 Skor mapping (sigmoid normalize)

```
FiyatAvantajı = 100 * sigmoid(ZScore * 1.5)
```

Örnek değerler:

| ZScore            | FiyatAvantajı |
| ----------------- | ------------- |
| -2.0 (çok pahalı) | 5             |
| -1.0              | 18            |
| 0 (medyanda)      | 50            |
| +1.0              | 82            |
| +2.0 (çok ucuz)   | 95            |

> **Calibration note:** Sigmoid eğrisinin eğimi (`*1.5`) ilk veriyle ayarlanacak. Hedef: pazarlık tecrübeli emlakçının "evet kelepir" dediği ilanlar 75+, "kesin kelepir" dediği ilanlar 85+ alsın.

### 3.4 Edge case'ler

- **Comparable < 5:** Skor hesaplanır ama `confidence: low` bayrağı eklenir; UI'da kullanıcı uyarılır.
- **Outlier filter:** Comparable'larda fiyat_m2 IQR × 3 üstündekiler atılır (lüks/penthouse ilanları normal daire ile karıştırmamak için).
- **Yeni ilanlar (< 7 gün):** Pazar henüz tepkiyi vermemiş, ekstra `freshness: new` bayrağı.

---

## 4. Kalite Skoru (KaliteSkoru) — Detay

### 4.1 Parametreler ve ağırlıklar

| Parametre       | Ağırlık | Mapping fonksiyonu                                                    | Kaynak |
| --------------- | ------- | --------------------------------------------------------------------- | ------ |
| Bina yaşı       | 0.20    | Yeni (0-5y): 95 / 5-15y: 75 / 15-30y: 55 / 30-50y: 35 / 50+: 20       | İlan   |
| Net m²          | 0.15    | Oda sayısına göre beklenen m² ile karşılaştırma                       | İlan   |
| Brüt/net oranı  | 0.10    | < 1.15: 95 / 1.15-1.25: 75 / 1.25-1.35: 55 / > 1.35: 35               | İlan   |
| Oda dağılımı    | 0.10    | 1+1 (15-22m² salon iyi), 2+1 (sweet spot), 3+1 (aile), 4+: lüks farkı | İlan   |
| Banyo sayısı    | 0.05    | 1 (normal), 2 (iyi), 3+ (lüks)                                        | İlan   |
| Kat konumu      | 0.10    | Zemin: 30, 1-3: 80, 4-7: 90, 8+: 70, çatı katı: 60                    | İlan   |
| Bina kat sayısı | 0.05    | 3-5 katlı: 85 (kompakt), 6-15: 70, 15+: 55 (yüksek rezidans riski)    | İlan   |
| Isıtma          | 0.10    | Doğalgaz kombi: 90, merkezi pay ölçer: 80, merkezi: 60, sobalı: 25    | İlan   |
| Asansör         | 0.03    | Var: 90, yok + 1-2.kat: 70, yok + 3+kat: 30                           | İlan   |
| Otopark         | 0.05    | Kapalı: 90, açık: 75, yok + İstanbul/Ankara: 40                       | İlan   |
| Eşyalı          | 0.02    | Eşyalı: +5 ekstra (kira için bonus), boş: nötr                        | İlan   |
| Site içi        | 0.03    | Site: 85, müstakil: 70, apt: 55                                       | İlan   |
| Krediye uygun   | 0.02    | Uygun: 85, kısmen: 60, değil: 30                                      | İlan   |

> Yukarıdaki ağırlıklar ilanda parametre eksikse yeniden normalize edilir (mevcut parametrelerin toplam ağırlığı 1.0 olacak şekilde).

### 4.2 Hesaplama

```typescript
function kaliteSkoru(input: KonutInput): { score: number; breakdown: Breakdown[] } {
  const features = [
    { key: 'binaYaşı', w: 0.2, score: yaşScore(input.binaYaşı) },
    { key: 'netM2', w: 0.15, score: m2Score(input.netM2, input.odaSayısı) },
    // ...
  ];

  const presentFeatures = features.filter((f) => f.score !== null);
  const totalWeight = presentFeatures.reduce((s, f) => s + f.w, 0);
  const score = presentFeatures.reduce((s, f) => s + (f.w / totalWeight) * f.score, 0);

  return { score, breakdown: presentFeatures };
}
```

---

## 5. Konum Skoru (KonumSkoru) — Detay

### 5.1 Parametreler

| Parametre              | Ağırlık | Mapping                                                        | Kaynak               |
| ---------------------- | ------- | -------------------------------------------------------------- | -------------------- |
| Ana caddeye mesafe     | 0.15    | < 100m: 90, 100-300: 80, 300-500: 65, 500-1000: 50, 1000m+: 35 | OSM / Google routing |
| Metro/metrobüs mesafe  | 0.20    | < 500m: 95, 500-1000: 80, 1-2km: 60, 2-5km: 40, 5km+: 20       | Belediye veri        |
| Toplu taşıma yoğunluğu | 0.10    | 500m içinde hat sayısı                                         | OSM                  |
| AVM / market yakınlık  | 0.10    | 500m içinde market var: 80, 1km: 65, yok: 40                   | OSM                  |
| İlk/ortaokul mesafe    | 0.10    | < 500m: 85, 500-1000: 70, 1-2km: 55, 2km+: 35                  | MEB açık veri        |
| Hastane mesafe         | 0.05    | < 1km: 80, 1-3km: 65, 3km+: 45                                 | Sağlık Bakanlığı     |
| Park/yeşil alan        | 0.05    | 500m içinde park var: 80, yok: 50                              | OSM                  |
| Mahalle sosyo-ekonomik | 0.15    | TÜİK gelir seviyesi quintile (1-5) → 30-90                     | TÜİK                 |
| Mahalle yaş dağılımı   | 0.05    | Hedef pazara göre (genç/aile/emekli)                           | TÜİK                 |
| Mahalle fiyat ivmesi   | 0.05    | Son 12 ay +%X üzeri: 90, durağan: 50, düşüş: 30                | İç havuz             |

### 5.2 Veri kaynakları

- **OpenStreetMap:** ücretsiz, Nominatim API ile geocoding, Overpass ile POI sorgu.
- **Google Maps Routing:** ücretli (yedek/premium tier).
- **TÜİK:** [data.tuik.gov.tr](https://data.tuik.gov.tr) — gelir, eğitim, nüfus, yaş dağılımı (ilçe bazlı).
- **MEB:** okul listesi ve konumları açık veri.
- **AFAD:** deprem tehlike haritası (KonumSkoru'na değil, RiskSkoru'na girer).

### 5.3 Edge case'ler

- Mahalle bilinmiyorsa (ilan eksik) → ilçe ortalaması kullanılır + `confidence: medium`
- Veri henüz çekilmemiş mahalle → asenkron kuyruğa atılır, kullanıcıya "yükleniyor" gösterilir

---

## 6. Risk Skoru (RiskSkoru) — Detay

### 6.1 Parametreler

| Parametre                | Ağırlık | Mapping                                                         | Kaynak            |
| ------------------------ | ------- | --------------------------------------------------------------- | ----------------- |
| Deprem tehlike (PGA)     | 0.40    | TBDY tehlike bandı 1 (yüksek): -20 / 2: 0 / 3: +10 / 4: +20     | AFAD              |
| Bina inşa yılı (TBDY)    | 0.25    | 1999 öncesi: -20 / 2000-2018: -5 / 2019+ (yeni TBDY): +20       | İlan              |
| Aktif fay hattı mesafesi | 0.10    | < 500m: -20 / 500-2000m: -5 / 2km+: +10                         | MTA diri fay      |
| Tapu durumu              | 0.10    | Kat mülkiyeti: 90 / Kat irtifakı: 70 / Hisseli: 40 / Tahsis: 25 | İlan              |
| İskan durumu             | 0.05    | Var: 90 / Kısmen: 60 / Yok: 30                                  | İlan              |
| Krediye uygun            | 0.05    | Uygun: 80 / Kısmen: 55 / Değil: 30                              | İlan              |
| Kentsel dönüşüm          | 0.05    | Riskli: -20 / Dönüşüm bölgesi: +20 (fırsat) / Normal: 50        | Belediye GIS (V3) |

### 6.2 Hesaplama

```
RiskSkoru = 50 + sum(weighted_adjustments) → clamped [0, 100]
```

Yani başlangıç noktası 50 (nötr), her parametre + veya - getirir.

### 6.3 Önemli kural

Risk **çok yüksekse** (PGA tehlike 1 + 1999 öncesi + 500m fay), AnaSkor sigmoid ile cezalanır:

```
if RiskSkoru < 25:
  KelepirSkoru *= 0.7   # büyük indirim
  add_warning("⚠️ Yüksek deprem riski — fiyat ne olursa olsun dikkat")
```

---

## 7. AI Açıklama Katmanı (LLM)

Skor hesaplandıktan sonra LLM'e şu format verilir:

```json
{
  "ilan": {
    "id": "...",
    "başlık": "Beşiktaş Sinanpaşa 2+1 satılık daire",
    "fiyat_tl": 4250000,
    "m2": 95,
    "oda": "2+1",
    "yaş": 12,
    "kat": 3,
    "mahalle": "Sinanpaşa",
    "ilçe": "Beşiktaş"
  },
  "skor": {
    "toplam": 78,
    "etiket": "Kelepir",
    "bileşenler": {
      "fiyat_avantajı": 85,
      "kalite": 72,
      "konum": 88,
      "risk": 55
    },
    "breakdown_detay": { "bina_yaşı": 75, "kat_konumu": 80, ... },
    "comparable_count": 23,
    "median_m2_fiyatı_tl": 51200,
    "ilan_m2_fiyatı_tl": 44737,
    "confidence": "high",
    "warnings": ["Bina 2018 öncesi — TBDY 2019 kapsamı dışı"]
  }
}
```

LLM'e prompt:

> Sen Türkiye gayrimenkul piyasasında uzman bir analistsin. Yukarıdaki ilan ve skor bilgilerini kullanarak Türkçe, 4-6 cümlelik bir analiz yaz. Şunlara değin: (1) Neden bu skoru aldı (en güçlü ve en zayıf 1-2 parametre), (2) Müzakere ipucu (pazarlık payı tahmini), (3) Dikkat edilmesi gereken risk. Sayıları formül gibi değil, doğal dille kullan. Satış kapatma dili kullanma — objektif analist tonu.

**Kritik kural:** LLM **skorun sayısal değerini değiştiremez**, sadece **var olan bileşenleri açıklayabilir**. Her LLM çıktısı sonrası bir guard çalışır: çıktıda skor değiştirmeye yönelik ifadeler ("aslında 85" gibi) varsa silinir.

---

## 8. Pazarlama Metni Üretimi (LLM)

Emlakçı için "İlan açıklaması" + "Sosyal medya post" + "Müşteriye mesaj" varyantları:

```typescript
interface PazarlamaMetniInput {
  ilan: KonutInput;
  skor: SkorResult;
  hedef: 'ilan_açıklaması' | 'instagram_post' | 'whatsapp_müşteri' | 'email_müşteri';
  ton: 'profesyonel' | 'enerjik' | 'samimi';
  uzunluk: 'kısa' | 'orta' | 'uzun';
}
```

Şablon prompt'lar `packages/llm-gateway/src/prompts/marketing.ts` altında — kullanıcı özelleştirilebilir.

---

## 9. Validation & Calibration Planı

### 9.1 Birim test (Vitest)

```typescript
describe('Kelepir Skoru', () => {
  it('Medyanda fiyat → FiyatAvantajı ≈ 50', () => {
    const result = score({ ilanFiyatM2: 50000, comparableMedian: 50000, ... });
    expect(result.fiyatAvantajı).toBeCloseTo(50, 5);
  });

  it('%20 medyan altı → FiyatAvantajı ≥ 75', () => {
    const result = score({ ilanFiyatM2: 40000, comparableMedian: 50000, ... });
    expect(result.fiyatAvantajı).toBeGreaterThanOrEqual(75);
  });

  it('1999 öncesi + yüksek PGA → ana skor ceza yer', () => {
    const result = score({ binaYılı: 1995, pgaBand: 1, ... });
    expect(result.warnings).toContainEqual(expect.stringMatching(/deprem/i));
  });

  // 50+ test case daha
});
```

### 9.2 Saha kalibrasyonu

- İlk 100 ilan için Mehmet veya pilot emlakçı manuel "kelepir / değil" işaretler
- Sapma analizi: model 75 dedi, ekspert "değil" dedi → parametre ağırlıklarını rafine et
- Grid search veya basit hyperopt (`packages/scoring/calibration.ts`)

### 9.3 A/B test (V1+)

- Aynı ilanlar için skor v1 vs v2 → kullanıcı hangisini daha doğru buluyor
- Düşük güvenli kullanıcılar (yeni kayıt) → eski model; güvenli kullanıcılar → yeni model
- Sonuç: ilan_analyze_completed event'inde "kullanıcı feedback?" sorma

---

## 10. Kaynaklar & Referanslar

| Konu                                        | Kaynak            | URL                                                                                         |
| ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| sahibinden ilan filtreleri                  | sahibinden yardım | https://yardim.sahibinden.com                                                               |
| SPK Gayrimenkul Değerleme Tebliği           | SPK Resmi         | https://spk.gov.tr/kurumlar/gayrimenkul-degerleme-kuruluslari/tebligler                     |
| Türkiye Bina Deprem Yönetmeliği 2019 (TBDY) | Resmi Gazete      | https://www.resmigazete.gov.tr/eskiler/2018/03/20180318M1-2.htm                             |
| AFAD Deprem Tehlike Haritası                | AFAD              | https://www.afad.gov.tr/turkiye-deprem-tehlike-haritasi                                     |
| MTA Diri Fay Haritası                       | MTA               | https://www.mta.gov.tr (Diri Fay Veritabanı)                                                |
| TÜİK Açık Veri                              | TÜİK              | https://data.tuik.gov.tr                                                                    |
| 2026 Değerleme Asgari Ücret                 | Alomaliye         | https://www.alomaliye.com/2025/12/31/2026-yili-gayrimenkul-degerleme-asgari-ucret-tarifesi/ |

---

## 11. Sonraki Adımlar

1. [ ] Mehmet tarafından ağırlıkların ilk gözden geçirmesi
2. [ ] `packages/scoring/` paketinde TypeScript impl + 50 birim test
3. [ ] 10 örnek sahibinden ilanı (anonymize edilmiş JSON) ile dry-run
4. [ ] Pilot emlakçı kalibrasyon turu (ilk 100 ilan)
5. [ ] Arsa modülü v0 (V0.2 — ayrı doküman)
6. [ ] Oto modülü v0 (V2 — ayrı doküman, parametreler: km, model yılı, vites, motor, donanım, TRAMER, marka amortisman eğrisi)
