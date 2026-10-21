import type { DailyResponse, GuessResult } from "@chutai/shared";
import { dailyRequestSchema, firstZodError } from "@chutai/shared";
import { buildHint, canRequestHint, compareCharacters } from "@chutai/game";
import {
  DailySecretMissing,
  dailyAnswer,
  dailyStartsLater,
  dailySecret,
  dailyTheme,
  revealOf,
  today,
  yesterdayAnswer,
} from "@/lib/daily/server";

export const dynamic = "force-dynamic";

function reply(body: DailyResponse, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Confere um chute (ou dá uma dica) do desafio diário. A resposta do dia nunca sai daqui antes
 * do acerto. Roda no próprio site (Vercel): o diário funciona mesmo com o servidor de tempo
 * real fora do ar. Não guarda nada: o progresso fica no navegador.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = dailyTheme(slug);
  if (!theme) return reply({ ok: false, error: "Este tema não tem desafio diário." }, 404);

  let secret: string;
  try {
    secret = dailySecret();
  } catch (error) {
    if (error instanceof DailySecretMissing) return reply({ ok: false, error: error.message }, 503);
    throw error;
  }

  const parsed = dailyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ ok: false, error: firstZodError(parsed.error) }, 400);
  const body = parsed.data;

  const now = today();
  if (body.day !== now.number) {
    return reply(
      { ok: false, error: "Já tem desafio novo! Recarregue a página.", today: now.number },
      409,
    );
  }

  const later = dailyStartsLater(theme, now.dateKey);
  if (later) {
    const [year, month, day] = later.split("-");
    return reply(
      { ok: false, error: `O desafio deste tema começa em ${day}/${month}/${year}.` },
      409,
    );
  }
  const answer = dailyAnswer(theme, now.dateKey, secret);
  const find = (id: string) => theme.characters.find((character) => character.id === id);
  const judge = (id: string, index: number): GuessResult | undefined => {
    const character = find(id);
    if (!character) return undefined;
    return {
      characterId: character.id,
      characterName: character.name,
      emoji: character.emoji,
      image: character.image,
      feedback: compareCharacters(character, answer, theme.attributes),
      correct: character.id === answer.id,
      guessNumber: index + 1,
    };
  };

  if (body.action === "guess") {
    const guess = judge(body.characterId, 0);
    if (!guess) return reply({ ok: false, error: "Esse personagem não faz parte do tema." }, 400);
    if (!guess.correct) return reply({ ok: true, guess });
    return reply({
      ok: true,
      guess,
      answer: revealOf(theme, answer),
      yesterday: yesterdayAnswer(theme, now.dateKey, secret),
    });
  }

  // Dica: confere de novo os chutes que o navegador diz ter dado.
  const ids = [...new Set(body.guesses)];
  const guesses = ids.map(judge);
  if (guesses.some((guess) => !guess)) {
    return reply({ ok: false, error: "Algum chute não faz parte do tema." }, 400);
  }
  const check = canRequestHint(body.type, {
    hintsEnabled: true,
    guesses: guesses as GuessResult[],
    hintsUsed: body.hintsUsed.map((type) => ({ type, text: "" })),
    solved: guesses.some((guess) => guess!.correct),
  });
  if (!check.allowed) return reply({ ok: false, error: check.reason }, 400);
  return reply({
    ok: true,
    hint: buildHint(body.type, answer, theme.attributes, guesses as GuessResult[]),
  });
}
