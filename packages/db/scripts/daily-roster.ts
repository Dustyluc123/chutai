/**
 * Atualiza packages/db/seed/daily-roster.json com os personagens novos dos temas oficiais.
 *
 * - Personagem novo entra com a data de AMANHÃ (horário de Brasília): ele só pode cair a partir
 *   do próximo ciclo do diário, então a resposta de hoje e a de ontem não mudam.
 * - Nunca apaga ninguém: se um personagem sair do tema, o diário pula o dia dele (só aquele dia
 *   muda). Evite remover personagens de temas com diário.
 *
 * Uso: pnpm daily:roster
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { addDays, dailyDateKey } from "@chutai/game";
import { OFFICIAL_THEMES } from "../src/themes";

const file = fileURLToPath(new URL("../seed/daily-roster.json", import.meta.url));
const roster = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, string>>;
const tomorrow = addDays(dailyDateKey(new Date()), 1);

let added = 0;
for (const theme of OFFICIAL_THEMES) {
  const entries = (roster[theme.slug] ??= {});
  for (const character of theme.characters) {
    if (entries[character.id]) continue;
    entries[character.id] = tomorrow;
    added += 1;
    console.log(`+ ${theme.slug}/${character.id} (a partir de ${tomorrow})`);
  }
}

writeFileSync(file, `${JSON.stringify(roster, null, 2)}\n`);
console.log(added ? `${added} personagem(ns) adicionado(s).` : "Nada a adicionar.");
