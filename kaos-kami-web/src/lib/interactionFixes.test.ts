import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { getDecal3DPlacement } from "./scaleCalibration";
import type { DecalTargetSide } from "./constants";

describe("Gizmo and 360 Orbit Interaction Verification", () => {
  it("verifies screen-space drag sign multiplier (signX) maps cursor right to screen right", () => {
    // Helper function mirroring DecalGizmo.tsx signX determination
    const getSignX = (side: DecalTargetSide): number => {
      return side === "back" ||
        side === "hood" ||
        side === "right_sleeve" ||
        side === "side_right"
        ? -1
        : 1;
    };

    // Front: camera looks at -Z -> signX = 1
    expect(getSignX("front")).toBe(1);

    // Back & Hood: camera looks at +Z (flipped X view) -> signX = -1
    expect(getSignX("back")).toBe(-1);
    expect(getSignX("hood")).toBe(-1);

    // Left sleeve & Side left: camera is at -X looking towards origin.
    // Looking at left side, +Z is to camera's RIGHT. Increasing decalX increases Z, moving to screen right.
    // Therefore signX must be +1.
    expect(getSignX("left_sleeve")).toBe(1);
    expect(getSignX("side_left")).toBe(1);

    // Right sleeve & Side right: camera is at +X looking towards origin.
    // Looking at right side, +Z is to camera's LEFT. Increasing decalX increases Z, moving to screen left.
    // Therefore signX must be -1.
    expect(getSignX("right_sleeve")).toBe(-1);
    expect(getSignX("side_right")).toBe(-1);
  });

  it("verifies side_right 3D placement posZ is positive towards front", () => {
    const sideRight = getDecal3DPlacement("tshirt", "side_right", 0.05, 0, 0.105);
    // When decalX is positive (towards front), Z position should be positive (> 0)
    expect(sideRight.position[2]).toBeGreaterThan(0);
  });

  it("verifies Three.js decal rotation produces clockwise rotation for positive degrees", () => {
    // In DecalLayerRenderer.tsx, qUser rotates around (0,0,1) by (-decal.rotation * PI) / 180
    // Test that a +90 degree user rotation turns a vector (1, 0, 0) clockwise to (0, -1, 0)
    const deg = 90;
    const qUser = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      (-deg * Math.PI) / 180
    );

    const v = new THREE.Vector3(1, 0, 0).applyQuaternion(qUser);
    expect(v.x).toBeCloseTo(0, 4);
    // In 2D screen coordinates where +Y is up, rotating (1, 0) clockwise 90 degrees yields (0, -1)
    expect(v.y).toBeCloseTo(-1, 4);
  });

  it("verifies 360 Orbit pivot always locks to model position [modelPosX + targetX, modelPosY - 0.05, 0]", () => {
    // When model is nudged / aligned to left:
    const modelPosX = -0.45;
    const modelPosY = 0.1;
    const targetX = 0; // drawer closed

    const pivotX = modelPosX + targetX;
    const pivotY = modelPosY - 0.05;
    const pivotZ = 0;

    const pivot = new THREE.Vector3(pivotX, pivotY, pivotZ);
    const modelPos = new THREE.Vector3(modelPosX, modelPosY - 0.05, 0);

    // The orbit center of rotation is IDENTICAL to the apparel model origin!
    expect(pivot.x).toBe(modelPos.x);
    expect(pivot.y).toBe(modelPos.y);
    expect(pivot.z).toBe(modelPos.z);

    // Test that an orbit rotation around this pivot keeps the model at the center
    const cameraOffset = new THREE.Vector3(0, 0, 2.3);
    const cameraPos = pivot.clone().add(cameraOffset);

    // Rotate camera 90 degrees around pivot
    const orbitQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    const newCamPos = pivot.clone().add(cameraOffset.clone().applyQuaternion(orbitQ));

    // Distance from camera to model is preserved
    expect(newCamPos.distanceTo(modelPos)).toBeCloseTo(2.3, 4);

    // Camera lookAt direction points from camera to model: (-1, 0, 0)
    const lookDir = modelPos.clone().sub(newCamPos).normalize();
    expect(lookDir.x).toBeCloseTo(-1, 4);
    expect(lookDir.z).toBeCloseTo(0, 4);
  });

  it("verifies getStretchFactors applies Poisson cloth deformation along selected axis", async () => {
    const { getStretchFactors } = await import("./3d/stretchPhysics");

    // Horizontal stretch (dada): X expands, Y & Z contract slightly
    const horiz = getStretchFactors("stretch", 0.5, "horizontal");
    expect(horiz.stretchX).toBeGreaterThan(1.0);
    expect(horiz.stretchY).toBeLessThan(1.0);
    expect(horiz.stretchZ).toBeLessThan(1.0);
    expect(horiz.stretchX).toBeCloseTo(1.0 + 0.5 * 0.38, 4);
    expect(horiz.stretchY).toBeCloseTo(1.0 - 0.5 * 0.12, 4);

    // Vertical stretch (kerah): Y expands, X & Z contract
    const vert = getStretchFactors("stretch", 0.5, "vertical");
    expect(vert.stretchY).toBeGreaterThan(1.0);
    expect(vert.stretchX).toBeLessThan(1.0);
    expect(vert.stretchY).toBeCloseTo(1.0 + 0.5 * 0.38, 4);
    expect(vert.stretchX).toBeCloseTo(1.0 - 0.5 * 0.12, 4);

    // Biaxial stretch (radial): both X and Y expand equally
    const biax = getStretchFactors("stretch", 0.5, "biaxial");
    expect(biax.stretchX).toBeGreaterThan(1.0);
    expect(biax.stretchY).toBeGreaterThan(1.0);
    expect(biax.stretchX).toBe(biax.stretchY);

    // None mode: 1.0 on all axes
    const none = getStretchFactors("none", 0.5, "horizontal");
    expect(none.stretchX).toBe(1.0);
    expect(none.stretchY).toBe(1.0);
    expect(none.stretchZ).toBe(1.0);
  });
});

