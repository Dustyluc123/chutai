"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { dailyDateKey, dailyNumber } from "@chutai/game";

/** "Desafio do dia" na página inicial. O número é calculado no navegador (a página é estática). */
export function DailyHighlight() {
  const [number, setNumber] = useState<number | null>(null);
  useEffect(() => setNumber(dailyNumber(dailyDateKey(new Date()))), []);
  return (
    <Link
      href="/diario"
      className="flex items-center gap-4 rounded-3xl border-2 border-tinta bg-gema p-4 text-tinta shadow-carimbo transition-transform hover:-translate-y-0.5 sm:p-5"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-tinta bg-white">
        <CalendarDays aria-hidden className="size-6" />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-xl sm:text-2xl">
          Desafio do dia{number ? ` #${number}` : ""}
        </span>
        <span className="text-sm font-semibold">
          Um personagem por tema, o mesmo para todo mundo. Jogue e compare com os amigos.
        </span>
      </span>
    </Link>
  );
}
