import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this._make('player', 32, 36, (g) => {
      g.fillStyle(0x00ffff);
      g.fillTriangle(16, 0, 0, 36, 32, 36);
      g.fillStyle(0x0088cc);
      g.fillRect(12, 14, 8, 10);
    });

    this._make('enemy', 32, 28, (g) => {
      g.fillStyle(0xff4444);
      g.fillRect(8, 0, 16, 28);
      g.fillRect(0, 8, 32, 12);
      g.fillRect(0, 18, 8, 8);
      g.fillRect(24, 18, 8, 8);
    });

    this._make('bullet', 4, 14, (g) => {
      g.fillStyle(0xffff44);
      g.fillRect(0, 0, 4, 14);
    });

    this._make('enemyBullet', 10, 10, (g) => {
      g.fillStyle(0xff2233);
      g.fillCircle(5, 5, 5);
    });

    this._make('boss', 96, 72, (g) => {
      g.fillStyle(0xff8800);
      g.fillRect(16, 0, 64, 72);
      g.fillRect(0, 20, 96, 32);
      g.fillStyle(0xff4400);
      g.fillRect(34, 24, 28, 20);
    });

    this.scene.start('TitleScene');
  }

  _make(key, w, h, fn) {
    const g = this.make.graphics({ add: false });
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
