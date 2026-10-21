"use client";

import { Copy, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FinalStanding } from "@chutai/shared";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { shareText } from "@/lib/podium";
import { SITE_URL } from "@/lib/site";

type Status = "loading" | "ready" | "error";

/**
 * "Compartilhar resultado": imagem do pódio gerada no servidor do site (mesmo visual da prévia
 * do link). No celular abre o compartilhamento nativo com a imagem; no computador, ou se o
 * navegador não deixar, baixa o PNG e oferece "Copiar texto".
 */
export function ShareResult({
  code,
  themeName,
  standings,
}: {
  code: string;
  themeName: string;
  standings: FinalStanding[];
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [offerCopy, setOfferCopy] = useState(false);
  const text = useMemo(() => shareText(themeName, standings, SITE_URL), [themeName, standings]);
  // Muda quando outra partida termina na mesma sala (revanche): baixa a imagem de novo.
  const signature = standings.map((s) => `${s.playerId}:${s.score}`).join(",");

  // Baixa a imagem assim que o pódio aparece: o pódio some se o anfitrião chamar a revanche,
  // e o iPhone só abre o compartilhamento se ele vier logo depois do toque, sem esperar a rede.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`/sala/${code}/resultado`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        setFile(new File([blob], `chutai-${code}.png`, { type: "image/png" }));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [code, signature]);

  async function share() {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return; // cancelou
        // Outro erro: cai no plano B (baixar).
      }
    }
    setOfferCopy(true);
    if (!file) {
      toast("Não deu para gerar a imagem. Copie o texto do resultado.", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast("Imagem baixada. Agora é só mandar no grupo!", "success");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Texto copiado.", "success");
    } catch {
      toast("Não deu para copiar o texto.", "error");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        variant="accent"
        size="lg"
        loading={status === "loading"}
        onClick={() => void share()}
      >
        <Share2 aria-hidden className="size-5" /> Compartilhar resultado
      </Button>
      {offerCopy || status === "error" ? (
        <Button variant="secondary" size="lg" onClick={() => void copy()}>
          <Copy aria-hidden className="size-5" /> Copiar texto
        </Button>
      ) : null}
    </div>
  );
}
