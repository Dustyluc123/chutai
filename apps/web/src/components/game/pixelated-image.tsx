"use client";

import { useEffect, useRef } from "react";
import { imageEffect, zoomWindow, type ZoomCenter } from "@chutai/game";

const SIZE = 300;

interface PixelatedImageProps {
  src: string;
  level: number;
  /** Ponto do zoom, sorteado uma vez por personagem (o mesmo em todos os níveis). */
  center: ZoomCenter;
  label: string;
}

/**
 * Treino solo do modo Imagem: pixela e desfoca no próprio navegador (canvas).
 * Aqui não há o que proteger: no treino o navegador já tem o tema inteiro.
 * Na partida com amigos quem degrada a imagem é o servidor.
 */
export function PixelatedImage({ src, level, center, label }: PixelatedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      const { zoom, pixels, blur } = imageEffect(level);
      const window = zoomWindow(zoom, center);
      // 1. Recorta o pedaço ampliado e desenha bem pequeno; 2. amplia sem suavizar (blocos);
      // 3. desfoca.
      const small = document.createElement("canvas");
      small.width = pixels;
      small.height = pixels;
      small
        .getContext("2d")
        ?.drawImage(
          image,
          window.left * image.naturalWidth,
          window.top * image.naturalHeight,
          window.size * image.naturalWidth,
          window.size * image.naturalHeight,
          0,
          0,
          pixels,
          pixels,
        );
      ctx.imageSmoothingEnabled = false;
      ctx.filter = `blur(${blur}px)`;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(small, 0, 0, SIZE, SIZE);
      ctx.filter = "none";
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, level, center]);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={label}
      className="size-full"
    />
  );
}
