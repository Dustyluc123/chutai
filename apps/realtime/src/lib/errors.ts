/**
 * Erro "esperado" do jogo (sala cheia, não é sua vez...). A mensagem vai direto
 * para o jogador, então precisa ser clara e em português.
 */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}
