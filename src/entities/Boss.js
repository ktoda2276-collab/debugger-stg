import Phaser from 'phaser';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);

    this.hp           = 30;
    this.maxHp        = 30;
    this.scoreValue   = 5000;
    this.phase        = 1;
    this.moveSpeed    = 130;
    this.fireInterval = 1800;
    this._fireTimer   = 0;
    this.stunned      = false;
  }

  update(delta, fireCallback) {
    if (this.stunned) return;

    // Bounce horizontally off world bounds
    if (this.body.blocked.right || this.x >= this.scene.scale.width - 60) {
      this.body.setVelocityX(-this.moveSpeed);
    } else if (this.body.blocked.left || this.x <= 60) {
      this.body.setVelocityX(this.moveSpeed);
    }

    // Phase 2 transition at 50% HP
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.setTint(0xff4400);
      this.moveSpeed    = 210;
      this.fireInterval = 1000;
      const dir = this.body.velocity.x >= 0 ? 1 : -1;
      this.body.setVelocityX(this.moveSpeed * dir);
    }

    this._fireTimer += delta;
    if (this._fireTimer >= this.fireInterval) {
      this._fireTimer = 0;
      fireCallback(this);
    }
  }

  takeDamage(amount = 1) {
    this.hp -= amount;
    return this.hp <= 0;
  }
}
