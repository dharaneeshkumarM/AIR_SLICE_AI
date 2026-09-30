// AirSlice AI - Hand Gesture Recognizer with Temporal Confirmation Window
import type { Landmark, GestureType } from '../types.js';

export class GestureRecognizer {
  // Rolling gesture history for temporal stability
  private history: GestureType[] = [];
  private readonly historyWindowSize = 12; // ~200-300ms confirmation window
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
    const isExtended = (tipIdx: number, pipIdx: number, thresholdRatio = 1.15) => {
      const tipDist = dist(wrist, landmarks[tipIdx]);
      const pipDist = dist(wrist, landmarks[pipIdx]);
      return tipDist > pipDist * thresholdRatio;
    };

    const indexExtended = isExtended(8, 6, 1.2);
    const middleExtended = isExtended(12, 10, 1.2);
    const ringExtended = isExtended(16, 14, 1.2);
    const pinkyExtended = isExtended(20, 18, 1.2);

    // Thumb extension (comparing tip 4 with MCP 2)
    const thumbDist = dist(wrist, landmarks[4]);
    const thumbMcpDist = dist(wrist, landmarks[2]);
    const thumbExtended = thumbDist > thumbMcpDist * 1.15;

    // Check Thumbs Up: Thumb pointing upward (lower Y) while other fingers curled
    const thumbPointingUp = landmarks[4].y < landmarks[2].y - 0.05 && landmarks[4].y < landmarks[3].y;
    const allOtherFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

    let detected: GestureType = 'none';

    if (thumbPointingUp && allOtherFingersCurled && thumbExtended) {
      detected = 'thumbs-up';
    } else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      // All fingers curled
      detected = 'fist';
    } else if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      // All 4 long fingers extended
      detected = 'palm';
    } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      // Peace / Two fingers
      detected = 'two-fingers';
    } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      // Single index extended
      detected = 'index';
    } else if (indexExtended && !ringExtended && !pinkyExtended) {
      // Index dominant with slight thumb/middle variation -> defaults to index blade
      detected = 'index';
    } else {
      // Default to index if index is extended, else none
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
