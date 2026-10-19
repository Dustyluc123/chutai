import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { roomCodeSchema } from "@chutai/shared";
import { RoomScreen } from "./room-screen";

interface PageProps {
  params: Promise<{ codigo: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Sala ${codigo.toUpperCase()}`,
    description:
      "Você foi chamado para uma partida de Chutaí. Entre e descubra o personagem antes dos seus amigos.",
    robots: { index: false },
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { codigo } = await params;
  const parsed = roomCodeSchema.safeParse(codigo);
  if (!parsed.success) notFound();
  return <RoomScreen code={parsed.data} />;
}
