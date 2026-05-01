import Phaser from 'phaser';
import { BootScene }       from './scenes/BootScene.js';
import { TitleScene }      from './scenes/TitleScene.js';
import { GameScene }       from './scenes/GameScene.js';
import { GameOverScene }   from './scenes/GameOverScene.js';
import { StageClearScene } from './scenes/StageClearScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000011',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene, StageClearScene],
};

new Phaser.Game(config);
