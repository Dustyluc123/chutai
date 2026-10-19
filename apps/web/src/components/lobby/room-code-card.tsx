"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

/** Código da sala em letras grandes + botões para copiar ou compartilhar o link. */
export function RoomCodeCard({ code }: { code: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const link =
    typeof window === "undefined" ? `/sala/${code}` : `${window.location.origin}/sala/${code}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast("Link copiado. Manda no grupo!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(`Não deu para copiar. O código é ${code}.`, "error");
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Chutaí",
        text: `Bora jogar Chutaí? Código da sala: ${code}`,
        url: link,
      });
    } catch {
      // Cancelado pelo usuário: nada a fazer.
    }
  }

  return (
    <section
      aria-label="Código da sala"
      className="flex flex-col gap-4 rounded-3xl bg-anil p-5 text-white sm:p-6"
    >
      <p className="text-sm font-semibold text-white/80">Chame a galera com este código</p>
      <p className="flex gap-1.5 sm:gap-2" aria-label={`Código ${code.split("").join(" ")}`}>
        {code.split("").map((char, i) => (
          <span
            key={i}
            aria-hidden
            className="font-display flex h-14 w-11 items-center justify-center rounded-xl border-2 border-tinta bg-white text-3xl text-tinta shadow-carimbo-sm sm:h-16 sm:w-13 sm:text-4xl"
          >
            {char}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy}>
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? "Copiado" : "Copiar link"}
        </Button>
        {canShare ? (
          <Button variant="onDark" onClick={share}>
            <Share2 aria-hidden className="size-4" /> Compartilhar
          </Button>
        ) : null}
      </div>
    </section>
  );
}
