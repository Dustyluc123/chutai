import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";
import { SITE_URL } from "@/lib/site";
import { Providers } from "./providers";

export const metadata: Metadata = {
  // Links absolutos nas prévias (og:image etc.). Na Vercel: NEXT_PUBLIC_SITE_URL.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Chutaí — adivinhe o personagem antes dos seus amigos",
    template: "%s · Chutaí",
  },
  description:
    "Dle multiplayer em tempo real. Crie uma sala, mande o código no grupo e descubra o personagem secreto com menos chutes e mais rápido que todo mundo.",
  applicationName: "Chutaí",
  authors: [
    { name: "Lucas Barreto", url: "https://www.linkedin.com/in/lucas-barreto-santana-67aa932b6/" },
  ],
  keywords: ["dle", "jogo", "multiplayer", "adivinhar personagem", "folclore", "futebol", "wordle"],
  openGraph: {
    title: "Chutaí",
    description: "Adivinhe o personagem antes dos seus amigos. Dle multiplayer em tempo real.",
    locale: "pt_BR",
    type: "website",
    siteName: "Chutaí",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#2338d6",
  width: "device-width",
  initialScale: 1,
  // Chrome do Android: o teclado encolhe a página em vez de cobrir o campo de chute.
  // (No Safari do iPhone isso não existe; lá quem cuida é o useKeyboardFit.)
  // Sem `viewport-fit=cover`: o próprio navegador mantém o conteúdo longe do entalhe e da barra
  // do iPhone. Os elementos fixos (avisos) também somam `env(safe-area-inset-*)`, por garantia.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-lg bg-gema px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
        {/* Vercel Web Analytics: só conta visualizações de página. Sem cookies e sem dados pessoais. */}
        <Analytics />
      </body>
    </html>
  );
}
