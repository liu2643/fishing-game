/**
 * 音频管理器（程序化 WebAudio 音效，无需素材文件）
 * 事件：fire / hit / coin / skill / explode
 */
window.GameAudio = (function () {
  "use strict";

  let ctx = null;
  let enabled = true;

  function ensureCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        ctx = null;
      }
    }
    return ctx;
  }

  /** 播放一个振荡器音调 */
  function tone(freq, dur, type, vol, when) {
    const c = ensureCtx();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** 噪声爆破（爆炸/水花） */
  function noise(dur, vol, when) {
    const c = ensureCtx();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (when || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(gain);
    gain.connect(c.destination);
    src.start(t0);
  }

  function play(name) {
    if (!enabled) return;
    switch (name) {
      case "fire":    tone(520, 0.08, "square", 0.05); break;
      case "hit":     tone(880, 0.06, "triangle", 0.06); break;
      case "coin":    tone(1560, 0.07, "sine", 0.08); tone(2080, 0.09, "sine", 0.07, 0.06); break;
      case "skill":   tone(420, 0.1, "sawtooth", 0.07); tone(630, 0.14, "sawtooth", 0.07, 0.09); break;
      case "explode": noise(0.25, 0.14); tone(120, 0.22, "triangle", 0.12); break;
      case "splash":  noise(0.12, 0.08); break;
    }
  }

  /** 浏览器要求首次用户交互后才能发声 */
  function unlock() {
    ensureCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  return { play, unlock, ensureCtx, set enabled(v) { enabled = v; }, get enabled() { return enabled; } };
})();
