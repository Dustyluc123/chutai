import { NextResponse } from "next/server";
import { toCharacterOptions } from "@chutai/db";
import { getTheme } from "@/lib/themes";

/**
 * GET /api/themes/[slug]/characters — nomes para o autocompletar do jogo.
 * Só id, nome, apelidos e emoji: a resposta da rodada nunca sai do servidor de tempo real.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = await getTheme(slug);
  if (!theme) return NextResponse.json({ error: "Tema não encontrado." }, { status: 404 });
  return NextResponse.json(toCharacterOptions(theme), {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
