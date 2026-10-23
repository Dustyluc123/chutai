"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/**
 * Avisos curtos no pé da tela ("Bia acertou!", "Código copiado"). No celular, no máximo dois
 * ao mesmo tempo, para não cobrir o tabuleiro; acima da barra do iPhone (safe-area). Com o campo
 * de chute focado (teclado aberto), ficam transparentes para não cobrir as sugestões; o leitor
 * de tela continua anunciando.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 transition-opacity max-sm:[&>*:nth-last-child(n+3)]:hidden max-sm:[body:has([role=combobox]:focus)_&]:opacity-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "max-w-full animate-pop rounded-xl border-2 border-tinta px-3 py-2 text-sm font-semibold shadow-carimbo-sm sm:px-4 sm:py-2.5",
              toast.tone === "success" && "bg-folha text-white",
              toast.tone === "error" && "bg-pitanga text-white",
              toast.tone === "info" && "bg-white text-tinta",
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
