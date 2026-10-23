"use client";

import { Heart } from "lucide-react";
import type { DailyStats } from "@/lib/daily/storage";
import { cn } from "@/lib/cn";

/**
 * Corações do desafio diário, logo acima do campo de chute. O leitor de tela ouve quantos
 * sobram a cada chute errado ("Restam 5 de 8 corações").
 */
export function DailyHearts({ left, total }: { left: number; total: number }) {
  const label = left === 1 ? `Resta 1 de ${total} corações` : `Restam ${left} de ${total} corações`;
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => {
          const alive = i < left;
          return (
            <Heart
              // A chave muda quando o coração se perde: anima só ele.
              key={`${i}-${alive}`}
              className={cn(
                "size-6 sm:size-7",
                alive
                  ? "fill-pitanga text-tinta"
                  : "animate-pop fill-transparent text-tinta-soft/40",
              )}
              strokeWidth={2}
            />
          );
        })}
      </span>
      <span className="tabular text-sm font-bold text-tinta" aria-hidden>
        {left}/{total}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {label}
      </span>
    </div>
  );
}

/** Estatísticas do diário deste tema (no fim do desafio): jogos, vitórias, derrotas e sequência. */
export function DailyStatsPanel({ stats }: { stats: DailyStats }) {
  const items = [
    { label: "Jogos", value: stats.played },
    { label: "Vitórias", value: stats.wins },
    { label: "Derrotas", value: stats.losses ?? 0 },
    { label: "Sequência", value: stats.streak },
    { label: "Melhor sequência", value: stats.maxStreak },
  ];
  return (
    <section aria-label="Suas estatísticas neste tema" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-tinta-soft">Suas estatísticas neste tema</h2>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col-reverse items-center gap-0.5 rounded-2xl border-2 border-tinta bg-white px-2 py-3 text-center"
          >
            <dt className="text-xs leading-tight font-semibold text-tinta-soft">{item.label}</dt>
            <dd className="tabular font-display text-2xl">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
