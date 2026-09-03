/**
 * ==============================================================================
 * MEDIAPIPE POSE LANDMARK TRACKER FOR VIRTUAL TRY-ON (M7 §4)
 * ==============================================================================
 * PoseLandmarker ASLI (@mediapipe/tasks-vision, model lite) — lazy-load via
 * dynamic import agar tidak membebani bundle awal. Inferensi 15 FPS + lerp 60 FPS.
 * Gagal load model (offline) → detected:false → UI menampilkan panduan siluet.
 *
 * Landmark: 11 bahu kiri, 12 bahu kanan, 23 pinggul kiri, 24 pinggul kanan.
 */

export interface PoseTransform3D {
  detected: boolean;
  position: [number, number, number];
  rotation: [number, number, number]; // [pitch, yaw, roll]
  scale: number;
}

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

type Landmarker = {
  detectForVideo(video: HTMLVideoElement, nowMs: number): { landmarks?: Array<Array<{ x: number; y: number; visibility?: number }>> };
  close(): void;
};

export class MediaPipePoseTracker {
  private lastInferenceTime = 0;
  private inferenceIntervalMs = 66; // ~15 FPS inference for low battery drain
  private landmarker: Landmarker | null = null;
  private loading: Promise<void> | null = null;
  private loadFailed = false;
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

  private ensureLoaded(): void {
    if (this.landmarker || this.loading || this.loadFailed || typeof window === 'undefined') return;
    this.loading = (async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const landmarker = await (vision.PoseLandmarker as any).createFromOptions({
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.landmarker = landmarker as unknown as Landmarker;
      } catch {
        this.loadFailed = true;
      } finally {
        this.loading = null;
      }
    })();
  }

  /**
   * Inferensi bahu & torso dari frame video (maks 15 FPS).
   */
  public processVideoFrame(video: HTMLVideoElement, now: number): void {
    this.ensureLoaded();
    if (now - this.lastInferenceTime < this.inferenceIntervalMs) return;
    this.lastInferenceTime = now;
    if (!this.landmarker || !video || video.readyState < 2) return;

    try {
      const res = this.landmarker.detectForVideo(video, now);
      const lm = res.landmarks?.[0];
      const L = lm?.[11];
      const R = lm?.[12];
      if (!L || !R || (L.visibility ?? 1) < 0.4 || (R.visibility ?? 1) < 0.4) {
        this.targetTransform.detected = false;
        return;
      }
      // Lebar bahu (0..1) → skala baju; kemiringan → roll; offset tengah → anchor.
      const dx = R.x - L.x;
      const dy = R.y - L.y;
      const shoulderWidth = Math.max(0.05, Math.hypot(dx, dy));
      const roll = Math.max(-0.4, Math.min(0.4, Math.atan2(dy, dx)));
      const midX = (L.x + R.x) / 2 - 0.5; // -0.5..0.5
      const midY = (L.y + R.y) / 2;
      const scale = Math.max(0.7, Math.min(1.6, 0.32 / shoulderWidth));
      this.targetTransform = {
        detected: true,
        position: [-midX * 1.2, 0.35 - midY * 1.4, 0],
        rotation: [0, -midX * 0.6, -roll],
        scale,
      };
    } catch {
      this.targetTransform.detected = false;
    }
  }

  /**
   * Smoothly interpolates to 60 FPS in Three.js render loop.
   */
  public updateSmooth(dt: number): PoseTransform3D {
    const lerpFactor = Math.min(1.0, dt * 10); // Smooth 60 FPS interpolation
    const c = this.currentTransform;
    const t = this.targetTransform;
    c.position[0] += (t.position[0] - c.position[0]) * lerpFactor;
    c.position[1] += (t.position[1] - c.position[1]) * lerpFactor;
    c.position[2] += (t.position[2] - c.position[2]) * lerpFactor;
    c.rotation[0] += (t.rotation[0] - c.rotation[0]) * lerpFactor;
    c.rotation[1] += (t.rotation[1] - c.rotation[1]) * lerpFactor;
    c.rotation[2] += (t.rotation[2] - c.rotation[2]) * lerpFactor;
    c.scale += (t.scale - c.scale) * lerpFactor;
    c.detected = t.detected;
    return c;
  }
}
