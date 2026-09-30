// AirSlice AI - Low-Latency Velocity-Adaptive Coordinate Smoother with Prediction
import type { Point2D } from '../types.js';

export interface SmoothedResult {
  visualTip: Point2D;
  lowLatencyTip: Point2D;
  rawTip: Point2D;
  velocity: number;
  predictionOffset: Point2D;
}

export class CoordinateSmoother {
  private smoothedPoint: Point2D | null = null;
  private prevRawPoint: Point2D | null = null;
  private lastTimestamp: number = 0;
  private currentVelocity: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;

  // Last valid detection for 80ms confidence drop tolerance
  private lastValidResult: SmoothedResult | null = null;
  private lastValidTime: number = 0;
  private readonly maxHoldTimeMs: number = 80;

  // Prediction settings
  private readonly predictionFactor: number = 0.15; // Conservative velocity lead
  private readonly maxPredictionPx: number = 32;     // Prevent overshoot

  public reset(): void {
    this.smoothedPoint = null;
    this.prevRawPoint = null;
    this.lastTimestamp = 0;
    this.currentVelocity = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.lastValidResult = null;
    this.lastValidTime = 0;
  }

  /**
   * Updates coordinates using dynamic velocity-based smoothing and predictive lead.
   */
  public update(rawTarget: Point2D, timestamp: number = performance.now()): SmoothedResult {
    this.lastValidTime = timestamp;

    if (!this.smoothedPoint || !this.prevRawPoint || this.lastTimestamp === 0) {
      this.smoothedPoint = { ...rawTarget };
      this.prevRawPoint = { ...rawTarget };
      this.lastTimestamp = timestamp;
      this.currentVelocity = 0;
      this.velocityX = 0;
      this.velocityY = 0;

      const initialResult: SmoothedResult = {
        visualTip: { ...rawTarget },
        lowLatencyTip: { ...rawTarget },
        rawTip: { ...rawTarget },
        velocity: 0,
        predictionOffset: { x: 0, y: 0 },
      };
      this.lastValidResult = initialResult;
      return initialResult;
    }

    const dt = Math.max((timestamp - this.lastTimestamp) / 1000, 0.001);
    this.lastTimestamp = timestamp;

    // 1. Calculate raw velocity vector
    const rawDx = rawTarget.x - this.prevRawPoint.x;
    const rawDy = rawTarget.y - this.prevRawPoint.y;
    this.prevRawPoint = { ...rawTarget };

    const instVx = rawDx / dt;
    const instVy = rawDy / dt;
    const instSpeed = Math.hypot(instVx, instVy);

    // Responsive velocity rolling window
    this.velocityX = this.velocityX * 0.4 + instVx * 0.6;
    this.velocityY = this.velocityY * 0.4 + instVy * 0.6;
    this.currentVelocity = this.currentVelocity * 0.4 + instSpeed * 0.6;

    // 2. Dynamic Alpha Smoothing (Velocity-Sensitive)
    // Fast slash (>500 px/s): alpha = 0.85 (ultra-low input latency!)
    // Moderate motion (>180 px/s): alpha = 0.65
    // Slow / Hover (<=180 px/s): alpha = 0.38 (suppresses micro-tremors)
    let alpha: number;
    if (this.currentVelocity > 500) {
      alpha = 0.85;
    } else if (this.currentVelocity > 180) {
      alpha = 0.65;
    } else {
      alpha = 0.38;
    }

    // Exponential Moving Average
    this.smoothedPoint.x += (rawTarget.x - this.smoothedPoint.x) * alpha;
    this.smoothedPoint.y += (rawTarget.y - this.smoothedPoint.y) * alpha;

    // 3. Lightweight Clamped Prediction for Fast Slashes
    let predX = 0;
    let predY = 0;
    if (this.currentVelocity > 150) {
      const leadX = this.velocityX * dt * this.predictionFactor * 10;
      const leadY = this.velocityY * dt * this.predictionFactor * 10;
      const leadMag = Math.hypot(leadX, leadY);

      if (leadMag > this.maxPredictionPx) {
        const scale = this.maxPredictionPx / leadMag;
        predX = leadX * scale;
        predY = leadY * scale;
      } else {
        predX = leadX;
        predY = leadY;
      }
    }

    // 4. Low-Latency Tip (Raw coordinate + prediction for instant collision detection)
    const lowLatencyTip: Point2D = {
      x: rawTarget.x + predX,
      y: rawTarget.y + predY,
    };

    // 5. Visual Tip (Smooth coordinate + subtle 40% prediction for visual blade alignment)
    const visualTip: Point2D = {
      x: this.smoothedPoint.x + predX * 0.4,
      y: this.smoothedPoint.y + predY * 0.4,
    };

    const result: SmoothedResult = {
      visualTip,
      lowLatencyTip,
      rawTip: { ...rawTarget },
      velocity: this.currentVelocity,
      predictionOffset: { x: predX, y: predY },
    };

    this.lastValidResult = result;
    return result;
  }

  /**
   * Holds last position if confidence drops briefly (within maxHoldTimeMs = 80ms)
   */
  public holdOrNull(now: number = performance.now()): SmoothedResult | null {
    if (this.lastValidResult && now - this.lastValidTime <= this.maxHoldTimeMs) {
      return this.lastValidResult;
    }
    return null;
  }

  public getVelocity(): number {
    return this.currentVelocity;
  }

  public getSmoothedPoint(): Point2D | null {
    return this.smoothedPoint ? { ...this.smoothedPoint } : null;
  }
}
