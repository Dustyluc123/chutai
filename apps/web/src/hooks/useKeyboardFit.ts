"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Espaço entre o topo da área visível e o que fica no topo (campo ou imagem). */
const TOP_GAP = 12;
/** Altura mínima da lista de sugestões (com pouco espaço, ainda dá para ver 2 ou 3 nomes). */
const MIN_LIST = 132;
/** Altura máxima da lista (a mesma de antes, no computador). */
const MAX_LIST = 320;
/** A área visível encolheu pelo menos isto: o teclado está aberto. */
const KEYBOARD_MIN = 120;
/** Menor tamanho da imagem do modo Imagem com o teclado aberto (abaixo disso, não vale a pena). */
const MIN_IMAGE = 110;
/** Variável de CSS com o tamanho da imagem enquanto o teclado está aberto (veja MysteryImage). */
const IMAGE_VAR = "--teclado-imagem";

/** Maior altura visível já vista nesta aba (sem teclado). */
let tallest = 0;

function viewport() {
  const vv = window.visualViewport;
  return { top: vv?.offsetTop ?? 0, height: vv?.height ?? window.innerHeight };
}

/**
 * Teclado do celular sem esconder o campo de chute nem as sugestões.
 *
 * No Chrome do Android, o `interactive-widget=resizes-content` (no viewport do layout) já
 * encolhe a página quando o teclado abre. No Safari do iPhone, não: o teclado cobre a página e
 * só a "visual viewport" (a parte que sobra visível) encolhe. Este hook escuta a visual viewport
 * e, quando o teclado abre com o campo focado:
 * - rola a página para o campo ficar logo abaixo do topo da área visível (ou, se `keepVisible`
 *   for passado e couber, para esse elemento ficar no topo, como a imagem do modo Imagem);
 * - deixa a lista de sugestões com a altura que sobra entre o campo e o teclado;
 * - põe um espaço extra no fim da página, para dar para rolar até lá mesmo com a página curta.
 *
 * Só age quando o teclado abre de verdade: o foco automático no começo da rodada não mexe na
 * página (no celular, foco sem toque não abre teclado).
 */
export function useKeyboardFit(
  anchor: RefObject<HTMLElement | null>,
  focused: boolean,
  keepVisible?: RefObject<HTMLElement | null>,
) {
  const [listMax, setListMax] = useState(MAX_LIST);
  const open = useRef(false);

  const fit = useCallback(
    (scroll: boolean) => {
      const el = anchor.current;
      if (!el) return;
      const view = viewport();
      let rect = el.getBoundingClientRect();
      if (scroll) {
        const keepEl = keepVisible?.current;
        let keep = keepEl?.getBoundingClientRect();
        if (keepEl && keep && keep.height > 0) {
          // Encolhe a imagem para caberem ela, o campo e uma lista razoável acima do teclado.
          // O quadrado da imagem (marcado com data-keyboard-square); o resto é a legenda.
          const squareEl = keepEl.matches("[data-keyboard-square]")
            ? keepEl
            : (keepEl.querySelector("[data-keyboard-square]") ?? keepEl);
          const square = squareEl.getBoundingClientRect().width;
          const caption = keep.height - square;
          const between = rect.bottom - keep.bottom;
          const size = Math.floor(view.height - TOP_GAP - caption - between - MIN_LIST);
          const root = document.documentElement.style;
          if (size >= MIN_IMAGE) {
            root.setProperty(IMAGE_VAR, `${Math.min(size, Math.round(square))}px`);
            keep = keepEl.getBoundingClientRect();
            rect = el.getBoundingClientRect();
          } else {
            root.removeProperty(IMAGE_VAR);
            keep = undefined;
          }
        }
        // Cabe o elemento de cima + o campo + a lista? Então ele fica no topo; senão, o campo.
        const fitsWithKeep =
          keep && keep.height > 0 && rect.bottom - keep.top + MIN_LIST + TOP_GAP <= view.height + 1;
        const target = fitsWithKeep ? keep!.top : rect.top;
        const delta = target - view.top - TOP_GAP;
        if (Math.abs(delta) > 4) {
          window.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
          rect = el.getBoundingClientRect();
        }
      }
      const below = view.top + view.height - rect.bottom - 16;
      setListMax(Math.round(Math.min(MAX_LIST, Math.max(MIN_LIST, below))));
    },
    [anchor, keepVisible],
  );

  useEffect(() => {
    const body = document.body;
    const previousPadding = body.style.paddingBottom;
    const setOpen = (next: boolean) => {
      if (next === open.current) return;
      open.current = next;
      // Espaço extra só com o teclado aberto: some quando ele fecha.
      body.style.paddingBottom = next ? "60vh" : previousPadding;
      if (!next) {
        setListMax(MAX_LIST);
        document.documentElement.style.removeProperty(IMAGE_VAR);
      }
    };
    if (!focused) {
      setOpen(false);
      return;
    }

    const check = (allowScroll: boolean) => {
      const { height } = viewport();
      tallest = Math.max(tallest, height);
      const keyboard = height < tallest - KEYBOARD_MIN;
      const opened = keyboard && !open.current;
      setOpen(keyboard);
      // Rola só quando o teclado acabou de abrir (não a cada rolagem da própria pessoa).
      if (keyboard) fit(opened || allowScroll);
    };

    check(false);
    // O teclado leva uns 300 ms para abrir (e o Safari rola a página no meio do caminho).
    const settle = setTimeout(() => check(open.current), 350);
    const vv = window.visualViewport;
    const onResize = () => check(false);
    const onScroll = () => {
      if (open.current) fit(false);
    };
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(settle);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      setOpen(false);
    };
  }, [focused, fit]);

  return listMax;
}
