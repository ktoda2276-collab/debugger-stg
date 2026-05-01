const HS_KEY = 'highScore';

export class ScoreSystem {
  constructor() {
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10);
  }

  add(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(HS_KEY, String(this.highScore));
    }
    return this.score;
  }

  reset() {
    this.score = 0;
  }

  getScore() {
    return this.score;
  }

  getHighScore() {
    return this.highScore;
  }
}
