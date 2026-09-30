# AIRSLICE AI — REAL-TIME HAND-GESTURE FRUIT SLICING GAME

> **A realistic, browser-based arcade game powered by MediaPipe AI hand tracking, continuous line-segment collision physics, dynamic procedural slicing, and low-latency Web Audio sound synthesis.**

---

## 1. Problem Statement

Classic arcade games like *Fruit Ninja* demonstrated the intuitive joy of touch-based slicing. However, traditional touchscreens and mouse clicks lack physical immersion. With the advent of computer vision in modern browsers, players can now interact with virtual objects directly using physical hand gestures in thin air without dedicated VR headsets or specialized controllers.

Building a browser-based air-slicing experience requires overcoming several engineering challenges:
1. **Camera Latency & Landmark Jitter**: Raw webcam landmarks suffer from high-frequency tremor and temporal noise.
2. **Tunneling & High-Speed Misses**: Point-based collision tests fail when a fast hand slash skips over objects between animation frames.
3. **Realistic Fruit Separation**: Slicing shouldn't simply delete or replace an image; the fruit must physically separate into two halves along the exact cut plane with realistic cross-sections, angular spins, and fluid dynamics.
4. **Gesture False Positives**: Single-frame classification can trigger accidental pauses or power-ups during fast slashes.

---

## 2. Objective

**AirSlice AI** transforms the player's webcam into a virtual dojo. Using MediaPipe Hands to track 21 3D hand landmarks in real time, the player's **index fingertip becomes an energized slicing blade**. The game delivers:
* Zero-lag, jitter-free fingertip tracking with dynamic exponential smoothing.
* Continuous line-segment collision detection that never misses fast slashes.
* Realistic procedural cross-section rendering for 7 fruit varieties and hazardous bombs.
* Spatial sound effects synthesized directly in the browser via Web Audio API.
* An adaptive difficulty engine that responds to player reaction times and accuracy.

---

## 3. Key Features

* **⚡ Real-Time Hand Tracking**: Powered by MediaPipe Hands, tracking 21 hand landmarks at up to 60 FPS with horizontal camera mirroring.
* **✨ Dynamic Fluid Blade Trail**: Velocity-sensitive glowing neon blade with exponential smoothing, spark flares, and responsive width.
* **🍉 Realistic Procedural Fruits & Slicing**:
  * 7 distinct fruit types: **Watermelon**, **Orange**, **Apple**, **Banana**, **Kiwi**, **Pineapple**, and **Coconut**.
  * Dynamic cut-plane clipping that splits each fruit into 2 physical halves revealing anatomically detailed cross-sections (ruby pulp, citrus wedges, seed star pods, emerald striations, fibrous husks).
  * Outward separation impulse and randomized rotational physics.
* **💣 Hazard Bomb System**:
  * Metallic dark obsidian bombs with animated burning fuses, smoke embers, and hazard symbols.
  * Cinematic screen shake, sub-bass explosion rumble, and life deduction.
* **✋ Multi-Gesture Control Suite**:
  * **☝️ Index Finger**: Primary slicing blade.
  * **✋ Open Palm**: Pause / resume game.
  * **✌️ Two Fingers (Peace)**: Activates 5-second **2X Double Score** power-up with golden blade aura.
  * **✊ Fist**: Activates **Shield** power-up to negate 1 bomb explosion.
  * **👍 Thumbs Up**: Start / confirm game.
* **🎮 4 Distinct Game Modes**:
  * **Classic Mode**: 3 Lives (Hearts), waves of fruits, bombs, and combo multipliers.
  * **Time Attack**: 60-second frenzy where speed is king and bombs penalize time.
  * **Endless Mode**: Continuous adaptive challenge that dynamically scales with score.
  * **Training Mode**: Zen mode with gentle trajectories, no bombs, and zero stress.
* **📈 Adaptive Difficulty Engine**:
  * Analyzes player slice accuracy, reaction time, and streaks in real time.
  * Seamlessly scales wave frequency, arc velocity, and bomb ratios without unfair spikes.
* **🔊 Web Audio API Procedural Synthesizer**:
  * Zero external sound file dependencies — 100% reliable low-latency audio.
  * Fruit-specific wet squelches, crisp snaps, whoosh sweeps, pentatonic combo arpeggios, and sub-bass explosions.
* **📊 Comprehensive Post-Game Analytics**:
  * Displays final score, fruits sliced, bombs hit, best combo, accuracy percentage, and average reaction time.
* **🛡️ Accessibility & Fallbacks**:
  * Smooth Mouse/Touch blade fallback mode for environments without a webcam.
  * `prefers-reduced-motion` compliance for screen shake.
  * Toggleable Developer Debug Mode (`D` key) showing FPS, landmark skeletons, and hitboxes.

---

## 4. System Architecture

```text
                       WEBCAM FEED
                            ↓
                    MEDIA-PIPE HANDS
                            ↓
                   21 3D HAND LANDMARKS
                            ↓
             ┌──────────────┴──────────────┐
             ↓                             ↓
    GESTURE RECOGNIZER              INDEX FINGERTIP (8)
   (Temporal 12-Frame Window)              ↓
             ↓                     HORIZONTAL MIRRORING
   ☝️  ✋  ✌️  ✊  👍                    ↓
  Slice Pause 2X Shield Thumbs    EXPONENTIAL SMOOTHING (EMA)
             │                     + DEADBAND FILTER
             │                             ↓
             │                    VELOCITY ESTIMATOR
             │                             ↓
             │                    GLOWING BLADE TRAIL
             │                             ↓
             └──────────────┬──────────────┘
                            ↓
               CONTINUOUS COLLISION ENGINE
          (Segment-Circle Intersection Check)
                            ↓
                 FRUIT SLICE / BOMB HIT
                            ↓
             ┌──────────────┴──────────────┐
             ↓                             ↓
      PHYSICS SPLIT                 PARTICLE EMITTER
  (Cut Angle + Normal Impulse)    (Juice, Chunks, Sparks, Rings)
             ↓                             ↓
     SCORE & COMBO SYSTEM          AUDIO SYNTHESIZER
  (Bonuses, Multipliers, XP)       (Web Audio API Procedural)
             ↓                             ↓
        HUD & RADAR               MASTER CANVAS RENDERER
```

