import type { IoSocket } from "../types";

/**
 * Balde de fichas: cada evento gasta uma ficha; as fichas voltam aos poucos.
 * Permite rajadas curtas (digitar rápido) mas bloqueia quem tenta inundar o servidor.
 */
export class TokenBucket {
  private tokens: number;
  private updatedAt: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.updatedAt = now();
  }

  take(): boolean {
    const now = this.now();
    const elapsed = (now - this.updatedAt) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.updatedAt = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

const LIMITS: Record<string, { capacity: number; perSecond: number }> = {
  "guess:submit": { capacity: 4, perSecond: 2 },
  "hint:request": { capacity: 2, perSecond: 0.5 },
  "room:create": { capacity: 3, perSecond: 0.1 },
  default: { capacity: 20, perSecond: 5 },
};

/** Liga o limite de eventos em uma conexão (registrado em socket.use). */
export function applyRateLimit(socket: IoSocket): void {
  const buckets = new Map<string, TokenBucket>();

  socket.use((packet, next) => {
    const [event, ...args] = packet as [string, ...unknown[]];
    const key = event in LIMITS ? event : "default";
    let bucket = buckets.get(key);
    if (!bucket) {
      const limit = LIMITS[key]!;
      bucket = new TokenBucket(limit.capacity, limit.perSecond);
      buckets.set(key, bucket);
    }
    if (bucket.take()) return next();

    // Responde o pedido com erro em vez de deixar o navegador esperando para sempre.
    const ack = args.at(-1);
    if (typeof ack === "function") {
      ack({ ok: false, error: "Calma! Muitas ações em pouco tempo. Tente de novo em instantes." });
    }
  });
}
