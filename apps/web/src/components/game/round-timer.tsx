"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/cn";

interface RoundTimerProps {
  startedAt: number;
  endsAt: number;
  serverOffset: number;
}

/** Barra de tempo da rodada. Fica vermelha nos últimos 10 segundos. */
export function RoundTimer({ startedAt, endsAt, serverOffset }: RoundTimerProps) {
  const remaining = useCountdown(endsAt, serverOffset);
  const total = Math.max(1, endsAt - startedAt);
  const ratio = Math.min(1, remaining / total);
  const seconds = Math.ceil(remaining / 1000);
  const urgent = seconds <= 10;

  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Tempo restante da rodada"
        aria-valuemin={0}
        aria-valuemax={Math.round(total / 1000)}
        aria-valuenow={seconds}
        className="h-3 flex-1 overflow-hidden rounded-full border-2 border-tinta bg-white"
      >
        <div
          className={cn(
            "h-full transition-[width] duration-300 ease-linear",
            urgent ? "bg-pitanga" : "bg-gema",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span
        aria-live={urgent ? "polite" : "off"}
        className={cn(
          "tabular min-w-14 text-right text-2xl font-black",
          urgent ? "text-pitanga" : "text-tinta",
        )}
      >
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  );
}
