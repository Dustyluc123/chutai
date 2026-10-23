"use client";

import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const KEY = "chutai:apoie";

interface Saved {
  /** Fechou o convite: nunca mais aparece. */
  dismissed?: boolean;
  /** Dia (AAAA-MM-DD) e lugar em que o convite apareceu por último. */
  day?: string;
  where?: string;
}

function read(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
}

function write(value: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Sem localStorage: aparece de novo na próxima vez, sem problema.
  }
}

/**
 * Convite pequeno para apoiar, no fim da partida (pódio) e no fim do diário. Sem pop-up e sem
 * insistir: no máximo uma vez por dia (no primeiro lugar em que aparecer; recarregar a mesma
 * tela não esconde) e, se a pessoa fechar, nunca mais.
 */
export function SupportNudge({ where, className }: { where: string; className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const saved = read();
    const today = new Date().toLocaleDateString("en-CA"); // AAAA-MM-DD no fuso de quem joga
    if (saved.dismissed) return;
    if (saved.day === today && saved.where !== where) return;
    write({ day: today, where });
    setShow(true);
  }, [where]);

  if (!show) return null;
  return (
    <aside
      aria-label="Apoie o projeto"
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 border-dashed border-linha px-4 py-3 text-sm text-tinta-soft",
        className,
      )}
    >
      <Heart aria-hidden className="size-4 shrink-0 fill-pitanga text-tinta" />
      <p className="flex-1">
        Curtiu? O Chutaí é grátis e sem anúncios.{" "}
        <Link href="/apoie" className="font-semibold text-anil underline-offset-4 hover:underline">
          Apoie o projeto
        </Link>
      </p>
      <button
        type="button"
        aria-label="Fechar convite"
        onClick={() => {
          write({ ...read(), dismissed: true });
          setShow(false);
        }}
        className="hit-44 rounded-lg p-1 hover:bg-tinta/5"
      >
        <X aria-hidden className="size-4" />
      </button>
    </aside>
  );
}
