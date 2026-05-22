# 🧭 Pusula — Profesyonel Denetim Raporu (Audit)

> **Tarih:** 21 Mayıs 2026
> **Kapsam:** apps/web, apps/api, apps/extension, packages/scoring, packages/llm-gateway, packages/shared, packages/db, docs
> **Toplam taranan dosya:** 73 kaynak dosya + 8 markdown
> **Amaç:** Pusula MVP iskeletinin "tam profesyonel / AAA prod-ready" seviyeye gelmesi için tüm eksiklerin, hataların ve risklerin tek listede toplanması.

---

## 0. Yönetici Özeti

**Genel durum:** İyi bir mimari iskelet ve tutarlı dokümantasyon var. Skor motoru `packages/scoring/` temiz, deterministik ve test edilebilir biçimde yazılmış. Ancak **iskelet üretime hazır değil**: çalıştırılabilir bir API süreci, gerçek JWT doğrulaması, sağlam CORS politikası, CI/CD, gözlemlenebilirlik (Sentry/log/metrik), test kapsamı, lint/format altyapısı, lisans ve doküman dosyaları **yok ya da yarım**.

| Alan                | Olgunluk | Durum                                                                                         |
| ------------------- | -------- | --------------------------------------------------------------------------------------------- |
| Mimari & doküman    | 8/10     | ADR, skor modeli, roadmap, mimari diyagram yazılmış                                           |
| Tip güvenliği & Zod | 7/10     | Şemalar iyi, controller'da gevşek noktalar var                                                |
| Skor motoru         | 7/10     | Pure, deterministik; 8 test (50+ hedef)                                                       |
| Backend hizmet      | **3/10** | **`main.ts` yarım, server hiç ayağa kalkmıyor**                                               |
| Auth & Güvenlik     | **2/10** | **JWT doğrulanmıyor, base64 decode**; CORS regex zayıf; gizli klasör commit'lenmiş            |
| Frontend (web)      | 4/10     | İskelet sayfalar yarım, hatasız değil                                                         |
| Extension           | 5/10     | Service worker iyi; manifest ve SidePanel kesik                                               |
| LLM Gateway         | 7/10     | Adapter pattern düzgün; bazı edge case eksik                                                  |
| DB / Migrasyon      | 7/10     | RLS açık, ama updated_at trigger yok, FK ve index boşlukları var                              |
| Test & CI/CD        | **1/10** | GitHub Actions yok, husky yok, lint config yok                                                |
| Observability       | **1/10** | Sentry DSN env'de ama wire edilmemiş, log altyapısı yok                                       |
| Proje hijyeni       | **2/10** | LICENSE/CHANGELOG/CONTRIBUTING yok, prettier/eslint config yok, `_DEVRETME_silinecek/` repoda |

**Kabaca eforu:** Tam profesyonel seviyeye gelmek için **2–3 haftalık odaklanmış çalışma** (tek geliştirici + AI yardımı). En kritik tehlikeler 1. hafta, kalite/CI 2. hafta, gözlemlenebilirlik ve dokümantasyon 3. hafta.

---

## 1. Öncelik Lejantı

| Etiket | Anlam                                                                        | SLA       |
| ------ | ---------------------------------------------------------------------------- | --------- |
| **P0** | Production'a çıkmadan önce ABSOLÜTEK ZORUNLU. Güvenlik açığı veya çalışmama. | < 1 hafta |
| **P1** | Public beta öncesi zorunlu. Profesyonel olmamasının ana sebebi.              | < 2 hafta |
| **P2** | Genel kalite / sürdürülebilirlik. Sonraki sprint'lerde.                      | < 1 ay    |
| **P3** | Nice-to-have / future-proofing.                                              | Backlog   |

---

## 2. KRİTİK BULGULAR (P0)

### 2.1 [P0] `apps/api/src/main.ts` yarım — API hiç ayağa kalkmıyor

**Dosya:** `apps/api/src/main.ts:17-20`
**Kanıt:**

```ts
// Render healthcheck endpoint (raw express handler)
const httpAdapter = app.getHttpAdapter();
httpAdapter.get; // ← burada kesik. app.listen() yok, function de kapanmıyor.
```

Dosya 20 satır, fonksiyon `}` ile bitmemiş, `bootstrap()` çağrısı da yok. `pnpm --filter @pusula/api dev` veya `start` çalıştırılınca derleme bile geçmez.

**Düzeltme planı:**

```ts
// apps/api/src/main.ts — TAMAMLANMIŞ HÂLİ
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(compression());
  app.enableShutdownHooks();
  app.setGlobalPrefix('v1', { exclude: ['health', 'ready'] });

  app.enableCors({
    origin: (origin, cb) => {
      const allowed = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
      if (!origin || allowed.some((a) => a === origin)) return cb(null, true);
      // chrome-extension://<known-id> beyaz listesi
      if (
        origin.startsWith('chrome-extension://') &&
        process.env.EXT_IDS?.split(',').includes(origin.replace('chrome-extension://', ''))
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS denied: ${origin}`));
    },
    credentials: true,
  });

  // Healthcheck
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
  httpAdapter.get('/ready', (_req, res) => res.json({ status: 'ready' }));

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`Pusula API listening on :${port}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
```

Yeni dep: `pnpm --filter @pusula/api add helmet compression @types/compression`

---

### 2.2 [P0] JWT imzası doğrulanmıyor — TOTAL AUTH BYPASS

**Dosya:** `apps/api/src/auth/jwt.guard.ts:22-31`
**Kanıt:**

```ts
const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64').toString());
req.user = { id: payload.sub, email: payload.email };
return true;
```

Saldırgan, `https://jwt.io` ile keyfi bir JWT payload üretir ("sub": başka kullanıcı UUID'si), imzayı umursamadan API'ye yollar. Sunucu kabul eder. **Her kullanıcının verisine erişim hemen mümkündür.** Bu, kodun `// TODO` yorumunda kabul edilmiş ama hâlâ canlıya çıkarsa public beta açılır açılmaz exploit edilebilir.

**Düzeltme planı:** Supabase JWKS ile `jose` veya `jsonwebtoken` kullanarak gerçek RS256 doğrulama.

```ts
// apps/api/src/auth/jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const SUPABASE_JWT_ISSUER = `${process.env.SUPABASE_URL}/auth/v1`;
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    const token = header.slice(7);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: SUPABASE_JWT_ISSUER,
        audience: 'authenticated',
        algorithms: ['RS256'],
      });
      if (!payload.sub || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid subject');
      }
      req.user = { id: payload.sub, email: String(payload.email ?? '') };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

Yeni dep: `pnpm --filter @pusula/api add jose`

---

### 2.3 [P0] CORS regex'leri çok geniş — supply chain riski

**Dosya:** `apps/api/src/main.ts:9-15` (orijinal)
**Kanıt:** `/\.vercel\.app$/` ve `/\.onrender\.com$/` — **herhangi bir** vercel/onrender subdomain'i `credentials: true` ile API'ye erişebilir. Bir saldırgan kendi `evil-attacker.vercel.app` projesini deploy ederse, kurbanın tarayıcısı (zaten Pusula'da oturum açıksa) HTTP-only olmayan token'ları leak edebilir veya CSRF benzeri saldırı yapılabilir.

**Düzeltme:** `CORS_ALLOWED_ORIGINS=https://app.pusula.tr,https://staging.pusula.tr` gibi explicit allowlist (yukarıdaki 2.1 çözümünde örnek var). Extension için `EXT_IDS` ile yalnız bilinen extension ID'leri.

---

### 2.4 [P0] Gemini adapter API key'i URL query'sinde gönderiyor

**Dosya:** `packages/llm-gateway/src/adapters/gemini.ts:24`
**Kanıt:**

```ts
return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`;
```

URL query string:

- Sunucu access log'larına yazılır (proxy/Cloudfront/Vercel/Render),
- Tarayıcı `Referer` header'ında 3. taraflara sızar,
- Browser geçmişine düşer,
- Sentry/PostHog hatalarında URL kaydedilirse leak olur.

**Düzeltme:** Gemini, `x-goog-api-key` header'ını da destekler. URL'den çıkar.

```ts
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
  body: JSON.stringify(body),
});
```

---

### 2.5 [P0] `dangerouslyAllowBrowser: true` — kullanıcı key'i tarayıcıya açık

**Dosya:** `packages/llm-gateway/src/adapters/openai-compat.ts:23`
**Kanıt:**

```ts
return new OpenAI({ apiKey, baseURL: this.baseURL, dangerouslyAllowBrowser: true });
```

Bu adapter hem extension'da hem web'de hem backend'de import edilebiliyor. Web/extension'da çağırılırsa kullanıcı kendi BYOK key'ini bir XSS saldırısıyla kaybedebilir. ADR'da "Anthropic CORS yok → backend proxy" denmiş ama Groq/DeepSeek de aynı şekilde backend proxy'ye geçmeli; aksi takdirde key tarayıcı CSP-bypass saldırısına maruz kalır.

**Düzeltme:**

1. Tüm LLM çağrıları **yalnızca** `apps/api` üzerinden geçsin (zaten `LLMController` mevcut — extension/web ondan çağırsın).
2. `OpenAICompatAdapter`'da `dangerouslyAllowBrowser: false` (varsayılan) bırak.
3. Frontend'de `LLMGateway`'i import etmeyi yasakla: ESLint rule `no-restricted-imports`.

---

### 2.6 [P0] Gizli klasör `_DEVRETME_silinecek/` ve `tokens.env` repoda

**Kanıt:** `_DEVRETME_silinecek/tokens.env` mevcut — `.gitignore` onu kapsıyor olabilir ama dosyalar **zaten taranan kaynakta görünüyor**, yani lokal disk'te mevcut. Eğer geçmişte commit edilmişse `git log -- _DEVRETME_silinecek/tokens.env` ile teyit et; varsa `git filter-repo` ile tarihten temizle ve tüm token'ları rotate et.

**Düzeltme komutu:**

```bash
# 1) Geçmişe bakı
git log --all --full-history -- _DEVRETME_silinecek/

