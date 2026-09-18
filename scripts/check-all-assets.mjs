import fs from "fs";

function checkGLB(file) {
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.toString("utf8", 20, 20 + jsonLen));
  return {
    file,
    generator: gltf.asset?.generator,
    title: gltf.asset?.extras?.title || gltf.asset?.extras?.name,
    author: gltf.asset?.extras?.author,
    meshCount: gltf.meshes?.length,
    meshes: gltf.meshes?.map(m => m.name),
    materials: gltf.materials?.map(m => m.name),
  };
}

const list = fs.readdirSync("Asset 3D/sketchfab").filter(f => f.endsWith(".glb"));
console.log("=== SKETCHFAB MODELS ===");
list.forEach(f => {
  const info = checkGLB(`Asset 3D/sketchfab/${f}`);
  console.log(`\n[${f}] (${(fs.statSync(`Asset 3D/sketchfab/${f}`).size / 1024).toFixed(0)} KB)`);
  console.log(`  Title: ${info.title} | Author: ${info.author}`);
  console.log(`  Meshes: ${info.meshes?.join(", ")}`);
  console.log(`  Materials: ${info.materials?.join(", ")}`);
});
