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
  // Chiptune battle theme — D natural minor, 220 BPM, 8-bar loop (~8.7 s)
  // Original composition: driving 8th-note bass, repeating melodic motif,
  // square-wave lead + triangle harmony + chiptune percussion.

  _buildBgm() {
    const sr      = this.ctx.sampleRate;
    const bpm     = 220;
    const beatSmp = Math.round(sr * 60 / bpm);
    const beats   = 32;                 // 8 bars × 4 beats
    const total   = beatSmp * beats;

    const buf = this.ctx.createBuffer(2, total, sr);
    const L   = buf.getChannelData(0);
    const R   = buf.getChannelData(1);

    // D natural minor: D  E  F  G  A  Bb C
    const F = {
      _: 0,
      D2:  73.42, A2: 110.00,
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61,
      G3: 196.00, A3: 220.00, Bb3: 233.08,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
      G4: 392.00, A4: 440.00, Bb4: 466.16,
      C5: 523.25, D5: 587.33, E5: 659.25,
    };

    // ── Lead: square wave, 8th notes, 64 steps (8 bars) ─────────────────
    const mel = [
      // Bar 1: Main motif — descending Dm figure, then back up
      F.D5, F.C5, F.Bb4, F.A4,  F.G4, F.A4, F.Bb4, F.C5,
      // Bar 2: Full descent to tonic
      F.D5, F.C5, F.Bb4, F.A4,  F.G4, F.F4, F.E4,  F.D4,
      // Bar 3: Ascending response
      F.E4, F.F4, F.G4,  F.A4,  F.Bb4,F.C5, F.D5,  F.C5,
      // Bar 4: Syncopated riff — rests on off-beats create drive
      F.Bb4,F.A4, F._,   F.A4,  F._,  F.A4, F.Bb4, F.A4,
      // Bar 5–6: Main motif repeat
      F.D5, F.C5, F.Bb4, F.A4,  F.G4, F.A4, F.Bb4, F.C5,
      F.D5, F.C5, F.Bb4, F.A4,  F.G4, F.F4, F.E4,  F.D4,
      // Bar 7: Climax — ascending run to E5
      F.A4, F.Bb4,F.C5,  F.D5,  F.E5, F.D5, F.C5,  F.Bb4,
      // Bar 8: Syncopated resolution
      F.A4, F._,  F.D5,  F._,   F.A4, F.G4, F.F4,  F.D4,
    ];

    // ── Bass: square wave, 8th notes, 64 steps ──────────────────────────
    const bas = [
      F.D3,F.D3,F.D3,F.A3, F.D3,F.D3,F.D3,F.A3,  // Bar 1: Dm
      F.D3,F.D3,F.D3,F.A3, F.D3,F.D3,F.D3,F.A3,  // Bar 2: Dm
      F.G3,F.G3,F.G3,F.D3, F.G3,F.G3,F.G3,F.D3,  // Bar 3: Gm
      F.A3,F.A3,F.A3,F.E3, F.A3,F.A3,F.A3,F.E3,  // Bar 4: Am
      F.D3,F.D3,F.D3,F.A3, F.D3,F.D3,F.D3,F.A3,  // Bar 5: Dm
      F.D3,F.D3,F.D3,F.A3, F.D3,F.D3,F.D3,F.A3,  // Bar 6: Dm
      F.C3,F.C3,F.C3,F.G3, F.C3,F.C3,F.C3,F.G3,  // Bar 7: C (VII)
      F.D3,F.A3,F.D3,F.A3, F.D3,F.A3,F.D2,F.A2,  // Bar 8: Dm (drop low)
    ];

    // ── Harmony: triangle wave, quarter notes, 32 steps ─────────────────
    const har = [
      F.F3, F.A3, F.F3, F.A3,    // Bar 1: Dm (3rd–5th)
      F.D3, F.F3, F.D3, F.F3,    // Bar 2: Dm (root–3rd)
      F.Bb3,F.D3, F.Bb3,F.D3,    // Bar 3: Gm (Bb–D)
      F.C4, F.E3, F.C4, F.E3,    // Bar 4: Am (C–E)
      F.F3, F.A3, F.F3, F.A3,    // Bar 5: Dm
      F.D3, F.F3, F.D3, F.F3,    // Bar 6: Dm
      F.E3, F.G3, F.E3, F.G3,    // Bar 7: C (E–G)
      F.F3, F.A3, F.D3, F.A3,    // Bar 8: resolve Dm
    ];

    const half = beatSmp >> 1;   // 8th note in samples

    const ns = new Float32Array(total);
    for (let i = 0; i < total; i++) ns[i] = Math.random() * 2 - 1;

    for (let i = 0; i < total; i++) {
      // ── Lead (square, 8th-note steps) ──────────────────────────────────
      const mi   = Math.floor(i / half) % mel.length;
      const mf   = mel[mi];
      const mPos = (i % half) / half;
      // 1 % attack → 78 % sustain → 22 % release (punchy chiptune gate)
      const mEnv = mf > 0
        ? (mPos < 0.01 ? mPos / 0.01 : mPos > 0.78 ? Math.max(0, (1 - mPos) / 0.22) : 1)
        : 0;
      const mVal = mf > 0 ? ((i * mf / sr % 1) < 0.5 ? 1 : -1) * 0.22 * mEnv : 0;

      // ── Bass (square, 8th-note steps) ───────────────────────────────────
      const bi   = Math.floor(i / half) % bas.length;
      const bf   = bas[bi];
      const bPos = (i % half) / half;
      const bEnv = bPos < 0.01 ? bPos / 0.01 : bPos > 0.85 ? Math.max(0, (1 - bPos) / 0.15) : 1;
      const bVal = (i * bf / sr % 1 < 0.5 ? 1 : -1) * 0.18 * bEnv;

      // ── Harmony (triangle, quarter-note steps) ───────────────────────────
      const hi   = Math.floor(i / beatSmp) % har.length;
      const hf   = har[hi];
      const hPos = (i % beatSmp) / beatSmp;
      const hEnv = Math.min(hPos * 6, 1) * (hPos > 0.90 ? Math.max(0, (1 - hPos) / 0.10) : 1);
      const hPh  = (i * hf / sr) % 1;
      const hVal = hf > 0
        ? (hPh < 0.5 ? hPh * 4 - 1 : 3 - hPh * 4) * 0.11 * hEnv
        : 0;

      // ── Percussion ──────────────────────────────────────────────────────
      const bp      = i % beatSmp;
      const beatNum = Math.floor(i / beatSmp) % 4;

      // Kick: beats 1 & 3
      const kickE  = (beatNum === 0 || beatNum === 2) && bp < beatSmp * 0.08
        ? (1 - bp / (beatSmp * 0.08)) * 0.22 : 0;

      // Snare: beats 2 & 4
      const snareE = (beatNum === 1 || beatNum === 3) && bp < beatSmp * 0.06
        ? (1 - bp / (beatSmp * 0.06)) * 0.17 : 0;

      // Hi-hat: every 8th note — the chiptune drive engine
      const hhPos = i % half;
      const hhE   = hhPos < half * 0.18 ? (1 - hhPos / (half * 0.18)) * 0.06 : 0;

      const kickV  = ns[i] * kickE;
      const snareV = ns[(i * 7 + (total >> 1)) % total] * snareE;
      const hhV    = ns[(i * 3 + (total >> 2)) % total] * hhE;

      const mono = Math.max(-0.88, Math.min(0.88, mVal + bVal + hVal + kickV + snareV + hhV));
      L[i] = mono;
      R[i] = mono;
    }

    return buf;
  }
}
