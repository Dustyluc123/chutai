"use client";

import { useEffect, useState } from "react";

/**
 * Milissegundos que faltam até `endsAt` (horário do servidor).
 * `offsetMs` corrige a diferença entre o relógio do servidor e o do navegador.
 */
export function useCountdown(endsAt: number | undefined, offsetMs = 0): number {
  const compute = () => (endsAt ? Math.max(0, endsAt - (Date.now() + offsetMs)) : 0);
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, endsAt - (Date.now() + offsetMs)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [endsAt, offsetMs]);

  return remaining;
}
