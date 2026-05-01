import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setVelocityY(130);
    this.hp = 1;
    this.scoreValue = 100;

    // Spawn animation: alpha.from/to 記法で tween 自身が初期値を保証
    this.setTint(0xff44ff);
    scene.tweens.add({
      targets: this,
      alpha: { from: 0, to: 1 },
      duration: 220,
      ease: 'Linear',
      onComplete: () => { if (this.active) this.clearTint(); },
    });
  }
}
