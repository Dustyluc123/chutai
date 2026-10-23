/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyResponse } from "@chutai/shared";
import { DAILY, addDays, dailyNumber } from "@chutai/game";
import { POST } from "@/app/api/diario/[slug]/route";
import { dailyAnswer, dailyTheme } from "@/lib/daily/server";

const SLUG = "folclore-brasileiro";
const theme = dailyTheme(SLUG)!;
// 3º dia do diário, às 15h de Brasília.
const DATE = addDays(DAILY.launchDate, 2);
const DAY = dailyNumber(DATE);

async function call(body: unknown, slug = SLUG) {
  const response = await POST(
    new Request(`http://localhost/api/diario/${slug}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug }) },
  );
  return { status: response.status, data: (await response.json()) as DailyResponse, raw: response };
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(`${DATE}T18:00:00Z`), toFake: ["Date"] });
  process.env.DAILY_SECRET = "segredo-de-teste";
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.DAILY_SECRET;
});

describe("rota do desafio diário", () => {
  it("sem DAILY_SECRET: erro claro, sem chave padrão", async () => {
    delete process.env.DAILY_SECRET;
    const { status, data } = await call({ action: "guess", day: DAY, characterId: "saci-perere" });
    expect(status).toBe(503);
    expect(data).toEqual({
      ok: false,
      error: "Desafio diário indisponível: falta configurar a variável DAILY_SECRET no servidor.",
    });
  });

  it("chute errado: só as cores, nunca a resposta", async () => {
    const answer = dailyAnswer(theme, DATE, "segredo-de-teste");
    const wrong = theme.characters.find((c) => c.id !== answer.id)!;
    const { status, data } = await call({ action: "guess", day: DAY, characterId: wrong.id });
    expect(status).toBe(200);
    expect(data.ok && data.guess?.correct).toBe(false);
    expect(data.ok && data.guess?.feedback.length).toBe(theme.attributes.length);
    expect(data).not.toHaveProperty("answer");
    expect(JSON.stringify(data)).not.toContain(`"${answer.id}"`);
  });

  it("acerto: devolve o personagem do dia e o de ontem", async () => {
    const answer = dailyAnswer(theme, DATE, "segredo-de-teste");
    const yesterday = dailyAnswer(theme, addDays(DATE, -1), "segredo-de-teste");
    const { data } = await call({ action: "guess", day: DAY, characterId: answer.id });
    expect(data.ok && data.guess?.correct).toBe(true);
    expect(data.ok && data.answer?.id).toBe(answer.id);
    expect(data.ok && data.yesterday?.name).toBe(yesterday.name);
  });

  it("dia errado (virou a meia-noite com a página aberta): pede para recarregar", async () => {
    const { status, data } = await call({
      action: "guess",
      day: DAY - 1,
      characterId: "saci-perere",
    });
    expect(status).toBe(409);
    expect(data).toMatchObject({ ok: false, today: DAY });
  });

  it("personagem de fora do tema, tema sem diário e pedido malformado", async () => {
    expect((await call({ action: "guess", day: DAY, characterId: "pikachu" })).status).toBe(400);
    expect((await call({ action: "guess", day: DAY, characterId: "x" }, "nao-existe")).status).toBe(
      404,
    );
    expect((await call({ action: "voar", day: DAY })).status).toBe(400);
  });

  it("dica só depois de 3 chutes, conferidos de novo no servidor", async () => {
    const answer = dailyAnswer(theme, DATE, "segredo-de-teste");
    const wrong = theme.characters.filter((c) => c.id !== answer.id).map((c) => c.id);
    const early = await call({
      action: "hint",
      day: DAY,
      type: "firstLetter",
      guesses: wrong.slice(0, 2),
      hintsUsed: [],
    });
    expect(early.status).toBe(400);
    // Repetir o mesmo chute não conta como 3.
    const repeated = await call({
      action: "hint",
      day: DAY,
      type: "firstLetter",
      guesses: [wrong[0], wrong[0], wrong[0]],
      hintsUsed: [],
    });
    expect(repeated.status).toBe(400);
    const ok = await call({
      action: "hint",
      day: DAY,
      type: "firstLetter",
      guesses: wrong.slice(0, 3),
      hintsUsed: [],
    });
    expect(ok.status).toBe(200);
    expect(ok.data.ok && ok.data.hint?.text).toContain(answer.name.charAt(0).toUpperCase());
  });

  it("a resposta muda à meia-noite de Brasília", async () => {
    const before = dailyAnswer(theme, DATE, "s");
    const after = dailyAnswer(theme, addDays(DATE, 1), "s");
    // Dias seguidos do mesmo ciclo nunca repetem personagem.
    expect(after.id).not.toBe(before.id);
  });
});

describe("rota do desafio diário: corações", () => {
  const wrongs = () => {
    const answer = dailyAnswer(theme, DATE, "segredo-de-teste");
    return { answer, wrong: theme.characters.filter((c) => c.id !== answer.id) };
  };

  it("até o 7º erro, nada da resposta", async () => {
    const { answer, wrong } = wrongs();
    const { data } = await call({
      action: "guess",
      day: DAY,
      characterId: wrong[6]!.id,
      previous: wrong.slice(0, 6).map((c) => c.id),
    });
    expect(data.ok && data.guess?.correct).toBe(false);
    expect(data).not.toHaveProperty("answer");
    expect(data).not.toHaveProperty("lost");
    expect(JSON.stringify(data)).not.toContain(`"${answer.id}"`);
  });

  it("no 8º erro, fim de jogo: revela quem era e o de ontem", async () => {
    const { answer, wrong } = wrongs();
    const { data } = await call({
      action: "guess",
      day: DAY,
      characterId: wrong[7]!.id,
      previous: wrong.slice(0, 7).map((c) => c.id),
    });
    expect(data).toMatchObject({ ok: true, lost: true, answer: { id: answer.id } });
    expect(data.ok && data.yesterday).toBeTruthy();
  });

  it("chutes repetidos ou fora do tema não contam como erro", async () => {
    const { wrong } = wrongs();
    const { data } = await call({
      action: "guess",
      day: DAY,
      characterId: wrong[0]!.id,
      previous: [...Array(7).fill(wrong[0]!.id), "nao-existe", "outro-inventado"],
    });
    expect(data).not.toHaveProperty("lost");
  });

  it("antes do dia dos corações, nunca termina em derrota", async () => {
    vi.setSystemTime(new Date(`${addDays(DAILY.livesFromDate, -1)}T18:00:00Z`));
    const date = addDays(DAILY.livesFromDate, -1);
    const answer = dailyAnswer(theme, date, "segredo-de-teste");
    const wrong = theme.characters.filter((c) => c.id !== answer.id);
    const { data } = await call({
      action: "guess",
      day: dailyNumber(date),
      characterId: wrong[8]!.id,
      previous: wrong.slice(0, 8).map((c) => c.id),
    });
    expect(data.ok).toBe(true);
    expect(data).not.toHaveProperty("lost");
    expect(data).not.toHaveProperty("answer");
  });
});
