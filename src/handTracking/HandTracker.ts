// AirSlice AI - Low-Latency Hand Tracking Engine with requestVideoFrameCallback
import type { HandTrackingState, Landmark, Point2D } from '../types.js';
import { CoordinateSmoother } from './CoordinateSmoother.js';
import { GestureRecognizer } from './GestureRecognizer.js';
import { CameraHelper } from '../utils/CameraHelper.js';

interface MediaPipeResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness?: Array<{ score: number; label: string }>;
}

export class HandTracker {
  public cameraHelper: CameraHelper = new CameraHelper();
  private smoother: CoordinateSmoother = new CoordinateSmoother();
  private gestureRecognizer: GestureRecognizer = new GestureRecognizer();

  private videoElement: HTMLVideoElement | null = null;
  private canvasWidth: number = 1280;
  private canvasHeight: number = 720;

  private isRunning: boolean = false;
  private isProcessingFrame: boolean = false;
  private useMouseFallback: boolean = false;

  // Frame Callback Handles (Dedicated Hand Tracking Loop)
  private vfcCallbackId: number | null = null;
  private rafCallbackId: number | null = null;

  // Tracking metrics
  private trackingFrameCount: number = 0;
  private trackingFpsTimer: number = 0;
  private trackingFps: number = 0;
  private estimatedLatencyMs: number = 0;

  private state: HandTrackingState = {
    detected: false,
    confidence: 0,
    landmarks: null,
    fingertip: null,
    rawFingertip: null,
    lowLatencyTip: null,
    gesture: 'none',
    velocity: 0,
    predictionOffset: { x: 0, y: 0 },
    isCalibrated: false,
    useMouseFallback: false,
    trackingFps: 0,
    cameraFps: 30,
    cameraWidth: 640,
    cameraHeight: 360,
    estimatedLatencyMs: 0,
    lastDetectionTime: 0,
  };

  private mousePosition: Point2D | null = null;
  private lastMouseMoveTime: number = 0;
  private mediaPipeHandsInstance: unknown = null;

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

