import React from 'react';
import { prisma } from '@/lib/db';
import { CanvasStage } from '@/components/3d/CanvasStage';
import * as THREE from 'three';

export default async function RenderPage({ params }: { params: { designId: string } }) {
  const design = await prisma.design.findUnique({ where: { id: params.designId }, include: { category: true } });
  if (!design) return <div data-render-ready='false'>Design not found</div>;
  const camPos = new THREE.Vector3(0, 0, 2.5);
  const lookAt = new THREE.Vector3(0, 0, 0);
  return (
    <div data-render-ready='true' style={{ width: 1600, height: 1600 }}>
      <CanvasStage camPos={camPos} lookAtPos={lookAt} />
    </div>
  );
}
