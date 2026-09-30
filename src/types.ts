// AirSlice AI - Core Type Definitions

export type FruitType = 
  | 'apple' 
  | 'orange' 
  | 'watermelon' 
  | 'banana' 
  | 'kiwi' 
  | 'pineapple' 
  | 'coconut';

export interface FruitConfig {
  name: string;
  radius: number;
  mass: number;
  scoreValue: number;
  outerColor: string;
  innerColor: string;
  rindColor?: string;
  juiceColor: string;
  hasSeeds?: boolean;
  seedColor?: string;
  hasSegments?: boolean;
  hasCore?: boolean;
}

export type SliceState = 'whole' | 'sliced' | 'faded';

export type GameMode = 'classic' | 'time-attack' | 'endless' | 'training';

export type GameState = 'start' | 'calibrating' | 'playing' | 'paused' | 'game-over';

export type GestureType = 'index' | 'palm' | 'two-fingers' | 'fist' | 'thumbs-up' | 'none';

export type PowerUpType = 'double-score' | 'shield' | 'slow-motion';

export interface Point2D {
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  speed: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingState {
  detected: boolean;
  confidence: number;
  landmarks: Landmark[] | null;
  fingertip: Point2D | null;        // visualTip: smooth + subtle lead for blade rendering
  rawFingertip: Point2D | null;     // raw coordinate directly from camera
  lowLatencyTip: Point2D | null;    // lowLatencyTip: raw + velocity prediction for instantaneous collision
  gesture: GestureType;
  velocity: number;
  predictionOffset: Point2D;
  isCalibrated: boolean;
  useMouseFallback: boolean;
  trackingFps: number;
  cameraFps: number;
  cameraWidth: number;
  cameraHeight: number;
  estimatedLatencyMs: number;
  lastDetectionTime: number;
}

export interface LatencyMetrics {
  cameraResolution: string;
  cameraFps: number;
  trackingFps: number;
  trackingConfidence: number;
  frameTimeMs: number;
  renderTimeMs: number;
  estimatedInputLatencyMs: number;
  velocity: number;
  predictionOffset: Point2D;
  rawPoint: Point2D | null;
  visualPoint: Point2D | null;
  lowLatencyPoint: Point2D | null;
}

export interface GameStats {
  score: number;
  highScore: number;
  fruitsSliced: number;
  fruitsMissed: number;
  bombsHit: number;
  maxCombo: number;
  currentCombo: number;
  accuracy: number;
  averageReactionTime: number;
  totalSpawned: number;
  level: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  duration: number;
  remainingTime: number;
  startTime: number;
}

export interface CutResult {
  hit: boolean;
  cutAngle: number;
  cutNormal: Point2D;
  entryPoint: Point2D;
  exitPoint: Point2D;
  speed: number;
}