  public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    return this.cameraHelper.getAvailableCameras();
  }

  public handlePointerMove(clientX: number, clientY: number, rect: DOMRect): void {
    if (!this.useMouseFallback) return;

    const canvasAspect = this.canvasWidth / this.canvasHeight;
    const rectAspect = rect.width / rect.height;
    let actualW = rect.width;
    let actualH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (rectAspect > canvasAspect) {
      actualW = rect.height * canvasAspect;
      offsetX = (rect.width - actualW) / 2;
    } else {
      actualH = rect.width / canvasAspect;
      offsetY = (rect.height - actualH) / 2;
    }

    const x = ((clientX - rect.left - offsetX) / actualW) * this.canvasWidth;
    const y = ((clientY - rect.top - offsetY) / actualH) * this.canvasHeight;

    this.mousePosition = { x, y };
    this.lastMouseMoveTime = performance.now();

    const smoothResult = this.smoother.update(this.mousePosition, this.lastMouseMoveTime);

    this.state.detected = true;
    this.state.confidence = 1.0;
    this.state.rawFingertip = smoothResult.rawTip;
    this.state.fingertip = smoothResult.visualTip;
    this.state.lowLatencyTip = smoothResult.lowLatencyTip;
    this.state.velocity = smoothResult.velocity;
    this.state.predictionOffset = smoothResult.predictionOffset;
    this.state.gesture = 'index';
    this.state.lastDetectionTime = this.lastMouseMoveTime;
  }

  public async waitForMediaPipe(timeoutMs = 8000): Promise<boolean> {
    const startTime = performance.now();
    const win = window as unknown as { Hands?: unknown };

    while (!win.Hands && performance.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 80));
    }
    return !!win.Hands;
  }

  public async initMediaPipe(): Promise<boolean> {
    if (this.mediaPipeHandsInstance) return true;

    await this.waitForMediaPipe(6000);

    const win = window as unknown as {
      Hands?: new (config: { locateFile: (file: string) => string }) => {
        setOptions: (opts: Record<string, unknown>) => void;
        onResults: (cb: (results: MediaPipeResults) => void) => void;
        send: (input: { image: HTMLVideoElement }) => Promise<void>;
        close?: () => void;
      };
    };

    if (!win.Hands) {
      return false;
    }

    try {
      const hands = new win.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      // Low latency & high throughput settings
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1, // High accuracy single hand model
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: MediaPipeResults) => {
        this.processMediaPipeResults(results);
      });

      this.mediaPipeHandsInstance = hands;
      return true;
    } catch {
      return false;
    }
  }

  public async start(videoElement: HTMLVideoElement, deviceId?: string): Promise<{ success: boolean; error?: string }> {
    this.videoElement = videoElement;

    // Start Webcam with low-latency 640x360@60fps
    const camResult = await this.cameraHelper.startCamera(videoElement, deviceId, 640, 360);
    if (!camResult.success) {
      this.setMouseFallback(true);
      return { success: false, error: camResult.error };
    }

    this.state.cameraWidth = this.cameraHelper.actualWidth;
    this.state.cameraHeight = this.cameraHelper.actualHeight;
    this.state.cameraFps = this.cameraHelper.actualFps;

    // Initialize MediaPipe in parallel
    if (!this.mediaPipeHandsInstance) {
      this.initMediaPipe();
    }

    this.isRunning = true;
    this.setMouseFallback(false);
    this.startHandTrackingLoop();
    return { success: true };
  }

  public stop(): void {
    this.isRunning = false;
    this.stopHandTrackingLoop();
    this.cameraHelper.stopCamera();
    this.smoother.reset();
    this.gestureRecognizer.reset();
  }

  private stopHandTrackingLoop(): void {
    if (this.videoElement) {
      const videoWithVfc = this.videoElement as HTMLVideoElement & {
        cancelVideoFrameCallback?: (id: number) => void;
      };
      if (this.vfcCallbackId !== null && typeof videoWithVfc.cancelVideoFrameCallback === 'function') {
        videoWithVfc.cancelVideoFrameCallback(this.vfcCallbackId);
        this.vfcCallbackId = null;
      }
    }
    if (this.rafCallbackId !== null) {
      cancelAnimationFrame(this.rafCallbackId);
      this.rafCallbackId = null;
    }
    this.isProcessingFrame = false;
  }

  /**
   * Dedicated Hand Tracking Loop using requestVideoFrameCallback for minimum input latency.
   * Runs independently from the 60fps Game Render Loop.
   */
  private startHandTrackingLoop(): void {
    this.stopHandTrackingLoop();
    this.trackingFpsTimer = performance.now();
    this.trackingFrameCount = 0;

    const videoWithVfc = this.videoElement as (HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
    }) | null;

    const hasVfc = videoWithVfc && typeof videoWithVfc.requestVideoFrameCallback === 'function';

    const processFrame = async (_frameTimestamp: number) => {
      if (!this.isRunning) return;

      // Track Tracking FPS
      this.trackingFrameCount++;
      const now = performance.now();
      if (now - this.trackingFpsTimer >= 1000) {
        this.trackingFps = this.trackingFrameCount;
        this.trackingFrameCount = 0;
        this.trackingFpsTimer = now;
        this.state.trackingFps = this.trackingFps;
        this.state.cameraFps = this.cameraHelper.actualFps;
      }

      // Lazy init MediaPipe if needed
      if (!this.mediaPipeHandsInstance) {
        const win = window as unknown as { Hands?: unknown };
        if (win.Hands) {
          await this.initMediaPipe();
        }
      }

      // Send raw video element directly without intermediate canvas copies
      if (
        this.mediaPipeHandsInstance &&
        this.videoElement &&
        this.videoElement.readyState >= 2 &&
        !this.isProcessingFrame &&
        !this.useMouseFallback
      ) {
        this.isProcessingFrame = true;
        const sendStart = performance.now();
        try {
          const mp = this.mediaPipeHandsInstance as { send: (input: { image: HTMLVideoElement }) => Promise<void> };
          await mp.send({ image: this.videoElement });
          this.estimatedLatencyMs = Math.round(performance.now() - sendStart);
          this.state.estimatedLatencyMs = this.estimatedLatencyMs;
        } catch {
          // Hand tracking frame skip
        } finally {
          this.isProcessingFrame = false;
        }
      }

      // Schedule next frame callback
      if (this.isRunning) {
        if (hasVfc && this.videoElement) {
          this.vfcCallbackId = (this.videoElement as HTMLVideoElement & {
            requestVideoFrameCallback: (cb: (t: number) => void) => number;
          }).requestVideoFrameCallback(processFrame);
        } else {
          this.rafCallbackId = requestAnimationFrame(processFrame);
        }
      }
    };

    if (hasVfc && this.videoElement) {
      this.vfcCallbackId = (this.videoElement as HTMLVideoElement & {
        requestVideoFrameCallback: (cb: (t: number) => void) => number;
      }).requestVideoFrameCallback(processFrame);
    } else {
      this.rafCallbackId = requestAnimationFrame(processFrame);
    }
  }

  private processMediaPipeResults(results: MediaPipeResults): void {
    if (this.useMouseFallback) return;

    const now = performance.now();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // Confidence drop / Hand missing: Hold last position for 80ms to prevent transient jitter
      const held = this.smoother.holdOrNull(now);
      if (held) {
        this.state.rawFingertip = held.rawTip;
        this.state.fingertip = held.visualTip;
        this.state.lowLatencyTip = held.lowLatencyTip;
        this.state.velocity = held.velocity;
        this.state.predictionOffset = held.predictionOffset;
        return;
      }

      this.state.detected = false;
      this.state.confidence = 0;
      this.state.landmarks = null;
      this.state.gesture = 'none';
      return;
    }

    const rawLandmarks = results.multiHandLandmarks[0];
    const confidence = results.multiHandedness?.[0]?.score || 0.9;

    // Ignore extremely low confidence detections
    if (confidence < 0.5) {
      const held = this.smoother.holdOrNull(now);
      if (held) return;
    }

    // Mirror X coordinates so moving right moves right on screen
    const mirroredLandmarks: Landmark[] = rawLandmarks.map((lm) => ({
      x: 1 - lm.x,
      y: lm.y,
      z: lm.z,
    }));

    // Primary slicing point: INDEX FINGERTIP (landmark index 8)
    const indexTip = mirroredLandmarks[8];
    const rawPx: Point2D = {
      x: indexTip.x * this.canvasWidth,
      y: indexTip.y * this.canvasHeight,
    };

    // Update coordinate smoother with dynamic alpha and prediction
    const smoothResult = this.smoother.update(rawPx, now);

    // Temporal gesture confirmation
    const { confirmed: gesture } = this.gestureRecognizer.analyzeFrame(mirroredLandmarks);

    this.state.detected = true;
    this.state.confidence = confidence;
    this.state.landmarks = mirroredLandmarks;
    this.state.rawFingertip = smoothResult.rawTip;
    this.state.fingertip = smoothResult.visualTip;
    this.state.lowLatencyTip = smoothResult.lowLatencyTip;
    this.state.velocity = smoothResult.velocity;
    this.state.predictionOffset = smoothResult.predictionOffset;
    this.state.gesture = gesture;
    this.state.lastDetectionTime = now;
  }

  public getState(): HandTrackingState {
    return { ...this.state };
  }

  public setCalibrated(val: boolean): void {
    this.state.isCalibrated = val;
  }
}
