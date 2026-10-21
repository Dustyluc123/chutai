import type { AttributeFeedback, AttributeValue, Character, ThemeAttribute } from "@chutai/shared";
import { UNKNOWN_VALUE } from "@chutai/shared";
import { formatValue, normalizeText } from "./format";

function toList(value: AttributeValue | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.map(normalizeText);
  return [normalizeText(String(value))];
}

function toNumber(value: AttributeValue | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** Compara um atributo do palpite com o mesmo atributo da resposta. */
export function compareAttribute(
  attribute: ThemeAttribute,
  guessValue: AttributeValue | undefined,
  answerValue: AttributeValue | undefined,
): AttributeFeedback {
  const display = formatValue(attribute, guessValue);
  const base = { key: attribute.key, display };

  if (guessValue === undefined || answerValue === undefined) {
    return { ...base, status: "wrong" };
  }
  // "Incerto" em qualquer um dos dois: ninguém sabe ao certo, não conta como erro.
  if (guessValue === UNKNOWN_VALUE || answerValue === UNKNOWN_VALUE) {
    return { ...base, status: "unknown" };
  }

  switch (attribute.type) {
    case "text": {
      const equal = normalizeText(String(guessValue)) === normalizeText(String(answerValue));
      return { ...base, status: equal ? "correct" : "wrong" };
    }

    case "list": {
      const guessList = new Set(toList(guessValue));
      const answerList = new Set(toList(answerValue));
      const shared = [...guessList].filter((item) => answerList.has(item)).length;
      const sameSet = shared === guessList.size && shared === answerList.size;
      if (sameSet) return { ...base, status: "correct" };
      return { ...base, status: shared > 0 ? "partial" : "wrong" };
    }

    case "number":
    case "range": {
      const guess = toNumber(guessValue);
      const answer = toNumber(answerValue);
      if (guess === undefined || answer === undefined) return { ...base, status: "wrong" };
      if (guess === answer) return { ...base, status: "correct" };

      const direction = answer > guess ? "up" : "down";
      if (attribute.type === "range" && attribute.tolerance !== undefined) {
        const margin = attribute.toleranceIsPercent
          ? Math.abs(answer) * (attribute.tolerance / 100)
          : attribute.tolerance;
        if (Math.abs(answer - guess) <= margin) return { ...base, status: "partial", direction };
      }
      return { ...base, status: "wrong", direction };
    }
  }
}

/** Compara o personagem chutado com a resposta, atributo por atributo. */
export function compareCharacters(
  guess: Character,
  answer: Character,
  attributes: ThemeAttribute[],
): AttributeFeedback[] {
  return attributes.map((attribute) => {
    const feedback = compareAttribute(
      attribute,
      guess.values[attribute.key],
      answer.values[attribute.key],
    );
    // Valor aproximado do personagem chutado: a peça mostra "c. 1655".
    return guess.approx?.includes(attribute.key)
      ? { ...feedback, display: `c. ${feedback.display}` }
      : feedback;
  });
}

/** Quantos atributos ficaram verdes num palpite. */
export function countCorrect(feedback: AttributeFeedback[]): number {
  return feedback.filter((item) => item.status === "correct").length;
}
