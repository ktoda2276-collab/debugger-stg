import Phaser from 'phaser';

export class GlitchEffectSystem {
  constructor(scene) {
    this.scene  = scene;
    this.active = false;
    this._initScanlines();
    this._scheduleNoise();
  }

  // ─── Public API ────────────────────────────────────────────────────────

  /** Damage flash: shake + red flash */
  trigger(duration = 400) {
    if (this.active) return;
    this.active = true;
    const cam = this.scene.cameras.main;
    cam.shake(duration, 0.014);
    cam.flash(120, 255, 30, 30, false);
    this.scene.time.delayedCall(duration, () => { this.active = false; });
  }

  /** Bomb activation: cyan flash + intense glitch overlay */
  triggerBomb() {
    const { width, height } = this.scene.scale;
    const cam = this.scene.cameras.main;
    cam.flash(280, 0, 255, 255, false);
    cam.shake(450, 0.026);

    const g = this.scene.add.graphics().setDepth(60);
    for (let i = 0; i < 22; i++) {
      const y = Phaser.Math.Between(0, height);
      const h = Phaser.Math.Between(4, 32);
      const color = Phaser.Math.RND.pick([0x00ffff, 0xff00ff, 0x00ff44, 0xffffff]);
      g.fillStyle(color, Phaser.Math.FloatBetween(0.25, 0.65));
      g.fillRect(0, y, width, h);
    }
    this.scene.time.delayedCall(220, () => g.destroy());
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  _initScanlines() {
    const { width, height } = this.scene.scale;
    const g = this.scene.add.graphics().setDepth(5).setAlpha(0.09);
    for (let y = 0; y < height; y += 4) {
      g.fillStyle(0x000000);
      g.fillRect(0, y, width, 1);
    }
  }

  _scheduleNoise() {
    const delay = Phaser.Math.Between(1200, 3500);
    this.scene.time.delayedCall(delay, () => this._fireNoise());
  }

  _fireNoise() {
    const { width, height } = this.scene.scale;
    const g = this.scene.add.graphics().setDepth(6);
    const lines = Phaser.Math.Between(2, 7);
    for (let i = 0; i < lines; i++) {
      const y     = Phaser.Math.Between(0, height);
      const lineH = Phaser.Math.Between(2, 12);
      const lineW = Phaser.Math.Between(width * 0.25, width * 0.95);
      const x     = Phaser.Math.Between(0, width - lineW);
      const color = Phaser.Math.RND.pick([0x00ffff, 0xff00ff, 0xffffff, 0x00ff66]);
      g.fillStyle(color, Phaser.Math.FloatBetween(0.08, 0.35));
      g.fillRect(x, y, lineW, lineH);
    }
    this.scene.time.delayedCall(Phaser.Math.Between(50, 160), () => {
      g.destroy();
      this._scheduleNoise();
    });
  }
}
