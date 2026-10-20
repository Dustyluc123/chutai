/** Endereço público do site (para links absolutos, prévias e o texto de compartilhar). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

/** Endereço sem "https://", para mostrar em imagens e textos. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** Servidor de tempo real. No servidor do site também vale (a prévia do link busca lá). */
export const REALTIME_URL = (
  process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");
