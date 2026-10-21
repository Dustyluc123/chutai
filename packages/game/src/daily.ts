/**
 * Desafio diário: regras puras (sem segredo e sem acesso a arquivos).
 *
 * Como o personagem do dia é escolhido:
 * - Os dias são contados a partir de DAILY.launchDate em ciclos. Cada ciclo passa por todos os
 *   personagens do tema que já estavam na lista (o "roster") quando o ciclo começou, sem repetir.
 * - A ordem dentro de cada ciclo vem de `rank(ciclo, id)`, que no site é um HMAC com a chave
 *   secreta DAILY_SECRET. Sem a chave, ninguém consegue prever a ordem.
 * - Personagem novo entra no roster com a data em que passa a valer e só aparece a partir do
 *   próximo ciclo: o ciclo atual (e portanto hoje e ontem) não muda.
 */
import { DAILY } from "./config";

/** Um personagem no roster do diário e a data (AAAA-MM-DD) a partir da qual ele pode ser sorteado. */
export interface DailyRosterEntry {
  id: string;
  since: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Data AAAA-MM-DD de um instante no fuso do diário (a virada é à meia-noite de Brasília). */
export function dailyDateKey(now: Date, timeZone: string = DAILY.timeZone): string {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtcDays(dateKey: string): number {
  if (!DATE.test(dateKey)) throw new Error(`Data inválida: ${dateKey}`);
  const [year, month, day] = dateKey.split("-").map(Number) as [number, number, number];
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Dias entre duas datas AAAA-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
  return toUtcDays(b) - toUtcDays(a);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function addDays(dateKey: string, days: number): string {
  return new Date((toUtcDays(dateKey) + days) * 86_400_000).toISOString().slice(0, 10);
}

/** Número do desafio (Chutaí #1 no dia do lançamento). Antes do lançamento, vale o #1. */
export function dailyNumber(dateKey: string, launchDate: string = DAILY.launchDate): number {
  return Math.max(0, daysBetween(launchDate, dateKey)) + 1;
}

/** Data AAAA-MM-DD de um número de desafio. */
export function dailyDateOf(number: number, launchDate: string = DAILY.launchDate): string {
  return addDays(launchDate, number - 1);
}

/**
 * Milissegundos até o próximo desafio (meia-noite no fuso do diário).
 * Brasília não tem horário de verão desde 2019, então o dia tem sempre 24 horas.
 */
export function msUntilNextDaily(now: Date, timeZone: string = DAILY.timeZone): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const elapsed = (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000;
  return 86_400_000 - elapsed - now.getMilliseconds();
}

export interface DailyPickInput {
  /** Data do desafio (AAAA-MM-DD). Antes do lançamento, vale o dia do lançamento. */
  dateKey: string;
  roster: readonly DailyRosterEntry[];
  /** Ordem secreta de um personagem num ciclo (menor sai primeiro). No site: HMAC com DAILY_SECRET. */
  rank: (cycle: number, id: string) => string;
  /** Ids que ainda existem no tema. Se o sorteado foi removido, vale o próximo da ordem. */
  available?: ReadonlySet<string>;
  launchDate?: string;
}

/**
 * Primeiro dia (AAAA-MM-DD) em que o diário de um tema tem personagens: o lançamento ou, para um
 * tema novo, o dia em que os personagens dele passam a valer. Null se o roster estiver vazio.
 */
export function dailyStartDate(
  roster: readonly DailyRosterEntry[],
  launchDate: string = DAILY.launchDate,
): string | null {
  if (roster.length === 0) return null;
  const first = roster.reduce(
    (min, entry) => (entry.since < min ? entry.since : min),
    roster[0]!.since,
  );
  return first > launchDate ? first : launchDate;
}

/** O diário deste tema ainda não começou (tema novo): só a partir de `from`. */
export class DailyNotStarted extends Error {
  constructor(readonly from: string) {
    super(`O desafio diário deste tema começa em ${from}.`);
  }
}

/** Id do personagem do dia. */
export function dailyAnswerId(input: DailyPickInput): string {
  const launch = input.launchDate ?? DAILY.launchDate;
  const start = dailyStartDate(input.roster, launch);
  if (!start) throw new Error("O diário deste tema não tem personagens no roster.");
  // Tema novo: os ciclos começam no primeiro dia com personagens (para os temas do lançamento,
  // é o próprio lançamento, e nada muda).
  // Antes do lançamento, os temas do lançamento mostram o desafio #1 (como sempre foi).
  const dateKey = input.dateKey < start && start === launch ? start : input.dateKey;
  if (dateKey < start) throw new DailyNotStarted(start);
  const target = daysBetween(start, dateKey);
  let cycleStart = 0; // em dias desde o início do diário deste tema
  for (let cycle = 0; ; cycle++) {
    const startKey = addDays(start, cycleStart);
    const members = input.roster
      .filter((entry) => entry.since <= startKey)
      .map((entry) => ({ id: entry.id, rank: input.rank(cycle, entry.id) }))
      .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : a.id < b.id ? -1 : 1));
    if (target < cycleStart + members.length) {
      const position = target - cycleStart;
      // Personagem removido do tema: pega o próximo da ordem que ainda existe (só este dia muda).
      for (let offset = 0; offset < members.length; offset++) {
        const candidate = members[(position + offset) % members.length]!;
        if (!input.available || input.available.has(candidate.id)) return candidate.id;
      }
      throw new Error("Nenhum personagem do roster existe mais no tema.");
    }
    cycleStart += members.length;
  }
}
