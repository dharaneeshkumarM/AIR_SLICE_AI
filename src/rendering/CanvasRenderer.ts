// AirSlice AI - Master Canvas Rendering Pipeline with Latency Metrics & Test Mode
import type { HandTrackingState, Point2D } from '../types.js';
import { FruitRenderer } from './FruitRenderer.js';
import { BladeTrailRenderer } from './BladeTrailRenderer.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Fruit } from '../physics/Fruit.js';
import { Bomb } from '../physics/Bomb.js';
import { randomRange } from '../utils/MathUtils.js';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public fruitRenderer: FruitRenderer = new FruitRenderer();
  public bladeRenderer: BladeTrailRenderer = new BladeTrailRenderer();
  public particleSystem: ParticleSystem = new ParticleSystem();

  // Screen Shake system
  private shakeDuration: number = 0;
  private shakeMagnitude: number = 0;
  private shakeOffset: Point2D = { x: 0, y: 0 };
  private reducedMotion: boolean = false;

  // Debug & Latency Test Mode
  public isDebugMode: boolean = false;
  public isLatencyTestMode: boolean = false;
  public latencyTarget: { x: number; y: number; vx: number; radius: number } | null = null;
  private renderTimeMs: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not acquire 2D canvas context');
    this.ctx = context;

    // Detect system reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.reducedMotion = true;
    }
  }

  public setReducedMotion(val: boolean): void {
    this.reducedMotion = val;
  }

  public triggerScreenShake(magnitude: number = 14, duration: number = 0.35): void {
    if (this.reducedMotion) return;
    this.shakeMagnitude = magnitude;
    this.shakeDuration = duration;
  }

  public update(dt: number): void {
    // 1. Update screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const factor = Math.max(0, this.shakeDuration / 0.35);
      const mag = this.shakeMagnitude * factor;
      this.shakeOffset.x = randomRange(-mag, mag);
      this.shakeOffset.y = randomRange(-mag, mag);
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // 2. Update particles
    this.particleSystem.update(dt);
  }

  public render(
    fruits: Fruit[],
    bombs: Bomb[],
    handState: HandTrackingState,
    fps: number
  ): void {
    const renderStart = performance.now();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();

    // Apply Screen Shake
    if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
      ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    }

    // 1. Sleek Modern Arcade Cyberpunk Background
    this.drawArcadeBackground(w, h);

    // 2. Latency Test Mode sweep guide & target
    if (this.isLatencyTestMode && this.latencyTarget) {
      this.renderLatencyTestTrack(ctx, w, h);
    }

    // 3. Render Sliced Fruit Pieces (behind whole fruits)
    for (const fruit of fruits) {
      if (fruit.sliceState === 'sliced') {
        for (const piece of fruit.pieces) {
          this.fruitRenderer.renderFruitPiece(ctx, piece);
        }
      }
    }

    // 4. Render Whole Fruits
    for (const fruit of fruits) {
      if (fruit.sliceState === 'whole') {
        this.fruitRenderer.renderWholeFruit(ctx, fruit);
      }
    }

    // 5. Render Bombs
    for (const bomb of bombs) {
      this.fruitRenderer.renderBomb(ctx, bomb);
    }

    // 6. Render Particle System (Juice, Sparks, Floating Scores)
    this.particleSystem.render(ctx);

    // 7. Render Fluid Glowing Blade Trail
    this.bladeRenderer.render(ctx);

    // 8. Render Debug Overlay if enabled
    if (this.isDebugMode) {
      this.renderDebugOverlay(fruits, bombs, handState, fps);
    }

    ctx.restore();
    this.renderTimeMs = Math.round((performance.now() - renderStart) * 10) / 10;
  }

  private drawArcadeBackground(w: number, h: number): void {
    const ctx = this.ctx;

    // Deep Obsidian / Navy Vignette
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.1, w * 0.5, h * 0.5, w * 0.85);
    bgGrad.addColorStop(0, '#101626');
    bgGrad.addColorStop(0.55, '#0a0d18');
    bgGrad.addColorStop(1, '#05070c');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Perspective Neon Floor Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;

    const horizonY = h * 0.55;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + (x - w * 0.5) * 0.25, horizonY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    let curY = horizonY;
    let step = 8;
    while (curY < h) {
      ctx.beginPath();
      ctx.moveTo(0, curY);
      ctx.lineTo(w, curY);
      ctx.stroke();
      curY += step;
      step *= 1.25;
    }

    // Ambient Top Light Sheen
    const topGlow = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    topGlow.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, w, h * 0.3);

    ctx.restore();
  }

  private renderLatencyTestTrack(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    if (!this.latencyTarget) return;

    ctx.save();
    const y = this.latencyTarget.y;

    // Horizontal speed sweep line
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(w * 0.15, y);
    ctx.lineTo(w * 0.85, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Direction indicators
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('← LEFT SWIPE TEST  |  LATENCY CALIBRATION TRACK  |  RIGHT SWIPE TEST →', w * 0.5, y - 55);

    // Moving target sphere
    const t = this.latencyTarget;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);

    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18 + pulse * 12;

    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Bullseye core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderDebugOverlay(
    fruits: Fruit[],
    bombs: Bomb[],
    handState: HandTrackingState,
    fps: number
  ): void {
    const ctx = this.ctx;
    ctx.save();

    // 1. Fruit & Bomb Hitbox Wireframes
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1.5;
    for (const f of fruits) {
      if (f.sliceState === 'whole') {
        ctx.beginPath();
        ctx.arc(f.position.x, f.position.y, f.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#ff1744';
    for (const b of bombs) {
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Hand Landmarks Skeleton
    if (handState.landmarks && handState.landmarks.length >= 21) {
      const lms = handState.landmarks;
      const w = this.canvas.width;
      const h = this.canvas.height;

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17],
      ];

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 1.8;
      for (const [i, j] of connections) {
        ctx.beginPath();
        ctx.moveTo(lms[i].x * w, lms[i].y * h);
        ctx.lineTo(lms[j].x * w, lms[j].y * h);
        ctx.stroke();
      }

      for (let i = 0; i < lms.length; i++) {
        const pt = lms[i];
        ctx.fillStyle = i === 8 ? '#ff007f' : '#00e5ff';
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, i === 8 ? 5.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Dual-Coordinate Indicators: Visual vs Low-Latency Collision
    const raw = handState.rawFingertip;
    const visual = handState.fingertip;
    const lowLatency = handState.lowLatencyTip;

    if (raw && visual && lowLatency) {
      // Connect visual to lowLatency tip with predictive vector
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(visual.x, visual.y);
      ctx.lineTo(lowLatency.x, lowLatency.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Visual tip (Cyan)
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(visual.x, visual.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Low-Latency collision tip (Gold with glow)
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(lowLatency.x, lowLatency.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. Section 19 Latency Debug Panel
    ctx.fillStyle = 'rgba(10, 14, 26, 0.88)';
    ctx.fillRect(16, 16, 310, 310);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(16, 16, 310, 310);

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'left';

    const predMag = Math.round(Math.hypot(handState.predictionOffset.x, handState.predictionOffset.y));
    const lines = [
      '--- CAMERA ---',
      `Resolution: ${handState.cameraWidth}x${handState.cameraHeight}`,
      `Camera FPS: ${handState.cameraFps || 30}`,
      '--- HAND TRACKING ---',
      `Tracking FPS: ${handState.trackingFps || 30}`,
      `Confidence: ${Math.round(handState.confidence * 100)}%`,
      `Detection Latency: ~${handState.estimatedLatencyMs} ms`,
      '--- INPUT COORDINATES ---',
      `Raw Tip: (${raw ? Math.round(raw.x) : 0}, ${raw ? Math.round(raw.y) : 0})`,
      `Visual Tip: (${visual ? Math.round(visual.x) : 0}, ${visual ? Math.round(visual.y) : 0})`,
      `Collision Tip: (${lowLatency ? Math.round(lowLatency.x) : 0}, ${lowLatency ? Math.round(lowLatency.y) : 0})`,
      `Velocity: ${Math.round(handState.velocity)} px/s`,
      `Prediction Lead: +${predMag} px`,
      '--- ENGINE TIMING ---',
      `Game Render FPS: ${Math.round(fps)}`,
      `Frame Render Time: ${this.renderTimeMs} ms`,
      `Mode: ${handState.useMouseFallback ? 'MOUSE (Fallback)' : 'WEBCAM (Low Latency)'}`,
    ];

    lines.forEach((line, idx) => {
      if (line.startsWith('---')) {
        ctx.fillStyle = '#ffd700';
      } else {
        ctx.fillStyle = '#00e5ff';
      }
      ctx.fillText(line, 26, 36 + idx * 16.5);
    });

    ctx.restore();
  }
}
