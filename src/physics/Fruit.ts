// AirSlice AI - Fruit & Fruit Halves Physics Engine
import type { FruitType, FruitConfig, SliceState, Point2D } from '../types.js';
import { randomRange } from '../utils/MathUtils.js';

export const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  watermelon: {
    name: 'Watermelon',
    radius: 54,
    mass: 1.8,
    scoreValue: 200,
    outerColor: '#1e5e2e',
    innerColor: '#e0283c',
    rindColor: '#c8e6a5',
    juiceColor: '#ff2a4d',
    hasSeeds: true,
    seedColor: '#1a1a1a',
  },
  orange: {
    name: 'Orange',
    radius: 42,
    mass: 1.0,
    scoreValue: 100,
    outerColor: '#ff8800',
    innerColor: '#ffa726',
    rindColor: '#ffe0b2',
    juiceColor: '#ff9800',
    hasSegments: true,
  },
  apple: {
    name: 'Apple',
    radius: 40,
    mass: 1.1,
    scoreValue: 100,
    outerColor: '#d32f2f',
    innerColor: '#fff9e6',
    juiceColor: '#ffcdd2',
    hasCore: true,
    hasSeeds: true,
    seedColor: '#4a2511',
  },
  banana: {
    name: 'Banana',
    radius: 36,
    mass: 0.9,
    scoreValue: 120,
    outerColor: '#ffd600',
    innerColor: '#fffde7',
    juiceColor: '#fff59d',
  },
  kiwi: {
    name: 'Kiwi',
    radius: 34,
    mass: 0.8,
    scoreValue: 150,
    outerColor: '#795548',
    innerColor: '#7cb342',
    rindColor: '#aed581',
    juiceColor: '#8bc34a',
    hasSeeds: true,
    seedColor: '#1a1a1a',
  },
  pineapple: {
    name: 'Pineapple',
    radius: 52,
    mass: 1.7,
    scoreValue: 250,
    outerColor: '#e69500',
    innerColor: '#ffea00',
    rindColor: '#bf7000',
    juiceColor: '#ffd600',
    hasCore: true,
  },
  coconut: {
    name: 'Coconut',
    radius: 46,
    mass: 1.6,
    scoreValue: 180,
    outerColor: '#4e342e',
    innerColor: '#ffffff',
    rindColor: '#3e2723',
    juiceColor: '#f5f5f5',
  },
};

export class FruitPiece {
  public position: Point2D;
  public velocity: Point2D;
  public rotation: number;
  public angularVelocity: number;
  public halfSide: 1 | -1; // 1 = positive normal side, -1 = negative normal side
  public cutAngle: number;
  public radius: number;
  public fruitType: FruitType;
  public opacity: number = 1;
  public isOffScreen: boolean = false;

  constructor(
    fruitType: FruitType,
    position: Point2D,
    velocity: Point2D,
    cutAngle: number,
    halfSide: 1 | -1,
    radius: number
  ) {
    this.fruitType = fruitType;
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.cutAngle = cutAngle;
    this.halfSide = halfSide;
    this.radius = radius;
    this.rotation = cutAngle;
    this.angularVelocity = randomRange(1.8, 3.8) * halfSide;
  }

  public update(dt: number, gravity: number, canvasHeight: number): void {
    this.velocity.y += gravity * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.rotation += this.angularVelocity * dt;

    if (this.position.y - this.radius > canvasHeight + 100) {
      this.isOffScreen = true;
    }
  }
}

export class Fruit {
  public id: string;
  public type: FruitType;
  public position: Point2D;
  public velocity: Point2D;
  public rotation: number = 0;
  public angularVelocity: number;
  public radius: number;
  public mass: number;
  public scoreValue: number;
  public sliceState: SliceState = 'whole';
  public spawnTime: number;
  public pieces: FruitPiece[] = [];
  public isOffScreen: boolean = false;
  public hasMissed: boolean = false;

  constructor(type: FruitType, startX: number, startY: number, vx: number, vy: number) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.type = type;
    const config = FRUIT_CONFIGS[type];
    this.radius = config.radius;
    this.mass = config.mass;
    this.scoreValue = config.scoreValue;

    this.position = { x: startX, y: startY };
    this.velocity = { x: vx, y: vy };
    this.angularVelocity = randomRange(-2.5, 2.5);
    this.spawnTime = performance.now();
  }

  public update(dt: number, gravity: number, canvasHeight: number, speedMultiplier: number = 1): void {
    const effectiveDt = dt * speedMultiplier;

    if (this.sliceState === 'whole') {
      this.velocity.y += gravity * effectiveDt;
      this.position.x += this.velocity.x * effectiveDt;
      this.position.y += this.velocity.y * effectiveDt;
      this.rotation += this.angularVelocity * effectiveDt;

      // Check if dropped past bottom of the screen
      if (this.velocity.y > 0 && this.position.y - this.radius > canvasHeight) {
        this.isOffScreen = true;
        this.hasMissed = true;
      }
    } else if (this.sliceState === 'sliced') {
      let allPiecesOffScreen = true;
      for (const piece of this.pieces) {
        piece.update(effectiveDt, gravity, canvasHeight);
        if (!piece.isOffScreen) {
          allPiecesOffScreen = false;
        }
      }
      if (allPiecesOffScreen) {
        this.isOffScreen = true;
      }
    }
  }

  /**
   * Slices the fruit along cut direction, creating two realistic separating halves
   */
  public slice(cutNormal: Point2D, cutAngle: number, bladeSpeed: number): FruitPiece[] {
    if (this.sliceState !== 'whole') return [];

    this.sliceState = 'sliced';

    // Impulse separation force based on blade speed
    const baseForce = 220 + Math.min(bladeSpeed * 0.25, 300);

    // Half A (flies along positive normal)
    const vA: Point2D = {
      x: this.velocity.x * 0.7 + cutNormal.x * baseForce + randomRange(-40, 40),
      y: this.velocity.y * 0.7 + cutNormal.y * baseForce - randomRange(30, 90),
    };
    const pieceA = new FruitPiece(this.type, this.position, vA, cutAngle, 1, this.radius);

    // Half B (flies along negative normal)
    const vB: Point2D = {
      x: this.velocity.x * 0.7 - cutNormal.x * baseForce + randomRange(-40, 40),
      y: this.velocity.y * 0.7 - cutNormal.y * baseForce - randomRange(30, 90),
    };
    const pieceB = new FruitPiece(this.type, this.position, vB, cutAngle, -1, this.radius);

    this.pieces = [pieceA, pieceB];
    return this.pieces;
  }
}
