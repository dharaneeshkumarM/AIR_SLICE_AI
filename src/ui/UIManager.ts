// AirSlice AI - Complete Arcade UI & Modal Manager
import type { GameMode, GameState, HandTrackingState, GameStats, ActivePowerUp } from '../types.js';

export class UIManager {
  private container: HTMLElement;

  // DOM Elements cache
  private startScreen!: HTMLElement;
  private calibrationScreen!: HTMLElement;
  private hudElement!: HTMLElement;
  private pauseModal!: HTMLElement;
  private gameOverModal!: HTMLElement;
  private howToPlayModal!: HTMLElement;
  private settingsModal!: HTMLElement;

  // HUD elements
  private scoreVal!: HTMLElement;
  private comboVal!: HTMLElement;
  private levelVal!: HTMLElement;
  private fruitsVal!: HTMLElement;
  private livesContainer!: HTMLElement;
  private timerContainer!: HTMLElement;
  private timerVal!: HTMLElement;
  private powerUpContainer!: HTMLElement;
  private powerUpLabel!: HTMLElement;
  private powerUpBar!: HTMLElement;

  // PiP elements
  private pipCanvas!: HTMLCanvasElement;
  private pipCtx!: CanvasRenderingContext2D;
  private pipStatusBadge!: HTMLElement;
  private pipGestureBadge!: HTMLElement;

  // Calibration state
  private calibStep: 'detect' | 'left' | 'right' | 'complete' = 'detect';
  private calibInstruction!: HTMLElement;
  private calibProgress!: HTMLElement;
  private calibLeftIndicator!: HTMLElement;
  private calibRightIndicator!: HTMLElement;

  // Callbacks
  public onStartGame?: (mode: GameMode) => void;
  public onStartCalibration?: () => void;
  public onPauseGame?: () => void;
  public onResumeGame?: () => void;
  public onRestartGame?: () => void;
  public onMainMenu?: () => void;
  public onToggleMute?: () => boolean;
  public onVolumeChange?: (val: number) => void;
  public onToggleMouseFallback?: (val: boolean) => void;
  public onToggleDebug?: () => boolean;
  public onToggleReducedMotion?: (val: boolean) => void;
  public onSwitchCamera?: (deviceId: string) => Promise<boolean>;
  public onConnectCameraClick?: () => Promise<boolean>;
  public onToggleLatencyTest?: (val: boolean) => void;

  private selectedMode: GameMode = 'classic';

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildUI();
    this.bindEvents();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <!-- 1. START SCREEN -->
      <div id="start-screen" class="ui-screen active">
        <div class="arcade-glow-bg"></div>
        <div class="start-content">
          <div class="brand-badge"><span>⚡</span> REAL-TIME HAND GESTURE ARCADE</div>
          <h1 class="game-title">AIRSLICE <span class="neon-text">AI</span></h1>
          <p class="game-subtitle">SLICE FRUITS IN THE AIR USING YOUR WEBCAM & FINGERTIP</p>

          <div class="mode-selector">
            <button class="mode-card active" data-mode="classic">
              <span class="mode-icon">⚔️</span>
              <div class="mode-info">
                <strong>CLASSIC</strong>
                <small>3 Lives, Bombs, Combos</small>
              </div>
            </button>
            <button class="mode-card" data-mode="time-attack">
              <span class="mode-icon">⏱️</span>
              <div class="mode-info">
                <strong>TIME ATTACK</strong>
                <small>60s Frenzy Challenge</small>
              </div>
            </button>
            <button class="mode-card" data-mode="endless">
              <span class="mode-icon">♾️</span>
              <div class="mode-info">
                <strong>ENDLESS</strong>
                <small>Adaptive Progression</small>
              </div>
            </button>
            <button class="mode-card" data-mode="training">
              <span class="mode-icon">🧘</span>
              <div class="mode-info">
                <strong>TRAINING</strong>
                <small>Zen Mode, No Bombs</small>
              </div>
            </button>
          </div>

