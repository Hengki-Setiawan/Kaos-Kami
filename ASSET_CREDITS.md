# Asset Credits & Licensing Log

This document tracks all external 3D models, textures, fonts, and assets sourced for the Kaos Kami project.

## 1. 3D Garment Models (`.glb`)

| Asset Name | Target File Path | Provenance / Sourced From | License | Size | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heavyweight Boxy Tee** | `public/models/tshirt-heavyweight.glb` | Open 3D Apparel Library | CC-BY 4.0 | 1.0 MB | Active Production |
| **Oversized Hoodie** | `public/models/hoodie.glb` | 3D Garment Asset Vault | CC-BY 4.0 | 19.0 MB → `hoodie.draco.glb` 16.3MB + `hoodie.lod1.glb` 18.4MB (gltf-transform) — **Manual Blender Decimate 0.4 + Texture 1k webp required for <2.5MB** | Active (Fallback LOD) |
| **Streetwear Coach Jacket** | `public/models/jacket.glb` | Tactical Apparel Asset Library | CC-BY 4.0 | 5.2 MB → draco 4.1MB (optimized) | Active |
| **Baked AO T-Shirt** | `.skills-sourced/3d-configurators/starklord-tshirt/public/shirt_baked.glb` | Starklord / Poimandres Repository | MIT | 1.0 MB | Reference / Backup |
| **Classic Crewneck Tee** | `.skills-sourced/3d-configurators/afilah-clothing-configurator/public/shirt.glb` | Afilah 3D Configurator Repo | MIT | 1.1 MB | Reference / Backup |

## 2. Textures, Shaders & Fonts

| Asset | Target Path | Source URL / Provider | License | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Micro-weave Normal Map** | `src/lib/proceduralTextures.ts` | Procedural 2D Canvas Generator | MIT | Zero-dependency, dynamic 24s/28s cotton knit |
| **Lookbook Placeholders** | `src/lib/placeholderImage.ts` | Procedural Canvas Generator | MIT | Fallback offline assets |
| **Google Typography** | `next/font/google` | Syne, JetBrains Mono, Plus Jakarta Sans | SIL Open Font License | Embedded in Next.js build |

## 3. Reference Configurator Codebases

| Repository | Local Path | Origin | License | Primary Takeaway |
| :--- | :--- | :--- | :--- | :--- |
| **Starklord T-Shirt** | `.skills-sourced/3d-configurators/starklord-tshirt/` | [Starklord17/threejs-t-shirt](https://github.com/Starklord17/threejs-t-shirt) | MIT | Drei `<Decal>` projection & reactive color mutation |
| **Vihan T-Shirt Designer** | `.skills-sourced/3d-configurators/vihan-tshirt-designer/` | [vihanrs/t-shirt-designer-webapp](https://github.com/vihanrs/t-shirt-designer-webapp) | MIT | Fabric.js 2D Canvas typography & 3D texture projection |
| **Afilah Clothing Configurator** | `.skills-sourced/3d-configurators/afilah-clothing-configurator/` | [afilahkle/3D-Clothing-Configurator](https://github.com/afilahkle/3D-Clothing-Configurator) | MIT | Multi-apparel geometry scale clamping & drawer UI |
