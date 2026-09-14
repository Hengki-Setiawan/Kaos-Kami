import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import path from 'path';

async function inspect(file) {
  try {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule()
    });
    const fullPath = path.resolve('kaos-kami-web/public/models', file);
    const doc = await io.read(fullPath);
    const root = doc.getRoot();
    console.log('========================================================');
    console.log('FILE:', file);
    console.log('Nodes count:', root.listNodes().length);
    root.listNodes().forEach((node, i) => {
      const mesh = node.getMesh();
      console.log('Node ' + i + ': name="' + node.getName() + '", mesh=' + (mesh ? mesh.getName() || 'Mesh' : 'none') +
        ', trans=' + JSON.stringify(node.getTranslation()) +
        ', rot=' + JSON.stringify(node.getRotation()) +
        ', scale=' + JSON.stringify(node.getScale()));
    });
    root.listMeshes().forEach((mesh, i) => {
      console.log('Mesh ' + i + ': name="' + mesh.getName() + '"');
      mesh.listPrimitives().forEach((prim, j) => {
        const pos = prim.getAttribute('POSITION');
        console.log('  Prim ' + j + ': pos count=' + (pos ? pos.getCount() : 0) +
          ', min=' + JSON.stringify(pos ? pos.getMin([0,0,0]) : null) +
          ', max=' + JSON.stringify(pos ? pos.getMax([0,0,0]) : null));
        const mat = prim.getMaterial();
        console.log('  Mat: ' + (mat ? mat.getName() : 'none') +
          ', baseColor=' + JSON.stringify(mat ? mat.getBaseColorFactor() : null) +
          ', alphaMode=' + (mat ? mat.getAlphaMode() : null));
      });
    });
  } catch (err) {
    console.error('Error inspecting ' + file + ':', err);
  }
}

(async () => {
  await inspect('tee-basic.glb');
  await inspect('tee-basic.draco.glb');
  await inspect('sweater.glb');
  await inspect('hoodie-blue.glb');
  await inspect('longsleeve.glb');
  await inspect('jacket.glb');
  await inspect('cap.glb');
  await inspect('pants.glb');
  await inspect('shorts.glb');
})();
