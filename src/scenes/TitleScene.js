import Phaser from 'phaser';
import { SoundSystem } from '../systems/SoundSystem.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;

    this._buildStarfield(width, height);

    this.add.text(width / 2, height * 0.28, 'DEBUGGER STG', {
      fontSize: '52px',
      color: '#00ffff',
      fontFamily: 'monospace',
      stroke: '#003344',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const hs = localStorage.getItem('highScore') || '0';
    this.add.text(width / 2, height * 0.50, `HI-SCORE  ${hs}`, {
      fontSize: '24px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.62, '[ Arrow ] Move    [ Z ] Shot    [ X ] Bomb', {
      fontSize: '15px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const prompt = this.add.text(width / 2, height * 0.74, 'PRESS  SPACE  TO  START', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0, duration: 550, yoyo: true, repeat: -1 });

    // ── Sound toggle (V key) ──────────────────────────────────────────
    this._soundText = this.add.text(width / 2, height * 0.88,
      this._soundLabel(),
      { fontSize: '14px', color: '#444444', fontFamily: 'monospace' }
    ).setOrigin(0.5);

    this.input.keyboard.on('keydown-V', () => {
      SoundSystem.setMuted(!SoundSystem.isMuted());
      this._soundText.setText(this._soundLabel());
    });

    // ── Start ─────────────────────────────────────────────────────────
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
  }

  _soundLabel() {
    return `SOUND  [ ${SoundSystem.isMuted() ? 'OFF' : 'ON'} ]   ( V : toggle )`;
  }

  _buildStarfield(width, height) {
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.Between(1, 2);
      const a = Phaser.Math.FloatBetween(0.25, 1.0);
      this.add.circle(x, y, r, 0xffffff, a);
    }
  }
}
