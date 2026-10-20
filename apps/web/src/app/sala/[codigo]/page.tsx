import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { roomCodeSchema } from "@chutai/shared";
import { fetchRoomPreview, previewPlayersText } from "@/lib/room-preview";
import { RoomScreen } from "./room-screen";

interface PageProps {
  params: Promise<{ codigo: string }>;
}

/**
 * Título e descrição do cartão do link (WhatsApp, redes), com os dados públicos da sala.
 * A imagem vem de opengraph-image.tsx, nesta mesma pasta.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { codigo } = await params;
  const code = roomCodeSchema.safeParse(codigo);
  const preview = code.success ? await fetchRoomPreview(code.data) : null;
  const title = preview
    ? `${preview.host?.nickname ?? "Alguém"} te chamou para jogar Chutaí`
    : "Essa sala já acabou";
  const description = preview
    ? `Tema: ${preview.theme.name}. ${previewPlayersText(preview)}`
    : "Crie a sua no Chutaí: mande o código no grupo e descubra o personagem antes dos seus amigos.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "Chutaí" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false },
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { codigo } = await params;
  const parsed = roomCodeSchema.safeParse(codigo);
  if (!parsed.success) notFound();
  return <RoomScreen code={parsed.data} />;
}
