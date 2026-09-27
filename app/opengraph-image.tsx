import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "pnk почта (пнк почта) — электронная почта @pnkmail.ru";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(145deg, #0066ff 0%, #003399 55%, #0c0d10 100%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            opacity: 0.95,
          }}
        >
          pnk почта · пнк почта
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              maxWidth: 900,
            }}
          >
            Письма и вложения без границ
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              opacity: 0.85,
              maxWidth: 820,
            }}
          >
            Российская электронная почта @pnkmail.ru
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 600,
            opacity: 0.7,
          }}
        >
          pnkmail.ru
        </div>
      </div>
    ),
    { ...size },
  );
}
