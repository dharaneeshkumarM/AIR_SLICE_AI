// AirSlice AI - Camera Access & Device Management Helper with Multi-Tier Fallback

export interface CameraInitResult {
  success: boolean;
  stream: MediaStream | null;
  deviceId?: string;
  error?: string;
  errorCode?: 'NOT_ALLOWED' | 'NOT_FOUND' | 'NOT_READABLE' | 'UNSUPPORTED';
}

export class CameraHelper {
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentDeviceId: string | undefined = undefined;

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

  public async startCamera(
    video: HTMLVideoElement,
    deviceId?: string,
    width: number = 640,
    height: number = 480
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

    // Multi-tier fallback constraints to prevent OverconstrainedError on desktop/virtual webcams
    const attempts: MediaStreamConstraints[] = [];

    if (deviceId) {
      // 1. Specific device with resolution
      attempts.push({
        audio: false,
        video: { deviceId: { exact: deviceId }, width: { ideal: width }, height: { ideal: height } },
      });
      // 2. Specific device relaxed
      attempts.push({
        audio: false,
        video: { deviceId: { exact: deviceId } },
      });
    }

    // 3. User-facing ideal (desktop cams don't fail on ideal)
    attempts.push({
      audio: false,
      video: { width: { ideal: width }, height: { ideal: height }, facingMode: { ideal: 'user' } },
    });

    // 4. Basic video stream fallback
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
      this.currentDeviceId = stream.getVideoTracks()[0]?.getSettings()?.deviceId || deviceId;

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // If metadata takes too long, resolve anyway if stream is active
          if (video.videoWidth > 0) resolve();
          else reject(new Error('Video play timeout'));
        }, 3500);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          video
            .play()
            .then(() => resolve())
            .catch((e) => reject(e));
        };
        video.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });

      return {
        success: true,
        stream,
        deviceId: this.currentDeviceId,
      };
    } catch (playErr) {
      return {
        success: false,
        stream: null,
        error: 'Camera connected, but video playback failed.',
        errorCode: 'NOT_READABLE',
      };
    }
  }

  public stopCamera(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  public isStreamActive(): boolean {
    return !!this.currentStream && this.currentStream.active;
  }

  public getCurrentDeviceId(): string | undefined {
    return this.currentDeviceId;
  }
}
