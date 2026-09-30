// AirSlice AI - Bomb Entity with Animated Sizzling Fuse
import type { Point2D } from '../types.js';
import { randomRange } from '../utils/MathUtils.js';

export class Bomb {
  public id: string;
  public position: Point2D;
  public velocity: Point2D;
  public rotation: number = 0;
  public angularVelocity: number;
  public radius: number = 44;
  public isOffScreen: boolean = false;
  public isExploded: boolean = false;
  public fuseTimer: number = 0;
  public spawnTime: number;

  constructor(startX: number, startY: number, vx: number, vy: number) {
    this.id = 'bomb_' + Math.random().toString(36).substring(2, 9);
    this.position = { x: startX, y: startY };
    this.velocity = { x: vx, y: vy };
    this.angularVelocity = randomRange(-1.5, 1.5);
    this.spawnTime = performance.now();
  }

  public update(dt: number, gravity: number, canvasHeight: number, speedMultiplier: number = 1): void {
    if (this.isExploded) return;

    const effectiveDt = dt * speedMultiplier;
    this.velocity.y += gravity * effectiveDt;
    this.position.x += this.velocity.x * effectiveDt;
    this.position.y += this.velocity.y * effectiveDt;
    this.rotation += this.angularVelocity * effectiveDt;
    this.fuseTimer += effectiveDt;

    // Check if fallen off-screen
    if (this.velocity.y > 0 && this.position.y - this.radius > canvasHeight) {
      this.isOffScreen = true;
    }
  }

  public explode(): void {
    this.isExploded = true;
  }
}
