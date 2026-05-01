// Fully procedural audio — no external assets required.
// All sounds generated via WebAudio API using the AudioContext Phaser exposes.

const LS_MUTE = 'debugger_mute';
const LS_VOL  = 'debugger_vol';

export class SoundSystem {
  constructor(scene) {
    this._ready  = false;
    this._bgmSrc = null;
    this._bgmBuf = null;

    try {
      this.ctx = scene.sound.context;
      this._out = this.ctx.createGain();
      this._out.gain.value = SoundSystem.isMuted() ? 0 : SoundSystem.savedVolume();
      this._out.connect(this.ctx.destination);
      this._ready = true;
    } catch (e) {
      console.warn('[SoundSystem] WebAudio unavailable:', e);
    }
  }

  // ─── Static helpers (localStorage) ───────────────────────────────────────

  static isMuted() {
    return localStorage.getItem(LS_MUTE) === '1';
  }

  static setMuted(v) {
    localStorage.setItem(LS_MUTE, v ? '1' : '0');
  }

  static savedVolume() {
    return parseFloat(localStorage.getItem(LS_VOL) ?? '0.6');
  }

  // ─── BGM ──────────────────────────────────────────────────────────────────

  startBgm() {
    if (!this._ready) return;
    this.stopBgm();

    const go = () => {
      if (!this._bgmBuf) this._bgmBuf = this._buildBgm();
      this._bgmSrc = this.ctx.createBufferSource();
      this._bgmSrc.buffer = this._bgmBuf;
      this._bgmSrc.loop   = true;
      this._bgmSrc.connect(this._out);
      this._bgmSrc.start();
    };

    this.ctx.state === 'suspended' ? this.ctx.resume().then(go) : go();
  }

  stopBgm() {
    if (!this._bgmSrc) return;
    try { this._bgmSrc.stop(); } catch (_) {}
    this._bgmSrc = null;
  }

  setMuted(muted) {
    SoundSystem.setMuted(muted);
    if (this._out) this._out.gain.value = muted ? 0 : SoundSystem.savedVolume();
    if (muted) this.stopBgm();
  }

  // ─── SFX ──────────────────────────────────────────────────────────────────

  sfxShot() {
    if (!this._ready) return;
    this._osc('square', 900, 420, 0.065, 0.18);
  }

  sfxEnemyDestroy() {
    if (!this._ready) return;
    this._noise(0.13, 0.30);
    this._osc('square', 460, 85, 0.10, 0.17);
  }

  sfxPlayerHit() {
    if (!this._ready) return;
    this._osc('sawtooth', 210, 40, 0.28, 0.48);
    this._noise(0.12, 0.52);
  }

  sfxBomb() {
    if (!this._ready) return;
    this._osc('sawtooth', 130, 16, 0.62, 0.68);
    this._noise(0.52, 0.48);
  }

  sfxBossAppear() {
    if (!this._ready) return;
    [0, 0.19, 0.38, 0.57].forEach((d, i) => {
      const f = 190 * Math.pow(1.35, i);
      this._oscAt('square', f, f * 1.5, 0.20, 0.36, d);
    });
  }

  sfxBossDefeat() {
    if (!this._ready) return;
    [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => {
      this._oscAt('square', f, f * 1.05, 0.36, 0.38, i * 0.10);
    });
    this._noiseAt(0.38, 0.38, 0.50);
  }

  // ─── Internal: oscillator helpers ────────────────────────────────────────

