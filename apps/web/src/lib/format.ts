const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "2026-10" → "outubro de 2026". Devolve null se o texto não estiver no formato AAAA-MM. */
export function formatDataMonth(value: string | undefined): string | null {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} de ${match[1]}` : null;
}
