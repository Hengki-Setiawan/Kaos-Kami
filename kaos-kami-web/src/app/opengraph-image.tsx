import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const alt = "kaos kami — Heavyweight 3D Apparel Experience | Makassar DTF Sablon";

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#121214",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 6,
            color: "#E65100",
            fontWeight: 700,
          }}
        >
          KAOS KAMI · MAKASSAR
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            lineHeight: 1,
            color: "#FFFFFF",
            fontWeight: 800,
            marginTop: 16,
          }}
        >
          kaos kami
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#A1A1AA",
            marginTop: 20,
          }}
        >
          Heavyweight streetwear, engineered not printed.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 24,
            color: "#121214",
            backgroundColor: "#E65100",
            padding: "12px 28px",
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          240 &amp; 280 GSM · Studio 3D · Sablon DTF
        </div>
      </div>
    ),
    { ...size }
  );
}
