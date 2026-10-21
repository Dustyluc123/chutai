import { ImageResponse } from "next/og";
import { roomCodeSchema } from "@chutai/shared";
import { COLORS, OgAvatar, OgEmoji, OgLogo, OgTiles, display, text } from "@/lib/og/brand";
import { emojiDataUris, ogText } from "@/lib/og/emoji";
import { ogFonts } from "@/lib/og/fonts";
import { fetchRoomPreview, previewPlayersText } from "@/lib/room-preview";
import { SITE_HOST } from "@/lib/site";

export const alt = "Convite para uma sala do Chutaí";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Cartão do link da sala (WhatsApp, redes): quem chamou, tema, jogadores e código. */
export default async function Image({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = roomCodeSchema.safeParse(codigo);
  const [preview, fonts] = await Promise.all([
    code.success ? fetchRoomPreview(code.data) : Promise.resolve(null),
    ogFonts(),
  ]);

  if (!preview) {
    return new ImageResponse(<RoomEnded />, { ...size, fonts });
  }

  const host = ogText(preview.host?.nickname ?? "", "Alguém");
  const theme = ogText(preview.theme.name, "Chutaí");
  const [avatar = null, themeEmoji = null] = await emojiDataUris([
    preview.host?.avatar ?? "",
    preview.theme.emoji,
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: COLORS.anil,
        padding: "48px 64px",
        gap: 32,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <OgLogo size={64} />
        <span style={text(28, COLORS.anilSoft)}>{SITE_HOST}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 44,
          flex: 1,
          background: COLORS.white,
          border: `5px solid ${COLORS.tinta}`,
          borderRadius: 44,
          boxShadow: `14px 14px 0 ${COLORS.tinta}`,
          padding: "36px 48px",
        }}
      >
        <OgAvatar src={avatar} size={200} initial={host[0]!.toUpperCase()} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ display: "flex", ...display(host.length > 11 ? 50 : 62) }}>
            {`${host} te chamou`}
          </div>
          <div style={{ display: "flex", ...text(36, COLORS.tintaSoft) }}>para jogar Chutaí</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: COLORS.anilSoft,
                border: `3px solid ${COLORS.tinta}`,
                borderRadius: 999,
                padding: "8px 22px",
                ...text(30),
              }}
            >
              {themeEmoji ? <OgEmoji src={themeEmoji} size={36} /> : null}
              <span>{theme}</span>
            </div>
          </div>
          <div style={{ display: "flex", ...text(28, COLORS.tintaSoft) }}>
            {previewPlayersText(preview)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={text(30, COLORS.white)}>Código da sala</span>
          <div
            style={{
              display: "flex",
              background: COLORS.gema,
              border: `4px solid ${COLORS.tinta}`,
              borderRadius: 20,
              boxShadow: `6px 6px 0 ${COLORS.tinta}`,
              padding: "6px 24px",
              letterSpacing: 6,
              ...display(52),
            }}
          >
            {preview.code}
          </div>
        </div>
        <OgTiles size={44} gap={10} />
      </div>
    </div>,
    { ...size, fonts },
  );
}

/** Sala que não existe mais (ou servidor fora do ar): convite genérico. */
function RoomEnded() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: COLORS.anil,
        padding: "56px 72px",
      }}
    >
      <OgLogo size={72} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", ...display(76, COLORS.white) }}>Essa sala já acabou.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={text(40, COLORS.anilSoft)}>Crie a sua no</span>
          <div
            style={{
              display: "flex",
              background: COLORS.gema,
              border: `4px solid ${COLORS.tinta}`,
              borderRadius: 20,
              boxShadow: `6px 6px 0 ${COLORS.tinta}`,
              padding: "4px 22px",
              ...display(44),
            }}
          >
            Chutaí
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={text(30, COLORS.anilSoft)}>{SITE_HOST}</span>
        <OgTiles size={52} gap={12} />
      </div>
    </div>
  );
}
