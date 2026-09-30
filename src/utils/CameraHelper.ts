// AirSlice AI - Camera Access & Device Management Helper

export interface CameraInitResult {
  success: boolean;
  stream: MediaStream | null;
  error?: string;
  errorCode?: 'NOT_ALLOWED' | 'NOT_FOUND' | 'NOT_READABLE' | 'UNSUPPORTED';
}

export class CameraHelper {
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

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

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: width }, height: { ideal: height }, facingMode: 'user' }
        : { width: { ideal: width }, height: { ideal: height }, facingMode: 'user' },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => resolve())
            .catch((e) => reject(e));
        };
        video.onerror = (e) => reject(e);
      });

      return {
        success: true,
        stream,
      };
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      let errorMsg = 'Could not access webcam. Please check permissions.';
      let code: CameraInitResult['errorCode'] = 'NOT_READABLE';

      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        errorMsg = 'Webcam permission denied. Please enable camera access in your browser settings.';
        code = 'NOT_ALLOWED';
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device detected. Please connect a webcam.';
        code = 'NOT_FOUND';
      } else if (errorObj.name === 'NotReadableError' || errorObj.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application.';
        code = 'NOT_READABLE';
      }

      return {
        success: false,
        stream: null,
        error: errorMsg,
        errorCode: code,
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
}
