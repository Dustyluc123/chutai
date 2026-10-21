import type { RoomResult } from "@chutai/shared";
import { formatPoints, podiumTitle, podiumTop } from "@/lib/podium";
import { COLORS, OgAvatar, OgEmoji, OgLogo, OgTiles, display, text } from "./brand";
import { ogText } from "./emoji";

export const PODIUM_SIZE = { width: 1080, height: 1350 };

const STEP = {
  1: { height: 250, color: COLORS.gema, avatar: 160 },
  2: { height: 180, color: COLORS.anilSoft, avatar: 124 },
  3: { height: 130, color: COLORS.chicleteSoft, avatar: 124 },
} as const;

/** Degrau pela posição (empates ficam no mesmo degrau; 4º em diante não entra no pódio). */
function step(position: number) {
  return STEP[Math.min(3, Math.max(1, position)) as 1 | 2 | 3];
}

export interface PodiumImageProps {
  result: RoomResult;
  siteHost: string;
  /** Emojis já baixados: avatar de cada um do top 3 (na ordem), tema e coroa. Null se faltou. */
  avatars: (string | null)[];
  themeEmoji: string | null;
  crown: string | null;
}

/**
 * Imagem do pódio para compartilhar (1080×1350, o retrato do feed do Instagram, que também
 * aparece bem no WhatsApp). Mesmo visual da prévia do link.
 */
export function PodiumImage({ result, siteHost, avatars, themeEmoji, crown }: PodiumImageProps) {
  const standings = result.standings.map((entry) => ({
    ...entry,
    nickname: ogText(entry.nickname, "Jogador"),
  }));
  const { top, tiedOut } = podiumTop(standings);
  // Ordem visual do pódio: 2º, 1º, 3º (só quem existe).
  const columns = [1, 0, 2]
    .map((index) => ({ entry: top[index], avatar: avatars[index] ?? null }))
    .filter((column) => column.entry);
  const players = `${result.playerCount} ${result.playerCount === 1 ? "jogador" : "jogadores"}`;
  const rounds = `${result.rounds} ${result.rounds === 1 ? "rodada" : "rodadas"}`;
  const title = podiumTitle(standings);
  // Título numa linha só (apelidos de até 20 letras): diminui a fonte se for comprido.
  const titleSize = title.length <= 14 ? 76 : title.length <= 22 ? 58 : 44;
  const facts = [rounds, players];
  if (tiedOut) facts.push(`e mais ${tiedOut} ${tiedOut === 1 ? "empatado" : "empatados"}`);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: COLORS.anil,
        padding: "64px 64px 56px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <OgLogo size={76} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: COLORS.white,
            border: `4px solid ${COLORS.tinta}`,
            borderRadius: 999,
            boxShadow: `5px 5px 0 ${COLORS.tinta}`,
            padding: "10px 24px",
            ...text(30),
          }}
        >
          {themeEmoji ? <OgEmoji src={themeEmoji} size={38} /> : null}
          <span>{ogText(result.theme.name, "Chutaí")}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          marginTop: 56,
          marginBottom: 12,
        }}
      >
        <span style={text(30, COLORS.gema)}>Resultado da partida</span>
        <div
          style={{
            display: "flex",
            textAlign: "center",
            justifyContent: "center",
            ...display(titleSize, COLORS.white),
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 22,
          flex: 1,
          marginTop: 24,
        }}
      >
        {columns.map(({ entry, avatar }) => {
          const place = step(entry!.position);
          const first = entry!.position === 1;
          return (
            <div
              key={`${entry!.position}-${entry!.nickname}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 296 }}
            >
              {first && crown ? <OgEmoji src={crown} size={64} /> : null}
              <OgAvatar
                src={avatar}
                size={place.avatar}
                initial={entry!.nickname[0]!.toUpperCase()}
                background={COLORS.white}
              />
              <div
                style={{
                  display: "flex",
                  textAlign: "center",
                  justifyContent: "center",
                  marginTop: 14,
                  ...text(34, COLORS.white),
                }}
              >
                {entry!.nickname}
              </div>
              <div style={{ display: "flex", marginBottom: 14, ...display(46, COLORS.gema) }}>
                {formatPoints(entry!.score)}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                  height: place.height,
                  paddingTop: 20,
                  background: place.color,
                  border: `5px solid ${COLORS.tinta}`,
                  borderBottom: "none",
                  borderRadius: "28px 28px 0 0",
                  ...display(84),
                }}
              >
                {`${entry!.position}º`}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 18,
          background: COLORS.white,
          border: `5px solid ${COLORS.tinta}`,
          borderRadius: 24,
          boxShadow: `8px 8px 0 ${COLORS.tinta}`,
          padding: "18px 24px",
          ...text(32),
        }}
      >
        {facts.map((fact, index) => (
          <span key={fact} style={{ display: "flex", gap: 18 }}>
            {index > 0 ? <span style={{ color: COLORS.tintaSoft }}>·</span> : null}
            <span>{fact}</span>
          </span>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 44,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={text(30, COLORS.anilSoft)}>Jogue também:</span>
          <span style={display(44, COLORS.white)}>{siteHost}</span>
        </div>
        <OgTiles size={46} gap={10} />
      </div>
    </div>
  );
}
