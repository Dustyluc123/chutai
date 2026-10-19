import type { Character } from "@chutai/shared";

/** Função que devolve um número entre 0 (incluso) e 1 (excluso). Trocável nos testes. */
export type Random = () => number;

/**
 * Sorteia um personagem que ainda não saiu na partida.
 * Se todos já saíram, volta a sortear entre todos.
 */
export function drawCharacter(
  characters: Character[],
  usedIds: ReadonlySet<string>,
  random: Random = Math.random,
): Character {
  if (characters.length === 0) throw new Error("O tema não tem personagens.");
  const available = characters.filter((character) => !usedIds.has(character.id));
  const pool = available.length > 0 ? available : characters;
  const index = Math.floor(random() * pool.length);
  return pool[Math.min(index, pool.length - 1)]!;
}

/** Gera um código aleatório usando só as letras permitidas. */
export function randomCode(alphabet: string, length: number, random: Random = Math.random): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet.charAt(Math.floor(random() * alphabet.length));
  }
  return code;
}
