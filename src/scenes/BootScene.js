import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this._make('player', 32, 36, (g) => {
      // Wings drawn first so fuselage renders on top
      g.fillStyle(0x009fbd);  // darker cyan wings
      g.fillTriangle(14, 8, 0, 26, 14, 26);   // left main wing (swept)
      g.fillTriangle(18, 8, 32, 26, 18, 26);  // right main wing (swept)

      // Tail fins
      g.fillStyle(0x00c8dc);
      g.fillTriangle(12, 22, 5, 36, 14, 36);   // left fin
      g.fillTriangle(20, 22, 27, 36, 18, 36);  // right fin

      // Main fuselage
      g.fillStyle(0x00e5ff);
      g.fillRect(12, 6, 8, 28);                 // center body
      g.fillTriangle(12, 6, 20, 6, 16, 0);      // nose

      // Magenta accent stripes on fuselage sides
      g.fillStyle(0xff00ff);
      g.fillRect(12, 16, 2, 6);  // left stripe
      g.fillRect(18, 16, 2, 6);  // right stripe

      // Cockpit
      g.fillStyle(0x88ccff);
      g.fillRect(13, 6, 6, 9);
      g.fillStyle(0xffffff);
      g.fillRect(14, 7, 4, 4);  // highlight

      // Engine nozzle (bottom)
      g.fillStyle(0xff5500);
      g.fillRect(12, 30, 8, 5);
      g.fillStyle(0xffff44);
      g.fillRect(13, 32, 6, 2);
      g.fillStyle(0xffffff);
      g.fillRect(15, 33, 2, 1);  // hot core
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
