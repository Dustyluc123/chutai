import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CharacterPicture } from "@/components/ui/character-picture";
// Gerado por `pnpm images:fetch` a partir das informações do Wikimedia Commons.
import creditsJson from "../../../public/temas/creditos.json";

export const metadata: Metadata = {
  title: "Créditos das imagens",
  description: "Autores e licenças das imagens dos personagens do Chutaí.",
};

interface ImageCredit {
  theme: string;
  characterId: string;
  characterName: string;
  image: string;
  file: string;
  author: string;
  license: string;
  licenseUrl?: string;
  source: string;
}

const credits = creditsJson as ImageCredit[];

/** Página de créditos: autor, licença e link do original de cada imagem. */
export default function CreditsPage() {
  const themes = [...new Set(credits.map((credit) => credit.theme))];

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
        </div>

        {themes.map((theme) => {
          const items = credits.filter((credit) => credit.theme === theme);
          const headingId = `tema-${items[0]?.image.split("/")[2] ?? theme}`;
          return (
            <section key={theme} aria-labelledby={headingId} className="flex flex-col gap-4">
              <h2 id={headingId} className="font-display text-3xl">
                {theme}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((credit) => (
                  <li
                    key={credit.image}
                    className="flex gap-3 rounded-2xl border-2 border-tinta bg-white p-3"
                  >
                    <CharacterPicture
                      name={credit.characterName}
                      image={credit.image}
                      size="lg"
                      decorative
                    />
                    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                      <span className="font-bold">{credit.characterName}</span>
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
                        <a
                          href={credit.source}
                          target="_blank"
                          rel="noreferrer"
                          className="text-tinta-soft underline hover:text-tinta"
                        >
                          Original<span className="sr-only"> de {credit.characterName}</span>
                        </a>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </>
  );
}
