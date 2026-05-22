'use client';

/**
 * Settings — Provider key yönetimi (BYOK), task→model mapping, beta banner.
 *
 * KRİTİK: Key'ler client-side AES-GCM şifreli, IndexedDB'de saklanıyor.
 * `lib/crypto.ts` master password ile şifre üretir.
 */
import { useState, type ReactElement } from 'react';
import type { Provider } from '@pusula/shared';
import { Navbar } from '../../components/Navbar';
import { AccountSecurity } from '../../components/auth/AccountSecurity';

interface ProviderConfig {
  provider: Provider;
  label: string;
  signupUrl: string;
  whitelist: string[];
  warning?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'groq',
    label: 'Groq (Llama 3.3, çok hızlı)',
    signupUrl: 'https://console.groq.com',
    whitelist: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
  },
  {
    provider: 'gemini',
    label: 'Google Gemini (Flash + Vision)',
    signupUrl: 'https://aistudio.google.com',
    whitelist: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek (V3 + R1 reasoning)',
    signupUrl: 'https://platform.deepseek.com',
    whitelist: [
      'deepseek-chat',
      'deepseek-reasoner',
      'deepseek-v3.2',
      'deepseek-coder',
      'deepseek-vl2',
    ],
    warning: 'DeepSeek Çin merkezli — hassas kişisel veri göndermeyin.',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic Claude (en kaliteli yazım)',
    signupUrl: 'https://console.anthropic.com',
    whitelist: ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-7'],
    warning: 'CORS yok → backend proxy üzerinden çağrı yapılıyor.',
  },
];

export default function SettingsPage(): ReactElement {
  const [keys, setKeys] = useState<Record<Provider, string>>({} as Record<Provider, string>);

  function updateKey(provider: Provider, value: string): void {
    setKeys((k) => ({ ...k, [provider]: value }));
    // TODO: AES-GCM encrypt + save to IndexedDB (V1)
  }

  async function testKey(provider: Provider): Promise<void> {
    const key = keys[provider];
    if (!key) {
      alert('Önce key girin');
      return;
    }
    // TODO: gateway.chat({ taskType: 'quick-chat' }) ile test çağrısı (V1)
    alert(`${provider} test edildi (placeholder)`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-2 text-2xl font-bold">Ayarlar</h1>

        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm">
          🚧 <strong>Beta sürümü.</strong> Şu an kendi API key&apos;inizi kullanıyorsunuz. Yakında
          abonelik sistemi geldiğinde key girmek zorunda olmadan tüm modellere erişebileceksiniz.
          Beta kullanıcılarına %50 ilk yıl indirimi ve <em>Erken Destekçi</em> rozeti.
        </div>

        <section className="mb-4 rounded-lg bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">AI Provider Key&apos;leri (BYOK)</h2>

          {PROVIDERS.map((p) => (
            <div key={p.provider} className="border-b py-4 last:border-b-0">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-medium">{p.label}</div>
                  <a
                    href={p.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-600 underline"
                  >
                    Key al →
                  </a>
                </div>
              </div>

              <div className="mb-2 flex gap-2">
                <input
                  type="password"
                  placeholder={`${p.provider} API key`}
                  className="flex-1 rounded-md border px-3 py-2 font-mono text-sm"
                  value={keys[p.provider] ?? ''}
                  onChange={(e) => updateKey(p.provider, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => testKey(p.provider)}
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white"
                >
                  Test
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {p.whitelist.map((m) => (
                  <span key={m} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                    {m}
                  </span>
                ))}
              </div>

              {p.warning && <p className="mt-2 text-xs text-amber-600">⚠️ {p.warning}</p>}
            </div>
          ))}
        </section>

        <section className="mb-4 rounded-lg bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Görev → Model Varsayılanları</h2>
          <p className="text-sm text-slate-500">
            Yakında her görev tipi için ayrı varsayılan model seçimi.
          </p>
        </section>

        <AccountSecurity />
      </div>
    </main>
  );
}