          <div class="menu-actions">
            <button id="btn-start" class="btn btn-primary btn-large glow-btn">
              <span>START GAME</span>
              <span class="btn-sub">☝️ OR THUMBS UP</span>
            </button>
            <button id="btn-calibrate" class="btn btn-secondary">
              <span>CALIBRATE CAMERA</span>
            </button>
            <button id="btn-how-to-play" class="btn btn-secondary">
              <span>HOW TO PLAY</span>
            </button>
            <button id="btn-settings" class="btn btn-secondary">
              <span>SETTINGS</span>
            </button>
          </div>

          <div class="device-status-bar">
            <div class="status-item" id="cam-status-pill">
              <span class="status-dot green"></span>
              <span id="cam-status-text">Webcam Ready / Mouse Available</span>
            </div>
            <div class="status-item" id="hand-status-pill">
              <span class="status-dot yellow" id="hand-dot"></span>
              <span id="hand-status-text">Awaiting Hand</span>
            </div>
          </div>

          <div class="camera-controls-bar">
            <select id="camera-select" class="camera-dropdown" title="Select Webcam Device">
              <option value="">Default Webcam</option>
            </select>
            <button id="btn-connect-cam" class="btn-cam-action" title="Connect / Switch Camera">
              <span>📷 CONNECT / SWITCH CAMERA</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. CALIBRATION SCREEN -->
      <div id="calibration-screen" class="ui-screen">
        <div class="calib-modal glass-panel">
          <h2>CAMERA & GESTURE CALIBRATION</h2>
          <p class="calib-desc">Ensure your hand is clearly visible and within webcam frame.</p>

          <div class="camera-controls-bar" style="margin-bottom: 16px;">
            <select id="calib-camera-select" class="camera-dropdown" title="Select Webcam Device">
              <option value="">Default Webcam</option>
            </select>
            <button id="btn-calib-connect-cam" class="btn-cam-action">
              <span>📷 SWITCH CAMERA</span>
            </button>
          </div>

          <div class="calib-pip-container">
            <video id="calib-video" autoplay playsinline muted></video>
            <div class="calib-zone left" id="calib-zone-left">
              <span>← MOVE LEFT</span>
            </div>
            <div class="calib-zone right" id="calib-zone-right">
              <span>MOVE RIGHT →</span>
            </div>
          </div>

          <div class="calib-instruction-box">
            <h3 id="calib-instruction">Move your hand into the camera frame</h3>
            <div class="calib-progress-bar">
              <div id="calib-progress" style="width: 20%;"></div>
            </div>
          </div>

          <div class="calib-metrics">
            <div class="metric"><label>Camera Status:</label> <span id="calib-cam-state">Connected</span></div>
            <div class="metric"><label>Hand Tracking:</label> <span id="calib-track-pct">0%</span></div>
            <div class="metric"><label>Gesture:</label> <span id="calib-gesture-name">NONE</span></div>
          </div>

          <div class="calib-actions">
            <button id="btn-calib-skip" class="btn btn-primary">
              <span>SKIP & PLAY</span>
            </button>
            <button id="btn-calib-back" class="btn btn-secondary">
              <span>BACK TO MENU</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. IN-GAME HUD -->
      <div id="game-hud" class="ui-screen">
        <div class="hud-top">
          <!-- Left: Score & Combo -->
          <div class="hud-stats-group glass-panel">
            <div class="hud-stat">
              <span class="hud-label">SCORE</span>
              <span id="hud-score" class="hud-value neon-cyan">0</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">COMBO</span>
              <span id="hud-combo" class="hud-value neon-gold">x0</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">LEVEL</span>
              <span id="hud-level" class="hud-value">1</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">FRUITS</span>
              <span id="hud-fruits" class="hud-value">0</span>
            </div>
          </div>

          <!-- Center: Lives or Timer -->
          <div class="hud-center-group">
            <div id="hud-lives" class="lives-container">
              <span class="heart active">❤️</span>
              <span class="heart active">❤️</span>
              <span class="heart active">❤️</span>
            </div>
            <div id="hud-timer" class="timer-container" style="display: none;">
              <span class="timer-icon">⏱️</span>
              <span id="hud-timer-val" class="timer-val">60.0s</span>
            </div>

            <!-- Active Power-Up Banner -->
            <div id="hud-powerup" class="powerup-badge" style="display: none;">
              <span id="hud-powerup-label">2X SCORE</span>
              <div class="powerup-bar-track">
                <div id="hud-powerup-bar" class="powerup-bar-fill"></div>
              </div>
            </div>
          </div>

