// AirSlice AI - High-Performance Arcade Particle & Juice Engine
import type { Point2D, FruitType } from '../types.js';
import { FRUIT_CONFIGS } from '../physics/Fruit.js';
import { randomRange } from '../utils/MathUtils.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  rotation?: number;
  angularVelocity?: number;
  shape: 'circle' | 'droplet' | 'chunk' | 'spark' | 'smoke' | 'ring';
  maxLife: number;
  life: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  vy: number;
  fontSize: number;
  life: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private maxParticles = 500; // Performance safeguard
  private performanceScale: number = 1.0;

  public setPerformanceScaling(scale: number): void {
    this.performanceScale = Math.max(0.3, Math.min(1.0, scale));
    this.maxParticles = Math.round(500 * this.performanceScale);
  }

  public reset(): void {
    this.particles = [];
    this.floatingTexts = [];
  }

  public update(dt: number): void {
    // 1. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.rotation !== undefined && p.angularVelocity !== undefined) {
        p.rotation += p.angularVelocity * dt;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 0.9);
      ft.scale = Math.min(1.2, ft.scale + dt * 0.4);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.shape === 'ring') {
        // Expanding shockwave ring
        const progress = 1 - p.life / p.maxLife;
        const currentRadius = p.size * (0.2 + progress * 0.8);
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, (1 - progress) * 8);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.stroke();
      } else if (p.shape === 'droplet') {
        // Stretched liquid juice drop along velocity
        const speed = Math.hypot(p.vx, p.vy);
        const angle = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size + speed * 0.015, p.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        // Glowing cutting spark
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'chunk') {
        // Rotating fruit pulp chunk
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
      } else if (p.shape === 'smoke') {
        // Soft billowing smoke cloud
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Render Floating Text
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `900 ${Math.round(ft.fontSize * ft.scale)}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Neon stroke outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeText(ft.text, ft.x, ft.y);

      // Glowing fill
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 14;
      ctx.fillText(ft.text, ft.x, ft.y);

      ctx.restore();
    }
  }

  /**
   * Spawns rich directional juice spray & fruit chunks when a fruit is sliced
   */
  public emitFruitSlice(
    pos: Point2D,
    cutNormal: Point2D,
    type: FruitType,
    bladeSpeed: number
  ): void {
    const config = FRUIT_CONFIGS[type];
    const juiceColor = config.juiceColor;
    const pulpColor = config.innerColor;

    // 1. High-velocity juice droplets
    const dropletCount = 28;
    for (let i = 0; i < dropletCount; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const side = Math.random() < 0.5 ? 1 : -1;
      const spread = randomRange(-0.8, 0.8);
      const spraySpeed = randomRange(150, 480) + Math.min(bladeSpeed * 0.2, 250);

      this.particles.push({
        x: pos.x + randomRange(-10, 10),
        y: pos.y + randomRange(-10, 10),
        vx: cutNormal.x * side * spraySpeed + spread * 180,
        vy: cutNormal.y * side * spraySpeed + randomRange(-120, 60),
        size: randomRange(2.5, 5.5),
        color: juiceColor,
        alpha: 1,
        decay: 1,
        gravity: 520,
        shape: 'droplet',
        maxLife: randomRange(0.45, 0.85),
        life: randomRange(0.45, 0.85),
      });
    }

    // 2. Organic pulp flesh chunks
    const chunkCount = 10;
    for (let i = 0; i < chunkCount; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(100, 320);

      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: randomRange(4, 9),
        color: pulpColor,
        alpha: 1,
        decay: 1,
        gravity: 600,
        rotation: randomRange(0, Math.PI * 2),
        angularVelocity: randomRange(-8, 8),
        shape: 'chunk',
        maxLife: randomRange(0.5, 0.9),
        life: randomRange(0.5, 0.9),
      });
    }

    // 3. Slicing electric spark flash
    for (let i = 0; i < 12; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(160, 450);
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(2, 4),
        color: '#ffffff',
        alpha: 1,
        decay: 1,
        gravity: 100,
        shape: 'spark',
        maxLife: 0.25,
        life: 0.25,
      });
    }
  }

  /**
   * Spawns massive cinematic bomb explosion effects
   */
  public emitBombExplosion(pos: Point2D): void {
    // 1. Shockwave rings
    this.particles.push({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      size: 160,
      color: '#ff1744',
      alpha: 1,
      decay: 1,
      gravity: 0,
      shape: 'ring',
      maxLife: 0.6,
      life: 0.6,
    });
    this.particles.push({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      size: 220,
      color: '#ff9100',
      alpha: 1,
      decay: 1,
      gravity: 0,
      shape: 'ring',
      maxLife: 0.8,
      life: 0.8,
    });

    // 2. Fireball & embers
    for (let i = 0; i < 45; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(180, 620);
      const colors = ['#ffffff', '#ffeb3b', '#ff9800', '#ff1744'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(4, 9),
        color,
        alpha: 1,
        decay: 1,
        gravity: 300,
        shape: 'spark',
        maxLife: randomRange(0.4, 0.9),
        life: randomRange(0.4, 0.9),
      });
    }

    // 3. Heavy billowing smoke puffs
    for (let i = 0; i < 18; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const dist = randomRange(10, 60);
      this.particles.push({
        x: pos.x + Math.cos(angle) * dist,
        y: pos.y + Math.sin(angle) * dist,
        vx: randomRange(-40, 40),
        vy: randomRange(-70, -20),
        size: randomRange(18, 38),
        color: 'rgba(50, 50, 50, 0.45)',
        alpha: 1,
        decay: 1,
        gravity: -20,
        shape: 'smoke',
        maxLife: randomRange(0.8, 1.4),
        life: randomRange(0.8, 1.4),
      });
    }
  }

  /**
   * Spawns celebration confetti on level-up
   */
  public emitLevelUpConfetti(canvasWidth: number): void {
    const colors = ['#00e5ff', '#ff007f', '#ffd700', '#00ff66', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push({
        x: randomRange(canvasWidth * 0.1, canvasWidth * 0.9),
        y: randomRange(-20, 100),
        vx: randomRange(-120, 120),
        vy: randomRange(140, 360),
        size: randomRange(5, 10),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 1,
        gravity: 120,
        rotation: randomRange(0, Math.PI * 2),
        angularVelocity: randomRange(-6, 6),
        shape: 'chunk',
        maxLife: randomRange(1.8, 2.8),
        life: randomRange(1.8, 2.8),
      });
    }
  }

  /**
   * Floating arcade score text
   */
  public addFloatingText(text: string, x: number, y: number, color: string = '#ffd700', fontSize: number = 26): void {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1,
      scale: 0.8,
      vy: -90,
      fontSize,
      life: 0.9,
    });
  }
}
