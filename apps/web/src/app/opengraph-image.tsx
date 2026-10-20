import { ImageResponse } from "next/og";
import { COLORS, OgLogo, OgTiles, display, text } from "@/lib/og/brand";
import { ogFonts } from "@/lib/og/fonts";
import { SITE_HOST } from "@/lib/site";

export const alt = "Chutaí: adivinhe o personagem antes dos seus amigos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem padrão do site (início, temas e o resto) quando o link é colado num app. */
export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: COLORS.anil,
        padding: "64px 72px",
      }}
    >
      <OgLogo size={120} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", ...display(66, COLORS.white) }}>Adivinhe o personagem</div>
        <div style={{ display: "flex", ...display(66, COLORS.gema) }}>antes dos seus amigos.</div>
        <div style={{ display: "flex", ...text(34, COLORS.anilSoft), marginTop: 8 }}>
          Crie uma sala, mande o código no grupo e chute.
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={text(32, COLORS.white)}>{SITE_HOST}</span>
        <OgTiles size={60} gap={14} />
      </div>
    </div>,
    { ...size, fonts: await ogFonts() },
  );
}
