import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AUTHOR } from "@/components/layout/site-footer";
import { CharacterPicture } from "@/components/ui/character-picture";
import { getTheme, listThemes } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Créditos das imagens",
  description: "Autores e licenças das imagens dos personagens do Chutaí.",
};

/** Página de créditos: autor, licença e link do original de cada imagem. */
export default async function CreditsPage() {
  // Os créditos ficam em cada personagem (campo imageCredit), no JSON ou no banco.
  const summaries = await listThemes();
  const themes = (await Promise.all(summaries.map((summary) => getTheme(summary.slug))))
    .filter((theme) => theme !== null)
    .map((theme) => ({
      slug: theme.slug,
      name: theme.name,
      characters: theme.characters
        .filter((character) => character.image && character.imageCredit)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .filter((theme) => theme.characters.length > 0);

  return (
    <>
      <SiteHeader />
      <main
        id="conteudo"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 lg:py-16"
      >
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-5xl sm:text-6xl">Créditos das imagens</h1>
          <p className="max-w-[64ch] text-lg text-tinta-soft">
            As imagens dos personagens vêm do{" "}
            <a
              href="https://commons.wikimedia.org"
              className="font-semibold text-tinta underline"
              target="_blank"
              rel="noreferrer"
            >
              Wikimedia Commons
            </a>{" "}
            e têm licença livre (domínio público, CC0, CC BY ou CC BY-SA). Foram recortadas e
            reduzidas, e as versões modificadas seguem a licença da original. Obrigado a cada autor.
          </p>
          <p className="max-w-[64ch] text-tinta-soft">
            Quem aparece no site e quiser ser removido pode pedir pelo e-mail{" "}
            <a href={`mailto:${AUTHOR.email}`} className="font-semibold text-tinta underline">
              {AUTHOR.email}
            </a>
            . A remoção é feita sem burocracia.
          </p>
        </div>

        {themes.map((theme) => {
          const headingId = `tema-${theme.slug}`;
          return (
            <section key={theme.slug} aria-labelledby={headingId} className="flex flex-col gap-4">
              <h2 id={headingId} className="font-display text-3xl">
                {theme.name}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {theme.characters.map((character) => {
                  const credit = character.imageCredit!;
                  return (
                    <li
                      key={character.id}
                      className="flex gap-3 rounded-2xl border-2 border-tinta bg-white p-3"
                    >
                      <CharacterPicture
                        name={character.name}
                        image={character.image}
                        size="lg"
                        decorative
                      />
                      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                        <span className="font-bold">{character.name}</span>
                        <span className="truncate text-tinta-soft" title={credit.author}>
                          {credit.author}
                        </span>
                        <span className="flex flex-wrap gap-x-3">
                          {credit.licenseUrl ? (
                            <a
                              href={credit.licenseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold underline"
                            >
                              {credit.license}
                            </a>
                          ) : (
                            <span className="font-semibold">{credit.license}</span>
                          )}
                          {credit.source ? (
                            <a
                              href={credit.source}
                              target="_blank"
                              rel="noreferrer"
                              className="text-tinta-soft underline hover:text-tinta"
                            >
                              Original<span className="sr-only"> de {character.name}</span>
                            </a>
                          ) : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </>
  );
}
