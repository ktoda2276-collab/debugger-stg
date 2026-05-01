import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#000011');

    this.add.text(width / 2, height * 0.28, 'GAME  OVER', {
      fontSize: '58px',
      color: '#ff4444',
      fontFamily: 'monospace',
      stroke: '#440000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.50, `SCORE  ${this.finalScore}`, {
      fontSize: '30px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const hs = localStorage.getItem('highScore') || '0';
    this.add.text(width / 2, height * 0.61, `HI-SCORE  ${hs}`, {
      fontSize: '22px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const prompt = this.add.text(width / 2, height * 0.77, 'PRESS  SPACE  TO  RETRY', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0, duration: 550, yoyo: true, repeat: -1 });

    // Short delay before accepting input to avoid accidental skip
    this.time.delayedCall(600, () => {
      this.input.keyboard.once('keydown-SPACE', () => this.scene.start('TitleScene'));
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start('TitleScene'));
    });
  }
}
