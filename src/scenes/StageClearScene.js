import Phaser from 'phaser';

export class StageClearScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageClearScene' });
  }

  init(data) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#000011');

    // Scanlines
    const g = this.add.graphics().setAlpha(0.09);
    for (let y = 0; y < height; y += 4) {
      g.fillStyle(0x000000);
      g.fillRect(0, y, width, 1);
    }

    this.add.text(width / 2, height * 0.26, 'STAGE  CLEAR', {
      fontSize: '52px',
      color: '#00ff88',
      fontFamily: 'monospace',
      stroke: '#003322',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.48, `SCORE  ${this.finalScore}`, {
      fontSize: '30px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const hs = localStorage.getItem('highScore') || '0';
    this.add.text(width / 2, height * 0.59, `HI-SCORE  ${hs}`, {
      fontSize: '22px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.70, '— MORE STAGES COMING SOON —', {
      fontSize: '14px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const prompt = this.add.text(width / 2, height * 0.83, 'PRESS  SPACE  TO  RETURN', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0, duration: 550, yoyo: true, repeat: -1 });

    this.time.delayedCall(800, () => {
      this.input.keyboard.once('keydown-SPACE', () => this.scene.start('TitleScene'));
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start('TitleScene'));
    });
  }
}
