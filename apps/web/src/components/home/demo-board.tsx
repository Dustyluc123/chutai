import type { Theme } from "@chutai/shared";
import { compareCharacters } from "@chutai/game";
import { Tile } from "@/components/game/tile";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";

/**
 * Tabuleiro de exemplo do topo da página. Os resultados são calculados com as
 * mesmas regras do jogo de verdade (@chutai/game), não desenhados à mão.
 * As peças viram uma de cada vez, fileira por fileira, uma única vez ao abrir a página.
 */
export function DemoBoard({
  theme,
  answerId,
  guessIds,
}: {
  theme: Theme;
  answerId: string;
  guessIds: string[];
}) {
  const answer = theme.characters.find((c) => c.id === answerId);
  if (!answer) return null;
  const rows = guessIds
    .map((id) => theme.characters.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((character) => ({
      character,
      feedback: compareCharacters(character, answer, theme.attributes),
    }));

  const columns = `minmax(7.5rem, 1.2fr) repeat(${theme.attributes.length}, minmax(4.75rem, 1fr))`;

  return (
    <figure className="flex w-full flex-col gap-3">
      <HorizontalScroll
        fadeFrom="anil"
        className="-mx-4 lg:mx-0"
        scrollClassName="px-4 pb-1 lg:px-0"
      >
        <div
          role="table"
          aria-label="Exemplo de rodada"
          className="flex min-w-max flex-col gap-2 lg:min-w-0"
        >
          <div role="row" className="grid gap-2" style={{ gridTemplateColumns: columns }}>
            <div role="columnheader" className="px-1 text-xs font-semibold text-white/70">
              Palpite
            </div>
            {theme.attributes.map((attr) => (
              <div
                key={attr.key}
                role="columnheader"
                lang="pt-BR"
                className="px-1 text-center text-xs leading-tight font-semibold [overflow-wrap:anywhere] hyphens-auto text-white/70"
              >
                {attr.label}
              </div>
            ))}
          </div>
          {rows.map(({ character, feedback }, row) => (
            <div
              key={character.id}
              role="row"
              className="grid gap-2"
              style={{ gridTemplateColumns: columns }}
            >
              <div
                role="rowheader"
                style={{ animationDelay: `${300 + row * 700}ms` }}
                className="flex min-h-16 animate-pop items-center gap-2 rounded-xl border-2 border-tinta bg-white px-2.5 py-2 text-tinta"
              >
                <span aria-hidden className="text-2xl leading-none">
                  {character.emoji}
                </span>
                <span className="text-sm leading-tight font-semibold">{character.name}</span>
              </div>
              {feedback.map((item, col) => (
                <div
                  key={item.key}
                  style={{ animationDelay: `${400 + row * 700 + col * 90}ms` }}
                  className="animate-flip"
                >
                  <Tile label={theme.attributes[col]?.label ?? item.key} feedback={item} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </HorizontalScroll>
      <figcaption className="text-sm text-white/75">
        Exemplo no tema {theme.name.toLowerCase()}: três chutes até achar {answer.name}.
      </figcaption>
    </figure>
  );
}
