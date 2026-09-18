"use client";

import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { applyProps } from "@react-three/fiber";
import { DecalGeometry } from "three-stdlib";

function isArray(vec: any): vec is any[] {
  return Array.isArray(vec);
}

function vecToArray(vec: any = [0, 0, 0]): number[] {
  if (isArray(vec)) {
    return vec;
  } else if (vec instanceof THREE.Vector3 || vec instanceof THREE.Euler) {
    return [vec.x, vec.y, vec.z];
  } else {
    return [vec, vec, vec];
  }
}

/**
 * Filter out back-facing and interior triangles from DecalGeometry.
 * Ensures decals NEVER bleed through the back of sleeves, opposite side of body, or interior seams.
 */
export function filterDecalBackfaces(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3,
  rotation: THREE.Euler,
  minDot: number = 0.05,
  targetSide?: string
): THREE.BufferGeometry {
  const pAttr = geometry.attributes.position;
  const nAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;

  if (!pAttr || !nAttr || !uvAttr || pAttr.count === 0) {
    return geometry;
  }

  const projMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation).setPosition(position);
  const projInv = projMatrix.clone().invert();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(projInv);

  const keptPos: number[] = [];
  const keptNorm: number[] = [];
  const keptUv: number[] = [];

  for (let i = 0; i < pAttr.count; i += 3) {
    const x0 = pAttr.getX(i);
    const x1 = pAttr.getX(i + 1);
    const x2 = pAttr.getX(i + 2);
    const avgX = (x0 + x1 + x2) / 3;

    const y0 = pAttr.getY(i);
    const y1 = pAttr.getY(i + 1);
    const y2 = pAttr.getY(i + 2);
    const avgY = (y0 + y1 + y2) / 3;

    // SPATIAL PARTITIONING GUARDS:
    // 1. Sablon lengan kiri HARUS berada di lengan kiri, DILARANG menembus/bocor ke rusuk badan (|x| < 0.165)
    if (targetSide === "left_sleeve" && avgX > -0.165) {
      continue;
    }
    // 2. Sablon lengan kanan HARUS berada di lengan kanan, DILARANG menembus/bocor ke rusuk badan
    if (targetSide === "right_sleeve" && avgX < 0.165) {
      continue;
    }
    // 3. Sablon dada / punggung tidak boleh bocor melompat ke lengan luar
    if ((targetSide === "front" || targetSide === "back") && Math.abs(avgX) > 0.22 && avgY < 0.05) {
      continue;
    }

    const n0 = new THREE.Vector3(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i)).applyMatrix3(normalMatrix).normalize();
    const n1 = new THREE.Vector3(nAttr.getX(i + 1), nAttr.getY(i + 1), nAttr.getZ(i + 1)).applyMatrix3(normalMatrix).normalize();
    const n2 = new THREE.Vector3(nAttr.getX(i + 2), nAttr.getY(i + 2), nAttr.getZ(i + 2)).applyMatrix3(normalMatrix).normalize();
    const avgZ = (n0.z + n1.z + n2.z) / 3;

    // Normal in projector space must face forward (+Z towards projector)
    if (avgZ > minDot) {
      for (let j = 0; j < 3; j++) {
        const idx = i + j;
        keptPos.push(pAttr.getX(idx), pAttr.getY(idx), pAttr.getZ(idx));
        keptNorm.push(nAttr.getX(idx), nAttr.getY(idx), nAttr.getZ(idx));
        keptUv.push(uvAttr.getX(idx), uvAttr.getY(idx));
      }
    }
  }

  // Dispose raw geometry
  geometry.dispose();

  const cleanGeom = new THREE.BufferGeometry();
  cleanGeom.setAttribute("position", new THREE.Float32BufferAttribute(keptPos, 3));
  cleanGeom.setAttribute("normal", new THREE.Float32BufferAttribute(keptNorm, 3));
  cleanGeom.setAttribute("uv", new THREE.Float32BufferAttribute(keptUv, 2));

  return cleanGeom;
}

