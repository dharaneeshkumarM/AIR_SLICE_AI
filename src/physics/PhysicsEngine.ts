// AirSlice AI - Physics Simulation & Object Spawner
import type { FruitType, GameMode } from '../types.js';
import { Fruit } from './Fruit.js';
import { Bomb } from './Bomb.js';
import { randomRange } from '../utils/MathUtils.js';

export class PhysicsEngine {
  public fruits: Fruit[] = [];
  public bombs: Bomb[] = [];

  private gravity: number = 740; // px/s^2
  private canvasWidth: number = 1280;
  private canvasHeight: number = 720;

  private spawnTimer: number = 0;
  private nextSpawnInterval: number = 2.0; // seconds

  // List of available fruits
  private readonly fruitTypes: FruitType[] = [
    'watermelon',
    'orange',
    'apple',
    'banana',
    'kiwi',
    'pineapple',
    'coconut',
  ];

  public setDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public reset(): void {
    this.fruits = [];
    this.bombs = [];
    this.spawnTimer = 0;
    this.nextSpawnInterval = 1.5;
  }

  public update(
    dt: number,
    gameMode: GameMode,
    level: number,
    difficultyMultiplier: number,
    isSlowMo: boolean,
    onMissedFruit?: (fruit: Fruit) => void
  ): void {
    const speedMult = isSlowMo ? 0.45 : 1.0;

    // 1. Update Spawner
    this.spawnTimer += dt * speedMult;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave(gameMode, level, difficultyMultiplier);

      // Interval scaled by level and difficulty
      const baseInterval = Math.max(1.1, 2.5 - level * 0.18) / difficultyMultiplier;
      this.nextSpawnInterval = randomRange(baseInterval * 0.8, baseInterval * 1.25);
    }

    // 2. Update Fruits
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      fruit.update(dt, this.gravity, this.canvasHeight, speedMult);

      if (fruit.hasMissed && onMissedFruit) {
        onMissedFruit(fruit);
        fruit.hasMissed = false; // Trigger once
      }

      if (fruit.isOffScreen) {
        this.fruits.splice(i, 1);
      }
    }

    // 3. Update Bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.update(dt, this.gravity, this.canvasHeight, speedMult);

      if (bomb.isOffScreen || bomb.isExploded) {
        this.bombs.splice(i, 1);
      }
    }
  }

  /**
   * Spawns a cluster/wave of fruits and occasional bombs based on level and mode
   */
  public spawnWave(gameMode: GameMode, level: number, difficultyMultiplier: number): void {
    if (gameMode === 'training') {
      // Training mode: single gentle fruit, zero bombs
      this.spawnSingleFruit(0.85);
      return;
    }

    // Calculate cluster size (1 to 4 fruits)
    let count = 1;
    const rand = Math.random();
    if (level >= 4 && rand < 0.4) {
      count = 3;
    } else if (level >= 2 && rand < 0.65) {
      count = 2;
    }

    // Spawn fruits with slight staggered timing
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawnSingleFruit(difficultyMultiplier);
      }, i * 160);
    }

    // Bombs: disabled in Level 1, scales with level
    if (level >= 2) {
      const bombChance = Math.min(0.12 + level * 0.05, 0.4) * difficultyMultiplier;
      if (Math.random() < bombChance) {
        setTimeout(() => {
          this.spawnBomb(difficultyMultiplier);
        }, 120);
      }
    }
  }

  private spawnSingleFruit(difficultyMult: number): void {
    const type = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
    const margin = this.canvasWidth * 0.15;
    const startX = randomRange(margin, this.canvasWidth - margin);
    const startY = this.canvasHeight + 40;

    // Launch towards screen center
    const centerBias = (this.canvasWidth * 0.5 - startX) / (this.canvasWidth * 0.5);
    const vx = centerBias * randomRange(120, 260) + randomRange(-60, 60);

    // Upward launch speed tailored to screen height
    const baseVy = -Math.sqrt(2 * this.gravity * (this.canvasHeight * randomRange(0.55, 0.78)));
    const vy = baseVy * (0.95 + difficultyMult * 0.05);

    this.fruits.push(new Fruit(type, startX, startY, vx, vy));
  }

  private spawnBomb(difficultyMult: number): void {
    const margin = this.canvasWidth * 0.2;
    const startX = randomRange(margin, this.canvasWidth - margin);
    const startY = this.canvasHeight + 40;

    const centerBias = (this.canvasWidth * 0.5 - startX) / (this.canvasWidth * 0.5);
    const vx = centerBias * randomRange(90, 180);

    const baseVy = -Math.sqrt(2 * this.gravity * (this.canvasHeight * randomRange(0.5, 0.7)));
    const vy = baseVy * (0.95 + difficultyMult * 0.05);

    this.bombs.push(new Bomb(startX, startY, vx, vy));
  }
}
