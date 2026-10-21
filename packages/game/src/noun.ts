import type { ThemeNoun } from "@chutai/shared";

/** Palavra padrão para o que se adivinha. */
export const DEFAULT_NOUN: ThemeNoun = {
  singular: "personagem",
  plural: "personagens",
  gender: "m",
};

export function nounOf(theme: { noun?: ThemeNoun } | undefined): ThemeNoun {
  return theme?.noun ?? DEFAULT_NOUN;
}

/** Pedaços de frase com artigo e concordância: "o personagem secreto", "da cidade secreta"... */
export function nounPhrases(noun: ThemeNoun = DEFAULT_NOUN) {
  const f = noun.gender === "f";
  const secret = `${noun.singular} ${f ? "secreta" : "secreto"}`;
  return {
    /** "o personagem secreto" */
    theSecret: `${f ? "a" : "o"} ${secret}`,
    /** "do personagem secreto" */
    ofTheSecret: `${f ? "da" : "do"} ${secret}`,
    /** "O personagem era" (revelação) */
    itWas: `${f ? "A" : "O"} ${noun.singular} era`,
    /** "o personagem era" (no meio da frase) */
    itWasLower: `${f ? "a" : "o"} ${noun.singular} era`,
    /** "qualquer personagem" */
    any: `qualquer ${noun.singular}`,
    /** "um personagem" */
    one: `${f ? "uma" : "um"} ${noun.singular}`,
    /** "24 personagens" */
    count: (n: number) => `${n} ${n === 1 ? noun.singular : noun.plural}`,
  };
}
