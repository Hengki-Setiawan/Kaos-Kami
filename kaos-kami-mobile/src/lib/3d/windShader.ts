import * as THREE from 'three';

/**
 * Wind shader ringan untuk material mobile + bobot per-vertex.
 * uWindStrength dimodulasi per-frame dari sway inersia (lihat MobileApparelMeshRenderer),
 * sehingga kain "hidup" saat diputar dan diam saat idle — bukan goyang seragam.
 */
export function applyMobileWind(material: THREE.Material, strength = 0.3): void {
  const mat = material as any;
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: strength };
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nattribute float windWeight;'
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      [
        'vec3 transformed = vec3(position);',
        'float wave = sin(uTime * 2.1 + position.y * 5.0) * uWindStrength;',
        'transformed.x += wave * windWeight * 0.035;',
        'transformed.z += cos(uTime * 1.7 + position.x * 4.0) * uWindStrength * windWeight * 0.028;',
        '#include <begin_vertex>',
      ].join('\n')
    );
    mat.userData.shader = shader;
  };
  mat.needsUpdate = true;
}

export function ensureWindWeights(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geo.getAttribute('windWeight')) return geo;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const top = bb.min.y + (bb.max.y - bb.min.y) * 0.72;
  const span = Math.max(1e-5, top - bb.min.y);
  const w = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, (top - pos.getY(i)) / span));
    w[i] = t * t * (3 - 2 * t);
  }
  geo.setAttribute('windWeight', new THREE.BufferAttribute(w, 1));
  return geo;
}
