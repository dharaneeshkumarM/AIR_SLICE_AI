// AirSlice AI - Realistic Procedural Fruit & Bomb Renderer
import { Fruit, FruitPiece } from '../physics/Fruit.js';
import { Bomb } from '../physics/Bomb.js';

export class FruitRenderer {
  /**
   * Renders a whole fruit with 3D lighting, textures, and features
   */
  public renderWholeFruit(ctx: CanvasRenderingContext2D, fruit: Fruit): void {
    ctx.save();
    ctx.translate(fruit.position.x, fruit.position.y);
    ctx.rotate(fruit.rotation);

    switch (fruit.type) {
      case 'watermelon':
        this.drawWholeWatermelon(ctx, fruit.radius);
        break;
      case 'orange':
        this.drawWholeOrange(ctx, fruit.radius);
        break;
      case 'apple':
        this.drawWholeApple(ctx, fruit.radius);
        break;
      case 'banana':
        this.drawWholeBanana(ctx, fruit.radius);
        break;
      case 'kiwi':
        this.drawWholeKiwi(ctx, fruit.radius);
        break;
      case 'pineapple':
        this.drawWholePineapple(ctx, fruit.radius);
        break;
      case 'coconut':
        this.drawWholeCoconut(ctx, fruit.radius);
        break;
    }

    ctx.restore();
  }

  /**
   * Renders a sliced fruit piece along its dynamic cut angle
   */
  public renderFruitPiece(ctx: CanvasRenderingContext2D, piece: FruitPiece): void {
    ctx.save();
    ctx.translate(piece.position.x, piece.position.y);
    ctx.rotate(piece.rotation);

    const r = piece.radius;

    // Clip to half circle along cut plane
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.closePath();
    ctx.clip();

    // Render fruit interior cross section
    switch (piece.fruitType) {
      case 'watermelon':
        this.drawCutWatermelon(ctx, r);
        break;
      case 'orange':
        this.drawCutOrange(ctx, r);
        break;
      case 'apple':
        this.drawCutApple(ctx, r);
        break;
      case 'banana':
        this.drawCutBanana(ctx, r);
        break;
      case 'kiwi':
        this.drawCutKiwi(ctx, r);
        break;
      case 'pineapple':
        this.drawCutPineapple(ctx, r);
        break;
      case 'coconut':
        this.drawCutCoconut(ctx, r);
        break;
    }

    // Outer skin border on the curved edge
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.stroke();

    // Cut face highlight line along the flat edge
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();

    ctx.restore();
  }

  // --- WHOLE FRUITS ---

  private drawWholeWatermelon(ctx: CanvasRenderingContext2D, r: number): void {
    // Green base sphere with 3D gradient
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#388e3c');
    grad.addColorStop(0.7, '#1b5e20');
    grad.addColorStop(1, '#0d3813');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Dark wavy stripes
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = '#0a270d';
    ctx.lineWidth = r * 0.18;
    ctx.lineCap = 'round';

    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      const xOffset = (i * r) / 2.5;
      ctx.moveTo(xOffset, -r);
      ctx.bezierCurveTo(xOffset - 12, -r * 0.3, xOffset + 12, r * 0.3, xOffset, r);
      ctx.stroke();
    }
    ctx.restore();