  _osc(type, f0, f1, dur, gain)              { this._oscAt(type, f0, f1, dur, gain, 0); }
  _oscAt(type, f0, f1, dur, gain, delay) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type  = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._out);
    o.start(t);   o.stop(t + dur + 0.01);
  }

  // ─── Internal: noise helpers ──────────────────────────────────────────────

  _noise(dur, gain)              { this._noiseAt(dur, gain, 0); }
  _noiseAt(dur, gain, delay) {
    const t   = this.ctx.currentTime + delay;
    const sr  = this.ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g); g.connect(this._out);
    src.start(t);
  }

  // ─── BGM generation ──────────────────────────────────────────────────────
  // A-minor pentatonic, 128 BPM, 4-bar loop (~7.5 s)

  _buildBgm() {
    const sr      = this.ctx.sampleRate;
    const bpm     = 128;
    const beatSmp = Math.round(sr * 60 / bpm);   // ≈ 20672 samples/beat
    const beats   = 16;                            // 4 bars × 4 beats
    const total   = beatSmp * beats;               // ≈ 330 752 samples

    const buf = this.ctx.createBuffer(2, total, sr);
    const L   = buf.getChannelData(0);
    const R   = buf.getChannelData(1);

    // Note frequencies
    const F = {
      _:  0,
      A2: 110.00, C3: 130.81, E3: 164.81, G3: 196.00,
      A3: 220.00, C4: 261.63, D4: 293.66, E4: 329.63,
      G4: 392.00, A4: 440.00, C5: 523.25,
    };

    // Melody — 32 eighth-notes (2 steps/beat × 16 beats)
    const mel = [
      F.A4, F.G4, F.E4, F.D4, F.E4, F.G4, F.A4, F.G4,
      F.A4, F.C5, F.A4, F.G4, F.E4, F.D4, F.E4, F._,
      F.G4, F.E4, F.D4, F.C4, F.D4, F.E4, F.G4, F.A4,
      F.G4, F.A4, F.C5, F.A4, F.G4, F.E4, F.G4, F.E4,
    ];

    // Bass — 16 quarter-notes (1 step/beat)
    const bas = [
      F.A2, F.A2, F.E3, F.E3, F.G3, F.G3, F.A2, F.A2,
      F.A2, F.C3, F.E3, F.C3, F.G3, F.E3, F.A2, F.A2,
    ];

    const half = beatSmp / 2;

    // Pre-generate noise table for hihats / glitch bursts
    const ns = new Float32Array(total);
    for (let i = 0; i < total; i++) ns[i] = Math.random() * 2 - 1;

    for (let i = 0; i < total; i++) {
      // ── Lead (square, 8th-note steps) ──────────────────────────────
      const mi   = Math.floor(i / half) % mel.length;
      const mf   = mel[mi];
      const mPos = (i % half) / half;
      const mEnv = mf > 0
        ? Math.min(mPos * 20, 1) * (mPos > 0.86 ? Math.max(0, (1 - mPos) / 0.14) : 1)
        : 0;
      const mVal = mf > 0 ? ((i * mf / sr % 1 < 0.5) ? 1 : -1) * 0.20 * mEnv : 0;

      // ── Bass (square, quarter-note steps) ──────────────────────────
      const bi   = Math.floor(i / beatSmp) % bas.length;
      const bf   = bas[bi];
      const bPos = (i % beatSmp) / beatSmp;
      const bEnv = Math.min(bPos * 14, 1) * (bPos > 0.78 ? Math.max(0, (1 - bPos) / 0.22) : 1);
      const bVal = (i * bf / sr % 1 < 0.5 ? 1 : -1) * 0.17 * bEnv;

      // ── Hihat (noise, on-beat + off-beat) ──────────────────────────
      const bp   = i % beatSmp;
      const onB  = bp < beatSmp * 0.07  ? (1 - bp / (beatSmp * 0.07)) * 0.11  : 0;
      const offB = Math.abs(bp - half) < beatSmp * 0.05
        ? (1 - Math.abs(bp - half) / (beatSmp * 0.05)) * 0.07 : 0;
      const hhVal = ns[i] * (onB + offB);

      // ── Glitch burst (once per 4 beats, like a snare hit) ─────────
      const gp  = i % (beatSmp * 4);
      const gE  = gp < beatSmp * 0.028 ? (1 - gp / (beatSmp * 0.028)) * 0.13 : 0;
      const gV  = ns[(i + (total / 3 | 0)) % total] * gE;

      const s = Math.max(-0.88, Math.min(0.88, mVal + bVal + hhVal + gV));
      L[i] = s;
      R[i] = s;
    }

    return buf;
  }
}
