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
    whitelist: ['deepseek-chat', 'deepseek-reasoner'],
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
      <div className="container mx-auto px-6 max-w-3xl py-8">
        <h1 className="text-2xl font-bold mb-2">Ayarlar</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm">
          🚧 <strong>Beta sürümü.</strong> Şu an kendi API key&apos;inizi kullanıyorsunuz. Yakında
          abonelik sistemi geldiğinde key girmek zorunda olmadan tüm modellere erişebileceksiniz.
          Beta kullanıcılarına %50 ilk yıl indirimi ve <em>Erken Destekçi</em> rozeti.
        </div>

        <section className="bg-white rounded-lg p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">AI Provider Key&apos;leri (BYOK)</h2>

          {PROVIDERS.map((p) => (
            <div key={p.provider} className="border-b last:border-b-0 py-4">
              <div className="flex justify-between items-start mb-2">
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

              <div className="flex gap-2 mb-2">
                <input
                  type="password"
                  placeholder={`${p.provider} API key`}
                  className="flex-1 px-3 py-2 border rounded-md text-sm font-mono"
                  value={keys[p.provider] ?? ''}
                  onChange={(e) => updateKey(p.provider, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => testKey(p.provider)}
                  className="px-4 py-2 bg-sky-500 text-white rounded-md text-sm font-medium"
                >
                  Test
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {p.whitelist.map((m) => (
                  <span key={m} className="text-xs bg-slate-100 px-2 py-1 rounded-full">
                    {m}
                  </span>
                ))}
              </div>

              {p.warning && <p className="text-xs text-amber-600 mt-2">⚠️ {p.warning}</p>}
            </div>
          ))}
        </section>

        <section className="bg-white rounded-lg p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Görev → Model Varsayılanları</h2>
          <p className="text-sm text-slate-500">
            Yakında her görev tipi için ayrı varsayılan model seçimi.
          </p>
        </section>

        <section className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Hesap</h2>
          <div className="text-sm space-y-2">
            <p className="text-slate-600">
              KVKK politikamızı <a href="/legal/kvkk" className="text-sky-600 underline">buradan</a>{' '}
              okuyabilirsin.
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200 hover:bg-red-100"
            >
              Hesabımı Sil
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
