import { NextResponse } from "next/server";
import { toThemeSummary } from "@chutai/db";
import { getTheme } from "@/lib/themes";

/** GET /api/themes/[slug] — resumo do tema com a definição completa dos atributos. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = await getTheme(slug);
  if (!theme || theme.visibility === "private") {
    return NextResponse.json({ error: "Tema não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ...toThemeSummary(theme), attributes: theme.attributes });
}
