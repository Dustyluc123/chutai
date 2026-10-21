import type { AttributeValue, Character, ThemeAttribute } from "@chutai/shared";

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Formata um número para exibição. Anos (até 4 dígitos inteiros) ficam sem ponto de milhar. */
export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 10000) return String(value);
  return numberFormatter.format(value);
}

/** Transforma o valor de um atributo em texto para mostrar na tabela de palpites. */
export function formatValue(attribute: ThemeAttribute, value: AttributeValue | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "number") {
    const text = formatNumber(value);
    return attribute.unit ? `${text} ${attribute.unit}` : text;
  }
  return value;
}

/** Valor de um atributo de um personagem, com "c." quando o valor é aproximado ("c. 1655"). */
export function formatCharacterValue(
  attribute: ThemeAttribute,
  character: Pick<Character, "values" | "approx">,
): string {
  const text = formatValue(attribute, character.values[attribute.key]);
  return character.approx?.includes(attribute.key) ? `c. ${text}` : text;
}

/** Remove acentos e deixa minúsculo: "São Paulo" → "sao paulo". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
