"use client";

import { Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { PIX_KEY, PIX_PAYLOAD, PIX_QR_IMAGE } from "@/lib/support";

/** Chave Pix, "copia e cola" e QR code. Qualquer valor; nada é obrigatório. */
export function PixBox() {
  const toast = useToast();

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(done, "success");
    } catch {
      toast("Não deu para copiar. Selecione o texto e copie à mão.", "error");
    }
  }

  return (
    <section
      aria-labelledby="pix-titulo"
      className="flex flex-col gap-5 rounded-3xl border-2 border-tinta bg-white p-5 shadow-carimbo sm:flex-row sm:items-center sm:gap-8 sm:p-8"
    >
      <figure className="flex flex-col items-center gap-2 self-center">
        {/* QR estático (sem valor), gerado pelo Mercado Pago e conferido (lib/support.ts). */}
        <img
          src={PIX_QR_IMAGE}
          alt="QR code do Pix do Chutaí (chave lucasbrsantana@gmail.com)"
          width={182}
          height={182}
          // No tamanho original: reduzir ou ampliar por frações deforma os quadradinhos do QR.
          className="box-content size-[182px] max-w-none rounded-xl border-2 border-tinta bg-white p-3"
        />
        <figcaption className="inline-flex items-center gap-1.5 text-xs font-semibold text-tinta-soft">
          <QrCode aria-hidden className="size-3.5" /> Aponte a câmera do app do banco
        </figcaption>
      </figure>
      <div className="flex flex-1 flex-col gap-3">
        <h2 id="pix-titulo" className="font-display text-2xl">
          Pix
        </h2>
        <p className="text-sm text-tinta-soft">Chave (e-mail):</p>
        <p className="tabular -mt-2 font-semibold break-all select-all">{PIX_KEY}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void copy(PIX_KEY, "Chave Pix copiada!")}>
            <Copy aria-hidden className="size-5" /> Copiar chave Pix
          </Button>
          <Button
            variant="secondary"
            onClick={() => void copy(PIX_PAYLOAD, "Pix copia e cola copiado!")}
          >
            <Copy aria-hidden className="size-5" /> Copiar Pix copia e cola
          </Button>
        </div>
        <p className="text-xs text-tinta-soft">
          O valor é você quem escolhe no app do banco. Aparece o nome Lucas Barreto Santana.
        </p>
      </div>
    </section>
  );
}