---

## 5. Hand Tracking & Coordinate Pipeline

1. **Capture**: Video frames are streamed via `navigator.mediaDevices.getUserMedia` into a hidden HTML5 `<video>` element.
2. **Landmark Inference**: MediaPipe Hands evaluates the frame and returns 21 normalized `(x, y, z)` coordinates.
3. **Mirroring**: Coordinates are mirrored horizontally (`x_screen = 1.0 - x_landmark`) so rightward hand motions intuitively travel rightward on screen.
4. **Coordinate Smoothing**:
   $$\text{Smooth}_t = \text{Smooth}_{t-1} \cdot (1 - \alpha) + \text{Raw}_t \cdot \alpha$$
   * When movement distance exceeds 50 px, $\alpha = 0.8$ (instant low-latency tracking for fast slashes).
   * When hovering under 15 px, $\alpha = 0.45$ (smooth and stable).
   * Micro-tremors under 1.5 px are dropped via a deadband filter.
5. **Segment-Based Collision**: Rather than testing a single point, the engine evaluates the line segment between $(\text{PrevX}, \text{PrevY})$ and $(\text{CurrX}, \text{CurrY})$. Even if a hand slashes 200 pixels in a single 16ms frame, the segment guarantees collision detection without tunneling.

---

## 6. Gesture Mapping Reference

| Gesture | Hand Pose | In-Game Action | Confirmation Window |
|---|---|---|---|
| **☝️ Index Finger** | Index extended, others curled | Virtual slicing blade active | Immediate |
| **✋ Open Palm** | All 5 fingers extended | Pause / Resume Game | 12 frames (~200ms) |
| **✌️ Two Fingers** | Index & Middle extended | Activates **Double Score (2X)** (5s) | 12 frames (~200ms) |
| **✊ Fist** | All fingers curled tightly | Activates **Bomb Shield** (10s) | 12 frames (~200ms) |
| **👍 Thumbs Up** | Thumb pointed up, fingers curled | Start Game / Replay / Confirm | 12 frames (~200ms) |

---

## 7. Fruit Catalogue & Cross-Section Design

| Fruit | Radius | Score | Exterior Features | Interior Cross-Section |
|---|---|---|---|---|
| **Watermelon** | 54 px | +200 | Emerald spherical gradient, dark wavy stripes | Ruby-red pulp, circular black teardrop seeds, light green rind |
| **Orange** | 42 px | +100 | Textured porous skin, calyx dot | 10 translucent wedges, white pith radial septa, white core |
| **Apple** | 40 px | +100 | Crimson-red gradient, dimpled crown, wood stem | Crisp creamy-white pulp, star seed core, brown seed |
| **Banana** | 36 px | +120 | Curved yellow arc, green tip, dark stalk | Pale cream interior with faint tri-fold seed markers |
| **Kiwi** | 34 px | +150 | Fuzzy golden-brown oval husk with fine bristles | Bright emerald lime pulp, ring of micro black seeds, ivory core |
| **Pineapple** | 52 px | +250 | Golden diamond-quilted rind, spiky crown leaves | Golden yellow ringed core, radial fibers, textured rim |
| **Coconut** | 46 px | +180 | Dark chocolate fibrous husk with 3 coconut eyes | Thick snowy-white coconut meat ring, hollow dark center |

---

## 8. Installation & Running Locally

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** (v9.0.0 or higher)
* A modern browser with WebGL and Web Audio support (Chrome, Edge, Firefox, Brave, Safari)
* A webcam (or use the built-in Mouse Blade Fallback)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

### Step 3: Production Build
```bash
npm run build
npm run preview
```

---

## 9. Controls & Shortcuts

* **Physical Hand**: Move your index finger in front of the webcam.
* **Mouse / Trackpad**: Click or drag across the screen to slice (automatic fallback).
* **Keyboard Shortcuts**:
  * `D`: Toggle Developer Debug Overlay (FPS, skeleton, hitboxes, speed).
  * `Space` / `P`: Pause / Resume game.
  * `M`: Toggle Sound Mute.
  * `R`: Quick Restart.
  * `T`: Trigger Thumbs Up (Start / Confirm).

---

## 10. Troubleshooting

1. **Webcam permission denied**: Click the lock/permission icon in your browser URL bar, enable camera access, and reload the page.
2. **No webcam available**: The game automatically engages Mouse Blade Fallback mode so you can play without any hardware restrictions.
3. **Choppy framerate**: Ensure hardware acceleration is enabled in browser settings. You can also disable screen shake in the Settings menu (`Reduced Motion`).
4. **Audio not playing**: Browsers require a user interaction before allowing Web Audio playback. Simply click anywhere on screen or press any key to initialize audio.

---

## 11. Technology Stack

* **Core**: TypeScript, HTML5 Canvas 2D, CSS3 Glassmorphism
* **Computer Vision**: MediaPipe Hands (`@mediapipe/hands`, `@mediapipe/camera_utils`)
* **Audio**: Procedural Web Audio API Synthesizer (Oscillators, BiquadFilters, GainEnvelopes)
* **Build Tool**: Vite 8.3

---

*Enjoy slicing in the air with AirSlice AI!*
