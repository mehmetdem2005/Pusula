import type { Provider } from '@pusula/shared';

/**
 * KeyResolver — runtime'da key kaynağını soyutlar.
 * V1 (Beta): user_byok (IndexedDB)
 * V2 (GA):   platform_pool (Supabase Vault)
 */
export interface KeyResolver {
  source: 'user_byok' | 'platform_pool';
  getKey(provider: Provider): Promise<string>;
}

/**
 * Client-side BYOK resolver (browser / extension).
 * Master password ile AES-GCM çözer (caller passlanmış key'i sağlar).
 */
export class ByokKeyResolver implements KeyResolver {
  readonly source = 'user_byok' as const;

  constructor(private keysByProvider: Partial<Record<Provider, string>>) {}

  async getKey(provider: Provider): Promise<string> {
    const k = this.keysByProvider[provider];
    if (!k) throw new Error(`BYOK key not set for provider: ${provider}`);
    return k;
  }
}

/**
 * Sunucu-side platform pool resolver (V2).
 * Supabase Vault'tan key'i alır; cache + rotation destekler.
 */
export class PlatformPoolResolver implements KeyResolver {
  readonly source = 'platform_pool' as const;

  constructor(private fetcher: (provider: Provider) => Promise<string>) {}

  async getKey(provider: Provider): Promise<string> {
    return this.fetcher(provider);
  }
}
