import { describe, expect, it } from "vitest";
import {
  DailyNotStarted,
  addDays,
  dailyAnswerId,
  dailyDateKey,
  dailyStartDate,
  dailyNumber,
  msUntilNextDaily,
  type DailyRosterEntry,
} from "../src/daily";

const LAUNCH = "2026-10-22";
/**
 * Hash simples (FNV-1a, 2 rodadas) só para os testes: o pacote é puro e não usa node:crypto.
 * No site, a ordem vem de um HMAC-SHA256 com DAILY_SECRET (testado em apps/web/tests).
 */
function fnv(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (const char of text) {
    a = Math.imul(a ^ char.charCodeAt(0), 0x01000193) >>> 0;
    b = Math.imul(b ^ a, 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
const rankWith =
  (secret: string, slug = "fauna") =>
  (cycle: number, id: string) =>
    fnv(`${secret}:${slug}:${cycle}:${id}`);

const roster = (count: number, since = "2026-10-01"): DailyRosterEntry[] =>
  Array.from({ length: count }, (_, i) => ({ id: `p${String(i).padStart(2, "0")}`, since }));

function answers(entries: DailyRosterEntry[], days: number, secret = "segredo-de-teste") {
  return Array.from({ length: days }, (_, day) =>
    dailyAnswerId({
      dateKey: addDays(LAUNCH, day),
      roster: entries,
      rank: rankWith(secret),
      launchDate: LAUNCH,
    }),
  );
}

describe("desafio diário: datas", () => {
  it("o dia vira à meia-noite de Brasília (03:00 UTC)", () => {
    expect(dailyDateKey(new Date("2026-10-23T02:59:59Z"))).toBe("2026-10-22");
    expect(dailyDateKey(new Date("2026-10-23T03:00:00Z"))).toBe("2026-10-23");
  });

  it("numeração: #1 no lançamento, #2 no dia seguinte; antes do lançamento vale o #1", () => {
    expect(dailyNumber("2026-10-22", LAUNCH)).toBe(1);
    expect(dailyNumber("2026-10-23", LAUNCH)).toBe(2);
    expect(dailyNumber("2026-11-21", LAUNCH)).toBe(31);
    expect(dailyNumber("2026-10-01", LAUNCH)).toBe(1);
  });

  it("quanto falta para o próximo desafio", () => {
    // 23:00 em Brasília = 02:00 UTC do dia seguinte: falta 1 hora.
    expect(msUntilNextDaily(new Date("2026-10-23T02:00:00Z"))).toBe(3_600_000);
    expect(msUntilNextDaily(new Date("2026-10-23T03:00:00Z"))).toBe(86_400_000);
  });
});

describe("desafio diário: sorteio", () => {
  it("mesma data, mesma resposta (e muda de um dia para o outro)", () => {
    const entries = roster(10);
    const day = { dateKey: "2026-10-25", roster: entries, rank: rankWith("x"), launchDate: LAUNCH };
    expect(dailyAnswerId(day)).toBe(dailyAnswerId({ ...day }));
    expect(new Set(answers(entries, 10)).size).toBeGreaterThan(1);
  });

  it("não repete até passar pelo tema inteiro, ciclo após ciclo", () => {
    const entries = roster(12);
    const all = answers(entries, 36);
    for (let cycle = 0; cycle < 3; cycle++) {
      const slice = all.slice(cycle * 12, cycle * 12 + 12);
      expect(new Set(slice).size).toBe(12);
    }
    // A ordem muda entre ciclos (não é o mesmo rodízio repetido).
    expect(all.slice(0, 12)).not.toEqual(all.slice(12, 24));
  });

  it("depende da chave secreta: outra chave, outra sequência", () => {
    const entries = roster(20);
    expect(answers(entries, 20, "chave-a")).not.toEqual(answers(entries, 20, "chave-b"));
  });

  it("adicionar personagens não muda a resposta de hoje nem a de ontem", () => {
    const entries = roster(10);
    // Hoje é o dia 15 (no meio do 2º ciclo). Novos personagens entram amanhã.
    const today = addDays(LAUNCH, 14);
    const before = answers(entries, 15);
    const grown = [
      ...entries,
      { id: "novo-1", since: addDays(today, 1) },
      { id: "novo-2", since: addDays(today, 1) },
    ];
    const after = answers(grown, 15);
    expect(after).toEqual(before); // todos os dias até hoje, inclusive ontem e hoje
    // Os novos aparecem a partir do próximo ciclo.
    expect(answers(grown, 32).slice(20)).toEqual(expect.arrayContaining(["novo-1", "novo-2"]));
  });

  it("personagem removido do tema: só o dia dele muda", () => {
    const entries = roster(8);
    const base = answers(entries, 8);
    const removed = base[3]!;
    const available = new Set(entries.map((e) => e.id).filter((id) => id !== removed));
    const withRemoval = Array.from({ length: 8 }, (_, day) =>
      dailyAnswerId({
        dateKey: addDays(LAUNCH, day),
        roster: entries,
        rank: rankWith("segredo-de-teste"),
        available,
        launchDate: LAUNCH,
      }),
    );
    expect(withRemoval.filter((id, day) => id !== base[day])).toHaveLength(1);
    expect(withRemoval).not.toContain(removed);
  });
});

describe("desafio diário: tema novo", () => {
  it("só começa quando os personagens dele passam a valer, e não mexe nos temas antigos", () => {
    const start = addDays(LAUNCH, 30);
    const fresh = roster(6, start);
    expect(() =>
      dailyAnswerId({
        dateKey: addDays(LAUNCH, 29),
        roster: fresh,
        rank: rankWith("s"),
        launchDate: LAUNCH,
      }),
    ).toThrow(DailyNotStarted);
    expect(dailyStartDate(fresh, LAUNCH)).toBe(start);
    // A partir do primeiro dia, um ciclo inteiro sem repetir.
    const days = Array.from({ length: 6 }, (_, i) =>
      dailyAnswerId({
        dateKey: addDays(start, i),
        roster: fresh,
        rank: rankWith("s"),
        launchDate: LAUNCH,
      }),
    );
    expect(new Set(days).size).toBe(6);
  });

  it("antes do lançamento, os temas do lançamento continuam mostrando o desafio #1", () => {
    const entries = roster(10);
    const pick = (dateKey: string) =>
      dailyAnswerId({ dateKey, roster: entries, rank: rankWith("s"), launchDate: LAUNCH });
    expect(pick(addDays(LAUNCH, -1))).toBe(pick(LAUNCH));
  });
});
