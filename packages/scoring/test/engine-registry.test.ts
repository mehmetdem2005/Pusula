import { describe, it, expect } from 'vitest';
import { engineFor, listEngines, KonutEngine } from '../src/index.js';
import type { KonutInput } from '@pusula/shared';

describe('Multi-vertical engine registry', () => {
  it('Konut engine otomatik kayıtlı', () => {
    const verticals = listEngines();
    expect(verticals).toContain('konut');
  });

  it('engineFor("konut") çağrısı KonutEngine instance döner', () => {
    const engine = engineFor('konut');
    expect(engine.vertical).toBe('konut');
    expect(typeof engine.formulVersion).toBe('string');
    expect(typeof engine.score).toBe('function');
  });

  it('Bilinmeyen vertical için exception', () => {
    expect(() => engineFor('balık')).toThrow();
  });

  it('Konut engine deterministik skor', () => {
    const engine = new KonutEngine();
    const input: KonutInput = {
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
    const ctx = { comparables: [], konum: {}, risk: {} };
    const r1 = engine.score(input, ctx);
    const r2 = engine.score(input, ctx);
    expect(r1.toplam).toBe(r2.toplam);
    expect(r1.etiket).toBe(r2.etiket);
  });
});
