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

export function applyWindToMaterial(
  material: any,
  windStrength: number
) {
  material.onBeforeCompile = (shader: any) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: windStrength };
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nattribute float windWeight;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `vec3 transformed = vec3(position);\nfloat wave = sin(uTime * 2.0 + position.y * 4.0) * uWindStrength;\ntransformed.x += wave * windWeight * 0.04;\n#include <begin_vertex>`
    );
    material.userData.shader = shader;
  };
  material.needsUpdate = true;
  return material;
}
