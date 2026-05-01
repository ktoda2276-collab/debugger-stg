import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';

// Formation patterns with weight table per phase
//   phase 0 (0-12s):   mostly singles
//   phase 1 (12-30s):  horizontal formations added
//   phase 2 (30s+):    all patterns including arrow
const WEIGHTS = [
  ['SINGLE', 'SINGLE', 'SINGLE', 'SINGLE', 'FORM_H'],
  ['SINGLE', 'SINGLE', 'FORM_H', 'FORM_H', 'FORM_V'],
  ['SINGLE', 'FORM_H', 'FORM_H', 'FORM_V', 'FORM_ARROW'],
];

export class SpawnSystem {
  constructor(scene, enemyGroup) {
    this.scene        = scene;
    this.enemyGroup   = enemyGroup;
    this.elapsed      = 0;
    this.totalElapsed = 0;
    this.interval     = 1500;
    this.minInterval  = 400;
    this.paused       = false;
  }

  update(delta) {
    if (this.paused) return;
    this.elapsed      += delta;
    this.totalElapsed += delta;
    if (this.elapsed >= this.interval) {
      this.elapsed = 0;
      this._spawn();
      this.interval = Math.max(this.minInterval, this.interval - 15);
    }
  }

  reset() {
    this.elapsed      = 0;
    this.totalElapsed = 0;
    this.interval     = 1500;
    this.paused       = false;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  _spawn() {
    const phase   = this.totalElapsed < 12000 ? 0 : this.totalElapsed < 30000 ? 1 : 2;
    const pattern = Phaser.Math.RND.pick(WEIGHTS[phase]);

    switch (pattern) {
      case 'FORM_H':     return this._formH();
      case 'FORM_V':     return this._formV();
      case 'FORM_ARROW': return this._formArrow();
      default:           return this._single();
    }
  }

  _spawnOne(x, y = -32) {
    const e = new Enemy(this.scene, x, y);
    this.enemyGroup.add(e);
    e.body.setVelocityY(130);  // must come after group.add (group resets velocity)
  }

  // 1体
  _single() {
    const { width } = this.scene.scale;
    this._spawnOne(Phaser.Math.Between(24, width - 24));
  }

  // 3体横並び ←  →
  _formH() {
    const { width } = this.scene.scale;
    const cx = Phaser.Math.Between(110, width - 110);
    [-56, 0, 56].forEach(dx => this._spawnOne(cx + dx));
  }

  // 3体縦列（先頭 → 後続が追いかける）
  _formV() {
    const { width } = this.scene.scale;
    const x = Phaser.Math.Between(40, width - 40);
    [0, -56, -112].forEach(dy => this._spawnOne(x, -32 + dy));
  }

  // 5体矢形 ▽
  _formArrow() {
    const { width } = this.scene.scale;
    const cx = Phaser.Math.Between(130, width - 130);
    [
      [0,    0],
      [-58, -44],
      [58,  -44],
      [-105, -88],
      [105,  -88],
    ].forEach(([dx, dy]) => this._spawnOne(cx + dx, -32 + dy));
  }
}
