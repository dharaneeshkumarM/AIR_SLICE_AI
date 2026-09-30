// AirSlice AI - Low-Latency Webcam Configuration & Device Management
export interface CameraInitResult {
  success: boolean;
  stream: MediaStream | null;
  deviceId?: string;
  width?: number;
  height?: number;
  fps?: number;
  error?: string;
  errorCode?: 'NOT_ALLOWED' | 'NOT_FOUND' | 'NOT_READABLE' | 'UNSUPPORTED';
}

export class CameraHelper {
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentDeviceId: string | undefined = undefined;

  // Actual stream metrics
  public actualWidth: number = 640;
  public actualHeight: number = 360;
  public actualFps: number = 30;

  // Video Frame Callback ID
  private vfcCallbackId: number | null = null;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch {
      return [];
    }
  }

  /**
   * Initializes webcam with low-latency constraints (640x360 @ 60/30fps).
   */
  public async startCamera(
    video: HTMLVideoElement,
    deviceId?: string,
    width: number = 640,
    height: number = 360
  ): Promise<CameraInitResult> {
    this.stopCamera();
    this.videoElement = video;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        stream: null,
        error: 'Camera API is not supported in this browser.',
        errorCode: 'UNSUPPORTED',
      };
    }

    // Low-latency prioritized constraint attempts
    const attempts: MediaStreamConstraints[] = [];

    if (deviceId) {
      // 1. Specified device with low-latency target (640x360 @ 60/30fps)
      attempts.push({
        audio: false,
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: 60, min: 30 },
        },
      });
      // 2. Specified device relaxed resolution
      attempts.push({
        audio: false,
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: width },
          height: { ideal: height },
        },
      });
      // 3. Specified device basic
      attempts.push({
        audio: false,
        video: { deviceId: { exact: deviceId } },
      });
    }

    // 4. Default camera with low-latency target (640x360 @ 60fps)
    attempts.push({
      audio: false,
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: 60, min: 30 },
        facingMode: { ideal: 'user' },
      },
    });

    // 5. Default camera 640x360 fallback
    attempts.push({
      audio: false,
      video: {
        width: { ideal: width },
        height: { ideal: height },
      },
    });

    // 6. Generic video fallback
    attempts.push({
      audio: false,
      video: true,
    });

    let lastError: unknown = null;
    let stream: MediaStream | null = null;

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream && stream.active) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      const errorObj = lastError as { name?: string; message?: string } | null;
      let errorMsg = 'Could not access webcam. Please check permissions or device connection.';
      let code: CameraInitResult['errorCode'] = 'NOT_READABLE';

      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        errorMsg = 'Webcam permission denied. Please allow camera access in browser settings.';
        code = 'NOT_ALLOWED';
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on system.';
        code = 'NOT_FOUND';
      } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another app or disconnected.';
        code = 'NOT_READABLE';
      }

      return {
        success: false,
        stream: null,
        error: errorMsg,
        errorCode: code,
      };
    }

    try {
      this.currentStream = stream;
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings() || {};

      this.currentDeviceId = settings.deviceId || deviceId;
      this.actualWidth = settings.width || width;
      this.actualHeight = settings.height || height;
      this.actualFps = settings.frameRate ? Math.round(settings.frameRate) : 30;

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (video.videoWidth > 0) resolve();
          else reject(new Error('Video play timeout'));
        }, 3000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          video
            .play()
            .then(() => {
              this.actualWidth = video.videoWidth || this.actualWidth;
              this.actualHeight = video.videoHeight || this.actualHeight;
              resolve();
            })
            .catch((e) => reject(e));
        };
        video.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });

      // Start internal camera FPS monitor
      this.startCameraFpsMonitor(video);

      return {
        success: true,
        stream,
        deviceId: this.currentDeviceId,
        width: this.actualWidth,
        height: this.actualHeight,
        fps: this.actualFps,
      };
    } catch {
      return {
        success: false,
        stream: null,
        error: 'Camera connected, but video playback failed.',
        errorCode: 'NOT_READABLE',
      };
    }
  }

  private startCameraFpsMonitor(video: HTMLVideoElement): void {
    const videoWithVfc = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };

    if (typeof videoWithVfc.requestVideoFrameCallback === 'function') {
      const vfcLoop = (_now: number) => {
        if (!this.currentStream || !this.currentStream.active) return;
        this.frameCount++;
        const currTime = performance.now();
        if (currTime - this.fpsTimer >= 1000) {
          this.actualFps = this.frameCount;
          this.frameCount = 0;
          this.fpsTimer = currTime;
        }
        this.vfcCallbackId = videoWithVfc.requestVideoFrameCallback!(vfcLoop);
      };
      this.fpsTimer = performance.now();
      this.vfcCallbackId = videoWithVfc.requestVideoFrameCallback(vfcLoop);
    }
  }

  public stopCamera(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
    if (this.videoElement) {
      const videoWithVfc = this.videoElement as HTMLVideoElement & {
        cancelVideoFrameCallback?: (id: number) => void;
      };
      if (this.vfcCallbackId !== null && typeof videoWithVfc.cancelVideoFrameCallback === 'function') {
        videoWithVfc.cancelVideoFrameCallback(this.vfcCallbackId);
        this.vfcCallbackId = null;
      }
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.frameCount = 0;
  }

  public isStreamActive(): boolean {
    return !!this.currentStream && this.currentStream.active;
  }

  public getCurrentDeviceId(): string | undefined {
    return this.currentDeviceId;
  }
}
