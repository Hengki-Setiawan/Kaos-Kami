/**
 * ==============================================================================
 * CLOTH ROTATIONAL INERTIA & DAMPED SPRING OSCILLATOR
 * ==============================================================================
 * Simulates organic fabric weight, rotational inertia, and hem swing when
 * the user spins/drags the 3D garment.
 *
 * Physics formula:
 * a = -k * displacement - c * velocity + torque
 * where:
 *   k = spring stiffness (heavyweight cotton = higher stiffness)
 *   c = damping coefficient (air and fabric friction)
 */

export interface ClothPhysicsState {
  currentAngle: number;
  angularVelocity: number;
  inertialDisplacement: number; // In radians (lean/sway angle)
  oscillationVelocity: number;
}

export class ClothInertiaSimulator {
  private stiffness: number;
  private damping: number;
  private mass: number;
  private maxLeanRadians: number;
  private state: ClothPhysicsState;
  private lastAngle: number;

  constructor(options?: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    maxLeanDeg?: number;
  }) {
    // 240/280 GSM Cotton characteristics
    this.stiffness = options?.stiffness ?? 42.0;
    this.damping = options?.damping ?? 6.5;
    this.mass = options?.mass ?? 0.28; // 280 grams
    this.maxLeanRadians = ((options?.maxLeanDeg ?? 14.0) * Math.PI) / 180;

    this.state = {
      currentAngle: 0,
      angularVelocity: 0,
      inertialDisplacement: 0,
      oscillationVelocity: 0,
    };
    this.lastAngle = 0;
  }

  /**
   * Update rotation angle from TouchOrbitControls
   */
  public reportRotation(angleRadians: number, dt: number): void {
    if (dt <= 0) return;
    const delta = angleRadians - this.lastAngle;
    this.lastAngle = angleRadians;
    this.state.angularVelocity = delta / dt;
  }

  /**
   * Step the spring-mass physics simulation per frame (in useFrame)
   */
  public update(dt: number): number {
    const clampedDt = Math.min(dt, 0.05); // Cap at 20 FPS minimum to avoid explosion

    // Inertial torque induced by angular velocity of the spin
    const inertialTorque = -this.state.angularVelocity * 0.18;

    // Hooke's law spring restoring force + damping friction
    const springForce = -this.stiffness * this.state.inertialDisplacement;
    const dampingForce = -this.damping * this.state.oscillationVelocity;
    const totalForce = springForce + dampingForce + inertialTorque;

    const acceleration = totalForce / this.mass;
    this.state.oscillationVelocity += acceleration * clampedDt;
    this.state.inertialDisplacement += this.state.oscillationVelocity * clampedDt;

    // Decay angular velocity influence
    this.state.angularVelocity *= 0.92;

    // Clamp maximum fabric deflection
    this.state.inertialDisplacement = Math.max(
      -this.maxLeanRadians,
      Math.min(this.maxLeanRadians, this.state.inertialDisplacement)
    );

    return this.state.inertialDisplacement;
  }

  public getDisplacement(): number {
    return this.state.inertialDisplacement;
  }
}