          <!-- Right: Mini PiP Camera & Controls -->
          <div class="hud-right-group">
            <div class="mini-pip glass-panel">
              <canvas id="pip-canvas" width="160" height="120"></canvas>
              <div class="pip-overlay">
                <span id="pip-status-badge" class="pip-badge red">NO HAND</span>
                <span id="pip-gesture-badge" class="pip-badge blue">NONE</span>
              </div>
            </div>

            <div class="hud-quick-buttons">
              <button id="btn-hud-pause" class="icon-btn" title="Pause Game (Open Palm ✋)">
                <span>⏸️</span>
              </button>
              <button id="btn-hud-mute" class="icon-btn" title="Toggle Sound">
                <span id="mute-icon">🔊</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. PAUSE MODAL -->
      <div id="pause-modal" class="modal-overlay">
        <div class="modal-card glass-panel" style="text-align: center; max-width: 440px;">
          <h2>GAME PAUSED</h2>
          <div style="margin: 16px 0; padding: 14px; background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.35); border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 12px;">
            <span style="font-size: 32px; filter: drop-shadow(0 0 8px #00e5ff);">✋</span>
            <div style="text-align: left;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #fff;">Show OPEN PALM (✋) again</p>
              <span style="font-size: 12px; color: #00e5ff;">to resume playing anytime</span>
            </div>
          </div>
          <div class="modal-buttons" style="display: flex; gap: 10px; justify-content: center;">
            <button id="btn-pause-resume" class="btn btn-primary">RESUME</button>
            <button id="btn-pause-restart" class="btn btn-secondary">RESTART</button>
            <button id="btn-pause-menu" class="btn btn-secondary">MAIN MENU</button>
          </div>
        </div>
      </div>

      <!-- 5. GAME OVER MODAL -->
      <div id="game-over-modal" class="modal-overlay">
        <div class="modal-card glass-panel game-over-card">
          <div class="go-header">
            <span class="go-badge">GAME OVER</span>
            <h2 id="go-final-score" class="neon-gold">0</h2>
            <p id="go-high-score-label">BEST SCORE: <strong id="go-high-score">0</strong></p>
          </div>

          <div class="analytics-grid">
            <div class="analytic-item">
              <span class="label">FRUITS SLICED</span>
              <strong id="go-fruits-sliced">0</strong>
            </div>
            <div class="analytic-item">
              <span class="label">BEST COMBO</span>
              <strong id="go-best-combo">x0</strong>
            </div>
            <div class="analytic-item">
              <span class="label">BOMBS HIT</span>
              <strong id="go-bombs-hit">0</strong>
            </div>
            <div class="analytic-item">
              <span class="label">ACCURACY</span>
              <strong id="go-accuracy">100%</strong>
            </div>
            <div class="analytic-item">
              <span class="label">AVG REACTION</span>
              <strong id="go-reaction-time">0.42s</strong>
            </div>
            <div class="analytic-item">
              <span class="label">FINAL LEVEL</span>
              <strong id="go-level">1</strong>
            </div>
          </div>

          <div class="modal-buttons">
            <button id="btn-go-replay" class="btn btn-primary btn-large">
              <span>PLAY AGAIN</span>
              <span class="btn-sub">👍 THUMBS UP</span>
            </button>
            <button id="btn-go-menu" class="btn btn-secondary">MAIN MENU</button>
          </div>
        </div>
      </div>

      <!-- 6. HOW TO PLAY MODAL -->
      <div id="how-to-play-modal" class="modal-overlay">
        <div class="modal-card glass-panel wide-modal">
          <h2>HOW TO PLAY AIRSLICE AI</h2>
          <p class="subtitle">Use your hand gestures in the air in front of your webcam!</p>

          <div class="gestures-guide">
            <div class="gesture-card">
              <div class="gesture-icon">☝️</div>
              <strong>INDEX FINGER</strong>
              <p>Virtual slicing blade. Move quickly across fruits to slice!</p>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">✋</div>
              <strong>OPEN PALM</strong>
              <p>Pause or resume the game anytime.</p>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">✌️</div>
              <strong>TWO FINGERS</strong>
              <p>Activates DOUBLE SCORE (2X) power-up for 5 seconds!</p>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">✊</div>
              <strong>FIST</strong>
              <p>Activates SHIELD power-up to protect from 1 bomb explosion.</p>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">👍</div>
              <strong>THUMBS UP</strong>
              <p>Quick start / confirm / play again.</p>
            </div>
          </div>

