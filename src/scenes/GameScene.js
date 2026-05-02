import Phaser from 'phaser';
import { Player }             from '../entities/Player.js';
import { Enemy }              from '../entities/Enemy.js';
import { Bullet }             from '../entities/Bullet.js';
import { Boss }               from '../entities/Boss.js';
import { SpawnSystem }        from '../systems/SpawnSystem.js';
import { ScoreSystem }        from '../systems/ScoreSystem.js';
import { GlitchEffectSystem } from '../systems/GlitchEffectSystem.js';
import { SoundSystem }        from '../systems/SoundSystem.js';

const BOSS_THRESHOLD = 20;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  create() {
    const { width, height } = this.scale;

    this._buildBg(width, height);

    this.bullets      = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies      = this.physics.add.group();

    this.player = new Player(this, width / 2, height - 80);

    this.scoreSystem = new ScoreSystem();
    this.spawnSystem = new SpawnSystem(this, this.enemies);
    this.glitch      = new GlitchEffectSystem(this);
    this.soundSys    = new SoundSystem(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.zKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    this.physics.add.overlap(this.bullets, this.enemies,
      (b, e) => this._onBulletHitEnemy(b, e));
    this.physics.add.overlap(this.player, this.enemies,
      (p, e) => this._onPlayerHitEnemy(p, e));
    this.physics.add.overlap(this.player, this.enemyBullets,
      (p, b) => { b.destroy(); this._playerTakeDamage(); });

    this._buildHUD(width);
    this._buildBossBar(width, height);

    this.phase      = 'WAVE';
    this.killCount  = 0;
    this.boss       = null;
    this.bossActive = false;
    this._over      = false;

    // BGM
    if (!SoundSystem.isMuted()) this.soundSys.startBgm();
    this.events.once('shutdown', () => this.soundSys.stopBgm());
  }

  update(time, delta) {
    if (this._over) return;

    this.player.move(this.cursors);

    if (this.zKey.isDown && this.player.canFire(time)) {
      this.player.markFired(time);
      const b = new Bullet(this, this.player.x, this.player.y - 22);
      this.bullets.add(b);
      b.body.setVelocity(0, -700);  // after group.add (group resets velocity)
      this.soundSys.sfxShot();
    }

    this._emitEngineExhaust();

    if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
      this._bomb();
    }

    if (this.phase === 'WAVE') {
      this.spawnSystem.update(delta);
    } else if (this.phase === 'BOSS' && this.bossActive && this.boss?.active) {
      this.boss.update(delta, (boss) => this._bossFire(boss));
      this._refreshBossBar();
    }

    this._cleanup();
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD(width) {
    this.scoreText = this.add.text(width / 2, 14, 'SCORE  0', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(30);

    this.hiText = this.add.text(width - 16, 14, `HI  ${this.scoreSystem.getHighScore()}`, {
      fontSize: '18px', color: '#ffff00', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(30);

    this.lifeIcons = [];
    for (let i = 0; i < this.player.maxLives; i++) {
      this.lifeIcons.push(
        this.add.rectangle(18 + i * 22, 54, 16, 16, 0x00ffff).setDepth(30)
      );
    }

    this.bombText = this.add.text(16, 72, `BOMB ×${this.player.bombStock}`, {
      fontSize: '15px', color: '#ff88ff', fontFamily: 'monospace',
    }).setDepth(30);
  }

  _buildBossBar(width, height) {
    const bw = width - 100;
    const by = height - 22;
    this._bossBarMaxW = bw;

    this._bossBarBg = this.add
      .rectangle(50, by, bw, 12, 0x222222)
      .setOrigin(0, 0.5).setDepth(30).setVisible(false);

    this._bossBarFill = this.add
      .rectangle(50, by, bw, 12, 0xff4400)
      .setOrigin(0, 0.5).setDepth(31).setVisible(false);

    this._bossBarLabel = this.add.text(50, by - 18, 'STAGE BOSS  [PHASE 1]', {
      fontSize: '13px', color: '#ff8800', fontFamily: 'monospace',
    }).setDepth(31).setVisible(false);
  }

  _refreshLifeHUD() {
    this.lifeIcons.forEach((icon, i) => {
      icon.setFillStyle(i < this.player.lives ? 0x00ffff : 0x112233);
    });
  }

  _refreshBombHUD() {
    this.bombText.setText(`BOMB ×${this.player.bombStock}`);
  }

  _refreshBossBar() {
    if (!this.boss?.active) return;
    this._bossBarFill.width = this._bossBarMaxW * (this.boss.hp / this.boss.maxHp);
    if (this.boss.phase === 2) {
      this._bossBarFill.setFillStyle(0xff2200);
      this._bossBarLabel.setText('STAGE BOSS  [PHASE 2]');
    }
  }

  // ─── Bomb ─────────────────────────────────────────────────────────────────

  _bomb() {
    if (!this.player.useBomb()) return;
    this.soundSys.sfxBomb();
    this._refreshBombHUD();
    this.glitch.triggerBomb();

    let bonus = 0;
    for (const e of [...this.enemies.getChildren()]) {
      if (e.active) { e.destroy(); bonus += 50; }
    }
    for (const b of [...this.enemyBullets.getChildren()]) {
      if (b.active) b.destroy();
    }

    if (bonus > 0) {
      this.scoreText.setText(`SCORE  ${this.scoreSystem.add(bonus)}`);
      this.hiText.setText(`HI  ${this.scoreSystem.getHighScore()}`);
    }

    if (this.boss?.active) {
      this.boss.stunned = true;
      this.boss.body.setVelocity(0);
      this.time.delayedCall(1200, () => {
        if (this.boss?.active) {
          this.boss.stunned = false;
          this.boss.body.setVelocityX(this.boss.moveSpeed);
        }
      });
    }
  }

  // ─── Boss fire pattern ────────────────────────────────────────────────────

  _bossFire(boss) {
    const angles = boss.phase === 1 ? [-20, 0, 20] : [-40, -20, 0, 20, 40];
    const speed  = boss.phase === 1 ? 230 : 280;
    for (const deg of angles) {
      const rad = Phaser.Math.DegToRad(deg);
      const vx  = Math.sin(rad) * speed;
      const vy  = Math.cos(rad) * speed;
      const b   = new Bullet(this, boss.x, boss.y + 46);
      b.setTexture('enemyBullet');
      this.enemyBullets.add(b);
      b.body.setVelocity(vx, vy);  // after group.add (group resets velocity)
    }
  }

  // ─── Collision handlers ───────────────────────────────────────────────────

  _onBulletHitEnemy(bullet, enemy) {
    const { x, y } = enemy;
    bullet.destroy();
    enemy.destroy();

    this._spawnExplosion(x, y);
    this._spawnScorePopup(x, y, 100);
    this.soundSys.sfxEnemyDestroy();
    this.killCount++;

    const s = this.scoreSystem.add(100);
    this.scoreText.setText(`SCORE  ${s}`);
    this.hiText.setText(`HI  ${this.scoreSystem.getHighScore()}`);

    if (this.phase === 'WAVE' && this.killCount >= BOSS_THRESHOLD) {
      this._enterBossIntro();
    }
  }

  _onPlayerHitEnemy(player, enemy) {
    if (!enemy.active) return;
    enemy.destroy();
    this._playerTakeDamage();
  }

  _onBulletHitBoss(obj1, obj2) {
    // overlap(Group, Sprite) → Phaser calls collideSpriteVsGroup(sprite, group)
    // so callback args arrive as (boss, bullet) — use instanceof to be safe
    const boss   = obj1 instanceof Boss ? obj1 : obj2;
    const bullet = obj1 instanceof Boss ? obj2 : obj1;

    if (!boss.active || this._over) return;
    bullet.destroy();

    const dead = boss.takeDamage();
    this._refreshBossBar();

    boss.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (boss.active) boss.phase === 2 ? boss.setTint(0xff4400) : boss.clearTint();
    });

    if (!dead) return;

    // Boss defeated
    this.soundSys.sfxBossDefeat();
    const s = this.scoreSystem.add(5000);
    this.scoreText.setText(`SCORE  ${s}`);
    this.hiText.setText(`HI  ${this.scoreSystem.getHighScore()}`);

    this.glitch.trigger(900);
    boss.destroy();
    [this._bossBarBg, this._bossBarFill, this._bossBarLabel].forEach(el => el.setVisible(false));

    this._over = true;
    this.phase = 'CLEAR';
    this.time.delayedCall(1400, () => {
      this.scene.start('StageClearScene', { score: this.scoreSystem.getScore() });
    });
  }

  _playerTakeDamage() {
    if (this._over || !this.player.active) return;
    if (!this.player.hit()) return;

    this.soundSys.sfxPlayerHit();
    this.glitch.trigger(320);
    this._refreshLifeHUD();

    if (this.player.lives <= 0) {
      this._over = true;
      this.player.destroy();
      this.time.delayedCall(800, () => {
        this.scene.start('GameOverScene', { score: this.scoreSystem.getScore() });
      });
    }
  }

  // ─── Boss sequence ────────────────────────────────────────────────────────

  _enterBossIntro() {
    this.phase = 'BOSS_INTRO';
    this.spawnSystem.paused = true;

    for (const e of [...this.enemies.getChildren()]) {
      if (e.active) e.destroy();
    }

    const { width, height } = this.scale;
    this.cameras.main.flash(200, 255, 0, 0);

    const warn = this.add.text(width / 2, height / 2, '! ! !  B O S S  ! ! !', {
      fontSize: '38px',
      color: '#ff4400',
      fontFamily: 'monospace',
      stroke: '#220000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: warn,
      alpha: 1,
      duration: 260,
      yoyo: true,
      repeat: 3,
      onComplete: () => { warn.destroy(); this._spawnBoss(); },
    });
  }

  _spawnBoss() {
    this.phase = 'BOSS';
    const { width } = this.scale;
    this.boss = new Boss(this, width / 2, -90);

    this.boss.body.enable = false;
    this.soundSys.sfxBossAppear();

    this.tweens.add({
      targets: this.boss,
      y: 120,
      duration: 1400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.boss.body.enable = true;
        this.boss.body.reset(this.boss.x, this.boss.y);
        this.bossActive = true;
        this.boss.body.setVelocityX(this.boss.moveSpeed);
      },
    });

    this._bossBarBg.setVisible(true);
    this._bossBarFill.setVisible(true);
    this._bossBarLabel.setVisible(true);

    this.physics.add.overlap(this.bullets, this.boss,
      (b, boss) => this._onBulletHitBoss(b, boss));
    this.physics.add.overlap(this.player, this.boss,
      () => this._playerTakeDamage());
  }

  // ─── Visual effects ───────────────────────────────────────────────────────

  _emitEngineExhaust() {
    if (!this.player?.active) return;
    this._exhaustTick = (this._exhaustTick || 0) + 1;
    if (this._exhaustTick % 2 !== 0) return;

    const COLORS = [0xff6600, 0xffaa00, 0xffff44, 0xff4400, 0xffffff];
    const px = this.player.x;
    const py = this.player.y + 12;  // engine nozzle position

    for (let k = 0; k < 2; k++) {
      const color = COLORS[(this._exhaustTick + k * 2) % COLORS.length];
      const xOff  = Phaser.Math.Between(-4, 4);
      const size  = Phaser.Math.Between(2, 5);
      const p     = this.add.rectangle(px + xOff, py, size, size, color).setDepth(5);
      this.tweens.add({
        targets:  p,
        y:        py + Phaser.Math.Between(16, 28),
        alpha:    0,
        duration: Phaser.Math.Between(100, 190),
        onComplete: () => p.destroy(),
      });
    }
  }

  _spawnExplosion(x, y) {
    const COLORS = [0xff4444, 0xff8800, 0xffff44, 0xff00ff, 0x00ffff];
    const COUNT  = 10;
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.4, 0.4);
      const speed = Phaser.Math.Between(70, 230);
      const color = Phaser.Math.RND.pick(COLORS);
      const size  = Phaser.Math.Between(3, 6);

      const spark = this.add
        .rectangle(x, y, size, size, color)
        .setDepth(15);

      this.tweens.add({
        targets: spark,
        x:       x + Math.cos(angle) * speed * 0.5,
        y:       y + Math.sin(angle) * speed * 0.5,
        alpha:   0,
        scaleX:  0,
        scaleY:  0,
        duration: Phaser.Math.Between(240, 480),
        ease:    'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  _spawnScorePopup(x, y, pts) {
    const popup = this.add.text(x, y - 10, `+${pts}`, {
      fontSize: '15px',
      color: '#ffff00',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(40);

    this.tweens.add({
      targets:  popup,
      y:        y - 65,
      alpha:    0,
      duration: 720,
      ease:     'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  _cleanup() {
    const { width, height } = this.scale;
    for (const b of [...this.bullets.getChildren()]) {
      if (b.active && b.y < -20) b.destroy();
    }
    for (const b of [...this.enemyBullets.getChildren()]) {
      if (b.active && (b.y > height + 30 || b.y < -30 || b.x < -30 || b.x > width + 30)) {
        b.destroy();
      }
    }
    for (const e of [...this.enemies.getChildren()]) {
      if (e.active && e.y > height + 50) e.destroy();
    }
  }

  _buildBg(width, height) {
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const s = Phaser.Math.Between(1, 2);
      const a = Phaser.Math.FloatBetween(0.15, 0.65);
      this.add.rectangle(x, y, s, s, 0xffffff, a);
    }
  }
}
