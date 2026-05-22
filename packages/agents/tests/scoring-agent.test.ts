import { describe, it, expect } from 'vitest';
import { ScoringAgent } from '../src/specialists/ScoringAgent.js';
import { NoopLogger } from '../src/runtime/Logger.js';
import type { KonutInput } from '@pusula/shared';

const baseIlan: KonutInput = {
  kaynak: 'sahibinden',
  kaynak_id: '1',
  ilan_url: 'https://www.sahibinden.com/ilan/1',
  baslik: 'Test',
  fiyat_tl: 4_750_000,
  il: 'İstanbul',
  ilce: 'Beşiktaş',
  net_m2: 95,
  oda_sayisi: '2+1',
  bina_yasi: 12,
  isitma: 'dogalgaz_kombi',
  parse_versiyonu: 'test',
  parse_tarihi: new Date().toISOString(),
  foto_urlleri: [],
};

describe('ScoringAgent — gerçek engine entegrasyon', () => {
  it('AgentBus verilmediğinde boş context ile çalışır ve geçerli SkorSonucu döner', async () => {
    const agent = new ScoringAgent({ logger: new NoopLogger() });
    const resp = await agent.handle({
      ilan: baseIlan,
      context_options: {
        include_comparables: false,
        include_vision: false,
        include_market: false,
        max_latency_ms: 8000,
      },
      trace_id: crypto.randomUUID(),
    });

    expect(resp.result.toplam).toBeGreaterThanOrEqual(0);
    expect(resp.result.toplam).toBeLessThanOrEqual(100);
    expect(['kacirilmaz', 'kelepir', 'iyi_fiyat', 'piyasa', 'pahali', 'asiri_pahali']).toContain(
      resp.result.etiket,
    );
    expect(typeof resp.total_duration_ms).toBe('number');
    expect(resp.trace_id).toBeTruthy();
  });

  it('Output kontratı geçerli', async () => {
    const agent = new ScoringAgent({ logger: new NoopLogger() });
    const resp = await agent.handle({
      ilan: baseIlan,
      context_options: {
        include_comparables: false,
        include_vision: false,
        include_market: false,
        max_latency_ms: 8000,
      },
      trace_id: crypto.randomUUID(),
    });
    const parsed = ScoringAgent.outputSchema.safeParse(resp);
    expect(parsed.success).toBe(true);
  });
});
