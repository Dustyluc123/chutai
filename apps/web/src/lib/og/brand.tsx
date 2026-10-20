import type { CSSProperties, ReactNode } from "react";
import { DISPLAY, TEXT } from "./fonts";

/** Cores da identidade (as mesmas de globals.css). */
export const COLORS = {
  anil: "#2338d6",
  anilDeep: "#18249a",
  anilSoft: "#dde2ff",
  gema: "#ffc928",
  gemaSoft: "#fff1c2",
  chiclete: "#ff4f9a",
  chicleteSoft: "#ffe0ee",
  folha: "#12a85f",
  papel: "#f4f5fa",
  tinta: "#16183f",
  tintaSoft: "#4a4d72",
  white: "#ffffff",
} as const;

export const display = (size: number, color: string = COLORS.tinta): CSSProperties => ({
  fontFamily: DISPLAY,
  fontWeight: 900,
  fontSize: size,
  color,
  lineHeight: 1.05,
});

export const text = (size: number, color: string = COLORS.tinta): CSSProperties => ({
  fontFamily: TEXT,
  fontWeight: 600,
  fontSize: size,
  color,
  lineHeight: 1.25,
});

/** Logo "Chutaí": o acento do "í" é um traço gordo cor de gema, como no site. */
export function OgLogo({ size, color = COLORS.white }: { size: number; color?: string }) {
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", ...display(size, color), lineHeight: 1 }}
    >
      <span>Chuta</span>
      <div style={{ display: "flex", position: "relative" }}>
        <span>ı</span>
        <div
          style={{
            position: "absolute",
            top: size * 0.02,
            left: size * 0.06,
            width: size * 0.2,
            height: size * 0.24,
            background: COLORS.gema,
            borderRadius: size * 0.04,
            transform: "skewX(-30deg)",
          }}
        />
      </div>
    </div>
  );
}

/** Emoji já baixado (data URI). Sem ele, mostra `fallback` (ou nada). */
export function OgEmoji({
  src,
  size,
  fallback = null,
}: {
  src: string | null;
  size: number;
  fallback?: ReactNode;
}) {
  if (!src) return <>{fallback}</>;
  return <img src={src} width={size} height={size} alt="" />;
}

/** Avatar redondo cor de gema com o emoji (ou a inicial do apelido, se o emoji não veio). */
export function OgAvatar({
  src,
  size,
  initial,
  background = COLORS.gema,
}: {
  src: string | null;
  size: number;
  initial: string;
  background?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size,
        background,
        border: `${Math.max(3, Math.round(size / 40))}px solid ${COLORS.tinta}`,
        flexShrink: 0,
      }}
    >
      <OgEmoji
        src={src}
        size={Math.round(size * 0.6)}
        fallback={<span style={display(Math.round(size * 0.45))}>{initial}</span>}
      />
    </div>
  );
}

/** Peças coloridas do tabuleiro, de enfeite. */
export function OgTiles({ size, gap }: { size: number; gap: number }) {
  const colors = [COLORS.folha, COLORS.gema, COLORS.chiclete, COLORS.folha, COLORS.white];
  return (
    <div style={{ display: "flex", gap }}>
      {colors.map((color, index) => (
        <div
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.22,
            background: color,
            border: `4px solid ${COLORS.tinta}`,
            boxShadow: `4px 4px 0 ${COLORS.tinta}`,
          }}
        />
      ))}
    </div>
  );
}
