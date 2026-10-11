import sharp from "sharp";
import path from "path";
import fs from "fs";

async function makeRealisticMockups() {
  const publicDir = path.join(__dirname, "../public");
  const outputDir = path.join(publicDir, "mockups");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // --- 1. T-Shirt Hitam Solid + Maskot Kamito (Streetwear Cyber Makassar A3+) ---
  const tshirtBlack = path.join(publicDir, "products/tshirt-black.jpg");
  const kamitoDecal = path.join(publicDir, "mascot/kamito-clean-decal.png");

  // Resize decal cleanly without opaque padding
  const kamitoForBlack = await sharp(kamitoDecal)
    .resize(320, 320, { fit: "inside" })
    .toBuffer();

  const kbMeta = await sharp(kamitoForBlack).metadata();
  const kbw = kbMeta.width || 320;
  const kbh = kbMeta.height || 320;
  const kbLeft = Math.round(448 - kbw / 2);
  const kbTop = 450;

  const out1 = path.join(outputDir, "mockup-cyber-makassar-black.jpg");
  await sharp(tshirtBlack)
    .composite([
      {
        input: kamitoForBlack,
        top: kbTop,
        left: kbLeft,
      },
    ])
    .jpeg({ quality: 95 })
    .toFile(out1);
  console.log("Mockup 1 Created:", out1);

  // --- 2. T-Shirt Putih Ecru + Maskot Kamito (Losari Vintage Sunset Tee) ---
  const tshirtWhite = path.join(publicDir, "products/tshirt-white-ecru.jpg");

  const kamitoForWhite = await sharp(kamitoDecal)
    .resize(320, 320, { fit: "inside" })
    .toBuffer();

  const kwMeta = await sharp(kamitoForWhite).metadata();
  const kww = kwMeta.width || 320;
  const kwh = kwMeta.height || 320;
  const kwLeft = Math.round(448 - kww / 2);
  const kwTop = 450;

  const out2 = path.join(outputDir, "mockup-losari-sunset-white.jpg");
  await sharp(tshirtWhite)
    .composite([
      {
        input: kamitoForWhite,
        top: kwTop,
        left: kwLeft,
      },
    ])
    .jpeg({ quality: 95 })
    .toFile(out2);
  console.log("Mockup 2 Created:", out2);

  // --- 3. Hoodie Hitam + Maskot Kamito (Toraja Heavyweight Hoodie) ---
  const hoodieBlack = path.join(publicDir, "products/hoodie-black.jpg");

  const kamitoForHoodie = await sharp(kamitoDecal)
    .resize(290, 290, { fit: "inside" })
    .toBuffer();

  const khMeta = await sharp(kamitoForHoodie).metadata();
  const khw = khMeta.width || 290;
  const khh = khMeta.height || 290;
  const khLeft = Math.round(448 - khw / 2);
  const khTop = 480;

  const out3 = path.join(outputDir, "mockup-toraja-hoodie-black.jpg");
  await sharp(hoodieBlack)
    .composite([
      {
        input: kamitoForHoodie,
        top: khTop,
        left: khLeft,
      },
    ])
    .jpeg({ quality: 95 })
    .toFile(out3);
  console.log("Mockup 3 Created:", out3);
}

makeRealisticMockups().catch(console.error);
