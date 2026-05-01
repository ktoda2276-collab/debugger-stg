import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(22, 28);

    this.speed      = 300;
    this.fireRate   = 200;
    this.lastFired  = 0;
    this.lives      = 3;
    this.maxLives   = 3;
    this.bombStock  = 3;
    this.maxBombs   = 3;
    this.invincible = false;
  }

  canFire(time) {
    return !this.invincible && time - this.lastFired >= this.fireRate;
  }

  markFired(time) {
    this.lastFired = time;
  }

  move(cursors) {
    this.body.setVelocity(0);
    if (cursors.left.isDown)       this.body.setVelocityX(-this.speed);
    else if (cursors.right.isDown) this.body.setVelocityX(this.speed);
    if (cursors.up.isDown)         this.body.setVelocityY(-this.speed);
    else if (cursors.down.isDown)  this.body.setVelocityY(this.speed);
  }

  useBomb() {
    if (this.bombStock <= 0) return false;
    this.bombStock--;
    return true;
  }

  hit() {
    if (this.invincible) return false;
    this.lives--;
    this.invincible = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.15,
      duration: 80,
      repeat: 7,
      yoyo: true,
      onComplete: () => { this.alpha = 1; this.invincible = false; },
    });
    return true;
  }
}
