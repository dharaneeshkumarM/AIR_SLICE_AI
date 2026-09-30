// AirSlice AI - Low-Latency Velocity-Sensitive Blade Trail
import type { Point2D, TrailPoint } from '../types.js';

export class BladeTrailRenderer {
  private history: TrailPoint[] = [];
  private readonly maxLifetime = 110; // milliseconds (ultra snappy, zero visual drag)
  private readonly maxTrailPoints = 8; // Keep only recent 8 points
  private isPowerUpActive: boolean = false;

  public setPowerUp(active: boolean): void {
    this.isPowerUpActive = active;
  }

  public addPoint(pt: Point2D, speed: number): void {
    const now = performance.now();
    this.history.push({
      x: pt.x,
      y: pt.y,
      timestamp: now,
      speed,
    });

    // Enforce max trail points
    while (this.history.length > this.maxTrailPoints) {
      this.history.shift();
    }
  }

  public clear(): void {
    this.history = [];
  }

  public update(): void {
    const now = performance.now();
    // Drop points older than maxLifetime
    this.history = this.history.filter((pt) => now - pt.timestamp < this.maxLifetime);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.update();
    const len = this.history.length;
    if (len < 2) return;

    const now = performance.now();
    const tip = this.history[len - 1];
    const tipSpeed = tip.speed;

    // Responsive width scaling
    const speedFactor = Math.min(Math.max((tipSpeed - 120) / 1000, 0), 1);
    const baseWidth = 3.5 + speedFactor * 13;

    const auraColor = this.isPowerUpActive ? '#ffd700' : '#00e5ff';
    const coreColor = '#ffffff';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Outer Neon Aura Pass
    for (let i = 0; i < len - 1; i++) {
      const p1 = this.history[i];
      const p2 = this.history[i + 1];

      const age1 = (now - p1.timestamp) / this.maxLifetime;
      const age2 = (now - p2.timestamp) / this.maxLifetime;
      const alpha = Math.max(0, 1 - (age1 + age2) * 0.5);

      if (alpha <= 0.01) continue;

      const progress = (i + 1) / len;
      const width = baseWidth * progress * (0.4 + speedFactor * 0.6);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = width * 1.7;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 10 + speedFactor * 14;
      ctx.strokeStyle = this.isPowerUpActive
        ? `rgba(255, 215, 0, ${alpha * 0.8})`
        : `rgba(0, 229, 255, ${alpha * 0.8})`;
      ctx.stroke();
    }

    // 2. Inner White-Hot Sharp Blade Core
    for (let i = 0; i < len - 1; i++) {
      const p1 = this.history[i];
      const p2 = this.history[i + 1];

      const age1 = (now - p1.timestamp) / this.maxLifetime;
      const age2 = (now - p2.timestamp) / this.maxLifetime;
      const alpha = Math.max(0, 1 - (age1 + age2) * 0.5);

      if (alpha <= 0.01) continue;

      const progress = (i + 1) / len;
      const width = (baseWidth * 0.45 + 1.8) * progress;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = width;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.stroke();
    }

    // 3. Fingertip Flare & Cutting Head
    if (len > 0) {
      const tipPoint = this.history[len - 1];
      const flareRadius = 4.5 + speedFactor * 8.5;

      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 16 + speedFactor * 16;
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.arc(tipPoint.x, tipPoint.y, flareRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(tipPoint.x, tipPoint.y, flareRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
