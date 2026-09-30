// AirSlice AI - Main Game Engine Manager
import type {
  GameMode,
  GameState,
  GestureType,
  ActivePowerUp,
  PowerUpType,
  Point2D,
} from '../types.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';
import { CollisionDetector } from '../physics/CollisionDetector.js';
import { ScoreSystem } from './ScoreSystem.js';
import { DifficultyManager } from './DifficultyManager.js';
import { CanvasRenderer } from '../rendering/CanvasRenderer.js';
import { HandTracker } from '../handTracking/HandTracker.js';
import { SoundSynthesizer } from '../audio/SoundSynthesizer.js';

export class GameManager {
  public gameState: GameState = 'start';
  public gameMode: GameMode = 'classic';
  public lives: number = 3;
  public maxLives: number = 3;

  // Time Attack mode timer
  public timeRemaining: number = 60.0;

  // Active Power-up state
  public activePowerUp: ActivePowerUp | null = null;
  public hasShield: boolean = false;
  private powerUpCooldown: number = 0;

  // Subsystems
  public physics: PhysicsEngine = new PhysicsEngine();
  public collision: CollisionDetector = new CollisionDetector();
  public scoreSystem: ScoreSystem = new ScoreSystem();
  public difficulty: DifficultyManager = new DifficultyManager();
  public renderer: CanvasRenderer;
  public tracker: HandTracker;
  public audio: SoundSynthesizer;

  // Game loop controls
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  public fps: number = 60;
  private previousCollisionTip: Point2D | null = null;
  private hudUpdateTimer: number = 0;

  // Latency Test Mode
  public isLatencyTestMode: boolean = false;
  private latencyTarget = { x: 400, y: 360, vx: 420, radius: 45 };

