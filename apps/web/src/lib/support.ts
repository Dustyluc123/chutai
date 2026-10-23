/**
 * "Apoie o projeto": Pix para quem quiser ajudar a manter o servidor no ar.
 *
 * O QR code em public/apoie/pix-qr-code.png foi gerado pelo Mercado Pago, sem valor. O conteúdo
 * dele (abaixo) foi conferido: é um Pix ESTÁTICO (não tem URL de cobrança, não tem valor e não
 * expira) para a chave PIX_KEY, com o CRC certo. O teste tests/support.test.ts confere de novo.
 * Se trocar o QR, troque também PIX_PAYLOAD (é o "Pix copia e cola").
 */
export const PIX_KEY = "lucasbrsantana@gmail.com";

export const PIX_PAYLOAD =
  "00020126460014br.gov.bcb.pix0124lucasbrsantana@gmail.com5204000053039865802BR5921Lucas Barreto Santana6009Sao Paulo62240520daqr11489371242827126304DF8E";

export const PIX_QR_IMAGE = "/apoie/pix-qr-code.png";

/** CRC16-CCITT (o dígito verificador do Pix "copia e cola", campo 63). */
export function pixCrc(payloadWithoutCrc: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payloadWithoutCrc)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Lê os campos de um Pix "copia e cola" (formato EMV: id de 2 dígitos, tamanho de 2, valor). */
export function parseEmv(payload: string): Map<string, string> {
  const fields = new Map<string, string>();
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const size = Number(payload.slice(i + 2, i + 4));
    fields.set(id, payload.slice(i + 4, i + 4 + size));
    i += 4 + size;
  }
  return fields;
}
