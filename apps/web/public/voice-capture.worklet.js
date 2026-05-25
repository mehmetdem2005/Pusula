// Pusula — mic capture AudioWorklet: giriş Float32'yi 16kHz PCM16'ya indirip ana thread'e yollar.
// Gemini Live realtimeInput 16kHz PCM16 ister. `sampleRate` global = AudioContext örnekleme hızı.
class VoiceCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this._ratio = sampleRate / 16000; // örn 48000/16000 = 3
    this._acc = 0;
    this._sum = 0;
    this._cnt = 0;
    this._buf = [];
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this._sum += ch[i];
      this._cnt += 1;
      this._acc += 1;
      if (this._acc >= this._ratio) {
        const v = this._sum / this._cnt;
        this._acc -= this._ratio;
        this._sum = 0;
        this._cnt = 0;
        const s = Math.max(-1, Math.min(1, v));
        this._buf.push(s < 0 ? s * 0x8000 : s * 0x7fff);
      }
    }
    if (this._buf.length >= 320) {
      // ~20ms @16kHz
      const out = new Int16Array(this._buf.splice(0, this._buf.length));
      this.port.postMessage(out.buffer, [out.buffer]);
    }
    return true;
  }
}
registerProcessor('voice-capture', VoiceCapture);