  // Callback to update UI
  public onStateChange?: (state: GameState) => void;
  public onHUDUpdate?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    tracker: HandTracker,
    audio: SoundSynthesizer
  ) {
    this.renderer = new CanvasRenderer(canvas);
    this.tracker = tracker;
    this.audio = audio;

    this.physics.setDimensions(canvas.width, canvas.height);
    this.tracker.setCanvasDimensions(canvas.width, canvas.height);
  }

  public setLatencyTestMode(enabled: boolean): void {
    this.isLatencyTestMode = enabled;
    this.renderer.isLatencyTestMode = enabled;
  }

  public setGameMode(mode: GameMode): void {
    this.gameMode = mode;
  }

  public startGame(): void {
    this.audio.resume();
    this.gameState = 'playing';
    this.lives = this.gameMode === 'classic' || this.gameMode === 'endless' ? 3 : 0;
    this.timeRemaining = 60.0;
    this.activePowerUp = null;
    this.hasShield = false;
    this.powerUpCooldown = 0;

    this.physics.reset();
    this.scoreSystem.reset();
    this.difficulty.reset();
    this.renderer.bladeRenderer.clear();
    this.renderer.particleSystem.reset();
    this.previousCollisionTip = null;
    this.hudUpdateTimer = 0;

    if (this.onStateChange) this.onStateChange('playing');
    this.startLoop();
  }

  public pauseGame(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      if (this.onStateChange) this.onStateChange('paused');
    }
  }

  public resumeGame(): void {
    if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.lastFrameTime = performance.now();
      if (this.onStateChange) this.onStateChange('playing');
      this.startLoop();
    }
  }

  public gameOver(): void {
    this.gameState = 'game-over';
    this.audio.playGameOver();
    this.renderer.triggerScreenShake(10, 0.4);
    if (this.onStateChange) this.onStateChange('game-over');
  }

  public activatePowerUp(type: PowerUpType): void {
    if (this.powerUpCooldown > 0) return;

    if (type === 'double-score') {
      this.activePowerUp = {
        type: 'double-score',
        duration: 5.0,
        remainingTime: 5.0,
        startTime: performance.now(),
      };
      this.scoreSystem.setDoubleScore(true);
      this.renderer.bladeRenderer.setPowerUp(true);
      this.audio.playPowerUp('double-score');
      this.powerUpCooldown = 8.0;
    } else if (type === 'shield') {
      this.hasShield = true;
      this.activePowerUp = {
        type: 'shield',
        duration: 10.0,
        remainingTime: 10.0,
        startTime: performance.now(),
      };
      this.audio.playPowerUp('shield');
      this.powerUpCooldown = 8.0;
    }
  }

  public startLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      if (this.gameState !== 'playing') return;

      const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05); // Cap dt to 50ms
      this.lastFrameTime = currentTime;
      this.fps = 1 / Math.max(dt, 0.001);

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(dt: number): void {
    const handState = this.tracker.getState();

    // 1. Process Gestures
    this.handleGesture(handState.gesture);

    // 2. Power-Up Timers
    if (this.powerUpCooldown > 0) {
      this.powerUpCooldown -= dt;
    }

    if (this.activePowerUp) {
      this.activePowerUp.remainingTime -= dt;
      if (this.activePowerUp.remainingTime <= 0) {
        if (this.activePowerUp.type === 'double-score') {
          this.scoreSystem.setDoubleScore(false);
          this.renderer.bladeRenderer.setPowerUp(false);
        } else if (this.activePowerUp.type === 'shield') {
          this.hasShield = false;
        }
        this.activePowerUp = null;
      }
    }

    // 3. Time Attack mode countdown
    if (this.gameMode === 'time-attack') {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.gameOver();
        return;
      }
    }

    // 4. Update Difficulty & Level
    const currentStats = this.scoreSystem.getStats();
    const diffResult = this.difficulty.update(currentStats);
    if (diffResult.didLevelUp) {
      this.audio.playLevelUp();
      this.renderer.triggerScreenShake(8, 0.3);
      this.renderer.particleSystem.emitLevelUpConfetti(1280);
      this.renderer.particleSystem.addFloatingText(
        `LEVEL ${diffResult.level}!`,
        640,
        320,
        '#00e5ff',
        38
      );
    }

    // 5. Update Physics (Fruits & Bombs)
    this.physics.update(
      dt,
      this.gameMode,
      diffResult.level,
      diffResult.difficultyMultiplier,
      false,
      () => {
        // Missed fruit in Classic mode
        if (this.gameMode === 'classic') {
          this.scoreSystem.registerMiss();
          this.lives--;
          this.renderer.triggerScreenShake(6, 0.2);
          if (this.lives <= 0) {
            this.gameOver();
          }
        } else {
          this.scoreSystem.registerMiss();
        }
      }
    );

    // 6. Update Score system combo timer
    this.scoreSystem.update(dt);

    // 7. Decoupled Blade Rendering & Low-Latency Collision Checks
    const visualTip = handState.fingertip;
    const collisionTip = handState.lowLatencyTip || handState.fingertip;

    if (visualTip) {
      this.renderer.bladeRenderer.addPoint(visualTip, handState.velocity);

      // Play whoosh when moving swiftly
      if (handState.velocity > 420) {
        this.audio.playWhoosh(handState.velocity);
      }
    }

    if (collisionTip) {
      // Collision uses low-latency continuous line-segment path
      if (this.previousCollisionTip) {
        this.checkCollisions(this.previousCollisionTip, collisionTip, handState.velocity);
      }
      this.previousCollisionTip = { ...collisionTip };
    } else {
      this.previousCollisionTip = null;
    }

    // 8. Update Renderer (Screen shake + particles)
    this.renderer.update(dt);

    // 9. Throttle UI HUD DOM updates to 12.5 Hz (every 80ms) for high rendering performance
    this.hudUpdateTimer += dt;
    if (this.hudUpdateTimer >= 0.08) {
      this.hudUpdateTimer = 0;
      if (this.onHUDUpdate) this.onHUDUpdate();
    }

    // 10. Adaptive Performance Controller: scale particles if FPS drops below 45
    if (this.fps < 45) {
      this.renderer.particleSystem.setPerformanceScaling(0.5);
    } else {
      this.renderer.particleSystem.setPerformanceScaling(1.0);
    }

    // 11. Latency Test Mode update (if active)
    if (this.isLatencyTestMode) {
      this.updateLatencyTarget(dt, visualTip, collisionTip);
    }
  }

  private updateLatencyTarget(dt: number, _visualTip: Point2D | null, collisionTip: Point2D | null): void {
    const target = this.latencyTarget;
    target.x += target.vx * dt;

    if (target.x > 1280 * 0.85) {
      target.x = 1280 * 0.85;
      target.vx = -Math.abs(target.vx);
    } else if (target.x < 1280 * 0.15) {
      target.x = 1280 * 0.15;
      target.vx = Math.abs(target.vx);
    }

    this.renderer.latencyTarget = { ...target };

    // Check hit
    if (collisionTip) {
      const dist = Math.hypot(collisionTip.x - target.x, collisionTip.y - target.y);
      if (dist < target.radius + 15) {
        const estLatency = this.tracker.getState().estimatedLatencyMs;
        this.renderer.particleSystem.addFloatingText(`HIT! ~${estLatency}ms`, target.x, target.y - 30, '#00e5ff', 30);
        this.audio.playFruitSlice('kiwi');
        target.vx = -target.vx; // Reverse direction on hit
      }
    }
  }

  private handleGesture(gesture: GestureType): void {
    if (gesture === 'palm' && this.gameState === 'playing') {
      this.pauseGame();
    } else if (gesture === 'two-fingers' && this.gameState === 'playing') {
      this.activatePowerUp('double-score');
    } else if (gesture === 'fist' && this.gameState === 'playing') {
      this.activatePowerUp('shield');
    }
  }

  private checkCollisions(prev: Point2D, curr: Point2D, velocity: number): void {
    // 1. Check Fruit Slices
    for (const fruit of this.physics.fruits) {
      if (fruit.sliceState !== 'whole') continue;

      const cut = this.collision.checkFruitSlice(prev, curr, velocity, fruit);
      if (cut.hit) {
        // Slice the fruit into two physical halves
        fruit.slice(cut.cutNormal, cut.cutAngle, velocity);

        // Sound effect
        this.audio.playFruitSlice(fruit.type);

        // Emit fruit-specific juice particles & sparks
        this.renderer.particleSystem.emitFruitSlice(
          cut.entryPoint,
          cut.cutNormal,
          fruit.type,
          velocity
        );

        // Calculate score & combo
        const distRatio = Math.hypot(cut.entryPoint.x - fruit.position.x, cut.entryPoint.y - fruit.position.y) / fruit.radius;
        const res = this.scoreSystem.registerSlice(
          fruit.scoreValue,
          distRatio,
          velocity,
          fruit.spawnTime
        );

        // Play combo chime if combo >= 2
        if (res.combo >= 2) {
          this.audio.playCombo(res.combo);
        }

        // Floating score popup
        const textStr = res.combo >= 2
          ? `+${res.pointsAdded} COMBO x${res.combo}`
          : `+${res.pointsAdded}`;
        const textColor = res.isPerfect ? '#00e5ff' : res.combo >= 3 ? '#ff007f' : '#ffd700';

        this.renderer.particleSystem.addFloatingText(
          textStr,
          fruit.position.x,
          fruit.position.y - 20,
          textColor,
          res.isPerfect ? 32 : 26
        );

        // Subtle slice screen shake for large fruits
        if (fruit.type === 'watermelon' || fruit.type === 'pineapple') {
          this.renderer.triggerScreenShake(6, 0.18);
        }
      }
    }

    // 2. Check Bomb Hits
    for (const bomb of this.physics.bombs) {
      if (bomb.isExploded) continue;

      const hit = this.collision.checkBombHit(prev, curr, velocity, bomb);
      if (hit) {
        bomb.explode();
        this.renderer.particleSystem.emitBombExplosion(bomb.position);
        this.audio.playBombExplosion();
        this.renderer.triggerScreenShake(22, 0.55);

        // Shield protection check
        if (this.hasShield) {
          this.hasShield = false;
          if (this.activePowerUp && this.activePowerUp.type === 'shield') {
            this.activePowerUp = null;
          }
          this.renderer.particleSystem.addFloatingText('SHIELD SAVED!', bomb.position.x, bomb.position.y - 30, '#00e5ff', 32);
          continue;
        }

        // Bomb penalty
        this.scoreSystem.registerBombHit();
        if (this.gameMode === 'time-attack') {
          this.timeRemaining = Math.max(0, this.timeRemaining - 10);
          this.scoreSystem.getStats().score = Math.max(0, this.scoreSystem.getStats().score - 1000);
          this.renderer.particleSystem.addFloatingText('-10 SECONDS!', bomb.position.x, bomb.position.y - 30, '#ff1744', 32);
        } else {
          this.lives--;
          this.renderer.particleSystem.addFloatingText('BOMB HIT! -1 LIFE', bomb.position.x, bomb.position.y - 30, '#ff1744', 32);
          if (this.lives <= 0) {
            this.gameOver();
          }
        }
      }
    }
  }

  private render(): void {
    const handState = this.tracker.getState();
    this.renderer.render(
      this.physics.fruits,
      this.physics.bombs,
      handState,
      this.fps
    );
  }
}
