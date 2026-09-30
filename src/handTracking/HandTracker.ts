// AirSlice AI - MediaPipe Hand Tracker with Fallback Support
import type { HandTrackingState, Landmark, Point2D } from '../types.js';
import { CoordinateSmoother } from './CoordinateSmoother.js';
import { GestureRecognizer } from './GestureRecognizer.js';
import { CameraHelper } from '../utils/CameraHelper.js';

interface MediaPipeResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness?: Array<{ score: number; label: string }>;
}

export class HandTracker {
  private cameraHelper: CameraHelper = new CameraHelper();
  private smoother: CoordinateSmoother = new CoordinateSmoother();
  private gestureRecognizer: GestureRecognizer = new GestureRecognizer();

  private videoElement: HTMLVideoElement | null = null;
  private canvasWidth: number = 1280;
  private canvasHeight: number = 720;

  private isRunning: boolean = false;
  private isProcessingFrame: boolean = false;
  private useMouseFallback: boolean = false;

  private state: HandTrackingState = {
    detected: false,
    confidence: 0,
    landmarks: null,
    fingertip: null,
    rawFingertip: null,
    gesture: 'none',
    velocity: 0,
    isCalibrated: false,
    useMouseFallback: false,
  };

  private mousePosition: Point2D | null = null;
  private lastMouseMoveTime: number = 0;
  private mediaPipeHandsInstance: unknown = null;
  private animationFrameId: number | null = null;

  public setCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public setMouseFallback(enabled: boolean): void {
    this.useMouseFallback = enabled;
    this.state.useMouseFallback = enabled;
    if (enabled) {
      this.state.detected = true;
      this.state.confidence = 1.0;
      this.state.gesture = 'index';
    }
  }

  public getUseMouseFallback(): boolean {
    return this.useMouseFallback;
  }

  public handlePointerMove(clientX: number, clientY: number, rect: DOMRect): void {
    if (!this.useMouseFallback) return;

    // Calculate aspect ratio letterbox/pillarbox offsets
    const canvasAspect = this.canvasWidth / this.canvasHeight;
    const rectAspect = rect.width / rect.height;
    let actualW = rect.width;
    let actualH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (rectAspect > canvasAspect) {
      // Pillarboxed (black bars on left/right)
      actualW = rect.height * canvasAspect;
      offsetX = (rect.width - actualW) / 2;
    } else {
      // Letterboxed (black bars on top/bottom)
      actualH = rect.width / canvasAspect;
      offsetY = (rect.height - actualH) / 2;
    }

    const x = ((clientX - rect.left - offsetX) / actualW) * this.canvasWidth;
    const y = ((clientY - rect.top - offsetY) / actualH) * this.canvasHeight;

    this.mousePosition = { x, y };
    this.lastMouseMoveTime = performance.now();

    const { point, velocity } = this.smoother.update(this.mousePosition, this.lastMouseMoveTime);

    this.state.detected = true;
    this.state.confidence = 1.0;
    this.state.rawFingertip = { x, y };
    this.state.fingertip = point;
    this.state.velocity = velocity;
    this.state.gesture = 'index';
  }

  public async initMediaPipe(): Promise<boolean> {
    const win = window as unknown as {
      Hands?: new (config: { locateFile: (file: string) => string }) => {
        setOptions: (opts: Record<string, unknown>) => void;
        onResults: (cb: (results: MediaPipeResults) => void) => void;
        send: (input: { image: HTMLVideoElement }) => Promise<void>;
        close?: () => void;
      };
    };

    if (!win.Hands) {
      console.warn('MediaPipe Hands script not yet available on window.');
      return false;
    }

    try {
      const hands = new win.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });

      hands.onResults((results: MediaPipeResults) => {
        this.processMediaPipeResults(results);
      });

      this.mediaPipeHandsInstance = hands;
      return true;
    } catch (e) {
      console.error('Failed to initialize MediaPipe Hands:', e);
      return false;
    }
  }

  public async start(videoElement: HTMLVideoElement, deviceId?: string): Promise<{ success: boolean; error?: string }> {
    this.videoElement = videoElement;

    // First initialize MediaPipe if not ready
    if (!this.mediaPipeHandsInstance) {
      const mpReady = await this.initMediaPipe();
      if (!mpReady) {
        console.warn('MediaPipe not loaded via CDN yet; fallback enabled.');
      }
    }

    // Start Webcam
    const camResult = await this.cameraHelper.startCamera(videoElement, deviceId);
    if (!camResult.success) {
      this.setMouseFallback(true);
      return { success: false, error: camResult.error };
    }

    this.isRunning = true;
    this.startDetectionLoop();
    return { success: true };
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.cameraHelper.stopCamera();
    this.smoother.reset();
    this.gestureRecognizer.reset();
  }

  private startDetectionLoop(): void {
    const loop = async () => {
      if (!this.isRunning) return;

      if (
        this.mediaPipeHandsInstance &&
        this.videoElement &&
        this.videoElement.readyState >= 2 &&
        !this.isProcessingFrame
      ) {
        this.isProcessingFrame = true;
        try {
          const mp = this.mediaPipeHandsInstance as { send: (input: { image: HTMLVideoElement }) => Promise<void> };
          await mp.send({ image: this.videoElement });
        } catch (err) {
          // Hand tracking frame skip
        } finally {
          this.isProcessingFrame = false;
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private processMediaPipeResults(results: MediaPipeResults): void {
    if (this.useMouseFallback) return;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.state.detected = false;
      this.state.confidence = 0;
      this.state.landmarks = null;
      this.state.gesture = 'none';
      return;
    }

    const rawLandmarks = results.multiHandLandmarks[0];
    const confidence = results.multiHandedness?.[0]?.score || 0.9;

    // Mirror X coordinates so moving right moves right on screen
    const mirroredLandmarks: Landmark[] = rawLandmarks.map((lm) => ({
      x: 1 - lm.x, // HORIZONTAL MIRRORING
      y: lm.y,
      z: lm.z,
    }));

    // Primary slicing point: INDEX FINGERTIP (landmark index 8)
    const indexTip = mirroredLandmarks[8];
    const rawPx: Point2D = {
      x: indexTip.x * this.canvasWidth,
      y: indexTip.y * this.canvasHeight,
    };

    // Smooth coordinates
    const { point: smoothedPx, velocity } = this.smoother.update(rawPx, performance.now());

    // Recognize gesture
    const { confirmed: gesture } = this.gestureRecognizer.analyzeFrame(mirroredLandmarks);

    this.state.detected = true;
    this.state.confidence = confidence;
    this.state.landmarks = mirroredLandmarks;
    this.state.rawFingertip = rawPx;
    this.state.fingertip = smoothedPx;
    this.state.velocity = velocity;
    this.state.gesture = gesture;
  }

  public getState(): HandTrackingState {
    return { ...this.state };
  }

  public setCalibrated(val: boolean): void {
    this.state.isCalibrated = val;
  }
}
