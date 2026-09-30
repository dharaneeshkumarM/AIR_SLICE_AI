// AirSlice AI - Hand Gesture Recognizer with Temporal Confirmation Window
import type { Landmark, GestureType } from '../types.js';

export class GestureRecognizer {
  // Rolling gesture history for temporal stability
  private history: GestureType[] = [];
  private readonly historyWindowSize = 8; // Snappy ~130-200ms confirmation window
  private confirmedGesture: GestureType = 'none';

  public reset(): void {
    this.history = [];
    this.confirmedGesture = 'none';
  }

  /**
   * Recognizes raw single-frame gesture from 21 MediaPipe landmarks
   */
  public analyzeFrame(landmarks: Landmark[]): { raw: GestureType; confirmed: GestureType } {
    if (!landmarks || landmarks.length < 21) {
      this.history.push('none');
      if (this.history.length > this.historyWindowSize) this.history.shift();
      return { raw: 'none', confirmed: this.getMostFrequentGesture() };
    }

    const wrist = landmarks[0];

    // Helper: 2D distance between landmarks
    const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

    // Check finger extension: fingertip distance from wrist vs PIP joint distance from wrist
    const isExtended = (tipIdx: number, pipIdx: number, thresholdRatio = 1.14) => {
      const tipDist = dist(wrist, landmarks[tipIdx]);
      const pipDist = dist(wrist, landmarks[pipIdx]);
      return tipDist > pipDist * thresholdRatio;
    };

    const indexExtended = isExtended(8, 6, 1.15);
    const middleExtended = isExtended(12, 10, 1.15);
    const ringExtended = isExtended(16, 14, 1.15);
    const pinkyExtended = isExtended(20, 18, 1.15);

    // Thumb extension (comparing tip 4 with MCP 2)
    const thumbDist = dist(wrist, landmarks[4]);
    const thumbMcpDist = dist(wrist, landmarks[2]);
    const thumbExtended = thumbDist > thumbMcpDist * 1.12;

    const longFingersExtendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
    const totalExtendedCount = longFingersExtendedCount + (thumbExtended ? 1 : 0);

    // Check Thumbs Up: Thumb pointing upward (lower Y) while other fingers curled
    const thumbPointingUp = landmarks[4].y < landmarks[2].y - 0.05 && landmarks[4].y < landmarks[3].y;
    const allOtherFingersCurled = longFingersExtendedCount === 0;

    let detected: GestureType = 'none';

    if (thumbPointingUp && allOtherFingersCurled && thumbExtended) {
      detected = 'thumbs-up';
    } else if (allOtherFingersCurled && !thumbPointingUp) {
      // All fingers curled -> Fist
      detected = 'fist';
    } else if (
      longFingersExtendedCount >= 4 ||
      (longFingersExtendedCount === 3 && thumbExtended) ||
      (totalExtendedCount >= 4 && indexExtended && middleExtended)
    ) {
      // Open Palm: 4+ fingers extended, forgiving of natural webcam angles
      detected = 'palm';
    } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      // Peace / Two fingers
      detected = 'two-fingers';
    } else if (indexExtended && !ringExtended && !pinkyExtended) {
      // Single index extended (blade)
      detected = 'index';
    } else {
      detected = indexExtended ? 'index' : 'none';
    }

    // Push into temporal history window
    this.history.push(detected);
    if (this.history.length > this.historyWindowSize) {
      this.history.shift();
    }

    this.confirmedGesture = this.getMostFrequentGesture();

    return {
      raw: detected,
      confirmed: this.confirmedGesture,
    };
  }

  /**
   * Returns gesture if it accounts for at least 70% of frames in history window
   */
  private getMostFrequentGesture(): GestureType {
    if (this.history.length === 0) return 'none';

    const counts: Record<string, number> = {};
    for (const g of this.history) {
      counts[g] = (counts[g] || 0) + 1;
    }

    let topGesture: GestureType = 'none';
    let topCount = 0;

    for (const [gesture, count] of Object.entries(counts)) {
      if (count > topCount) {
        topCount = count;
        topGesture = gesture as GestureType;
      }
    }

    // Require at least 65% consensus to confirm
    const requiredMin = Math.ceil(this.history.length * 0.65);
    return topCount >= requiredMin ? topGesture : this.confirmedGesture;
  }

  public getConfirmed(): GestureType {
    return this.confirmedGesture;
  }
}