          <div class="rules-guide">
            <div class="rule-col">
              <h4>🎯 SCORING & COMBOS</h4>
              <ul>
                <li>Slice consecutive fruits in swift succession to rack up combo multipliers (x2, x3, x4+).</li>
                <li>Center hits award a <strong>+50% Perfect Slice</strong> bonus.</li>
                <li>Fast slashes (>600 px/s) grant a <strong>+25% Speed Bonus</strong>.</li>
              </ul>
            </div>
            <div class="rule-col">
              <h4>💣 HAZARDS & BOMBS</h4>
              <ul>
                <li>Beware the black hazard bombs with glowing sizzling fuses!</li>
                <li>Hitting a bomb removes 1 life (or 10s in Time Attack) unless Shielded!</li>
              </ul>
            </div>
          </div>

          <button id="btn-close-htp" class="btn btn-primary" style="margin-top: 20px;">GOT IT!</button>
        </div>
      </div>

      <!-- 7. SETTINGS MODAL -->
      <div id="settings-modal" class="modal-overlay">
        <div class="modal-card glass-panel">
          <h2>GAME SETTINGS</h2>

          <div class="setting-row">
            <label>Master Volume:</label>
            <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="0.7">
          </div>

          <div class="setting-row">
            <label>Camera Device:</label>
            <select id="settings-camera-select" class="camera-dropdown">
              <option value="">Default Webcam</option>
            </select>
          </div>

          <div class="setting-row">
            <label>Mouse Blade Fallback:</label>
            <label class="toggle-switch">
              <input type="checkbox" id="chk-mouse-fallback">
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <label>Reduced Motion (Screen Shake):</label>
            <label class="toggle-switch">
              <input type="checkbox" id="chk-reduced-motion">
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <label>Debug Overlay (Key: D):</label>
            <label class="toggle-switch">
              <input type="checkbox" id="chk-debug-mode">
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <label>Latency Test Mode (Target Track):</label>
            <label class="toggle-switch">
              <input type="checkbox" id="chk-latency-test">
              <span class="slider"></span>
            </label>
          </div>

