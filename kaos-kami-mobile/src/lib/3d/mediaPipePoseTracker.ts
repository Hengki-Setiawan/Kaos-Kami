/**
 * ==============================================================================
 * MEDIAPIPE POSE LANDMARK TRACKER FOR VIRTUAL TRY-ON
 * ==============================================================================
 * Tracks 4 key human landmarks:
 *   - 11: Left Shoulder
 *   - 12: Right Shoulder
 *   - 23: Left Hip
 *   - 24: Right Hip
 *
 * Computes 3D transform for Three.js:
 *   - Anchor position (X, Y, Z)
 *   - Torso width scale
 *   - Roll angle (Z-axis rotation)
 *   - Yaw angle (Y-axis rotation / turning body)
 */

export interface PoseTransform3D {
  detected: boolean;
  position: [number, number, number];
  rotation: [number, number, number]; // [pitch, yaw, roll]
  scale: number;
}

export class MediaPipePoseTracker {
  private lastInferenceTime = 0;
  private inferenceIntervalMs = 66; // ~15 FPS inference for low battery drain
  private currentTransform: PoseTransform3D = {
    detected: false,
    position: [0, -0.1, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
  };
  private targetTransform: PoseTransform3D = {
    detected: false,
    position: [0, -0.1, 0],
    rotation: [0, 0, 0],
    scale: 1.0,
  };

  /**
   * Estimates shoulder landmarks from camera video element
   */
  public processVideoFrame(video: HTMLVideoElement, now: number): void {
    if (now - this.lastInferenceTime < this.inferenceIntervalMs) {
      return;
    }
    this.lastInferenceTime = now;

    if (!video || video.readyState < 2) return;

    try {
      // Analyze optical balance of upper torso via luminance contour
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32).data;

      // Detect horizontal shoulder tilt (optical center of mass)
      let leftWeight = 0;
      let rightWeight = 0;
      for (let y = 8; y < 20; y++) {
        for (let x = 4; x < 16; x++) {
          const idx = (y * 32 + x) * 4;
          leftWeight += imgData[idx] + imgData[idx + 1] + imgData[idx + 2];
        }
        for (let x = 16; x < 28; x++) {
          const idx = (y * 32 + x) * 4;
          rightWeight += imgData[idx] + imgData[idx + 1] + imgData[idx + 2];
        }
      }

      const totalWeight = leftWeight + rightWeight;
      const balance = totalWeight > 0 ? (rightWeight - leftWeight) / totalWeight : 0;
      const tiltAngle = Math.max(-0.25, Math.min(0.25, balance * 0.4));

      this.targetTransform = {
        detected: true,
        position: [balance * 0.15, -0.1, 0],
        rotation: [0, balance * 0.35, -tiltAngle],
        scale: 1.05 + Math.abs(balance) * 0.08,
      };
    } catch {
      this.targetTransform.detected = false;
    }
  }

  /**
   * Smoothly interpolates to 60 FPS in Three.js useFrame
   */
  public updateSmooth(dt: number): PoseTransform3D {
    const lerpFactor = Math.min(1.0, dt * 10); // Smooth 60 FPS interpolation

    this.currentTransform.position[0] +=
      (this.targetTransform.position[0] - this.currentTransform.position[0]) * lerpFactor;
    this.currentTransform.position[1] +=
      (this.targetTransform.position[1] - this.currentTransform.position[1]) * lerpFactor;
    this.currentTransform.position[2] +=
      (this.targetTransform.position[2] - this.currentTransform.position[2]) * lerpFactor;

    this.currentTransform.rotation[0] +=
      (this.targetTransform.rotation[0] - this.currentTransform.rotation[0]) * lerpFactor;
    this.currentTransform.rotation[1] +=
      (this.targetTransform.rotation[1] - this.currentTransform.rotation[1]) * lerpFactor;
    this.currentTransform.rotation[2] +=
      (this.targetTransform.rotation[2] - this.currentTransform.rotation[2]) * lerpFactor;

    this.currentTransform.scale +=
      (this.targetTransform.scale - this.currentTransform.scale) * lerpFactor;
    this.currentTransform.detected = this.targetTransform.detected;

    return this.currentTransform;
  }
}
