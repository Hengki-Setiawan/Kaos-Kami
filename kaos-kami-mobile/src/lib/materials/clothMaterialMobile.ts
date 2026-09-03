import * as THREE from 'three';

let cachedWeaveNormal: THREE.CanvasTexture | null = null;

export function getProceduralWeaveTexture(): THREE.CanvasTexture {
  if (cachedWeaveNormal) return cachedWeaveNormal;

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#8080FF';
    ctx.fillRect(0, 0, 128, 128);

    // Diagonal twill weave pattern
    ctx.strokeStyle = '#9090FF';
    ctx.lineWidth = 1;
    for (let i = -128; i < 256; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
    }

    ctx.strokeStyle = '#7070FF';
    for (let i = 0; i < 256; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - 128, 128);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32, 32);
  texture.needsUpdate = true;

  cachedWeaveNormal = texture;
  return texture;
}

export function createMobileClothMaterial(baseColor: string): THREE.MeshStandardMaterial {
  const normalMap = getProceduralWeaveTexture();

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor),
    roughness: 0.85,
    metalness: 0.05,
    normalMap,
    normalScale: new THREE.Vector2(0.12, 0.12),
    side: THREE.DoubleSide,
  });
}
