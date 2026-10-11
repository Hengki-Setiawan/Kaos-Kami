import { db } from "../src/lib/db";

async function main() {
  const designs = await db.query.Design.findMany({
    where: (t, { eq }) => eq(t.userId, "cmth7rezr0000us08kjfnz909"),
  });
  console.log(
    JSON.stringify(
      designs.map((d) => ({
        id: d.id,
        title: d.title,
        colorHex: d.colorHex,
        colorName: d.colorName,
        front: d.previewImageFrontUrl,
        back: d.previewImageBackUrl,
        decals: d.decals,
      })),
      null,
      2
    )
  );
}

main().catch(console.error);
