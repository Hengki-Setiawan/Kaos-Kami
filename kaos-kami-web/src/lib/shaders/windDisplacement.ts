/**
 * Wind displacement shader — port dari BLUEPRINT-02 §4
 * Cheap cloth-look tanpa physics, via vertex sine
 */
export const windVertexShader = `
uniform float uTime;
uniform float uWindStrength;
attribute float windWeight;
varying vec3 vWorldPos;

void main() {
  vec3 transformed = position;
  float wave = sin(uTime * 2.0 + position.y * 4.0) * uWindStrength;
  transformed.x += wave * windWeight * 0.04;
  transformed.z += cos(uTime * 1.6 + position.x * 3.0) * uWindStrength * windWeight * 0.03;
  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

/**
 * Uniforms angin BERSAMA (by-reference): arah + hembusan ditulis per-frame oleh
 * TestLabOverlay (WindUniformWriter) tanpa recompile. Default = tiupan depan.
 */
export const sharedWindUniforms = {
  uWindDir: { value: null as unknown as { x: number; y: number; z: number } },
  uGust: { value: 0.6 },
};

export interface WindApplyOpts {
  strength: number;
  /** Vektor arah gerak udara (lihat windDirectionToVec). Default (0,0,-1). */
  dir?: { x: number; y: number; z: number };
}

export function applyWindToMaterial(
  material: any,
  windStrength: number | WindApplyOpts
) {
  const opts: WindApplyOpts =
    typeof windStrength === "number" ? { strength: windStrength } : windStrength;
  if (opts.dir) {
    sharedWindUniforms.uWindDir.value = opts.dir;
  } else if (!sharedWindUniforms.uWindDir.value) {
    // Default malas: depan→belakang (hindari import three di modul shader murni).
    sharedWindUniforms.uWindDir.value = { x: 0, y: 0, z: -1 };
  }
  // Guard inject ganda (StrictMode dev / apply ulang material sama).
  if (material.userData.windInjectedV2) return material;
  material.userData.windInjectedV2 = true;
  const prevOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader: any) => {
    if (typeof prevOnBeforeCompile === "function") {
      prevOnBeforeCompile.call(material, shader);
    }
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: opts.strength };
    shader.uniforms.uWindDir = sharedWindUniforms.uWindDir as never;
    shader.uniforms.uGust = sharedWindUniforms.uGust as never;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nuniform vec3 uWindDir;\nuniform float uGust;\nattribute float windWeight;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
{
  float g = uWindStrength * uGust;
  float w1 = sin(uTime * 2.2 + dot(position.xy, vec2(4.0, 5.0)));
  float w2 = sin(uTime * 4.1 + position.y * 9.0 + position.x * 6.0) * 0.35;
  vec3 flutter = uWindDir * (w1 + w2) * windWeight * 0.045 * g;
  flutter.y += w2 * windWeight * 0.012 * g;
  transformed += flutter;
}`
    );
    material.userData.shader = shader;
  };
  material.needsUpdate = true;
  return material;
}
