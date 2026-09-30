// AirSlice AI - Main Application Entrypoint
import './style.css';
import { HandTracker } from './handTracking/HandTracker.js';
import { SoundSynthesizer } from './audio/SoundSynthesizer.js';
import { GameManager } from './game/GameManager.js';
import { UIManager } from './ui/UIManager.js';
import type { GameMode, GameState } from './types.js';

class AirSliceApp {
  private canvas!: HTMLCanvasElement;
  private video!: HTMLVideoElement;
  private overlayContainer!: HTMLElement;

  private tracker!: HandTracker;
  private audio!: SoundSynthesizer;
  private gameManager!: GameManager;
  private uiManager!: UIManager;

  private pipAnimationFrameId: number | null = null;
  public isPointerDown: boolean = false;

  constructor() {
    this.initDOM();
    this.initSubsystems();
    this.setupEventHandlers();
    this.startBackgroundPipLoop();
  }

  private initDOM(): void {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.video = document.getElementById('webcam-video') as HTMLVideoElement;
    this.overlayContainer = document.getElementById('ui-overlay') as HTMLElement;

    // Fixed internal resolution for consistent physics and collision geometry
    this.canvas.width = 1280;
    this.canvas.height = 720;
  }

  private initSubsystems(): void {
    this.audio = new SoundSynthesizer();
    this.tracker = new HandTracker();
    this.tracker.setCanvasDimensions(this.canvas.width, this.canvas.height);

    this.gameManager = new GameManager(this.canvas, this.tracker, this.audio);
    this.uiManager = new UIManager(this.overlayContainer);

    // Initial Camera Attempt in background (non-blocking)
    this.initCameraAsync();
  }

  public async initCameraAsync(deviceId?: string): Promise<boolean> {
    const camPill = document.getElementById('cam-status-pill');
    const camText = document.getElementById('cam-status-text');

    if (camText) camText.textContent = 'Connecting Camera...';

    // Check available devices before starting
    const initialDevices = await this.tracker.getAvailableCameras();
    let targetDeviceId = deviceId;

    if (!targetDeviceId && initialDevices.length > 0) {
      // Prefer real physical webcams over DroidCam/OBS if labels are known
      const physicalCam = initialDevices.find((d) => !/droidcam|obs|virtual/i.test(d.label));
      if (physicalCam) {
        targetDeviceId = physicalCam.deviceId;
      }
    }

    const res = await this.tracker.start(this.video, targetDeviceId);

    // Refresh devices now that permission is granted (labels are now visible)
    const devices = await this.tracker.getAvailableCameras();
    const activeId = this.tracker.cameraHelper.getCurrentDeviceId();
    this.uiManager.populateCameras(devices, activeId);

    const activeDevice = devices.find((d) => d.deviceId === activeId);
    const label = activeDevice?.label || 'Webcam';

    if (res.success) {
      if (camPill) camPill.className = 'status-item';
      if (camText) camText.textContent = `✓ ${label} Active`;

      // Update calibration video feed if active
      const calibVideo = document.getElementById('calib-video') as HTMLVideoElement;
      if (calibVideo && this.video.srcObject) {
        calibVideo.srcObject = this.video.srcObject;
      }
      return true;
    } else {
      console.warn('Webcam connection issue:', res.error);
      this.tracker.setMouseFallback(true);
      if (camPill) camPill.className = 'status-item';
      if (camText) camText.textContent = 'Camera Blocked/Disconnected — Click "Connect Camera"';
      return false;
    }
  }

