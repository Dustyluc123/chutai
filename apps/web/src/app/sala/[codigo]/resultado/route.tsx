import { ImageResponse } from "next/og";
import { roomCodeSchema } from "@chutai/shared";
import { emojiDataUris } from "@/lib/og/emoji";
import { ogFonts } from "@/lib/og/fonts";
import { PODIUM_SIZE, PodiumImage } from "@/lib/og/podium-image";
import { fetchRoomResult } from "@/lib/room-preview";
import { SITE_HOST } from "@/lib/site";

/**
 * PNG do pódio para o botão "Compartilhar resultado". Os dados vêm do servidor de tempo real
 * enquanto a sala está no pódio; o navegador baixa a imagem assim que o pódio aparece.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = roomCodeSchema.safeParse(codigo);
  const result = code.success ? await fetchRoomResult(code.data) : null;
  if (!result) {
    return new Response("Resultado não disponível: a partida não está no pódio.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const top = result.standings.slice(0, 3);
  const [fonts, emojis] = await Promise.all([
    ogFonts(),
    emojiDataUris([...top.map((entry) => entry.avatar), result.theme.emoji, "👑"]),
  ]);

  return new ImageResponse(
    <PodiumImage
      result={result}
      siteHost={SITE_HOST}
      avatars={emojis.slice(0, top.length)}
      themeEmoji={emojis[top.length] ?? null}
      crown={emojis[top.length + 1] ?? null}
    />,
    {
      ...PODIUM_SIZE,
      fonts,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="chutai-${result.code}.png"`,
      },
    },
  );
}
