/**
 * Side Panel React UI — kullanıcı sahibinden'de bir ilan açtığında
 * yan panelde skor + AI chat görünür.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import type { SkorSonucu } from '@pusula/shared';

interface AnalysisState {
  loading: boolean;
  score?: SkorSonucu;
  error?: string;
  ilan_basligi?: string;
}

export function SidePanel(): ReactElement {
  const [state, setState] = useState<AnalysisState>({ loading: true });
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);

  const fetchAnalysis = useCallback(async (id: string): Promise<void> => {
    setState({ loading: true });
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'GET_ANALYSIS',
        payload: { id },
      });
      if (resp?.ok) {
        setState({
          loading: false,
          score: resp.score,
          ilan_basligi: resp.ilan_basligi,
        });
      } else {
        setState({ loading: false, error: resp?.error ?? 'Bilinmeyen hata' });
      }
    } catch (e) {
      setState({ loading: false, error: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    const listener = (msg: { type: string; payload?: { analyzeId?: string } }) => {
      if (msg.type === 'NEW_ANALYSIS' && msg.payload?.analyzeId) {
        void fetchAnalysis(msg.payload.analyzeId);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [fetchAnalysis]);

  async function sendChat(text: string): Promise<void> {
    const next = [...chatMessages, { role: 'user' as const, content: text }];
    setChatMessages(next);
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'CHAT',
        payload: { taskType: 'score-explanation', messages: next, score: state.score },
      });
      if (resp?.ok) {
        setChatMessages((m) => [...m, { role: 'assistant', content: resp.text }]);
      } else {
        setChatMessages((m) => [
          ...m,
          { role: 'assistant', content: `⚠️ ${resp?.error ?? 'AI cevap veremedi'}` },
        ]);
      }
    } catch (e) {
      setChatMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${(e as Error).message}` }]);
    }
  }

  if (state.loading) {
    return (
      <div className="panel">
        <header className="header">
          <h1>🧭 Pusula</h1>
          <p className="tagline">Karar verirken kaybolma.</p>
        </header>
        <div className="empty">Analiz yapılıyor...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="panel">
        <header className="header">
          <h1>🧭 Pusula</h1>
          <p className="tagline">Karar verirken kaybolma.</p>
        </header>
        <div className="error">⚠️ {state.error}</div>
      </div>
    );
  }

  if (!state.score) {
    return (
      <div className="panel">
        <header className="header">
          <h1>🧭 Pusula</h1>
          <p className="tagline">Karar verirken kaybolma.</p>
        </header>
        <div className="empty">Bir ilan sayfasına gidin, otomatik analiz başlasın.</div>
      </div>
    );
  }

  const s = state.score;

  return (
    <div className="panel">
      <header className="header">
        <h1>🧭 Pusula</h1>
        {state.ilan_basligi && <p className="subtle">{state.ilan_basligi}</p>}
      </header>

      <section className="score-card">
        <div className={`score-value score-${s.etiket}`}>{Math.round(s.toplam)}</div>
        <div className="score-label">{etiketTr(s.etiket)}</div>
        <div className="score-confidence">Güven: {confidenceTr(s.confidence)}</div>
      </section>

      <section className="breakdown">
        <h2>Skor Bileşenleri</h2>
        {Object.entries(s.bilesenler).map(([key, b]) => (
          <div key={key} className="bar-row">
            <span className="bar-label">{labelTr(key)}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${b.deger}%` }} />
            </div>
            <span className="bar-val">{Math.round(b.deger)}</span>
          </div>
        ))}
      </section>

      {s.uyarilar.length > 0 && (
        <section className="warnings">
          <h2>⚠️ Dikkat</h2>
          {s.uyarilar.map((u, i) => (
            <div key={i} className="warning-item">
              {u}
            </div>
          ))}
        </section>
      )}

      <section className="chat">
        <h2>💬 AI Asistan</h2>
        <div className="chat-messages">
          {chatMessages.map((m, i) => (
            <div key={i} className={`chat-msg chat-${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>
        <ChatInput onSend={sendChat} />
      </section>
    </div>
  );
}

function ChatInput({ onSend }: { onSend: (t: string) => void | Promise<void> }): ReactElement {
  const [value, setValue] = useState('');
  return (
    <form
      className="chat-input"
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (v) {
          void onSend(v);
          setValue('');
        }
      }}
    >
      <input
        type="text"
        placeholder="Bu ilan hakkında soru sor..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="AI asistana soru sor"
      />
      <button type="submit">Gönder</button>
    </form>
  );
}

function etiketTr(e: SkorSonucu['etiket']): string {
  const map: Record<SkorSonucu['etiket'], string> = {
    kacirilmaz: 'Kaçırılmaz',
    kelepir: 'Kelepir',
    iyi_fiyat: 'İyi Fiyat',
    piyasa: 'Piyasa',
    pahali: 'Pahalı',
    asiri_pahali: 'Aşırı Pahalı',
  };
  return map[e];
}

function labelTr(key: string): string {
  const map: Record<string, string> = {
    fiyat_avantaji: 'Fiyat Avantajı',
    kalite: 'Kalite',
    konum: 'Konum',
    risk: 'Risk',
  };
  return map[key] ?? key;
}

function confidenceTr(c: SkorSonucu['confidence']): string {
  return { high: 'Yüksek', medium: 'Orta', low: 'Düşük' }[c];
}