    // Specular highlight
    this.drawSpecularHighlight(ctx, -r * 0.35, -r * 0.35, r * 0.35);
  }

  private drawWholeOrange(ctx: CanvasRenderingContext2D, r: number): void {
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffa726');
    grad.addColorStop(0.65, '#f57c00');
    grad.addColorStop(1, '#d84315');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle peel pores
    ctx.fillStyle = 'rgba(180, 60, 0, 0.2)';
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = (i % 3 === 0 ? 0.4 : 0.7) * r;
      ctx.fillRect(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.5, 1.5);
    }

    // Stem navel dot
    ctx.beginPath();
    ctx.arc(0, -r * 0.85, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4e342e';
    ctx.fill();

    this.drawSpecularHighlight(ctx, -r * 0.3, -r * 0.3, r * 0.3);
  }

  private drawWholeApple(ctx: CanvasRenderingContext2D, r: number): void {
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ef5350');
    grad.addColorStop(0.55, '#c62828');
    grad.addColorStop(1, '#5c0000');

    ctx.beginPath();
    // Heart-like apple silhouette
    ctx.moveTo(0, -r * 0.7);
    ctx.bezierCurveTo(r * 0.8, -r * 1.1, r * 1.1, r * 0.7, 0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.1, r * 0.7, -r * 0.8, -r * 1.1, 0, -r * 0.7);
    ctx.fillStyle = grad;
    ctx.fill();

    // Stem
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.quadraticCurveTo(8, -r * 1.2, 5, -r * 1.35);
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    this.drawSpecularHighlight(ctx, -r * 0.3, -r * 0.3, r * 0.3);
  }

  private drawWholeBanana(ctx: CanvasRenderingContext2D, r: number): void {
    const length = r * 2.2;
    const curve = r * 0.8;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-length * 0.5, -curve * 0.2);
    ctx.quadraticCurveTo(0, curve * 1.1, length * 0.5, -curve * 0.2);
    ctx.quadraticCurveTo(0, curve * 0.3, -length * 0.5, -curve * 0.2);

    const grad = ctx.createLinearGradient(0, -curve, 0, curve);
    grad.addColorStop(0, '#ffee58');
    grad.addColorStop(0.5, '#fdd835');
    grad.addColorStop(1, '#c0ca33');

    ctx.fillStyle = grad;
    ctx.fill();

    // Banana ridge lines
    ctx.strokeStyle = 'rgba(139, 119, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-length * 0.45, 0);
    ctx.quadraticCurveTo(0, curve * 0.75, length * 0.45, 0);
    ctx.stroke();

    // Brown tips
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-length * 0.52, -curve * 0.25, 6, 7);
    ctx.fillRect(length * 0.48, -curve * 0.25, 5, 5);
    ctx.restore();
  }

  private drawWholeKiwi(ctx: CanvasRenderingContext2D, r: number): void {
    // Fuzzy brown oval
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#8d6e63');
    grad.addColorStop(0.7, '#5d4037');
    grad.addColorStop(1, '#3e2723');

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Fuzzy hairs
    ctx.strokeStyle = 'rgba(78, 52, 46, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const x = Math.cos(angle) * r * 1.05;
      const y = Math.sin(angle) * r * 0.85;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3);
      ctx.stroke();
    }
  }

  private drawWholePineapple(ctx: CanvasRenderingContext2D, r: number): void {
    // Diamond quilted amber body
    const bodyHeight = r * 1.35;
    const bodyWidth = r * 0.95;

    const grad = ctx.createRadialGradient(-r * 0.2, 0, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffb300');
    grad.addColorStop(0.65, '#f57c00');
    grad.addColorStop(1, '#bf360c');

    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, bodyWidth, bodyHeight * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Diamond grid
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(120, 40, 0, 0.4)';
    ctx.lineWidth = 2.5;

    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-bodyWidth * 1.2 + i * 20, -bodyHeight);
      ctx.lineTo(bodyWidth * 1.2 + i * 20, bodyHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bodyWidth * 1.2 - i * 20, -bodyHeight);
      ctx.lineTo(-bodyWidth * 1.2 - i * 20, bodyHeight);
      ctx.stroke();
    }
    ctx.restore();

    // Green spiky crown leaves
    ctx.fillStyle = '#2e7d32';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      const x = i * 9;
      ctx.moveTo(x, -bodyHeight * 0.45);
      ctx.quadraticCurveTo(x * 1.5, -bodyHeight * 1.2, x * 2.2, -bodyHeight * 1.1);
      ctx.quadraticCurveTo(x * 0.8, -bodyHeight * 0.7, x, -bodyHeight * 0.45);
      ctx.fill();
    }
  }

  private drawWholeCoconut(ctx: CanvasRenderingContext2D, r: number): void {
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#5d4037');
    grad.addColorStop(0.7, '#3e2723');
    grad.addColorStop(1, '#1b0000');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3 iconic coconut eyes
    ctx.fillStyle = '#1b0000';
    [-12, 12].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, -r * 0.35, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Shell fiber texture
    ctx.strokeStyle = 'rgba(141, 110, 99, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
      ctx.stroke();
    }
  }

  // --- CUT INTERIOR CROSS SECTIONS ---

  private drawCutWatermelon(ctx: CanvasRenderingContext2D, r: number): void {
    // 1. Dark green outer rind
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // 2. Light green/white inner rind ring
    ctx.fillStyle = '#c8e6a5';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI, false);
    ctx.fill();

    // 3. Ruby red juicy pulp
    const pulpGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 0.85);
    pulpGrad.addColorStop(0, '#ff1744');
    pulpGrad.addColorStop(0.7, '#d50000');
    pulpGrad.addColorStop(1, '#b71c1c');

    ctx.fillStyle = pulpGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, Math.PI, false);
    ctx.fill();

    // 4. Black teardrop seeds
    ctx.fillStyle = '#1a1a1a';
    const seedAngles = [0.25, 0.45, 0.65, 0.85, 1.05, 1.25];
    seedAngles.forEach((a) => {
      const sx = Math.cos(a * Math.PI) * r * 0.55;
      const sy = Math.sin(a * Math.PI) * r * 0.55;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a * Math.PI + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawCutOrange(ctx: CanvasRenderingContext2D, r: number): void {
    // Orange peel rim
    ctx.fillStyle = '#f57c00';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // White pith ring
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI, false);
    ctx.fill();

    // Orange segment wedges
    const numSegments = 6;
    for (let i = 0; i < numSegments; i++) {
      const aStart = (i / numSegments) * Math.PI + 0.05;
      const aEnd = ((i + 1) / numSegments) * Math.PI - 0.05;

      ctx.fillStyle = '#ffa726';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r * 0.86, aStart, aEnd, false);
      ctx.closePath();
      ctx.fill();

      // Translucent inner pulp glow
      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r * 0.65, aStart + 0.03, aEnd - 0.03, false);
      ctx.closePath();
      ctx.fill();
    }

    // White center pip
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI, false);
    ctx.fill();
  }

  private drawCutApple(ctx: CanvasRenderingContext2D, r: number): void {
    // Crimson skin rim
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // Creamy white crisp flesh
    const fleshGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.93);
    fleshGrad.addColorStop(0, '#ffffff');
    fleshGrad.addColorStop(0.7, '#fffde7');
    fleshGrad.addColorStop(1, '#fff9c4');

    ctx.fillStyle = fleshGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.94, 0, Math.PI, false);
    ctx.fill();

    // Star core pocket with brown seed
    ctx.fillStyle = '#fff176';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.22, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, 3, 5.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCutBanana(ctx: CanvasRenderingContext2D, r: number): void {
    // Yellow peel rim
    ctx.fillStyle = '#fdd835';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // Creamy pale interior
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI, false);
    ctx.fill();

    // Tri-fold faint center lines
    ctx.fillStyle = 'rgba(180, 160, 100, 0.4)';
    [0.2, 0.5, 0.8].forEach((fraction) => {
      const a = fraction * Math.PI;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawCutKiwi(ctx: CanvasRenderingContext2D, r: number): void {
    // Brown fuzzy peel rim
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // Vibrant emerald green pulp
    const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 0.92);
    grad.addColorStop(0, '#cddc39');
    grad.addColorStop(0.5, '#8bc34a');
    grad.addColorStop(1, '#558b2f');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.93, 0, Math.PI, false);
    ctx.fill();

    // Radiant ray striations
    ctx.strokeStyle = 'rgba(238, 255, 65, 0.5)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
      ctx.lineTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65);
      ctx.stroke();
    }

    // Ring of micro black seeds
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI;
      const dist = r * 0.42 + (i % 2 === 0 ? 3 : -3);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Creamy center core
    ctx.fillStyle = '#f0f4c3';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI, false);
    ctx.fill();
  }

  private drawCutPineapple(ctx: CanvasRenderingContext2D, r: number): void {
    // Spiky amber rind rim
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // Bright golden yellow fibrous core
    const grad = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r * 0.92);
    grad.addColorStop(0, '#fff59d');
    grad.addColorStop(0.6, '#ffee58');
    grad.addColorStop(1, '#fbc02d');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.93, 0, Math.PI, false);
    ctx.fill();

    // Fiber ring & core dot
    ctx.strokeStyle = 'rgba(230, 81, 0, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI, false);
    ctx.stroke();
  }

  private drawCutCoconut(ctx: CanvasRenderingContext2D, r: number): void {
    // Outer brown shell rim
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI, false);
    ctx.fill();

    // Thick snow-white coconut meat ring
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI, false);
    ctx.fill();

    // Hollow dark center
    const hollowGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.65);
    hollowGrad.addColorStop(0, '#100c08');
    hollowGrad.addColorStop(1, '#2c1e18');

    ctx.fillStyle = hollowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI, false);
    ctx.fill();
  }

  // --- BOMB RENDERER ---

  public renderBomb(ctx: CanvasRenderingContext2D, bomb: Bomb): void {
    ctx.save();
    ctx.translate(bomb.position.x, bomb.position.y);
    ctx.rotate(bomb.rotation);

    const r = bomb.radius;

    // Red pulsating danger aura
    const pulse = 0.5 + 0.5 * Math.sin(bomb.fuseTimer * 8);
    ctx.shadowColor = `rgba(255, 23, 68, ${0.4 + pulse * 0.5})`;
    ctx.shadowBlur = 18 + pulse * 14;

    // Dark metallic bomb sphere
    const metalGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    metalGrad.addColorStop(0, '#424242');
    metalGrad.addColorStop(0.65, '#212121');
    metalGrad.addColorStop(1, '#0a0a0a');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = metalGrad;
    ctx.fill();

    ctx.shadowBlur = 0; // Reset shadow

    // Red warning stripe band across equator
    ctx.save();
    ctx.clip();
    ctx.fillStyle = `rgba(255, 23, 68, ${0.7 + pulse * 0.3})`;
    ctx.fillRect(-r, -r * 0.22, r * 2, r * 0.44);

    // Hazard skull / symbol in center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -2, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-r * 0.1, 2, r * 0.2, 5);
    ctx.restore();

    // Brass bomb neck at top
    ctx.fillStyle = '#b78103';
    ctx.fillRect(-r * 0.2, -r * 1.15, r * 0.4, r * 0.25);

    // S-curved burning fuse rope
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    const fusePeakX = Math.sin(bomb.fuseTimer * 12) * 6;
    ctx.quadraticCurveTo(fusePeakX + 10, -r * 1.45, 8, -r * 1.6);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#8d6e63';
    ctx.stroke();

    // Animated sizzling spark at tip of fuse
    const sparkX = 8;
    const sparkY = -r * 1.6;

    // Spark glow
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 4.5 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cross star sparks
    ctx.strokeStyle = '#fff59d';
    ctx.lineWidth = 1.8;
    const sparkSize = 8 + pulse * 5;
    ctx.beginPath();
    ctx.moveTo(sparkX - sparkSize, sparkY);
    ctx.lineTo(sparkX + sparkSize, sparkY);
    ctx.moveTo(sparkX, sparkY - sparkSize);
    ctx.lineTo(sparkX, sparkY + sparkSize);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawSpecularHighlight(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const shine = ctx.createRadialGradient(x, y, 0, x, y, r);
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    shine.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
    shine.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = shine;
    ctx.fill();
  }
}
