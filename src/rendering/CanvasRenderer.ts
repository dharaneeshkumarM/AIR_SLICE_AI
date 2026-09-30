// AirSlice AI - Master Canvas Rendering Pipeline with Screen Shake
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

  // Debug overlay toggle
  public isDebugMode: boolean = false;

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

    // 2. Render Sliced Fruit Pieces (behind whole fruits)
    for (const fruit of fruits) {
      if (fruit.sliceState === 'sliced') {
        for (const piece of fruit.pieces) {
          this.fruitRenderer.renderFruitPiece(ctx, piece);
        }
      }
    }

    // 3. Render Whole Fruits
    for (const fruit of fruits) {
      if (fruit.sliceState === 'whole') {
        this.fruitRenderer.renderWholeFruit(ctx, fruit);
      }
    }

    // 4. Render Bombs
    for (const bomb of bombs) {
      this.fruitRenderer.renderBomb(ctx, bomb);
    }

    // 5. Render Particle System (Juice, Sparks, Floating Scores)
    this.particleSystem.render(ctx);

    // 6. Render Fluid Glowing Blade Trail
    this.bladeRenderer.render(ctx);

    // 7. Render Debug Mode if enabled
    if (this.isDebugMode) {
      this.renderDebugOverlay(fruits, bombs, handState, fps);
    }

    ctx.restore();
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

    // Subtle Perspective Neon Floor Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;

    // Vertical perspective lines
    const horizonY = h * 0.55;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + (x - w * 0.5) * 0.25, horizonY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Horizontal grid lines with perspective spacing
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
    ctx.lineWidth = 2;
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

      // Draw Joint connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
        [5, 9], [9, 13], [13, 17],            // Palm knuckle bridge
      ];

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.lineWidth = 2;
      for (const [i, j] of connections) {
        ctx.beginPath();
        ctx.moveTo(lms[i].x * w, lms[i].y * h);
        ctx.lineTo(lms[j].x * w, lms[j].y * h);
        ctx.stroke();
      }

      // Draw Joint nodes
      for (let i = 0; i < lms.length; i++) {
        const pt = lms[i];
        ctx.fillStyle = i === 8 ? '#ff007f' : '#00e5ff';
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, i === 8 ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Debug HUD Panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(16, 16, 260, 180);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 260, 180);

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'left';

    const tip = handState.fingertip;
    const lines = [
      `FPS: ${Math.round(fps)}`,
      `Hand Detected: ${handState.detected}`,
      `Tracking Confidence: ${Math.round(handState.confidence * 100)}%`,
      `Gesture: ${handState.gesture.toUpperCase()}`,
      `Fingertip: (${tip ? Math.round(tip.x) : 0}, ${tip ? Math.round(tip.y) : 0})`,
      `Blade Velocity: ${Math.round(handState.velocity)} px/s`,
      `Active Fruits: ${fruits.length}`,
      `Active Bombs: ${bombs.length}`,
      `Input Mode: ${handState.useMouseFallback ? 'MOUSE (Fallback)' : 'WEBCAM'}`,
    ];

    lines.forEach((line, idx) => {
      ctx.fillText(line, 28, 38 + idx * 18);
    });

    ctx.restore();
  }
}
