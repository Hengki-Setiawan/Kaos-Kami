"use client";
import React from "react";
import * as THREE from "three";
import { CanvasStage } from "@/components/3d/CanvasStage";

export default function OrderInspector3D() {
  const camPos = new THREE.Vector3(0, 0.12, 2.4);
  const lookAt = new THREE.Vector3(0, 0, 0);
  return <CanvasStage camPos={camPos} lookAtPos={lookAt} />;
}