          <button id="btn-close-settings" class="btn btn-primary" style="margin-top: 24px;">SAVE & CLOSE</button>
        </div>
      </div>
    `;

    // Cache elements
    this.startScreen = document.getElementById('start-screen')!;
    this.calibrationScreen = document.getElementById('calibration-screen')!;
    this.hudElement = document.getElementById('game-hud')!;
    this.pauseModal = document.getElementById('pause-modal')!;
    this.gameOverModal = document.getElementById('game-over-modal')!;
    this.howToPlayModal = document.getElementById('how-to-play-modal')!;
    this.settingsModal = document.getElementById('settings-modal')!;

    this.scoreVal = document.getElementById('hud-score')!;
    this.comboVal = document.getElementById('hud-combo')!;
    this.levelVal = document.getElementById('hud-level')!;
    this.fruitsVal = document.getElementById('hud-fruits')!;
    this.livesContainer = document.getElementById('hud-lives')!;
    this.timerContainer = document.getElementById('hud-timer')!;
    this.timerVal = document.getElementById('hud-timer-val')!;
    this.powerUpContainer = document.getElementById('hud-powerup')!;
    this.powerUpLabel = document.getElementById('hud-powerup-label')!;
    this.powerUpBar = document.getElementById('hud-powerup-bar')!;

    this.pipCanvas = document.getElementById('pip-canvas') as HTMLCanvasElement;
    this.pipCtx = this.pipCanvas.getContext('2d')!;
    this.pipStatusBadge = document.getElementById('pip-status-badge')!;
    this.pipGestureBadge = document.getElementById('pip-gesture-badge')!;

    this.calibInstruction = document.getElementById('calib-instruction')!;
    this.calibProgress = document.getElementById('calib-progress')!;
    this.calibLeftIndicator = document.getElementById('calib-zone-left')!;
    this.calibRightIndicator = document.getElementById('calib-zone-right')!;
  }

  private bindEvents(): void {
    // Mode selector clicks
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        modeCards.forEach((c) => c.classList.remove('active'));
        const btn = (e.currentTarget as HTMLElement);
        btn.classList.add('active');
        this.selectedMode = btn.dataset.mode as GameMode;
      });
    });

    // Start Game
    document.getElementById('btn-start')?.addEventListener('click', () => {
      if (this.onStartGame) this.onStartGame(this.selectedMode);
    });

    // Calibration
    document.getElementById('btn-calibrate')?.addEventListener('click', () => {
      if (this.onStartCalibration) this.onStartCalibration();
    });

    document.getElementById('btn-calib-skip')?.addEventListener('click', () => {
      if (this.onStartGame) this.onStartGame(this.selectedMode);
    });

    document.getElementById('btn-calib-back')?.addEventListener('click', () => {
      this.setScreen('start');
    });

    // How to Play
    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      this.howToPlayModal.classList.add('active');
    });
    document.getElementById('btn-close-htp')?.addEventListener('click', () => {
      this.howToPlayModal.classList.remove('active');
    });

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.settingsModal.classList.add('active');
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.settingsModal.classList.remove('active');
    });

    // Volume Slider
    document.getElementById('vol-slider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (this.onVolumeChange) this.onVolumeChange(val);
    });

    // Mouse Fallback Toggle
    document.getElementById('chk-mouse-fallback')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).checked;
      if (this.onToggleMouseFallback) this.onToggleMouseFallback(val);
    });

    // Reduced Motion Toggle
    document.getElementById('chk-reduced-motion')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).checked;
      if (this.onToggleReducedMotion) this.onToggleReducedMotion(val);
    });

    // Debug Mode Toggle
    document.getElementById('chk-debug-mode')?.addEventListener('change', () => {
      if (this.onToggleDebug) this.onToggleDebug();
    });

    // Latency Test Mode Toggle
    document.getElementById('chk-latency-test')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).checked;
      if (this.onToggleLatencyTest) this.onToggleLatencyTest(val);
    });

    // Pause Controls
    document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
      this.pauseModal.classList.add('active');
      if (this.onPauseGame) this.onPauseGame();
    });
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.pauseModal.classList.remove('active');
      if (this.onResumeGame) this.onResumeGame();
    });
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.pauseModal.classList.remove('active');
      if (this.onRestartGame) this.onRestartGame();
    });
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
      this.pauseModal.classList.remove('active');
      if (this.onMainMenu) this.onMainMenu();
    });

    // HUD Mute button
    document.getElementById('btn-hud-mute')?.addEventListener('click', () => {
      if (this.onToggleMute) {
        const isMuted = this.onToggleMute();
        document.getElementById('mute-icon')!.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    // Camera selection event listeners
    const onCamChange = (e: Event) => {
      const deviceId = (e.target as HTMLSelectElement).value;
      if (this.onSwitchCamera) this.onSwitchCamera(deviceId);
    };

    document.getElementById('camera-select')?.addEventListener('change', onCamChange);
    document.getElementById('calib-camera-select')?.addEventListener('change', onCamChange);
    document.getElementById('settings-camera-select')?.addEventListener('change', onCamChange);

    // Connect Camera button clicks
    const onCamClick = () => {
      if (this.onConnectCameraClick) this.onConnectCameraClick();
    };
    document.getElementById('btn-connect-cam')?.addEventListener('click', onCamClick);
    document.getElementById('btn-calib-connect-cam')?.addEventListener('click', onCamClick);

    // Game Over Buttons
    document.getElementById('btn-go-replay')?.addEventListener('click', () => {
      this.gameOverModal.classList.remove('active');
      if (this.onStartGame) this.onStartGame(this.selectedMode);
    });
    document.getElementById('btn-go-menu')?.addEventListener('click', () => {
      this.gameOverModal.classList.remove('active');
      if (this.onMainMenu) this.onMainMenu();
    });
  }

  public setScreen(state: GameState): void {
    // Hide all full-screen views
    this.startScreen.classList.remove('active');
    this.calibrationScreen.classList.remove('active');
    this.hudElement.classList.remove('active');
    this.pauseModal.classList.remove('active');
    this.gameOverModal.classList.remove('active');

    switch (state) {
      case 'start':
        this.startScreen.classList.add('active');
        break;
      case 'calibrating':
        this.calibrationScreen.classList.add('active');
        this.calibStep = 'detect';
        break;
      case 'playing':
        this.hudElement.classList.add('active');
        break;
      case 'paused':
        this.hudElement.classList.add('active');
        this.pauseModal.classList.add('active');
        break;
      case 'game-over':
        this.hudElement.classList.add('active');
        this.gameOverModal.classList.add('active');
        break;
    }
  }

  public updateHUD(
    stats: GameStats,
    lives: number,
    gameMode: GameMode,
    timeRemaining: number,
    activePowerUp: ActivePowerUp | null,
    hasShield: boolean
  ): void {
    this.scoreVal.textContent = stats.score.toLocaleString();
    this.comboVal.textContent = stats.currentCombo > 1 ? `x${stats.currentCombo}` : 'x0';
    this.levelVal.textContent = stats.level.toString();
    this.fruitsVal.textContent = stats.fruitsSliced.toString();

    // Mode-specific display
    if (gameMode === 'time-attack') {
      this.livesContainer.style.display = 'none';
      this.timerContainer.style.display = 'flex';
      this.timerVal.textContent = `${timeRemaining.toFixed(1)}s`;
    } else if (gameMode === 'training') {
      this.livesContainer.style.display = 'none';
      this.timerContainer.style.display = 'none';
    } else {
      this.timerContainer.style.display = 'none';
      this.livesContainer.style.display = 'flex';
      // Update 3 hearts
      const hearts = this.livesContainer.querySelectorAll('.heart');
      hearts.forEach((h, idx) => {
        if (idx < lives) {
          h.classList.add('active');
        } else {
          h.classList.remove('active');
        }
      });
    }

    // Power-Up Display
    if (activePowerUp) {
      this.powerUpContainer.style.display = 'flex';
      const pct = Math.max(0, (activePowerUp.remainingTime / activePowerUp.duration) * 100);
      this.powerUpBar.style.width = `${pct}%`;
      this.powerUpLabel.textContent =
        activePowerUp.type === 'double-score'
          ? `2X SCORE: ${activePowerUp.remainingTime.toFixed(1)}s`
          : `SHIELD ACTIVE: ${activePowerUp.remainingTime.toFixed(1)}s`;
    } else if (hasShield) {
      this.powerUpContainer.style.display = 'flex';
      this.powerUpBar.style.width = '100%';
      this.powerUpLabel.textContent = 'SHIELD ACTIVE';
    } else {
      this.powerUpContainer.style.display = 'none';
    }
  }

  public updatePiP(video: HTMLVideoElement | null, handState: HandTrackingState): void {
    const ctx = this.pipCtx;
    const w = this.pipCanvas.width;
    const h = this.pipCanvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Draw Mirrored video frame
    if (video && video.readyState >= 2) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(0, 0, w, h);
    }

    // Hand Landmark overlay on PiP
    if (handState.landmarks && handState.landmarks.length >= 21) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      const lms = handState.landmarks;

      // Draw simplified skeleton on PiP
      const pairs = [[0, 5], [5, 8], [0, 9], [9, 12], [0, 17], [17, 20]];
      for (const [a, b] of pairs) {
        ctx.beginPath();
        ctx.moveTo(lms[a].x * w, lms[a].y * h);
        ctx.lineTo(lms[b].x * w, lms[b].y * h);
        ctx.stroke();
      }

      // Fingertip dot
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(lms[8].x * w, lms[8].y * h, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Status badges
    if (handState.detected) {
      this.pipStatusBadge.textContent = `${Math.round(handState.confidence * 100)}% DETECTED`;
      this.pipStatusBadge.className = 'pip-badge green';
    } else {
      this.pipStatusBadge.textContent = 'NO HAND';
      this.pipStatusBadge.className = 'pip-badge red';
    }

    const isPaused = this.pauseModal?.classList.contains('active');
    const gestureIcons: Record<string, string> = {
      index: '☝️ SLICE',
      palm: isPaused ? '✋ RESUME' : '✋ PAUSE',
      'two-fingers': '✌️ 2X',
      fist: '✊ SHIELD',
      'thumbs-up': '👍 CONFIRM',
      none: 'HAND',
    };
    this.pipGestureBadge.textContent = gestureIcons[handState.gesture] || handState.gesture.toUpperCase();

    // Also update start screen status indicators
    const handDot = document.getElementById('hand-dot');
    const handText = document.getElementById('hand-status-text');
    if (handDot && handText) {
      if (handState.detected) {
        handDot.className = 'status-dot green';
        handText.textContent = `Hand Detected (${gestureIcons[handState.gesture] || 'INDEX'})`;
      } else {
        handDot.className = 'status-dot yellow';
        handText.textContent = 'Awaiting Hand in Webcam Frame';
      }
    }
  }

  public updateCalibration(handState: HandTrackingState): void {
    const trackPct = document.getElementById('calib-track-pct');
    const gestureName = document.getElementById('calib-gesture-name');
    if (trackPct) trackPct.textContent = `${Math.round(handState.confidence * 100)}%`;
    if (gestureName) gestureName.textContent = handState.gesture.toUpperCase();

    const tip = handState.fingertip;
    if (!handState.detected || !tip) {
      this.calibInstruction.textContent = 'Move your hand into the camera frame';
      this.calibProgress.style.width = '15%';
      return;
    }

    // Step 1: Detect hand
    if (this.calibStep === 'detect') {
      this.calibInstruction.textContent = '← Move your index fingertip to the LEFT target';
      this.calibLeftIndicator.classList.add('active');
      this.calibProgress.style.width = '40%';
      this.calibStep = 'left';
    }

    // Step 2: Move left
    if (this.calibStep === 'left') {
      if (tip.x < 350) {
        this.calibLeftIndicator.classList.remove('active');
        this.calibLeftIndicator.classList.add('completed');
        this.calibRightIndicator.classList.add('active');
        this.calibInstruction.textContent = 'Move your index fingertip to the RIGHT target →';
        this.calibProgress.style.width = '70%';
        this.calibStep = 'right';
      }
    }

    // Step 3: Move right
    if (this.calibStep === 'right') {
      if (tip.x > 930) {
        this.calibRightIndicator.classList.remove('active');
        this.calibRightIndicator.classList.add('completed');
        this.calibInstruction.textContent = '✓ Calibration Complete! Ready to slice!';
        this.calibProgress.style.width = '100%';
        this.calibStep = 'complete';

        // Auto start after 1.2s
        setTimeout(() => {
          if (this.onStartGame) this.onStartGame(this.selectedMode);
        }, 1200);
      }
    }
  }

  public showGameOver(stats: GameStats): void {
    document.getElementById('go-final-score')!.textContent = stats.score.toLocaleString();
    document.getElementById('go-high-score')!.textContent = stats.highScore.toLocaleString();
    document.getElementById('go-fruits-sliced')!.textContent = stats.fruitsSliced.toString();
    document.getElementById('go-best-combo')!.textContent = `x${stats.maxCombo}`;
    document.getElementById('go-bombs-hit')!.textContent = stats.bombsHit.toString();
    document.getElementById('go-accuracy')!.textContent = `${stats.accuracy}%`;
    document.getElementById('go-reaction-time')!.textContent = `${stats.averageReactionTime}s`;
    document.getElementById('go-level')!.textContent = stats.level.toString();

    this.setScreen('game-over');
  }

  public populateCameras(devices: MediaDeviceInfo[], activeDeviceId?: string): void {
    const selects = [
      document.getElementById('camera-select') as HTMLSelectElement | null,
      document.getElementById('calib-camera-select') as HTMLSelectElement | null,
      document.getElementById('settings-camera-select') as HTMLSelectElement | null,
    ];

    selects.forEach((sel) => {
      if (!sel) return;
      sel.innerHTML = '';

      if (devices.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Default Webcam';
        sel.appendChild(opt);
        return;
      }

      devices.forEach((dev, idx) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || `Camera ${idx + 1}`;
        if (activeDeviceId && dev.deviceId === activeDeviceId) {
          opt.selected = true;
        }
        sel.appendChild(opt);
      });
    });
  }
}
