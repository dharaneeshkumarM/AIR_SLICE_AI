// AirSlice AI - Hand Coordinate Smoothing & Velocity Engine
import type { Point2D } from '../types.js';

export class CoordinateSmoother {
  private smoothedPoint: Point2D | null = null;
  private prevPoint: Point2D | null = null;
  private lastTimestamp: number = 0;
  private currentVelocity: number = 0;

  // Smoothing weights
  private baseAlpha: number = 0.45; // Balance between smoothness and latency
  private deadzone: number = 1.5;   // Micro-jitter deadband threshold in pixels

  public reset(): void {
    this.smoothedPoint = null;
    this.prevPoint = null;
    this.lastTimestamp = 0;
    this.currentVelocity = 0;
  }

  /**
   * Updates smoothed point from raw target coordinates (already mapped to canvas px)
   */
  public update(rawTarget: Point2D, timestamp: number = performance.now()): { point: Point2D; velocity: number } {
    if (!this.smoothedPoint || this.lastTimestamp === 0) {
      this.smoothedPoint = { ...rawTarget };
      this.prevPoint = { ...rawTarget };
      this.lastTimestamp = timestamp;
      this.currentVelocity = 0;
      return { point: { ...this.smoothedPoint }, velocity: 0 };
    }

    const dt = Math.max((timestamp - this.lastTimestamp) / 1000, 0.001);
    this.lastTimestamp = timestamp;

    const dx = rawTarget.x - this.smoothedPoint.x;
    const dy = rawTarget.y - this.smoothedPoint.y;
    const dist = Math.hypot(dx, dy);

    // Dynamic smoothing: if speed is high, prioritize responsive low-latency tracking
    let dynamicAlpha = this.baseAlpha;
    if (dist > 50) {
      dynamicAlpha = 0.8; // Fast slash: follow fingertip rapidly
    } else if (dist > 15) {
      dynamicAlpha = 0.6;
    } else if (dist < this.deadzone) {
      // Tremor deadband: ignore tiny sub-pixel jitters
      return { point: { ...this.smoothedPoint }, velocity: 0 };
    }

    // Save previous smoothed point
    this.prevPoint = { ...this.smoothedPoint };

    // Apply Exponential Moving Average (EMA)
    this.smoothedPoint.x = this.smoothedPoint.x + dx * dynamicAlpha;
    this.smoothedPoint.y = this.smoothedPoint.y + dy * dynamicAlpha;

    // Calculate instantaneous velocity in px/sec
    const moveDist = Math.hypot(this.smoothedPoint.x - this.prevPoint.x, this.smoothedPoint.y - this.prevPoint.y);
    const instVelocity = moveDist / dt;

    // Smooth velocity with rolling window
    this.currentVelocity = this.currentVelocity * 0.7 + instVelocity * 0.3;

    return {
      point: { ...this.smoothedPoint },
      velocity: this.currentVelocity,
    };
  }

  public getVelocity(): number {
    return this.currentVelocity;
  }

  public getSmoothedPoint(): Point2D | null {
    return this.smoothedPoint ? { ...this.smoothedPoint } : null;
  }

  public getPreviousPoint(): Point2D | null {
    return this.prevPoint ? { ...this.prevPoint } : null;
  }
}
