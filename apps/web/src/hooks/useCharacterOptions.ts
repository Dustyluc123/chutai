"use client";

import { useEffect, useState } from "react";
import type { CharacterOption } from "@chutai/shared";

const cache = new Map<string, CharacterOption[]>();

/**
 * Lista de personagens do tema para o autocompletar, buscada por HTTP no próprio site
 * (/api/themes/[slug]/characters). Nunca contém a resposta da rodada.
 */
export function useCharacterOptions(slug: string | undefined) {
  const [options, setOptions] = useState<CharacterOption[]>(() =>
    slug ? (cache.get(slug) ?? []) : [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const cached = cache.get(slug);
    if (cached) {
      setOptions(cached);
      return;
    }
    let cancelled = false;
    fetch(`/api/themes/${slug}/characters`)
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os personagens do tema.");
        return response.json() as Promise<CharacterOption[]>;
      })
      .then((data) => {
        cache.set(slug, data);
        if (!cancelled) setOptions(data);
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { options, error };
}
