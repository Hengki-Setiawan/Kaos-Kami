import { GET } from "../src/app/api/catalog/variants/route.ts";
import { NextRequest } from "next/server";

async function main() {
  const req = new NextRequest("http://localhost:3000/api/catalog/variants");
  const res = await GET(req);
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Success:", data.success);
  console.log("Variants count:", data.variants?.length);
  if (data.variants && data.variants.length > 0) {
    const tshirtVariants = data.variants.filter((v) => 
      (v.category?.slug === 'tshirt' || v.category?.slug === 'tee') &&
      (v.colorHex?.toLowerCase() === '#ffffff' || v.colorName?.toLowerCase().includes('white') || v.colorName?.toLowerCase().includes('chalk'))
    );
    console.log("Found tshirt white variants:", tshirtVariants.length);
    tshirtVariants.forEach(v => {
      console.log(`[${v.size}] id: ${v.id}, sku: ${v.sku}, colorHex: ${v.colorHex}, colorName: ${v.colorName}, stockQty: ${v.stockQty}, price: ${v.priceIdr}`);
    });
  }
}

main().catch(console.error);