  private setupEventHandlers(): void {
    // 0. Camera Switcher Callbacks
    this.uiManager.onSwitchCamera = async (deviceId: string) => {
      this.audio.playClick();
      return this.initCameraAsync(deviceId);
    };

    this.uiManager.onConnectCameraClick = async () => {
      this.audio.playClick();
      return this.initCameraAsync();
    };

    // 1. UI Callbacks
    this.uiManager.onStartGame = (mode: GameMode) => {
      this.audio.playClick();
      this.gameManager.setGameMode(mode);
      this.gameManager.startGame();
      this.uiManager.setScreen('playing');
    };

    this.uiManager.onStartCalibration = () => {
      this.audio.playClick();
      this.gameManager.gameState = 'calibrating';
      this.uiManager.setScreen('calibrating');
      const calibVideo = document.getElementById('calib-video') as HTMLVideoElement;
      if (calibVideo && this.video.srcObject) {
        calibVideo.srcObject = this.video.srcObject;
      }
    };

    this.uiManager.onResumeGame = () => {
      this.audio.playClick();
      this.gameManager.resumeGame();
      this.uiManager.setScreen('playing');
    };

    this.uiManager.onRestartGame = () => {
      this.audio.playClick();
      this.gameManager.startGame();
      this.uiManager.setScreen('playing');
    };

    this.uiManager.onMainMenu = () => {
      this.audio.playClick();
      this.gameManager.stopLoop();
      this.gameManager.gameState = 'start';
      this.uiManager.setScreen('start');
    };

    this.uiManager.onToggleMute = () => {
      return this.audio.toggleMute();
    };

    this.uiManager.onVolumeChange = (vol: number) => {
      this.audio.setVolume(vol);
    };

    this.uiManager.onToggleMouseFallback = (val: boolean) => {
      this.tracker.setMouseFallback(val);
    };

    this.uiManager.onToggleDebug = () => {
      this.gameManager.renderer.isDebugMode = !this.gameManager.renderer.isDebugMode;
      return this.gameManager.renderer.isDebugMode;
    };

    this.uiManager.onToggleReducedMotion = (val: boolean) => {
      this.gameManager.renderer.setReducedMotion(val);
    };

    // 2. GameManager Callbacks
    this.gameManager.onStateChange = (state: GameState) => {
      if (state === 'game-over') {
        this.uiManager.showGameOver(this.gameManager.scoreSystem.getStats());
      } else {
        this.uiManager.setScreen(state);
      }
    };

    this.gameManager.onHUDUpdate = () => {
      this.uiManager.updateHUD(
        this.gameManager.scoreSystem.getStats(),
        this.gameManager.lives,
        this.gameManager.gameMode,
        this.gameManager.timeRemaining,
        this.gameManager.activePowerUp,
        this.gameManager.hasShield
      );
    };

    // 3. Pointer & Mouse Fallback Handling on Canvas
    const handlePointer = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.tracker.handlePointerMove(e.clientX, e.clientY, rect);
    };

    window.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.audio.resume();
      handlePointer(e);
    });

    window.addEventListener('pointermove', (e) => {
      // In mouse fallback, tracking responds on cursor movement or drag
      handlePointer(e);
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    // 4. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      this.audio.resume();

      if (e.key === 'd' || e.key === 'D') {
        // Toggle debug overlay
        this.gameManager.renderer.isDebugMode = !this.gameManager.renderer.isDebugMode;
        const chk = document.getElementById('chk-debug-mode') as HTMLInputElement;
        if (chk) chk.checked = this.gameManager.renderer.isDebugMode;
      } else if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        // Space / P to toggle pause
        if (this.gameManager.gameState === 'playing') {
          this.gameManager.pauseGame();
          this.uiManager.setScreen('paused');
        } else if (this.gameManager.gameState === 'paused') {
          this.gameManager.resumeGame();
          this.uiManager.setScreen('playing');
        }
      } else if (e.key === 'm' || e.key === 'M') {
        // Mute toggle
        const isMuted = this.audio.toggleMute();
        const muteIcon = document.getElementById('mute-icon');
        if (muteIcon) muteIcon.textContent = isMuted ? '🔇' : '🔊';
      } else if (e.key === 'r' || e.key === 'R') {
        // Quick restart
        if (this.gameManager.gameState === 'playing' || this.gameManager.gameState === 'game-over') {
          this.gameManager.startGame();
          this.uiManager.setScreen('playing');
        }
      } else if (e.key === 't' || e.key === 'T') {
        // Trigger Thumbs up (Start / Confirm)
        if (this.gameManager.gameState === 'start' || this.gameManager.gameState === 'game-over') {
          this.gameManager.startGame();
          this.uiManager.setScreen('playing');
        }
      }
    });

    // Window blur pauses game safely
    window.addEventListener('blur', () => {
      if (this.gameManager.gameState === 'playing') {
        this.gameManager.pauseGame();
        this.uiManager.setScreen('paused');
      }
    });
  }

  /**
   * Continuous background loop for the mini PiP radar & gesture confirmation outside gameplay
   */
  private startBackgroundPipLoop(): void {
    const pipLoop = () => {
      const handState = this.tracker.getState();
      this.uiManager.updatePiP(this.video, handState);

      // Calibration update
      if (this.gameManager.gameState === 'calibrating') {
        this.uiManager.updateCalibration(handState);
      }

      // Thumbs-up gesture detection on Start and Game Over screens
      if (handState.gesture === 'thumbs-up') {
        if (this.gameManager.gameState === 'start') {
          this.gameManager.startGame();
          this.uiManager.setScreen('playing');
        } else if (this.gameManager.gameState === 'game-over') {
          this.gameManager.startGame();
          this.uiManager.setScreen('playing');
        }
      }

      this.pipAnimationFrameId = requestAnimationFrame(pipLoop);
    };

    this.pipAnimationFrameId = requestAnimationFrame(pipLoop);
  }

  public destroy(): void {
    if (this.pipAnimationFrameId !== null) {
      cancelAnimationFrame(this.pipAnimationFrameId);
      this.pipAnimationFrameId = null;
    }
    this.tracker.stop();
    this.gameManager.stopLoop();
  }
}

// Instantiate game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new AirSliceApp();
});