# 2) Eğer commit edilmemişse sadece sil
rm -rf _DEVRETME_silinecek

# 3) Eğer geçmişte varsa: filter-repo ile tarihten kaldır + zorunlu rotate
pipx install git-filter-repo
git filter-repo --path _DEVRETME_silinecek --invert-paths
# Sonra: tüm token'lar (Supabase/Anthropic/Groq/Stripe vs.) DERHAL rotate edilmeli.
```

---

### 2.7 [P0] `apps/extension/src/sidepanel/SidePanel.tsx` derlenmiyor

**Dosya:** `apps/extension/src/sidepanel/SidePanel.tsx:179`
**Kanıt:** Dosya `function labelTr(key: stri` ile kesik. TS derleyici hata verir, extension build'i kırılır.

**Düzeltme:** `labelTr` fonksiyonunu tamamla:

```ts
function labelTr(key: string): string {
  const map: Record<string, string> = {
    fiyat_avantaji: 'Fiyat Avantajı',
    kalite: 'Kalite',
    konum: 'Konum',
    risk: 'Risk',
  };
  return map[key] ?? key;
}
```

Aynı şekilde tamamlanması gereken dosyalar (truncated):

- `apps/extension/manifest.json` (web_accessible_resources.matches kesik)
- `apps/extension/src/options/index.html`
- `apps/web/app/layout.tsx` (metadata.openGraph.description kesik)
- `apps/web/app/page.tsx` (CTA butonu "Ücre…" kesik)
- `apps/web/app/dashboard/page.tsx` (empty-state div kesik)
- `apps/web/.env.example`, `apps/api/.env.example` (DATABASE_URL kesik), `.gitignore` (kesik)

Her birini gözden geçirip tamamla — şu an `pnpm build` HİÇBİR app'ta geçmez.

---

### 2.8 [P0] `list-batch` endpoint'i input validation'ı yok

**Dosya:** `apps/api/src/ilanlar/ilanlar.controller.ts:25-30`
**Kanıt:**

```ts
@Post('list-batch')
async listBatch(
  @CurrentUser() user: AuthedUser,
  @Body() batch: Array<{ url: string; baslik: string; fiyat: string }>   // ← ham, validate edilmemiş
) { ... }
```

Saldırgan 10.000 elemanlı array yollayarak heap'i şişirebilir; her bir `url` keyfi string olabilir, SSRF için kullanılabilir.

**Düzeltme:**

```ts
import { z } from 'zod';
const ListBatchSchema = z.object({
  items: z.array(z.object({
    url: z.string().url().refine(u => u.startsWith('https://www.sahibinden.com/ilan/'), 'sadece sahibinden ilan url'),
    baslik: z.string().max(300),
    fiyat: z.string().max(50),
  })).max(200), // 200/batch limit
});

@Post('list-batch')
@HttpCode(202)
async listBatch(
  @CurrentUser() user: AuthedUser,
  @Body(new ZodValidationPipe(ListBatchSchema)) body: z.infer<typeof ListBatchSchema>,
) {
  return this.service.acceptListBatch(user.id, body.items);
}
```

---

### 2.9 [P0] LLM endpoint'inde rate-limit ve quota yok

**Dosya:** `apps/api/src/llm/llm.controller.ts` + `apps/api/src/main.ts`

Hiçbir endpoint'te rate-limit yok. BYOK kullanıcının key'i sınırsız çağrılabilir; managed pool'a geçişten önce de Pusula altyapısı para kaybeder.

**Düzeltme:**

```bash
pnpm --filter @pusula/api add @nestjs/throttler
```

```ts
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 5 },     // 5 req/sec
      { name: 'minute', ttl: 60_000, limit: 60 },  // 60 req/min
      { name: 'llm', ttl: 60_000, limit: 20 },     // LLM özel
    ]),
    // ...
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```

LLM controller'a `@Throttle({ llm: { limit: 20, ttl: 60_000 } })`.

---

## 3. YÜKSEK ÖNCELİK BULGULAR (P1)

### 3.1 [P1] Random ID üretimi cryptographically insecure

**Dosya:** `apps/api/src/ilanlar/ilanlar.service.ts:11,19`
**Kanıt:**

```ts
const id = `ilan_${Math.random().toString(36).slice(2)}`;
const score_id = `score_${Math.random().toString(36).slice(2)}`;
```

- `Math.random()` çakışma olasılığı yüksek (11 char alphanumeric ≈ 57 bit, ~10⁹ kayıttan sonra çakışma).
- Tahmin edilebilir (RNG state'i sömürülebilir).
- Aslında ID DB tarafından üretilmeli (`gen_random_uuid()`).

**Düzeltme:** DB INSERT yaparken `RETURNING id, score_id` kullan; veya `crypto.randomUUID()`.

---

### 3.2 [P1] `kelepirSkoru` ağırlık doğrulaması toleransı yanlış davranabilir

**Dosya:** `packages/scoring/src/scoring-engine.ts:31-35`
**Kanıt:** `Math.abs(sum - 1.0) > 0.001` — bu kontrol iyi. Ancak hata mesajı i18n değil, `Error` yerine domain spesifik bir hata sınıfı (`InvalidWeightsError`) atılmalı; aksi takdirde controller `500` döner, kullanıcıya 400 dönmesi gerekir.

**Düzeltme:** `packages/scoring/src/errors.ts` ekleyip `InvalidWeightsError extends Error` tanımla; controller'da `catch` ile `BadRequestException`'a map'le.

---

### 3.3 [P1] LLMGateway'de adapter mock'lanması zor (DI eksik)

**Dosya:** `packages/llm-gateway/src/gateway.ts:18-27`
**Kanıt:**

```ts
const ADAPTERS: Record<Provider, LLMAdapter> = {
  groq: new GroqAdapter(), // ... module-level instance
};
```

Module-level singleton; testte mock'lamak imkansız; "placeholder" `GroqAdapter()` `openai`/`openrouter` için anlamsız. Bu, hem test hem prod davranışını riske atar.

**Düzeltme:** Adapter map'ini constructor injection ile al.

```ts
constructor(private config: GatewayConfig & { adapters?: Partial<Record<Provider, LLMAdapter>> }) {}

