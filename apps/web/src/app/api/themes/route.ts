import { NextResponse } from "next/server";
import { listThemes } from "@/lib/themes";

/** GET /api/themes — temas públicos (resumo, sem personagens). */
export async function GET() {
  return NextResponse.json(await listThemes(), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
