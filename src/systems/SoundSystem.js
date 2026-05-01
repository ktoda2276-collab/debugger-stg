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
  // Grand orchestral march in C major, 130 BPM, 8-bar loop (~14.8 s)
  // Inspired by classic space-opera fanfares — original composition.
  // Layers: sawtooth (brass/lead) + square (bass) + triangle (strings) + percussion

  _buildBgm() {
    const sr      = this.ctx.sampleRate;
    const bpm     = 130;
    const beatSmp = Math.round(sr * 60 / bpm);  // samples per beat
    const beats   = 32;                           // 8 bars × 4 beats
    const total   = beatSmp * beats;

    const buf = this.ctx.createBuffer(2, total, sr);
    const L   = buf.getChannelData(0);
    const R   = buf.getChannelData(1);

    // ── Note frequencies (C major) ────────────────────────────────────────
    const F = {
      _:  0,
      C2: 65.41,  G2: 98.00,
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61,
      G3: 196.00, A3: 220.00, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
      G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
      G5: 783.99, A5: 880.00,
    };

    // ── Lead melody (sawtooth = brass, 8th notes, 64 slots) ──────────────
    const mel = [
      // Bar 1: Heroic fanfare motif
      F.G4, F.G4, F.G4, F._,  F.E5, F._,  F.D5, F._,
      // Bar 2: Answering phrase (descending)
      F.C5, F.C5, F.C5, F._,  F.A4, F._,  F.G4, F._,
      // Bar 3: Rising action
      F.E5, F.F5, F.G5, F._,  F.E5, F.D5, F.C5, F._,
      // Bar 4: Resolution on dominant
      F.G4, F._,  F.C5, F._,  F.G4, F._,  F.C5, F._,
      // Bar 5: Second theme (starts a 3rd higher)
      F.A4, F.A4, F.A4, F._,  F.F5, F._,  F.E5, F._,
      // Bar 6: Continuation
      F.D5, F.D5, F.D5, F._,  F.C5, F._,  F.B4, F._,
      // Bar 7: Climactic ascending run
      F.C5, F.D5, F.E5, F.F5, F.G5, F._,  F.A5, F._,
      // Bar 8: Triumphant final cadence
      F.C5, F._,  F.G4, F._,  F.E5, F._,  F.C5, F._,
    ];

    // ── Bass (square = low brass, quarter notes, 32 slots) ───────────────
    const bas = [
      F.C2, F.G2, F.C3, F.G2,   // Bar 1 — I  V  I  V
      F.C2, F.G2, F.C3, F.E3,   // Bar 2 — I  V  I  iii
      F.A3, F.F3, F.C3, F.G2,   // Bar 3 — vi IV  I  V
      F.C2, F.C2, F.G2, F.G2,   // Bar 4 — I  I  V  V
      F.C2, F.G2, F.A3, F.E3,   // Bar 5 — I  V  vi iii
      F.D3, F.A3, F.D3, F.A3,   // Bar 6 — ii vi ii vi
      F.C3, F.F3, F.G2, F.G2,   // Bar 7 — I  IV V  V
      F.C2, F.C2, F.C2, F.G2,   // Bar 8 — I  I  I  V
    ];

    // ── Strings (triangle = legato strings, half notes, 16 slots) ────────
    const str = [
      F.E4, F.G4,   // Bar 1
      F.G4, F.C4,   // Bar 2
      F.A4, F.C5,   // Bar 3
      F.E4, F.G4,   // Bar 4
      F.F4, F.A4,   // Bar 5
      F.D4, F.F4,   // Bar 6
      F.E4, F.G4,   // Bar 7
      F.C4, F.G4,   // Bar 8
    ];

    const half     = beatSmp / 2;       // 8th note in samples
    const twoBeats = beatSmp * 2;       // half note in samples

    // Pre-generated noise for percussion
    const ns = new Float32Array(total);
    for (let i = 0; i < total; i++) ns[i] = Math.random() * 2 - 1;

    for (let i = 0; i < total; i++) {
      // ── Lead / brass (sawtooth, 8th-note steps) ──────────────────────
      const mi   = Math.floor(i / half) % mel.length;
      const mf   = mel[mi];
      const mPos = (i % half) / half;
      // Staccato envelope: fast attack, hold 72 %, quick decay
      const mEnv = mf > 0
        ? Math.min(mPos * 30, 1) * (mPos > 0.72 ? Math.max(0, (1 - mPos) / 0.28) : 1)
        : 0;
      const mVal = mf > 0 ? ((i * mf / sr) % 1 * 2 - 1) * 0.19 * mEnv : 0;

      // ── Bass (square, quarter-note steps) ─────────────────────────────
      const bi   = Math.floor(i / beatSmp) % bas.length;
      const bf   = bas[bi];
      const bPos = (i % beatSmp) / beatSmp;
      const bEnv = Math.min(bPos * 10, 1) * (bPos > 0.80 ? Math.max(0, (1 - bPos) / 0.20) : 1);
      const bVal = (i * bf / sr % 1 < 0.5 ? 1 : -1) * 0.22 * bEnv;

      // ── Strings (triangle, half-note steps) ───────────────────────────
      const si    = Math.floor(i / twoBeats) % str.length;
      const sf    = str[si];
      const sPos  = (i % twoBeats) / twoBeats;
      const sEnv  = Math.min(sPos * 5, 1) * (sPos > 0.88 ? Math.max(0, (1 - sPos) / 0.12) : 1);
      const sPh   = (i * sf / sr) % 1;
      const sVal  = sf > 0
        ? (sPh < 0.5 ? sPh * 4 - 1 : 3 - sPh * 4) * 0.13 * sEnv
        : 0;

      // ── March percussion ──────────────────────────────────────────────
      const bp      = i % beatSmp;
      const beatNum = Math.floor(i / beatSmp) % 4;

      // Kick: heavy on beat 1, medium on beat 3
      const isKick  = (beatNum === 0 || beatNum === 2);
      const kickAmp = beatNum === 0 ? 0.24 : 0.16;
      const kickE   = bp < beatSmp * 0.065
        ? (1 - bp / (beatSmp * 0.065)) * (isKick ? kickAmp : 0) : 0;

      // Snare: beats 2 and 4 (march backbeat)
      const isSnare = (beatNum === 1 || beatNum === 3);
      const snareE  = bp < beatSmp * 0.05
        ? (1 - bp / (beatSmp * 0.05)) * (isSnare ? 0.15 : 0) : 0;

      // Hi-hat: off-beats (adds march drive)
      const offE = Math.abs(bp - half) < beatSmp * 0.035
        ? (1 - Math.abs(bp - half) / (beatSmp * 0.035)) * 0.045 : 0;

      const kickV  = ns[i] * kickE;
      const snareV = ns[(i * 7 + (total >> 1)) % total] * snareE;
      const hhV    = ns[(i * 3 + (total >> 2)) % total] * offE;

      const mono = Math.max(-0.88, Math.min(0.88, mVal + bVal + sVal + kickV + snareV + hhV));
      L[i] = mono;
      R[i] = mono + sVal * 0.10;  // slight stereo spread on strings
    }

    return buf;
  }
}
