import type { Theme, ThemeSummary } from "@chutai/shared";
import type { ThemeRepository } from "@chutai/db";

/**
 * Busca temas no repositório (JSON hoje, PostgreSQL no futuro) e guarda em cache
 * por alguns minutos, para não consultar o banco a cada sala criada.
 */
export class ThemeService {
  private readonly cache = new Map<string, { theme: Theme; expiresAt: number }>();

  constructor(
    private readonly repository: ThemeRepository,
    private readonly ttlMs = 5 * 60_000,
  ) {}

  async get(slug: string): Promise<Theme | null> {
    const cached = this.cache.get(slug);
    if (cached && cached.expiresAt > Date.now()) return cached.theme;
    const theme = await this.repository.getTheme(slug);
    if (theme) this.cache.set(slug, { theme, expiresAt: Date.now() + this.ttlMs });
    return theme;
  }

  list(): Promise<ThemeSummary[]> {
    return this.repository.listThemes();
  }
}
