import { normalizeText } from "@chutai/game";

/**
 * Filtro simples de palavrões em apelidos. Não é perfeito (nenhum é),
 * mas evita o óbvio numa sala com desconhecidos. Amplie a lista quando precisar.
 *
 * Compara o começo de cada palavra, para "computador" não ser bloqueado por conter "puta".
 */
const BLOCKED = [
  "porra",
  "caralho",
  "buceta",
  "puta",
  "viado",
  "arrombad",
  "cuzao",
  "fdp",
  "merda",
  "piroca",
  "xoxota",
  "foder",
  "fuder",
  "vagabund",
  "nazista",
  "hitler",
];

export function containsProfanity(text: string): boolean {
  const words = normalizeText(text)
    .replace(/[0@]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .split(/[^a-z]+/)
    .filter(Boolean);
  return words.some((word) => BLOCKED.some((blocked) => word.startsWith(blocked)));
}