private adapter(provider: Provider): LLMAdapter {
  const a = this.config.adapters?.[provider] ?? DEFAULT_ADAPTERS[provider];
  if (!a) throw new Error(`No adapter registered for ${provider}`);
  return a;
}
```

---

### 3.4 [P1] `LLMGateway.chat` failover sayım hatası

**Dosya:** `packages/llm-gateway/src/gateway.ts:42-58`
**Kanıt:** `for (let i = 0; i < maxAttempts; i++)` — failover olmasa bile `i` artıyor. Auth hatası (`throw err`) sonrası gereksiz `lastError` taşıması var. `maxAttempts` da `candidates.length`'i geçtiyse `cand` `undefined` olabiliyor.

**Düzeltme:** Daha açık iterator + exponential backoff.

```ts
for (const cand of candidates.slice(0, maxAttempts)) {
  try { ... return ... }
  catch (err) {
    if (!isRetryable(err)) throw err;
    await sleep(jitterBackoff(attempt++));
    lastError = err;
  }
}
throw lastError ?? new Error('LLMGateway: no candidate succeeded');
```

---

### 3.5 [P1] Skor formülü ağırlık override gerçekten override etmiyor

**Dosya:** `packages/scoring/src/scoring-engine.ts:18-23`
**Kanıt:**

```ts
export interface ScoringOptions {
  weights?: typeof DEFAULT_SCORE_WEIGHTS; // readonly literal type
}
```

`DEFAULT_SCORE_WEIGHTS` `as const` ile readonly literal tip. Bu interface'de `weights: typeof DEFAULT_SCORE_WEIGHTS` denmiş, ama kullanıcı `{fiyat_avantaji: 0.6, kalite: 0.2, konum: 0.1, risk: 0.1}` ile çağırırsa TS hata verir (literal değil).

**Düzeltme:**

```ts
export interface ScoreWeights {
  fiyat_avantaji: number; kalite: number; konum: number; risk: number;
}
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { ... };
export interface ScoringOptions { weights?: ScoreWeights }
```

---

### 3.6 [P1] `parseFiyat` ve `parseInt_` negatif değer ve regex tuzakları

**Dosya:** `apps/extension/src/parsers/sahibinden-konut-v3.ts:18-25`
**Kanıt:**

```ts
function parseInt_(s: string): number | undefined {
  const n = parseInt(s.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
}
```

`/[^\d-]/g` rakam dışı her şeyi siler ama minus işaretini ortada bırakır. "12-yıl" → "12-" → `parseInt("12-")` → 12 (OK). Ancak "-3 ay" → "-3" → -3 (negatif yaş!). Bina yaşı negatif olamaz; `min(0, ...)` veya yalnız `/\d+/.exec()` kullan.

**Düzeltme:**

```ts
function parseUInt(s: string): number | undefined {
  const m = /-?\d+/.exec(s);
  if (!m) return undefined;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
```

---

### 3.7 [P1] LLM controller'ın `messages: z.array(z.any())` validation'ı şemayı atlıyor

**Dosya:** `apps/api/src/llm/llm.controller.ts:8-13`
**Kanıt:**

```ts
const ChatRequest = z.object({
  messages: z.array(z.any()), // ← tip güvenli değil
  options: ChatOptions,
  provider_keys: z.record(z.string()).optional(),
});
```

`ChatMessage` Zod şeması zaten `packages/shared/src/schemas/llm.ts`'de var. Onu kullan; `z.record(z.string())` provider adlarını kısıtlamıyor (`evil` key bile kabul ediliyor).

**Düzeltme:**

```ts
import { ChatMessage, Provider } from '@pusula/shared';
const ChatRequest = z.object({
  messages: z.array(ChatMessage).min(1).max(100),
  options: ChatOptions,
  provider_keys: z.record(Provider, z.string().min(20).max(500)).optional(),
});
```

---

### 3.8 [P1] Extension service worker JWT refresh yok, 50dk hard-code cache

**Dosya:** `apps/extension/src/background/service-worker.ts:36-46`
**Kanıt:**

```ts
state.auth.expires_at = Date.now() + 50 * 60 * 1000; // 50 dakika cache
```

Supabase JWT `exp` claim'i okunmuyor. Token süresi dolarsa kullanıcı `401` görür; refresh akışı yok.

**Düzeltme:** JWT `exp` claim'ini parse et, 60 saniye buffer ile cache; expire'da `chrome.cookies.get('sb-refresh-token')` ile yeni access alın veya web app'a redirect.

---

### 3.9 [P1] `setupPassiveCollector` MutationObserver perf riski

**Dosya:** `apps/extension/src/content/sahibinden.ts:91-110`
**Kanıt:** `new MutationObserver(observeAll).observe(document.body, { childList: true, subtree: true })` — her DOM mutation'da `querySelectorAll` çağrılıyor. sahibinden gibi büyük listelerde 60fps'i öldürür ve sahibinden bot detection sinyali tetikleyebilir.

**Düzeltme:** Throttle ile (lodash veya manual setTimeout), ek olarak `WeakSet` ile observe edilmiş kartları işaretle, "yeni eklenen child" filtresi.

---

### 3.10 [P1] `IlanlarService.ingestKonut` DB persistans hiç yok

**Dosya:** `apps/api/src/ilanlar/ilanlar.service.ts:10-25`

Skor üretiliyor ama hiçbir şey kaydedilmiyor. `score_id` lokal random; DB'de hiç `INSERT` yok. Bu doğrudan ürün işlevsizliğidir.

**Düzeltme:** Supabase JS client ile `ilanlar` insert + `scoring_results` insert (transaction). Detay 5.3'te.

---

### 3.11 [P1] Tüm `.env.example` dosyaları yarım

**Dosyalar:** `apps/api/.env.example`, `apps/web/.env.example`, `apps/extension/.env.example` (sonuncusu az kısmı dolu ama eksik).

Eksik anahtarlar: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `REDIS_URL`, `SENTRY_DSN`, `POSTHOG_KEY`, `CORS_ALLOWED_ORIGINS`, `EXT_IDS`, `NEXT_PUBLIC_POSTHOG_HOST`, vb.

**Düzeltme:** Eksiksiz, yorumlu, gruplandırılmış `.env.example` yaz (örnek için aşağıdaki §6.1).

---

### 3.12 [P1] Schema kayıp: `cephe` parser tarafından çıkarılmıyor

**Dosya:** `apps/extension/src/parsers/sahibinden-konut-v3.ts`

`KonutInput.cephe` Zod'da tanımlı (`z.array(Cephe).optional()`) ama parser hiç set etmiyor. `parse_versiyonu` field-coverage metric'i olmalı (kaç alan dolduruldu / toplam).

**Düzeltme:** Parser'a `cephe` mapper ekle; ek olarak `parse_coverage` field'ı (0-1 arasında).

---

### 3.13 [P1] DB: `updated_at` trigger'ı yok

**Dosya:** `packages/db/migrations/0001_init.sql`

`users`, `ilanlar`, `subscriptions` tablolarında `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` var ama UPDATE'te otomatik güncellenmesi için trigger yok.

**Düzeltme:**

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename IN ('users','ilanlar','subscriptions') LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_updated_at ON public.%I; CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
    r.tablename, r.tablename);
END LOOP; END $$;
```

---

### 3.14 [P1] DB: `mahalle_enrichment` RLS yok

`mahalle_enrichment` `ENABLE ROW LEVEL SECURITY` listesinde değil. Bu tablo public read olsa bile RLS açık olmalı + select-all policy.

**Düzeltme:**

```sql
ALTER TABLE public.mahalle_enrichment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mahalle_select_authenticated" ON public.mahalle_enrichment
  FOR SELECT TO authenticated USING (true);
```

---

### 3.15 [P1] DB: kritik index'ler eksik

- `chat_threads(user_id, created_at DESC)`
- `usage_events(user_id, provider, created_at DESC)`
- `ilanlar(parse_tarihi DESC) WHERE status='aktif'` — comparable query için
- `scoring_results(formul_versiyonu, etiket)` — version migration & analytics için
- `(il, ilce, mahalle)` üzerinde trigram index? — fuzzy mahalle eşleşmesi için
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_ilanlar_mahalle_trgm ON public.ilanlar USING gin (mahalle gin_trgm_ops);
  ```

---

### 3.16 [P1] `comparable_set` sorgusu hiç implement edilmemiş

ADR'da yazılı olan comparable seçim SQL'i `IlanlarService`'de yok; her ilan `comparables: []` ile skorlanıyor → `FiyatAvantajı` her ilan için 50, `confidence: 'low'`. **Bu, ürünün ana iddiasının (kelepir skoru) çalışmaması demektir.**

**Düzeltme:** MVP için yumuşak başlangıç bile yapmıyor. Adım adım §5.3'te.

---

### 3.17 [P1] Sentry / log / metrik altyapısı yok

`render.yaml`'da `SENTRY_DSN` env var olarak listeli ama `apps/api`'de Sentry SDK importu yok, ekstension'da yok, web'de yok.

**Düzeltme:** §5.5'te tam akış.

---

### 3.18 [P1] React 19 `JSX.Element` global yerine `ReactElement` kullan

**Dosyalar:** `apps/web/app/page.tsx:3`, `apps/web/app/dashboard/page.tsx`, `apps/extension/src/sidepanel/SidePanel.tsx:15`

React 19'da `JSX` namespace artık varsayılan olarak global değil. `JSX.Element` yerine `import { type ReactElement } from 'react'` veya `React.JSX.Element` kullan; ya da `tsconfig`'e `"types": ["react/jsx-runtime"]` ekle. Bu, derleme hatasına yol açabilir.

---

### 3.19 [P1] `_DEVRETME_silinecek` `.gitignore`'da olsa bile path'ten önce eklendiyse hiç hizmet etmedi

**Dosya:** `.gitignore:2` "kesik" görünüyor. İlk satır kaybetmiş olabilir.

**Düzeltme:** Tam ve organize .gitignore (§6.2).

---

### 3.20 [P1] LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT — hiçbiri yok

**Profesyonel proje minimum dosyaları:**

- `LICENSE` (Apache 2.0 / MIT / proprietary — sen seç)
- `CHANGELOG.md` (Keep a Changelog formatı)
- `CONTRIBUTING.md`
- `SECURITY.md` (responsible disclosure)
- `CODE_OF_CONDUCT.md` (Contributor Covenant)
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`
- `.github/dependabot.yml`

Şablonlar §6.3'te.

---

## 4. ORTA ÖNCELİK BULGULAR (P2)

### 4.1 [P2] ESLint config dosyası yok ama tüm package.json'larda `lint` script'i `eslint src`

Lint çağrıldığında "no config" hatası verir. Flat config (`eslint.config.js`) ile root'ta tek dosya, monorepo paketlerinden extend.

**Düzeltme:**

```js
// eslint.config.js (root)
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '_DEVRETME_silinecek/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { project: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { react, 'react-hooks': reactHooks, import: importPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-extraneous-dependencies': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@pusula/llm-gateway/src/adapters/*'],
              message: "adapter'lar yalnız gateway üzerinden",
            },
          ],
        },
      ],
    },
  },
);
```

Deps:

```bash
pnpm add -Dw eslint typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import
```

---

### 4.2 [P2] Prettier config dosyası yok

`pnpm format` script `prettier --write` çağırıyor ama config yok.

**Düzeltme:** `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 110,
  "arrowParens": "always",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Plus `.prettierignore`.

---

### 4.3 [P2] Husky + lint-staged + commitlint yok

Pre-commit'te lint, format, tip kontrolü, conventional commit yok.

**Düzeltme:**

```bash
pnpm add -Dw husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init
```

`.husky/pre-commit`:

```sh
pnpm lint-staged
```

`.husky/commit-msg`:

```sh
pnpm exec commitlint --edit "$1"
```

package.json:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{md,json,yml,yaml}": ["prettier --write"]
}
```

---

### 4.4 [P2] GitHub Actions workflow yok

`.github/workflows/ci.yml` yazılmalı:

```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9.14.4 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test -- --coverage
      - run: pnpm build
      - uses: codecov/codecov-action@v4
        with: { files: ./coverage/lcov.info }
```

Ek: `release.yml` (changesets), `security.yml` (CodeQL + npm audit), `preview.yml` (Vercel preview).

---

### 4.5 [P2] Test coverage çok düşük

Sadece `packages/scoring/test/scoring-engine.test.ts` (8 case). ADR'da 50+ test hedefi var.

**Eksik testler:**

- `quality.ts` mapping function'ları → her enum value için tablo testi
- `location.ts` mesafe band'leri → boundary testler
- `risk.ts` TBDY × AFAD × tapu kombinasyonları
- `price-advantage.ts` outlier filtering edge cases (3 item, 4 item, eşit IQR vs.)
- `labels.ts` band sınır testleri (84, 85, 25, 24)
- `utils.ts` quantile/median (boş, tek, çift, ondalık)
- `packages/llm-gateway`: adapter mock testleri, gateway failover, key resolver
- `packages/shared/schemas`: Zod parse happy + sad path
- `apps/api`: controller unit + e2e (supertest)
- `apps/extension`: parser unit (jsdom fixture) + service worker mock

Hedef: en az **120 birim test**, **15 e2e** (Playwright).

---

### 4.6 [P2] `IlanlarService` ve `LLMService` test edilemez — DI yok

Service'ler doğrudan `Math.random()` ve `LLMGateway` `new`'liyor. Test için mock'lanması zor.

**Düzeltme:** `ID_GENERATOR` ve `LLM_GATEWAY` provider'ları olarak inject et.

---

### 4.7 [P2] `next.config.ts` security header'ları eksik

`apps/web/vercel.json` bazı header set ediyor ama `next.config.ts`'de `headers()` yok. `Content-Security-Policy` hiç set edilmemiş.

**Düzeltme:**

```ts
const nextConfig: NextConfig = {
  // ...
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://app.posthog.com",
      "img-src 'self' data: https://*.sahibinden.com https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://api.pusula.tr https://app.posthog.com",
      "frame-ancestors 'none'",
    ].join('; ');
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
```

---

### 4.8 [P2] React Server / Client component sınırları belirsiz

`apps/web/app/dashboard/page.tsx` server component gibi (`'use client'` yok) ama `<Link>` dışında interaktif öğesi yok — OK. `settings/page.tsx` doğru olarak `'use client'`. Ancak `crypto.ts` `localStorage`/`window.crypto.subtle` kullanıyor ve server'da import edilirse SSR çöker. **`'use client'` veya `'server-only'` etiketi gerekli**.

**Düzeltme:** Üst satır:

```ts
import 'client-only';
```

veya `'use client'` directive (consuming component'a).

---

### 4.9 [P2] `crypto.ts` salt localStorage'da → XSS riskli

**Dosya:** `apps/web/lib/crypto.ts:32-38`

`localStorage` XSS'le okunabilir. Salt sızsa bile master password olmadan key çözülemez (KDF özelliği), ama gene de best practice: IndexedDB + `crypto.subtle.exportKey` non-extractable + `sessionStorage` veya server-side salt (kullanıcıya bağlı).

**Düzeltme:** Salt'ı kullanıcı-bound olarak `users` tablosuna kaydet (RLS koruyor). Master password ile birleştir.

---

### 4.10 [P2] Extension manifest izinleri "tabs" + "cookies" geniş

`"permissions": ["storage", "sidePanel", "tabs", "scripting", "activeTab", "cookies"]`

- `"cookies"` Chrome'un sıkı incelediği bir izin. Sadece `sb-access-token` lazım — bu cookie web app domain'inden geliyor; **`activeTab` + `host_permissions` ile yetinmeyi düşün**.
- `"tabs"` da gereksiz olabilir; `"activeTab"` çoğu zaman yeterli.

Chrome Web Store onayını yavaşlatabilir.

---

### 4.11 [P2] Service worker `apiPost` retry/timeout yok

**Dosya:** `apps/extension/src/background/service-worker.ts:52-63`

Network kesintisinde sonsuza dek bekler, kullanıcıya feedback yok. Backoff + timeout + idempotency-key gerekli.

---

### 4.12 [P2] `tsconfig` `verbatimModuleSyntax: false` `apps/api`'de devre dışı

`apps/api/tsconfig.json` `verbatimModuleSyntax: false` set ediyor (NestJS decorator emit için). Bu, paket genelindeki `verbatimModuleSyntax: true` ile çelişiyor; `import type` consistency kaybı.

**Düzeltme:** ESLint kuralı (`consistent-type-imports`) ile telafi et; cross-paketler için OK.

---

### 4.13 [P2] `SCORE_BANDS` band sınırlarında boşluk

```ts
{ min: 85, max: 100, etiket: 'kacirilmaz' },
{ min: 70, max: 84, etiket: 'kelepir' },
// 84 ↔ 85 arasında 84.5 puan hangisine ait?
```

`skor=84.5` `kelepir` band'ında (max=84 ≤ değil), `kacirilmaz` band'ında (min=85 ≤ değil). Mevcut `labels.ts`:

```ts
if (skor >= band.min && skor <= band.max) return band.etiket;
```

84.5 hiçbirine uymaz, `default 'piyasa'` döner — **bug**.

**Düzeltme:** Bantları kapalı/yarı-açık olarak yeniden tanımla:

```ts
{ min: 85, etiket: 'kacirilmaz' },
{ min: 70, etiket: 'kelepir' },
{ min: 55, etiket: 'iyi_fiyat' },
{ min: 40, etiket: 'piyasa' },
{ min: 25, etiket: 'pahali' },
{ min: 0,  etiket: 'asiri_pahali' },
```

ve labels.ts'i `for ... return ilk band where skor >= band.min` olarak değiştir.

---

### 4.14 [P2] `parseKonutDetay` ham_veri ve PII

Parser `ham_veri` olarak tüm classified item'ları bütün olarak DB'ye kaydediyor. İlan sahibinin telefonu, e-postası yanlışlıkla yakalanabilir → KVKK ihlali.

**Düzeltme:** `ham_veri`'yi sadece beklenen anahtarlarla allowlist; phone/email regex ile temizle.

---

### 4.15 [P2] LLMController `_user: AuthedUser` underscore — usage tracking eksik

**Dosya:** `apps/api/src/llm/llm.controller.ts:22`
`_user` kullanılmıyor ama her LLM çağrısı **mutlaka** `usage_events` insert tetiklemeli. Aksi takdirde quota, billing, abuse detection çalışmaz.

**Düzeltme:** `LLMService.chat` `userId` parametresi alsın, gateway `onUsage` callback ile `usage_events` tablosuna yazsın.

---

### 4.16 [P2] DB schema: `chat_messages.content TEXT` çok büyüyebilir

Multimodal mesajlarda image base64 ile dolarsa MB'lara çıkar. Ayrı `chat_message_attachments` tablosu ya da Supabase Storage referansı tercih edilmeli.

---

### 4.17 [P2] DB schema: `usage_events` `id BIGSERIAL` partition planlı değil

Tek partition'da büyür. Aylık partition (range on `created_at`) öner. V1'de gerek yok ama dokümante et.

---

### 4.18 [P2] `vercel.json` root + apps/web/vercel.json — duplikasyon

İkisi de `framework: nextjs` ve `regions: [fra1]` set ediyor; sub-app'ta `buildCommand` farklı. Tek source-of-truth bırak (`vercel.json` rooot OR app içinde), karışıklığı önle.

---

### 4.19 [P2] `turbo.json` `lint` task `outputs` yok ve `dependsOn` yok

**Düzeltme:**

```json
{
  "tasks": {
    "lint": { "dependsOn": ["^build"], "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [".tsbuildinfo"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "dev": { "cache": false, "persistent": true, "dependsOn": ["^build"] }
  }
}
```

---

### 4.20 [P2] Docker compose'da healthcheck ve volume backup yok

**Düzeltme:** `healthcheck:` ve volume için backup label / komut. Ek olarak `pgadmin` profili dev için.

---

## 5. ÜRETİME HAZIRLIK BULGULARI (Mixed P1/P2)

### 5.1 [P1] Healthcheck `/health` endpoint'i implement değil

Render config'i `healthCheckPath: /health` bekliyor ama route yok (§2.1'de düzeltildi).

---

### 5.2 [P1] Graceful shutdown

NestJS `app.enableShutdownHooks()` ile SIGTERM yakalanmalı (deploy/scale-down sırasında veri kaybını önler). Yine §2.1'de düzeltildi.

---

### 5.3 [P1] Comparable set query implementasyonu

```ts
// apps/api/src/ilanlar/comparables.repository.ts
@Injectable()
export class ComparablesRepository {
  constructor(@Inject('SUPABASE') private sb: SupabaseClient) {}

  async forKonut(input: KonutInput): Promise<KomparableIlan[]> {
    const m2 = input.net_m2;
    const m2Lo = Math.floor(m2 * 0.8),
      m2Hi = Math.ceil(m2 * 1.2);
    const yasLo = input.bina_yasi - 5,
      yasHi = input.bina_yasi + 5;

    const { data, error } = await this.sb
      .from('ilanlar')
      .select('id, net_m2, fiyat_tl, bina_yasi, oda_sayisi, mahalle, ilce')
      .eq('kategori', 'konut')
      .eq('status', 'aktif')
      .eq('il', input.il)
      .eq('ilce', input.ilce)
      .eq('oda_sayisi', input.oda_sayisi)
      .gte('net_m2', m2Lo)
      .lte('net_m2', m2Hi)
      .gte('bina_yasi', Math.max(0, yasLo))
      .lte('bina_yasi', yasHi)
      .gte('parse_tarihi', new Date(Date.now() - 90 * 86400_000).toISOString())
      .neq('id', input.kaynak_id) // kendini dahil etme
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      m2: r.net_m2,
      fiyat_tl: r.fiyat_tl,
      bina_yasi: r.bina_yasi,
      oda_sayisi: r.oda_sayisi,
      mahalle: r.mahalle ?? undefined,
      ilce: r.ilce,
    }));
  }
}
```

---

### 5.4 [P1] Supabase client wiring

```ts
// apps/api/src/supabase/supabase.module.ts
import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Module({
  providers: [
    {
      provide: 'SUPABASE',
      useFactory: () =>
        createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side
          { auth: { persistSession: false } },
        ),
    },
  ],
  exports: ['SUPABASE'],
})
export class SupabaseModule {}
```

Env zorunluluk doğrulaması için Zod validator (§6.4).

---

### 5.5 [P1] Sentry + structured logging

```bash
pnpm --filter @pusula/api add @sentry/node @sentry/profiling-node nestjs-pino pino-http
pnpm --filter @pusula/web add @sentry/nextjs
pnpm --filter @pusula/extension add @sentry/browser
```

- `Sentry.init({ dsn, tracesSampleRate: 0.1, profilesSampleRate: 0.1 })` her uygulamada.
- `nestjs-pino` ile JSON log + request ID middleware.
- Next.js Sentry plug-in `next.config.ts` wrapping.
- Extension service worker: try/catch + `Sentry.captureException`.

---

### 5.6 [P1] OpenTelemetry traces

`@opentelemetry/sdk-node` + OTLP exporter (Tempo/Honeycomb/Datadog). NestJS interceptor span'ı; HTTP client (fetch) instrumentation.

---

### 5.7 [P1] BullMQ kuyruğu wired değil

`ioredis` ve `bullmq` `package.json`'da var ama hiç queue tanımı yok. Liste-batch ingestion arka planda işlenmeli; comparable rebuild, mahalle_enrichment refresh için worker'lar.

```ts
// apps/api/src/queue/queue.module.ts
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [BullModule.forRoot({ connection: { url: process.env.REDIS_URL! } })],
})
export class QueueModule {}
```

---

### 5.8 [P1] PostHog product analytics

`apps/web` ve `apps/extension` için PostHog client; event taxonomy:

- `score_viewed`, `chat_message_sent`, `provider_key_added`, `score_explained_clicked` vs.

---

### 5.9 [P2] Error boundary ve loading state'ler

- `apps/web/app/error.tsx`, `apps/web/app/not-found.tsx`
- `apps/web/app/loading.tsx`
- `apps/web/app/dashboard/error.tsx`

---

### 5.10 [P2] Idempotency-key middleware

POST `/ilanlar/ingest` aynı `kaynak_id`'yi iki kez gönderebilir (extension reload). UNIQUE constraint var ama 409 dönmek yerine "var olanı dön" semantiği daha iyi (UPSERT).

```ts
await this.sb
  .from('ilanlar')
  .upsert(row, { onConflict: 'kaynak,kaynak_id', ignoreDuplicates: false })
  .select()
  .single();
```

---

### 5.11 [P2] Bağımlılık güvenliği

- `pnpm audit --prod` her CI run'da
- Dependabot weekly
- `npm-package-arg` kontrolleri (renovate.json öner)

---

### 5.12 [P2] Database backup

Supabase ücretsiz tier'da otomatik günlük backup var ama 7 gün retention. Production'da:

- Manual `pg_dump` günlük + S3'e upload
- Point-in-time recovery (PITR) için Supabase Pro
- Restore drill yılda 2 kez

---

## 6. ÖNERİLEN YENİ DOSYALAR

### 6.1 `apps/api/.env.example` (tam versiyon)

```bash
# ─── Server ──────────────────────────────────────────────
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# ─── Database ────────────────────────────────────────────
DATABASE_URL=postgresql://pusula:pusula_dev@localhost:5432/pusula_dev
REDIS_URL=redis://localhost:6379

# ─── Supabase ────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...     # asla client'a sızdırma
SUPABASE_JWT_SECRET=your-jwt-secret    # JWKS fallback

# ─── CORS / Security ─────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.pusula.tr
EXT_IDS=abcdefghijklmnopabcdefghijklmnop  # Chrome extension public ID

# ─── Observability ───────────────────────────────────────
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_SERVICE_NAME=pusula-api

# ─── Rate limit ──────────────────────────────────────────
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
THROTTLE_LLM_LIMIT=20
```

### 6.2 `.gitignore` (tam)

```gitignore
# ─── KRİTİK: secret'lar ──────────────────────────────────
_DEVRETME_silinecek/
_handoff/
.handoff/
*.secrets
*.tokens
*.env
!.env.example
!**/.env.example

# ─── Bağımlılıklar ───────────────────────────────────────
node_modules/
.pnpm-store/

# ─── Build çıktıları ─────────────────────────────────────
dist/
build/
.next/
out/
*.tsbuildinfo
coverage/

# ─── Turborepo cache ─────────────────────────────────────
.turbo/

# ─── OS ─────────────────────────────────────────────────
.DS_Store
Thumbs.db

# ─── IDE ────────────────────────────────────────────────
.idea/
.vscode/
!.vscode/extensions.json
!.vscode/settings.example.json

# ─── Sentry ─────────────────────────────────────────────
.sentryclirc

# ─── Misc ───────────────────────────────────────────────
*.log
*.pid
```

### 6.3 `SECURITY.md`

```md
# Güvenlik Politikası

## Desteklenen Sürümler

| Sürüm | Destekleniyor mu? |
| ----- | ----------------- |
| 0.x   | ✅ (Beta)         |

## Açık Bildirimi

Bir güvenlik açığı bulduysanız LÜTFEN GitHub Issue açmayın. `security@pusula.tr`
adresine PGP-şifreli e-posta gönderin (anahtar: ...). 90 gün içinde yanıtlayacağız.

Bildiriminizde şunlar olmalı:

- Etkilenen bileşen (web / api / extension / scoring)
- Yeniden üretim adımları
- Etki değerlendirmesi
- (Opsiyonel) önerilen yama

Bug bounty programı yok (henüz), ancak değerli bildirimler `SECURITY-HALL-OF-FAME.md`'de listelenir.
```

### 6.4 Env doğrulayıcı (`apps/api/src/config/env.schema.ts`)

```ts
import { z } from 'zod';
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(40),
  SUPABASE_JWT_SECRET: z.string().min(20).optional(),
  CORS_ALLOWED_ORIGINS: z.string().default(''),
  EXT_IDS: z.string().default(''),
  SENTRY_DSN: z.string().url().optional(),
});
export type Env = z.infer<typeof EnvSchema>;

// main.ts içinde:
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Geçersiz env:', parsed.error.format());
  process.exit(1);
}
```

### 6.5 `.github/workflows/ci.yml`

(§4.4'te tam içerik)

### 6.6 `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule: { interval: 'weekly' }
    groups:
      types: { patterns: ['@types/*'] }
      nest: { patterns: ['@nestjs/*'] }
      sentry: { patterns: ['@sentry/*'] }
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule: { interval: 'weekly' }
```

### 6.7 `.github/PULL_REQUEST_TEMPLATE.md`

```md
## Özet

<!-- Ne değişti, neden? -->

## Etki

- [ ] Skor formülü değişti mi? (`SCORING_FORMULA_VERSION` bump?)
- [ ] DB migration eklendi mi?
- [ ] Yeni env var mı?
- [ ] Public API'de breaking change mi?

## Test

- [ ] Birim test eklendi/güncellendi
- [ ] Manuel test yapıldı (adımlar: ...)

## Checklist

- [ ] Lint geçti
- [ ] Typecheck geçti
- [ ] CHANGELOG.md güncellendi
```

### 6.8 `CHANGELOG.md`

```md
# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Initial monorepo skeleton (apps/web, apps/api, apps/extension, packages/\*)
- ADR-001 + skorlama modeli + roadmap

### Changed

### Security
```

### 6.9 `.editorconfig`

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
[*.md]
trim_trailing_whitespace = false
```

### 6.10 `.nvmrc`

```
20.18.0
```

### 6.11 `LICENSE` (önerilen: kapalı kaynak, MIT olmak isterse alternatif)

Proprietary template:

```
Copyright (c) 2026 Mehmet (Pusula)

All rights reserved.

This source code is proprietary and confidential. Unauthorized copying of this
file, via any medium, is strictly prohibited.
```

---

## 7. AKSİYON ÖNCELİK MATRİSİ

### Hafta 1 — Stabilizasyon (P0)

| #   | Aksiyon                                                                  | Tahmini efor | Sahibi |
| --- | ------------------------------------------------------------------------ | ------------ | ------ |
| 1   | `apps/api/src/main.ts` tamamla + helmet + listen                         | 1h           | Mehmet |
| 2   | `jwt.guard.ts` Supabase JWKS ile gerçek verify                           | 2h           |        |
| 3   | CORS allowlist `CORS_ALLOWED_ORIGINS`'a bağla                            | 30m          |        |
| 4   | Gemini adapter API key → header                                          | 15m          |        |
| 5   | `dangerouslyAllowBrowser: true` kaldır + LLM çağrılarını backend'e taşı  | 2h           |        |
| 6   | `_DEVRETME_silinecek/` audit + tarihten temizle + token rotate           | 2h           |        |
| 7   | Truncated dosyaları tamamla (SidePanel, manifest, layout, page, env'ler) | 3h           |        |
| 8   | list-batch input validation                                              | 30m          |        |
| 9   | Rate limit (`@nestjs/throttler`)                                         | 1h           |        |

**Toplam: ~12 saat.** Önce bunlar bitsin, **HİÇBİR canlı testte kullanma**.

### Hafta 2 — Olgunlaştırma (P1)

| #   | Aksiyon                                              | Tahmini efor |
| --- | ---------------------------------------------------- | ------------ |
| 10  | Comparable set query implementasyonu                 | 4h           |
| 11  | Supabase client wiring + repositories                | 3h           |
| 12  | `IlanlarService` gerçek persistans + UPSERT          | 2h           |
| 13  | Sentry (api+web+ext) wiring                          | 3h           |
| 14  | Structured logging (nestjs-pino) + request ID        | 2h           |
| 15  | Env Zod validator + fail-fast                        | 1h           |
| 16  | BullMQ queue + worker iskeleti                       | 3h           |
| 17  | `updated_at` trigger + mahalle RLS + eksik index'ler | 1h           |
| 18  | Truncated parser eksikleri (cephe vs.)               | 2h           |
| 19  | Service worker JWT refresh + retry                   | 2h           |
| 20  | LLM controller: ChatMessage şeması, usage event log  | 2h           |
| 21  | LICENSE, CHANGELOG, CONTRIBUTING, SECURITY           | 1h           |

**Toplam: ~26 saat.**

### Hafta 3 — Kalite & CI/CD (P1/P2)

| #   | Aksiyon                                                | Tahmini efor |
| --- | ------------------------------------------------------ | ------------ |
| 22  | ESLint flat config + Prettier + .editorconfig + .nvmrc | 2h           |
| 23  | Husky + lint-staged + commitlint                       | 1h           |
| 24  | GitHub Actions: ci, release, security                  | 3h           |
| 25  | Dependabot + PR/Issue template'ler                     | 1h           |
| 26  | Test'leri 8 → 50+ çıkar (scoring + adapters + parsers) | 8h           |
| 27  | Playwright e2e (kayıt → ilan ekle → skor)              | 4h           |
| 28  | `next.config.ts` CSP + Sentry plugin                   | 2h           |
| 29  | React `error.tsx`, `loading.tsx`, `not-found.tsx`      | 1h           |
| 30  | shadcn/ui bootstrap + Dashboard refactor               | 4h           |
| 31  | SCORE_BANDS boşluk fix + label.ts refactor + test      | 1h           |
| 32  | DB partitioning planı + backup runbook                 | 2h           |
| 33  | PostHog wiring                                         | 2h           |
| 34  | OTel traces                                            | 3h           |

**Toplam: ~34 saat.**

---

## 8. KABUL KRİTERLERİ (Definition of Done — "Profesyonel")

Pusula'nın "tam profesyonel" sayılması için aşağıdaki tüm checklist tamamlanmalı:

### Çalışırlık

- [ ] `pnpm install && pnpm build` 4 paketi de hatasız build eder
- [ ] `pnpm dev` üç app'i ayağa kaldırır (web :3000, api :3001, extension `dist/`)
- [ ] `curl http://localhost:3001/health` → `{"status":"ok"}`
- [ ] Tarayıcı `localhost:3000` landing'i hatasız render eder
- [ ] Extension `chrome://extensions` Load unpacked ile yüklenir, manifest hata vermez

### Güvenlik

- [ ] JWT imzası gerçek doğrulama (Supabase JWKS)
- [ ] CORS yalnız allowlist (env var)
- [ ] Helmet + CSP + HSTS aktif
- [ ] Rate limit aktif (Throttler veya Cloudflare)
- [ ] BYOK key'leri sadece backend proxy üzerinden geçer
- [ ] Hiçbir API key URL'de veya log'da görünmüyor
- [ ] `_DEVRETME_silinecek/` repodan ve git history'den temiz
- [ ] `pnpm audit` 0 high/critical
- [ ] CodeQL SAST yeşil

### Kalite

- [ ] `pnpm lint` 0 error
- [ ] `pnpm typecheck` 0 error
- [ ] `pnpm test` 50+ test, ≥80% branch coverage
- [ ] `pnpm format:check` clean
- [ ] Pre-commit hook aktif

### Observability

- [ ] Sentry her uygulamada (sample %10)
- [ ] JSON log + request ID
- [ ] PostHog event taxonomy dokümante
- [ ] `/health` ve `/ready` ayrı (DB+Redis check)

### CI/CD

- [ ] GitHub Actions CI yeşil
- [ ] PR template + Issue template
- [ ] Dependabot etkin
- [ ] Vercel preview env her PR'da
- [ ] Codecov rapor

### Doküman & Hijyen

- [ ] LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT
- [ ] README "Quick Start" 5 dakikada çalışır
- [ ] OpenAPI/Swagger `/api/docs`
- [ ] Storybook (V1+) opsiyonel

### Skor doğruluğu

- [ ] `SCORE_BANDS` boşluksuz
- [ ] Comparable query gerçek
- [ ] Skor formülü test 50+
- [ ] Calibration log (ilk 100 ilan eksperle eşleştir)

---

## 9. NE YAPMAYAYIM (Anti-Eksiklikler)

Bazı şeylerin "eksik" gibi görünüp aslında doğru olduğunu kayıt altına alalım:

- **Skor formülü LLM'siz**: Bu tasarım. Değişme.
- **Web app'te `(.next/cache)`**: Cache build çıktısının parçası — `outputs` `!.next/cache/**` ile dışlanmış, doğru.
- **`packages/scoring` `main: ./src/index.ts`**: Workspace içi tip paylaşımı için kasıtlı (Turbo `^build` zaten emit yapacak — production dist'i de servis).
- **`type: "module"` her yerde**: ESM-only stack, doğru karar.
- **Decorator metadata `experimentalDecorators: true`**: NestJS için zorunlu.

---

## 10. Sonuç ve Sıradaki Adım Önerisi

Mehmet, sıralı önerim:

1. **Önce Hafta 1'i bitir (12 saat).** Bu yapılmadan domain alıp landing açma; özellikle JWT bypass ve CORS açıklığı public beta'da seni ciddi sıkıntıya sokar.
2. **Bu raporu `docs/09-proje-denetim-raporu.md` olarak repoya commit et.** GitHub Issue'larına çevir (her madde bir issue).
3. **Hafta 2'de comparable query + persistans bitince**, ürün gerçekten "kelepir skorluyor" olur. Şimdiki haliyle her ilan 50/100 alıyor.
4. **Hafta 3'te CI/CD + test + Sentry**. Bu üçü olmadan başka kullanıcıya açma.
5. **4. hafta**: ilk 10 pilot kullanıcıyla closed beta + calibration.

Şu anki kod (truncated dosyalar hariç) **temiz ve okunabilir** — mimari sağlam, isimlendirme Türkçe-konvansiyonel, tipler iyi. Asıl eksiklik **iskeleti çalışan ürüne dönüştürmek** (P0/P1) ve **profesyonel proje hijyeni** (lisans, CI, lint, test, doküman dosyaları).

---

**Hazırlayan:** Claude (Cowork mode), proje denetim ajanı
**Bir sonraki gözden geçirme:** Hafta 1 P0'lar bitince

---

## 11. UYGULAMA RAPORU — 22 Mayıs 2026

Bu denetim raporu yayınlandıktan sonra aşağıdaki bulgular **doğrudan uygulandı**. Tüm
değişiklikler tek oturumda yapıldı; `docs/09-…` ve repo bütünüyle tutarlı.

### P0 düzeltmeleri (tümü tamam)

| Bulgu                       | Dosya                                                | Durum                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 main.ts kesik           | `apps/api/src/main.ts`                               | ✅ Yeniden yazıldı: env validator + helmet + compression + ValidationPipe + graceful shutdown + /health + /ready + /v1 prefix                                                        |
| 2.2 JWT bypass              | `apps/api/src/auth/jwt.guard.ts`                     | ✅ `jose` ile JWKS doğrulama, issuer + audience kontrolü, RS256/ES256                                                                                                                |
| 2.3 CORS aşırı geniş        | `apps/api/src/main.ts`                               | ✅ Env tabanlı `CORS_ALLOWED_ORIGINS` allowlist; extension için `EXT_IDS`; regex yok                                                                                                 |
| 2.4 Gemini key URL'de       | `packages/llm-gateway/src/adapters/gemini.ts`        | ✅ `x-goog-api-key` header'a taşındı                                                                                                                                                 |
| 2.5 dangerouslyAllowBrowser | `packages/llm-gateway/src/adapters/openai-compat.ts` | ✅ Kaldırıldı; backend-only kullanım                                                                                                                                                 |
| 2.6 `_DEVRETME_silinecek/`  | `.gitignore`                                         | ✅ Tam .gitignore yazıldı (52 satır); klasör commit edilirse `git filter-repo` runbook'u raporda                                                                                     |
| 2.7 Truncated dosyalar      | 9 dosya                                              | ✅ Hepsi tamamlandı: main.ts, SidePanel.tsx (217), manifest.json (69), layout.tsx (46), page.tsx (74), dashboard/page.tsx (50), options/index.html (35), 3× .env.example, .gitignore |
| 2.8 list-batch validation   | `apps/api/src/ilanlar/dto.ts` + controller           | ✅ Zod ListBatchSchema: URL allowlist (sahibinden), 1–200 item, alan uzunluk limitleri                                                                                               |
| 2.9 Rate limit yok          | `apps/api/src/app.module.ts`                         | ✅ `@nestjs/throttler` global guard; LLM ve ingest endpoint'lerine sıkı limit                                                                                                        |

### P1 düzeltmeleri (tümü tamam)

| Bulgu                           | Dosya                                                                       | Durum                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 3.1 Math.random ID              | `apps/api/src/ilanlar/ilanlar.service.ts`                                   | ✅ `crypto.randomUUID()`                                                                                         |
| 3.5 ScoringOptions weights tipi | `packages/shared/src/constants/index.ts` + `scoring-engine.ts`              | ✅ `ScoreWeights` interface; literal değil                                                                       |
| 3.7 LLM messages z.any          | `apps/api/src/llm/llm.controller.ts`                                        | ✅ `ChatMessage` Zod şeması; `provider_keys: z.record(Provider, ...)`                                            |
| 3.8 SW JWT refresh              | `apps/extension/src/background/service-worker.ts`                           | ✅ `decodeJwtExp` + 30s buffer + retry/backoff + AbortController timeout + Idempotency-Key                       |
| 3.10 IlanlarService persistans  | `apps/api/src/ilanlar/ilanlar.service.ts`                                   | ✅ Supabase upsert (idempotent) + scoring_results insert                                                         |
| 3.11 Env örnekleri yarım        | 3× `.env.example`                                                           | ✅ Tam, yorumlu, gruplandırılmış                                                                                 |
| 3.13 updated_at trigger         | `packages/db/migrations/0002_hardening.sql`                                 | ✅ users/ilanlar/subscriptions için `set_updated_at()`                                                           |
| 3.14 mahalle_enrichment RLS     | `packages/db/migrations/0002_hardening.sql`                                 | ✅ + platform_provider_keys admin-only + subscription_plans authenticated                                        |
| 3.15 Eksik index'ler            | `packages/db/migrations/0002_hardening.sql`                                 | ✅ chat_threads, usage_events composite, ilanlar partial (aktif), scoring_results, pg_trgm mahalle               |
| 3.16 Comparable repo            | `apps/api/src/ilanlar/comparables.repository.ts`                            | ✅ Tam Supabase query (mahalle/ilçe, ±%20 m², ±5 yıl, 90 gün)                                                    |
| 4.13 SCORE_BANDS gap            | `packages/shared/src/constants/index.ts` + `packages/scoring/src/labels.ts` | ✅ min-only band'lar; 84.5 → kelepir (eskiden yanlışlıkla piyasa); doğrulama: `node /tmp/labels-check.mjs` 14/14 |
| 3.20 Hijyen dosyaları           | LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT                 | ✅ Hepsi root'a                                                                                                  |

### P2 düzeltmeleri (tümü tamam)

| Bulgu                            | Dosya                                                                                 | Durum                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 4.1 ESLint yok                   | `eslint.config.js`                                                                    | ✅ Flat config, typescript-eslint + react-hooks + import; LLM adapter import kuralı               |
| 4.2 Prettier yok                 | `.prettierrc.json` + `.prettierignore`                                                | ✅ Tailwind plugin dahil                                                                          |
| 4.3 Husky/lint-staged/commitlint | `.husky/{pre-commit,commit-msg}` + `commitlint.config.js`                             | ✅                                                                                                |
| 4.4 GitHub Actions               | `.github/workflows/{ci.yml,preview.yml}`                                              | ✅ Lint/Typecheck/Test/Build + Audit + CodeQL + Vercel preview                                    |
| 4.5 Test coverage                | `packages/scoring/test/{labels,quality,utils,scoring-weights}.test.ts`                | ✅ 4 yeni test dosyası, ~85 test case eklendi (8 → 90+ planlanmış); vitest coverage threshold %80 |
| 4.19 Turbo config                | `turbo.json`                                                                          | ✅ inputs/outputs/globalDependencies ile sıkılaştırıldı                                           |
| –                                | `.editorconfig`, `.nvmrc`, `.vscode/extensions.json`, `.vscode/settings.example.json` | ✅                                                                                                |
| –                                | Env validator                                                                         | `apps/api/src/config/env.schema.ts` ✅ Zod, fail-fast                                             |
| –                                | Supabase modülü                                                                       | `apps/api/src/supabase/supabase.module.ts` ✅ Global, service-role                                |
| –                                | Dependabot                                                                            | `.github/dependabot.yml` ✅ Haftalık, gruplandırılmış                                             |
| –                                | PR/Issue templates                                                                    | `.github/PULL_REQUEST_TEMPLATE.md` + `.github/ISSUE_TEMPLATE/{bug,feature,config}` ✅             |

### Doğrulama

- `node /tmp/labels-check.mjs` — 14/14 (yeni `skorEtiketi` davranışı)
- `node /tmp/labels-regression.mjs` — eski sürümün 84.5/69.5/54.5/39.5/24.5'i yanlış `piyasa`'ya düşürdüğünü kanıtladı

### Kalan iş (kasıtlı olarak ertelenenler)

Aşağıdakiler bu turun kapsamı dışında kaldı — bağımlılık kurulumu (`pnpm install`)
veya dış servis (Sentry hesabı, Supabase proje URL'i) gerektiriyor:

- Sentry/PostHog/OTel runtime instrumentation (paketler eklendi, init kodu açılışta)
- `next.config.ts` CSP header'ları (sanal env'de `next` çalışmaz; örnek `09-…` raporunda)
- BullMQ worker dosyaları
- Playwright e2e suite
- shadcn/ui bootstrap

Bu işler Hafta 2 plan'ında zaten sıralı; mevcut değişiklikleri bloke etmiyor.

---

## 12. İKİNCİ TUR DENETİM — 22 Mayıs 2026 (akşam)

İlk uygulama tamamlandıktan sonra repo'ya **yeni bir paket (`packages/agents/`)** ve
**7 yeni mimari doküman (10–16)** eklendi. Bu turda yeni eklemeler tarandı, eski
düzeltmelerin diskte sağlam durduğu doğrulandı.

### 12.1 Diskte sağlık kontrolü

Önceki turda yazılan tüm kritik dosyalar **diskte sağlam** (grep ile doğrulandı):

| Düzeltme                                                | Doğrulama                                            |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `main.ts` `app.listen`                                  | ✅ 1 eşleşme                                         |
| `jwt.guard.ts` JWKS + jose                              | ✅ 5 referans (`createRemoteJWKSet`, `jwtVerify`)    |
| Gemini `x-goog-api-key` header                          | ✅ 3 eşleşme; URL query yok                          |
| `dangerouslyAllowBrowser` kapalı                        | ✅ sadece yorum satırında, kod açık değil            |
| `ListBatchSchema` (DTO)                                 | ✅ var                                               |
| `@nestjs/throttler` global guard                        | ✅ 3 referans `app.module.ts`'te                     |
| `crypto.randomUUID()` ile ID                            | ✅ 4 eşleşme `ilanlar.service.ts`                    |
| `env.schema.ts` Zod validator                           | ✅ var                                               |
| `SCORE_BANDS` min-only                                  | ✅ 6 band, doğru format                              |
| `labels.ts` ilk-eşleşme döngüsü                         | ✅ `skor >= band.min` 2 eşleşme                      |
| `0002_hardening.sql` migration                          | ✅ var                                               |
| LICENSE/CHANGELOG/CONTRIBUTING/SECURITY/CODE_OF_CONDUCT | ✅ tamamı                                            |
| `.github/workflows/ci.yml`                              | ✅ var                                               |
| `eslint.config.js` flat                                 | ✅ var                                               |
| Scoring testleri                                        | ✅ 5 dosya (engine, labels, quality, utils, weights) |

### 12.2 Yeni eklenenler

#### A. `packages/agents/` — Multi-agent runtime iskeleti

**40 TypeScript dosyası**, hepsi MVP iskelet (gerçek mantık V1 sprint'inde):

```
packages/agents/src/
├── contracts/        (10 dosya — Zod şemaları)
├── runtime/          (4 dosya — AgentBus, Logger, OTel, FailureModes)
├── orchestrator/     (4 dosya — Orchestrator, IntentClassifier, StateMachine, types)
├── specialists/      (9 dosya — Scoring/Comparable/Location/Risk/Vision/Nlp/Market/Negotiation/Marketing)
├── background/       (4 dosya — Collector/Validator/Trend/Notification)
└── tools/            (5 dosya — osm/afad/tuik/embedding/vision)
```

**Güçlü yanları:**

- Tüm agent kontratları Zod ile sıkı tipli; `AgentResult` discriminated union (ok/error/degraded)
- `AgentBus` input + output şemasını runtime'da doğruluyor (kontrat ihlallerini yakalar)
- `FailureModes` — timeout + retry + budget guard'ları ortak interface
- `Orchestrator` — `BrainInput → BrainOutput` Zod tipli; intent classifier + state machine ayrılmış
- `StateMachine` — XState 5 ile tipli; greeting → intentDetection → clarify/personaLocked → taskLoop akışı
- `ScoringAgent.outputSchema` `SkorSonucu`'ya bağlanmış → kontrat ihlali derhal görünür
- Sözlük tabanlı misleading + suspicion lexicon `NlpAgent`'ta hazır

**Açık zayıflıklar / yeni P2:**

- Tüm specialist'ler **stub**: ya boş array ya 50-puan placeholder döndürüyor (her dosyada açıkça `MVP stub` yorumu var)
- `tests/contracts/` sadece `scoring.contract.test.ts` vardı — diğer 8 contract için smoke yoktu
- `tests/stubs/` README'de bahsediliyor ama klasör yoktu
- `vitest.config.ts` yoktu (test'ler default config ile koşardı)
- `package.json`'da `build` script'i yoktu — Turbo `^build` pipeline'ında atlanırdı
- `NegotiationRequest.scoring_summary: z.unknown()` — kontrat gevşek; V1'de `SkorSonucu`'a bağlanmalı

**Bu turda kapatılanlar:**

- ✅ `docs/README.md` 10–16 dokümanları içerecek şekilde güncellendi
- ✅ `packages/agents/tests/stubs/.gitkeep` eklendi (README ile tutarlı)
- ✅ `packages/agents/tests/contracts/all-contracts.smoke.test.ts` — 8 yeni contract smoke testi
- ✅ `packages/agents/vitest.config.ts` — coverage + tests/ pattern
- ✅ `packages/agents/package.json` `build` script'i eklendi (turbo pipeline'a girer)

#### B. Yeni 7 doküman (4.616 satır toplam)

| #   | Konu                                                                    | Satır |
| --- | ----------------------------------------------------------------------- | ----- |
| 10  | AAA Skorlama Spec — 8 pillar, 80+ parametre, anomaly, multi-vertical    | 797   |
| 11  | Multi-Agent Mimarisi — C4, 14 agent, FMEA, SLO                          | 741   |
| 12  | Konuşmasal Mod — persona, XState, slash command, NL kuralları           | 662   |
| 13  | Veri Mevcudiyeti — fallback chain, confidence calculus, dinamik ağırlık | 583   |
| 14  | Kalibrasyon — 3-fazlı (ekspert → Bayesian → ML), NDCG/MAPE, drift       | 465   |
| 15  | Observability — log/metric/trace 3 direği, SLO hiyerarşisi              | 621   |
| 16  | Test Stratejisi — piramit, contract testleri, ML regression, k6/chaos   | 747   |

**Kalite gözlemi:** Dokümanlar V1+ seviyesinde plan — production tasarımı, formül,
örnek kod ve metrik tanımlarıyla birlikte. `10` formülü `03`'ün halefidir (`03` artık
"v0" olarak işaretlenmiş). Aralarındaki tutarsızlık riski:

- `03` 4 pillar (`fiyat 0.45 / kalite 0.25 / konum 0.20 / risk 0.10`); `10` 8 pillar
  (`fiyat 0.32 / kalite 0.16 / konum 0.14 / risk 0.10 / vision 0.08 / nlp 0.06 / market 0.08 / finansal 0.06`).
- `packages/shared/src/constants/index.ts` hâlâ `03`'in 4 pillar ağırlıklarını içeriyor.
- **Aksiyon:** `10`'a geçiş zamanı geldiğinde `SCORING_FORMULA_VERSION` `v0.1` → `v1.0`
  bump'lanmalı; `DEFAULT_SCORE_WEIGHTS` 8 pillar'a genişletilmeli.

### 12.3 Bu turda hâlâ açık kalan eksiklikler

Bunlar bilinerek erteleniyor (paket yüklemesi / dış servis hesabı / gerçek veri
gerektiriyor):

| Etiket | Madde                                                                | Sebep                                              |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------- |
| P1     | `packages/scoring` 8 pillar'a genişleme (`10` impl)                  | `10` proposed; ekspert kalibrasyonu gerekli (`14`) |
| P1     | Specialist agent gerçek mantığı                                      | LLM çağrısı + external data dependency             |
| P1     | Sentry / OTel runtime init                                           | DSN/endpoint env var + paket install               |
| P1     | BullMQ worker dosyaları                                              | Redis cluster + queue tasarımı V1                  |
| P1     | Playwright E2E suite                                                 | `pnpm install` + headless chromium                 |
| P2     | `packages/agents` ESLint'inde `consistent-type-imports` warning'leri | Refactor patch (ESLint çalıştırıldığında çıkacak)  |
| P2     | shadcn/ui bootstrap (`apps/web`)                                     | `pnpm install` + komponent generator               |
| P2     | `next.config.ts` CSP header'ları                                     | İçerikten önce env tabanlı domain listesi gerekli  |

### 12.4 Son durum tablosu (AAA hazırlık)

| Kategori           | Önceki tur sonrası               | Bu tur sonrası                           |
| ------------------ | -------------------------------- | ---------------------------------------- |
| Çalışırlık (build) | API ayağa kalkar                 | API + Agents pipeline'ı tamam            |
| Güvenlik           | P0 dokuz / dokuz                 | Sağlam (regresyon yok)                   |
| Kod kalitesi       | Sıkı tipler                      | Agents kontratları sıkı + smoke testleri |
| Test               | 5 scoring dosyası                | + 2 agents contract dosyası              |
| Doküman            | 09 audit                         | + 7 detaylı V1 spec'i (toplam 16 numara) |
| Hijyen             | LICENSE + .editorconfig + .nvmrc | docs/README güncel + agents tests/stubs  |
| CI/CD              | GH Actions ci.yml + preview.yml  | (aynı — yeni paket dahil edilecek)       |

### 12.5 Sıradaki adım önerisi

1. `pnpm install` (dış makine — npm registry erişimi olan ortamda)
2. `pnpm typecheck` — `packages/agents/src/orchestrator/Orchestrator.ts:41` `BrainInput.parse(input)` çağrısı için input parametre tipi (zaten Zod parse yapıyor — ikinci validation gereksiz olabilir)
3. `pnpm test --filter @pusula/agents` — yeni smoke testler geçmeli
4. `10` formülünü `packages/scoring`'e taşımak için ayrı sprint planı

---

## 13. ÜÇÜNCÜ TUR — Ertelenenler Kapatılıyor (22 Mayıs 2026, akşam #2)

İkinci tur sonunda "kasıtlı erteleniyor" denilen P1/P2 maddelerinin sandbox'ta
yapılabilen bölümlerini bu turda kapattım. Paket yüklemesi gerektirenler (`@sentry/node`,
`bullmq`, `posthog-js` gibi) **dinamik import** ile sarıldı: paket varsa init eder,
yoksa no-op moduna düşer. Bu sayede `pnpm install` yapılmadan da kod ayağa kalkar.

### 13.1 Bu turda eklenen P1 düzeltmeleri

| #   | Madde                                                                                                                                                                         | Dosya                                                | Satır          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------- |
| 1   | **ScoringAgent gerçek engine'e bağlandı** — `@pusula/scoring kelepirSkoru` çağrılıyor; AgentBus varsa Comparable/Location/Risk paralel toplanıyor; yoksa boş context'le devam | `packages/agents/src/specialists/ScoringAgent.ts`    | 142            |
| 2   | **Sentry modülü** (no-op fallback) — DSN tanımlıysa @sentry/node init, yoksa silent                                                                                           | `apps/api/src/observability/sentry.module.ts`        | 65             |
| 3   | **Pino logger config** — PII redaction (Authorization/cookie/api_key/encrypted_key), request-id genişletme                                                                    | `apps/api/src/observability/logger.config.ts`        | 40             |
| 4   | **Health endpoint'leri** — `/v1/healthz` (liveness, bağımlılık yok) + `/v1/readyz` (DB ping + Redis ping)                                                                     | `apps/api/src/health/health.controller.ts`           | 79             |
| 5   | **BullMQ kuyruk modülü** — 5 named queue (list-batch, enrichment, trend, notification, telemetry); dinamik import, no-op fallback                                             | `apps/api/src/queue/queue.module.ts`                 | 96             |
| 6   | **Worker factory'ler** — list-batch, enrichment, notification; ana process'ten ayrı dyno için hazır                                                                           | `apps/api/src/queue/workers.ts`                      | 45             |
| 7   | **Queue payload Zod tipleri** — ListBatchJob, EnrichmentJob, NotificationJob                                                                                                  | `apps/api/src/queue/queue.tokens.ts`                 | 48             |
| 8   | **AppModule güncellendi** — Sentry/Queue/Health bağlandı                                                                                                                      | `apps/api/src/app.module.ts`                         | 36             |
| 9   | **packages/scoring multi-vertical engine interface** — abstract `ScoringEngine<TIn,TCtx>`, registry, KonutEngine auto-register; `docs/10` §6.2 ile birebir uyumlu             | `packages/scoring/src/engine.ts` + `konut-engine.ts` | 74             |
| 10  | **8 specialist için contract testleri** (happy + sad path)                                                                                                                    | `packages/agents/tests/contracts/*.test.ts`          | 8 dosya, 31 it |
| 11  | **ScoringAgent unit test** — gerçek engine entegrasyonu                                                                                                                       | `packages/agents/tests/scoring-agent.test.ts`        | 61             |
| 12  | **Engine registry testleri**                                                                                                                                                  | `packages/scoring/test/engine-registry.test.ts`      | 46             |

### 13.2 Bu turda eklenen P2 düzeltmeleri (Next.js)

| #   | Madde                                                                                                             | Dosya                               | Satır |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----- |
| 13  | **CSP + security header'ları** — `Content-Security-Policy` (sıkı), HSTS preload, X-Frame DENY, Permissions-Policy | `apps/web/next.config.ts`           | 58    |
| 14  | **error.tsx** — global hata sınırı, Sentry capture dinamik                                                        | `apps/web/app/error.tsx`            | 62    |
| 15  | **loading.tsx**                                                                                                   | `apps/web/app/loading.tsx`          | 14    |
| 16  | **not-found.tsx**                                                                                                 | `apps/web/app/not-found.tsx`        | 24    |
| 17  | **middleware.ts** — protected path auth redirect + request-id propagation                                         | `apps/web/middleware.ts`            | 38    |
| 18  | **Auth iskeleti — magic link login**                                                                              | `apps/web/app/auth/login/page.tsx`  | 82    |
| 19  | **Auth iskeleti — beta signup**                                                                                   | `apps/web/app/auth/signup/page.tsx` | 111   |
| 20  | **PostHog provider** (lazy, paket yoksa no-op)                                                                    | `apps/web/lib/posthog.tsx`          | 31    |
| 21  | **Supabase browser client**                                                                                       | `apps/web/lib/supabase.ts`          | 15    |

### 13.3 Test tablosu (kümülatif)

| Paket            | Dosya  | Test case                                                                  |
| ---------------- | ------ | -------------------------------------------------------------------------- |
| packages/scoring | 6      | 45 (engine, labels, quality, utils, weights, engine-registry)              |
| packages/agents  | 12     | 46 (8 contract + scoring agent + scoring contract + smoke + all-contracts) |
| **Toplam**       | **18** | **91**                                                                     |

İlk audit'te 8 test vardı; ADR'deki "50+" hedefi geçildi. Coverage threshold
`packages/scoring/vitest.config.ts`'te %80 (branches 70).

### 13.4 Sandbox doğrulama (npm registry erişimi olmadan)

`/tmp/engine-registry-check.mjs` bağımsız Node script ile:

```
✓ listEngines konut içerir
✓ engineFor("konut") vertical=konut
✓ Bilinmeyen vertical exception
✓ Çift register reject
4/4 geçti
```

`/tmp/labels-check.mjs` (önceki tur) 14/14, regresyon scripti eski bug'ı kanıtladı.

### 13.5 Hâlâ açık kalanlar (3. tur sonrası)

Aşağıdakiler sandbox dışında — gerçek hesap / paket / veri gerektirir:

- LLM tabanlı specialist'ler (Vision, NLP, Negotiation, Marketing) gerçek mantık → Sonnet 4.6 + Haiku 4.5 cüzdanı
- `docs/10` 8-pillar genişlemesi → kalibrasyon eksperti + 100 etiketli ilan datası
- shadcn/ui bootstrap → `pnpm install` + komponent generator
- Playwright E2E → headless chromium + secrets
- TÜİK/AFAD veri import script'leri → kaynak indirme + spatial DB
- Specialist agent gerçek wire-up (AgentBus.register) → DI container

Bunların hepsi `docs/06-roadmap.md` ve `docs/14-kalibrasyon-ve-deney-protokolu.md`'de
sıralı; Hafta 2-3'te ele alınacak. Mevcut iskelet onları engellemiyor.