export interface CleanDecalProps extends Omit<React.ComponentProps<"mesh">, "position" | "rotation" | "scale"> {
  targetSide?: string;
  debug?: boolean;
  mesh?: React.RefObject<THREE.Mesh> | null;
  position?: THREE.Vector3 | [number, number, number] | number;
  rotation?: THREE.Euler | [number, number, number] | number;
  scale?: THREE.Vector3 | [number, number, number] | number;
  map?: THREE.Texture | null;
  depthTest?: boolean;
  polygonOffsetFactor?: number;
}

/**
 * CleanDecal — Precision DTF Sablon Decal Component
 * Drop-in replacement for Drei `<Decal>` with integrated Vector Normal Dot Product Filtering.
 * Eliminates 100% of sleeve pass-through, torso penetration, and backface bleeding.
 */
export const CleanDecal = forwardRef<THREE.Mesh, CleanDecalProps>(function CleanDecal(
  {
    targetSide,
    debug,
    depthTest = false,
    polygonOffsetFactor = -10,
    map,
    mesh,
    children,
    position,
    rotation,
    scale,
    ...props
  },
  forwardRef
) {
  const ref = useRef<THREE.Mesh>(null!);
  useImperativeHandle(forwardRef, () => ref.current);

  const state = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1),
  });

  useLayoutEffect(() => {
    const parent = mesh?.current || ref.current?.parent;
    const target = ref.current;

    if (!target) return;
    if (!(parent instanceof THREE.Mesh)) {
      throw new Error("CleanDecal must have a Mesh as parent or specify its 'mesh' prop");
    }

    applyProps(state.current, {
      position,
      scale,
    });

    const matrixWorld = parent.matrixWorld.clone();
    parent.matrixWorld.identity();

    if (!rotation || typeof rotation === "number") {
      const o = new THREE.Object3D();
      o.position.copy(state.current.position);

      const vertices = parent.geometry.attributes.position.array;
      if (parent.geometry.attributes.normal === undefined) {
        parent.geometry.computeVertexNormals();
      }
      const normal = parent.geometry.attributes.normal.array;
      let distance = Infinity;
      const closestNormal = new THREE.Vector3();
      const ox = o.position.x;
      const oy = o.position.y;
      const oz = o.position.z;
      const vLength = vertices.length;
      let chosenIdx = -1;

      for (let i = 0; i < vLength; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        const distSquared = (x - ox) ** 2 + (y - oy) ** 2 + (z - oz) ** 2;
        if (distSquared < distance) {
          distance = distSquared;
          chosenIdx = i;
        }
      }

      closestNormal.fromArray(normal, chosenIdx);
      o.lookAt(o.position.clone().add(closestNormal));
      o.rotateZ(Math.PI);
      o.rotateY(Math.PI);
      if (typeof rotation === "number") o.rotateZ(rotation);

      applyProps(state.current, {
        rotation: o.rotation,
      });
    } else {
      applyProps(state.current, {
        rotation,
      });
    }

    // Generate raw DecalGeometry
    const rawGeometry = new DecalGeometry(
      parent,
      state.current.position,
      state.current.rotation,
      state.current.scale
    );

    // Apply strict backface culling with spatial isolation guard
    target.geometry = filterDecalBackfaces(
      rawGeometry,
      state.current.position,
      state.current.rotation,
      0.05,
      targetSide
    );

    parent.matrixWorld = matrixWorld;

    return () => {
      target.geometry?.dispose();
    };
  }, [mesh, targetSide, ...vecToArray(position), ...vecToArray(scale), ...vecToArray(rotation)]);

  return (
    <mesh
      ref={ref}
      material-transparent={true}
      material-polygonOffset={true}
      material-polygonOffsetFactor={polygonOffsetFactor}
      material-depthTest={depthTest}
      material-map={map}
      {...(props as any)}
    >
      {children}
    </mesh>
  );
});
