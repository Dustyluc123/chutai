/**
 * Decide QUAL som tocar, comparando o retrato anterior da partida com o atual.
 * Não sabe nada de áudio: chama `play(nome)` de quem for passado (o motor de verdade
 * ou um falso nos testes). Assim a regra "qual evento toca qual som" fica testável.
 */
export type SoundName =
  | "wrong"
  | "correct"
  | "otherSolved"
  | "tick"
  | "go"
  | "urgent"
  | "roundEnd"
  | "podium"
  | "victory";

export interface GameSnapshot {
  phase: "lobby" | "countdown" | "round" | "intermission" | "finished";
  roundNumber: number;
  /** Segundos que faltam na contagem da largada (fase countdown). */
  countdownLeft?: number;
  /** Segundos que faltam no intervalo entre rodadas. */
  intermissionLeft?: number;
  /** Segundos que faltam na rodada. */
  roundLeft?: number;
  /** Quantos outros jogadores já acertaram nesta rodada. */
  othersSolved: number;
  /** Minha posição no pódio (fase finished). */
  myPosition?: number;
}

/**
 * Som do MEU chute. Vem direto da resposta do servidor ao chute (e não do retrato):
 * se o meu acerto encerrar a rodada, o retrato já chega como "intervalo".
 */
export function guessSound(correct: boolean): SoundName {
  return correct ? "correct" : "wrong";
}

/** Contagem 3-2-1 da largada e do fim do intervalo; tique nos últimos 5 s da rodada. */
const COUNTDOWN_TICKS = 3;
const URGENT_SECONDS = 5;

export class SoundDirector {
  private previous?: GameSnapshot;

  constructor(private readonly play: (sound: SoundName) => void) {}

  update(next: GameSnapshot): void {
    const prev = this.previous;
    this.previous = next;
    // Primeiro retrato (entrou agora ou recarregou): só guarda, não toca nada atrasado.
    if (!prev) return;

    const sameRound = prev.roundNumber === next.roundNumber;

    // Fim de partida: pódio (ou fanfarra para quem ficou em 1º). Substitui o "fim da rodada".
    if (next.phase === "finished" && prev.phase !== "finished") {
      this.play(next.myPosition === 1 ? "victory" : "podium");
      return;
    }

    // Começou uma rodada: "Vai!".
    if (next.phase === "round" && (prev.phase !== "round" || !sameRound)) {
      this.play("go");
      return;
    }

    // Rodada acabou (tempo ou todos acertaram).
    if (prev.phase === "round" && next.phase === "intermission") {
      this.play("roundEnd");
      return;
    }

    if (next.phase === "countdown" && changedInto(prev.countdownLeft, next.countdownLeft)) {
      this.play("tick");
    }
    if (
      next.phase === "intermission" &&
      changedInto(prev.intermissionLeft, next.intermissionLeft)
    ) {
      this.play("tick");
    }

    if (next.phase === "round" && sameRound) {
      if (next.othersSolved > prev.othersSolved) this.play("otherSolved");
      else if (
        next.roundLeft !== undefined &&
        next.roundLeft !== prev.roundLeft &&
        next.roundLeft > 0 &&
        next.roundLeft <= URGENT_SECONDS
      ) {
        this.play("urgent");
      }
    }
  }
}

/** O número de segundos mudou e agora está em 3, 2 ou 1. */
function changedInto(before: number | undefined, after: number | undefined): boolean {
  return after !== undefined && after !== before && after > 0 && after <= COUNTDOWN_TICKS;
}
