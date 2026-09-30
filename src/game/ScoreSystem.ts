// AirSlice AI - Scoring, Combo Multiplier & Session Analytics System
import type { GameStats } from '../types.js';

export class ScoreSystem {
  private stats: GameStats = {
    score: 0,
    highScore: 0,
    fruitsSliced: 0,
    fruitsMissed: 0,
    bombsHit: 0,
    maxCombo: 1,
    currentCombo: 0,
    accuracy: 100,
    averageReactionTime: 0.45,
    totalSpawned: 0,
    level: 1,
  };

  private lastSliceTime: number = 0;
  private readonly comboResetWindow = 1.35; // Seconds to maintain combo
  private reactionTimes: number[] = [];
  private isDoubleScoreActive: boolean = false;

  constructor() {
    this.loadHighScore();
  }

  public reset(): void {
    const prevHigh = this.stats.highScore;
    this.stats = {
      score: 0,
      highScore: prevHigh,
      fruitsSliced: 0,
      fruitsMissed: 0,
      bombsHit: 0,
      maxCombo: 1,
      currentCombo: 0,
      accuracy: 100,
      averageReactionTime: 0.45,
      totalSpawned: 0,
      level: 1,
    };
    this.lastSliceTime = 0;
    this.reactionTimes = [];
    this.isDoubleScoreActive = false;
  }

  public setDoubleScore(active: boolean): void {
    this.isDoubleScoreActive = active;
  }

  public update(_dt: number): void {
    // Check if combo window has expired
    if (this.stats.currentCombo > 0) {
      const now = performance.now();
      if ((now - this.lastSliceTime) / 1000 > this.comboResetWindow) {
        this.stats.currentCombo = 0;
      }
    }
  }

  public registerSlice(
    baseScore: number,
    distToCenterRatio: number,
    bladeSpeed: number,
    spawnTime: number
  ): { pointsAdded: number; combo: number; isPerfect: boolean } {
    const now = performance.now();

    // 1. Update reaction time
    const reactionTime = Math.max(0.1, (now - spawnTime) / 1000);
    this.reactionTimes.push(reactionTime);
    if (this.reactionTimes.length > 30) this.reactionTimes.shift();
    const sum = this.reactionTimes.reduce((acc, v) => acc + v, 0);
    this.stats.averageReactionTime = +(sum / this.reactionTimes.length).toFixed(2);

    // 2. Combo Progression
    this.stats.currentCombo++;
    if (this.stats.currentCombo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.currentCombo;
    }
    this.lastSliceTime = now;

    // 3. Bonuses
    const isPerfect = distToCenterRatio <= 0.35;
    let multiplier = Math.min(this.stats.currentCombo, 8); // Combo mult up to 8x

    let points = baseScore * multiplier;

    if (isPerfect) {
      points = Math.round(points * 1.5); // 50% Perfect cut bonus
    }

    if (bladeSpeed > 600) {
      points = Math.round(points * 1.25); // 25% High speed slash bonus
    }

    if (this.isDoubleScoreActive) {
      points *= 2; // 2X Power-up
    }

    this.stats.score += points;
    this.stats.fruitsSliced++;

    // Update Accuracy
    const total = this.stats.fruitsSliced + this.stats.fruitsMissed;
    this.stats.accuracy = total > 0 ? Math.round((this.stats.fruitsSliced / total) * 100) : 100;

    // Update High Score
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      this.saveHighScore();
    }

    return {
      pointsAdded: points,
      combo: this.stats.currentCombo,
      isPerfect,
    };
  }

  public registerMiss(): void {
    this.stats.fruitsMissed++;
    this.stats.currentCombo = 0; // Reset combo on fruit miss

    const total = this.stats.fruitsSliced + this.stats.fruitsMissed;
    this.stats.accuracy = total > 0 ? Math.round((this.stats.fruitsSliced / total) * 100) : 100;
  }

  public registerBombHit(): void {
    this.stats.bombsHit++;
    this.stats.currentCombo = 0;
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('airslice_high_score');
      if (saved) {
        this.stats.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // LocalStorage access safe
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('airslice_high_score', this.stats.highScore.toString());
    } catch {
      // LocalStorage access safe
    }
  }
}
