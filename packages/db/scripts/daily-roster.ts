/**
 * Atualiza packages/db/seed/daily-roster.json com os personagens dos temas oficiais.
 *
 * - Personagem novo entra com a data de AMANHÃ (horário de Brasília): ele só pode cair a partir
 *   do próximo ciclo do diário, então a resposta de hoje e a de ontem não mudam.
 * - Quem ainda não está no roster da `origin/main` (ou seja, ainda não foi publicado) também
 *   ganha a data de amanhã a cada execução. Por isso: rode este script LOGO ANTES DO MERGE
 *   (depois de `git fetch`), faça o commit e só então faça o merge.
 * - Quem já está na `origin/main` nunca muda de data.
 * - Nunca apaga ninguém: se um personagem sair do tema, o diário pula o dia dele (só aquele dia
 *   muda). Evite remover personagens de temas com diário.
 *
 * Uso: git fetch && pnpm daily:roster
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { addDays, dailyDateKey } from "@chutai/game";
import { OFFICIAL_THEMES } from "../src/themes";

type Roster = Record<string, Record<string, string>>;

const file = fileURLToPath(new URL("../seed/daily-roster.json", import.meta.url));
const roster = JSON.parse(readFileSync(file, "utf8")) as Roster;
const tomorrow = addDays(dailyDateKey(new Date()), 1);

/** Roster que está publicado (origin/main). Sem git ou sem o arquivo lá: vazio. */
function publishedRoster(): Roster | null {
  try {
    const text = execFileSync("git", ["show", "origin/main:packages/db/seed/daily-roster.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(text) as Roster;
  } catch {
    return null;
  }
}

const published = publishedRoster();
if (!published) {
  console.warn(
    "Aviso: não achei o roster da origin/main (rode git fetch). Só adiciono os que faltam.",
  );
}

let added = 0;
let moved = 0;
for (const theme of OFFICIAL_THEMES) {
  const entries = (roster[theme.slug] ??= {});
  for (const character of theme.characters) {
    if (!entries[character.id]) {
      entries[character.id] = tomorrow;
      added += 1;
      console.log(`+ ${theme.slug}/${character.id} (a partir de ${tomorrow})`);
    }
  }
}
if (published) {
  for (const [slug, entries] of Object.entries(roster)) {
    for (const [id, since] of Object.entries(entries)) {
      if (published[slug]?.[id] || since === tomorrow) continue;
      entries[id] = tomorrow;
      moved += 1;
    }
  }
}

writeFileSync(file, `${JSON.stringify(roster, null, 2)}\n`);
console.log(
  added || moved
    ? `${added} adicionado(s); ${moved} ainda não publicado(s) passaram para ${tomorrow}.`
    : "Nada a mudar.",
);
