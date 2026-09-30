// AirSlice AI - Performance-Based Dynamic Difficulty Manager
import type { GameStats } from '../types.js';
import { clamp } from '../utils/MathUtils.js';

export class DifficultyManager {
  private level: number = 1;
  private difficultyMultiplier: number = 1.0;

  public reset(): void {
    this.level = 1;
    this.difficultyMultiplier = 1.0;
  }

  public update(stats: GameStats): { level: number; difficultyMultiplier: number; didLevelUp: boolean } {
    // 1. Calculate target level from score and sliced fruits
    // Level 1: 0, Level 2: 1200, Level 3: 3000, Level 4: 6000, Level 5: 10000...
    const scoreThresholds = [0, 1000, 2600, 5000, 8500, 13000, 19000, 26000, 35000, 46000];
    let newLevel = 1;
    for (let i = scoreThresholds.length - 1; i >= 0; i--) {
      if (stats.score >= scoreThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }

    const didLevelUp = newLevel > this.level;
    this.level = newLevel;

    // 2. Adaptive skill factor:
    // High accuracy + fast reaction time increases challenge smoothly
    let skillFactor = 1.0;
    if (stats.accuracy > 85 && stats.averageReactionTime < 0.4) {
      skillFactor += 0.2; // Performing well
    }
    if (stats.currentCombo >= 5) {
      skillFactor += 0.15; // In the zone
    }
    if (stats.accuracy < 60 || stats.bombsHit > 2) {
      skillFactor -= 0.2; // Struggling slightly, temper difficulty
    }

    // Combine Level + Skill Factor
    const levelScaling = 1.0 + (this.level - 1) * 0.12;
    this.difficultyMultiplier = clamp(levelScaling * skillFactor, 0.85, 2.5);

    return {
      level: this.level,
      difficultyMultiplier: this.difficultyMultiplier,
      didLevelUp,
    };
  }

  public getLevel(): number {
    return this.level;
  }

  public getMultiplier(): number {
    return this.difficultyMultiplier;
  }
}
