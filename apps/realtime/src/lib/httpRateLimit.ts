import type { IncomingMessage } from "node:http";
import { TokenBucket } from "../socket/middleware/rateLimit";

/**
 * Limite de requisições HTTP por IP (balde de fichas, o mesmo dos eventos do Socket.IO).
 * Atrás do proxy do Railway, o IP de verdade vem no cabeçalho x-forwarded-for.
 */
export class HttpRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly capacity: number,
    private readonly perSecond: number,
    private readonly now: () => number = Date.now,
    /** Acima disso, esquece todo mundo (evita crescer sem fim com muitos IPs). */
    private readonly maxTracked = 10_000,
  ) {}

  allow(req: IncomingMessage): boolean {
    const key = clientIp(req);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxTracked) this.buckets.clear();
      bucket = new TokenBucket(this.capacity, this.perSecond, this.now);
      this.buckets.set(key, bucket);
    }
    return bucket.take();
  }
}

export function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "desconhecido";
}
