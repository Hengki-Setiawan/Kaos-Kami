import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/lib/db";
import { Design } from "../src/lib/drizzle-schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Launching headless browser to capture real 3D canvas renders (Front & Back)...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=default",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  const designs = [
    {
      id: "des_test_toraja_03",
      title: "Toraja Heavyweight Streetwear Hoodie",
      frontFilename: "3d-toraja-hoodie-front.webp",
      backFilename: "3d-toraja-hoodie-back.webp",
    },
    {
      id: "des_test_losari_02",
      title: "Losari Vintage Sunset Tee",
      frontFilename: "3d-losari-sunset-front.webp",
      backFilename: "3d-losari-sunset-back.webp",
    },
    {
      id: "des_test_cyber_01",
      title: "Streetwear Cyber Makassar A3+",
      frontFilename: "3d-cyber-makassar-front.webp",
      backFilename: "3d-cyber-makassar-back.webp",
    },
  ];

  const publicPreviewsDir = path.resolve(process.cwd(), "public", "previews");
  if (!fs.existsSync(publicPreviewsDir)) {
    fs.mkdirSync(publicPreviewsDir, { recursive: true });
  }

  for (const item of designs) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Starting capture for: ${item.title} (${item.id})...`);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 960 },
    });
    const page = await context.newPage();

    try {
      await page.goto(`http://localhost:3000/studio?designId=${item.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for WebGL Canvas to mount
      console.log("Waiting for WebGL Canvas container...");
      await page.waitForSelector(".webgl-canvas-container canvas", { timeout: 60000 });
      console.log("Canvas element mounted! Waiting for 3D apparel mesh & GLTF to load...");

      // Wait until 3D mesh is fully loaded into the scene
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector(".webgl-canvas-container canvas") as any;
          if (!canvas) return false;
          try {
            canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 200 }));
          } catch {}
          return (
            typeof canvas.hasApparelMesh === "function" &&
            canvas.hasApparelMesh() &&
            typeof canvas.exportMockup === "function"
          );
        },
        { timeout: 60000 }
      );
      console.log("3D apparel mesh verified in scene! Settling decal textures (1.5s)...");
      await page.waitForTimeout(1500);

      // 1. Capture FRONT (Zero Tilt / 1:1 Transparent Alpha)
      const frontDataUrl = await page.evaluate(async () => {
        const canvas = document.querySelector(".webgl-canvas-container canvas") as any;
        if (!canvas || typeof canvas.exportMockup !== "function") return null;
        return await canvas.exportMockup({
          resolution: "standard",
          transparent: true,
          side: "front",
          aspectRatio: 1,
          format: "webp",
          quality: 0.92,
        });
      });

      // 2. Capture BACK (Zero Tilt / 1:1 Transparent Alpha)
      const backDataUrl = await page.evaluate(async () => {
        const canvas = document.querySelector(".webgl-canvas-container canvas") as any;
        if (!canvas || typeof canvas.exportMockup !== "function") return null;
        return await canvas.exportMockup({
          resolution: "standard",
          transparent: true,
          side: "back",
          aspectRatio: 1,
          format: "webp",
          quality: 0.92,
        });
      });

      if (frontDataUrl && frontDataUrl.startsWith("data:image/webp;base64,")) {
        const base64Data = frontDataUrl.replace(/^data:image\/webp;base64,/, "");
        const filePath = path.join(publicPreviewsDir, item.frontFilename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        console.log(`Saved pristine FRONT 3D render: ${filePath} (${fs.statSync(filePath).size} bytes)`);
      }

      if (backDataUrl && backDataUrl.startsWith("data:image/webp;base64,")) {
        const base64Data = backDataUrl.replace(/^data:image\/webp;base64,/, "");
        const filePath = path.join(publicPreviewsDir, item.backFilename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        console.log(`Saved pristine BACK 3D render: ${filePath} (${fs.statSync(filePath).size} bytes)`);
      }

      const frontRelativeUrl = `/previews/${item.frontFilename}`;
      const backRelativeUrl = `/previews/${item.backFilename}`;

      // Update database with distinct front and back previews
      await db
        .update(Design)
        .set({
          previewImageFrontUrl: frontRelativeUrl,
          previewImageBackUrl: backRelativeUrl,
          updatedAt: new Date(),
        })
        .where(eq(Design.id, item.id));

      console.log(`Updated Design ${item.id}: front=${frontRelativeUrl}, back=${backRelativeUrl}`);
    } catch (err) {
      console.error(`Error capturing ${item.id}:`, err);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log("\nAll 3D previews (Front & Back) successfully captured and database updated!");
}

main().catch(console.error);
