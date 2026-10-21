import type { SoundName } from "./director";
import type { SoundSettings } from "./settings";

/**
 * Sons do Chutaí gerados na hora com a Web Audio API: nenhum arquivo, nenhuma licença.
 *
 * Regras:
 * - nada toca antes da primeira interação com a página (`unlock`, chamado no primeiro
 *   toque ou tecla; é regra dos navegadores e também educação);
 * - nada toca com a aba escondida (a música pausa e volta junto com a aba);
 * - volume baixo por padrão.
 */
const EFFECTS_VOLUME = 0.16;
const MUSIC_VOLUME = 0.07;

/** Nota → frequência (A4 = 440 Hz). */
const NOTE: Record<string, number> = {
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
};

type Wave = OscillatorType;
interface Blip {
  note: keyof typeof NOTE | number;
  at: number;
  length: number;
  wave?: Wave;
  gain?: number;
}

/** Cada efeito é uma sequência curta de notas com envelope suave. */
const EFFECTS: Record<SoundName, Blip[]> = {
  wrong: [
    { note: "E4", at: 0, length: 0.11, wave: "triangle" },
    { note: "C4", at: 0.1, length: 0.16, wave: "triangle" },
  ],
  correct: [
    { note: "C5", at: 0, length: 0.12 },
    { note: "E5", at: 0.09, length: 0.12 },
    { note: "G5", at: 0.18, length: 0.12 },
    { note: "C6", at: 0.27, length: 0.3 },
  ],
  otherSolved: [{ note: "A5", at: 0, length: 0.09, gain: 0.45 }],
  tick: [{ note: "G5", at: 0, length: 0.07, wave: "triangle", gain: 0.7 }],
  go: [
    { note: "G4", at: 0, length: 0.1, wave: "triangle" },
    { note: "C5", at: 0.08, length: 0.28, wave: "triangle" },
  ],
  urgent: [{ note: "A5", at: 0, length: 0.05, wave: "square", gain: 0.25 }],
  roundEnd: [
    { note: "C5", at: 0, length: 0.14, wave: "triangle" },
    { note: "G4", at: 0.12, length: 0.24, wave: "triangle" },
  ],
  podium: [
    { note: "C5", at: 0, length: 0.14 },
    { note: "E5", at: 0.14, length: 0.14 },
    { note: "G5", at: 0.28, length: 0.4 },
  ],
  victory: [
    { note: "G4", at: 0, length: 0.12, wave: "triangle" },
    { note: "C5", at: 0.12, length: 0.12, wave: "triangle" },
    { note: "E5", at: 0.24, length: 0.12, wave: "triangle" },
    { note: "G5", at: 0.36, length: 0.5, wave: "triangle" },
    { note: "C5", at: 0.36, length: 0.5, gain: 0.5 },
    { note: "E5", at: 0.36, length: 0.5, gain: 0.5 },
  ],
};

export interface EngineEnv {
  createContext: () => AudioContext;
  isHidden: () => boolean;
  getSettings: () => SoundSettings;
}

const browserEnv = (): EngineEnv => ({
  createContext: () => new AudioContext(),
  isHidden: () => document.visibilityState === "hidden",
  getSettings: () => ({ effects: true, music: false }),
});

export class SoundEngine {
  private ctx?: AudioContext;
  private effectsBus?: GainNode;
  private music?: GenerativeMusic;

  constructor(private readonly env: EngineEnv = browserEnv()) {}

  /** Chamado no primeiro toque ou tecla. Antes disso, nada toca. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = this.env.createContext();
      this.effectsBus = this.ctx.createGain();
      this.effectsBus.gain.value = EFFECTS_VOLUME;
      this.effectsBus.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended" && !this.env.isHidden()) void this.ctx.resume();
    this.syncMusic();
  }

  get unlocked(): boolean {
    return !!this.ctx;
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx || !this.effectsBus) return;
    if (this.env.isHidden() || !this.env.getSettings().effects) return;
    const start = ctx.currentTime + 0.01;
    for (const blip of EFFECTS[name]) {
      const frequency = typeof blip.note === "number" ? blip.note : NOTE[blip.note]!;
      tone(ctx, this.effectsBus, frequency, start + blip.at, blip.length, blip.wave, blip.gain);
    }
  }

  /** Liga ou desliga a música conforme as preferências e a aba (chamado quando algo muda). */
  syncMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const wanted = this.env.getSettings().music && !this.env.isHidden();
    if (wanted && !this.music) {
      this.music = new GenerativeMusic(ctx, MUSIC_VOLUME);
      this.music.start();
    } else if (!wanted && this.music) {
      this.music.stop();
      this.music = undefined;
    }
  }

  get musicPlaying(): boolean {
    return !!this.music;
  }
}

/** Uma nota com ataque curto e decaimento exponencial (sem estalos). */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  frequency: number,
  at: number,
  length: number,
  wave: Wave = "sine",
  level = 1,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain);
  gain.connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/**
 * Música de fundo calma, gerada: notas da escala pentatônica de dó sobre a sequência
 * C - Am - F - G, com som de seno macio, filtro e um eco leve. Como é gerada na hora,
 * não tem arquivo, licença nem "corte" no loop.
 */
class GenerativeMusic {
  private timer?: ReturnType<typeof setInterval>;
  private nextAt = 0;
  private step = 0;
  private readonly bus: GainNode;
  private seed = 7;

  private static readonly BEAT = 0.5; // 120 notas por minuto, bem espaçadas
  private static readonly CHORDS = [
    ["C4", "E4", "G4"],
    ["A3", "C4", "E4"],
    ["F4", "A4", "C5"],
    ["G3", "B3", "D4"],
  ];
  private static readonly MELODY = ["C5", "D5", "E5", "G5", "A5", "G4", "A4"];

  constructor(
    private readonly ctx: AudioContext,
    volume: number,
  ) {
    this.bus = ctx.createGain();
    this.bus.gain.value = volume;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.375;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    this.bus.connect(filter);
    filter.connect(ctx.destination);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(ctx.destination);
  }

  /** Pseudoaleatório simples e repetível. */
  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  start(): void {
    this.nextAt = this.ctx.currentTime + 0.1;
    // Agenda um pouco à frente, de tempos em tempos (o setInterval sozinho atrasaria).
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    setTimeout(() => this.bus.disconnect(), 1500);
  }

  private schedule(): void {
    const beat = GenerativeMusic.BEAT;
    while (this.nextAt < this.ctx.currentTime + 1) {
      const bar = Math.floor(this.step / 8) % GenerativeMusic.CHORDS.length;
      const chord = GenerativeMusic.CHORDS[bar]!;
      if (this.step % 8 === 0) {
        // Acorde longo no começo de cada compasso.
        for (const note of chord)
          tone(this.ctx, this.bus, NOTE[note]!, this.nextAt, beat * 7.5, "sine", 0.35);
      }
      // Melodia esparsa: toca em mais ou menos metade dos tempos.
      if (this.step % 2 === 0 || this.random() > 0.6) {
        const melody = GenerativeMusic.MELODY;
        const note = melody[Math.floor(this.random() * melody.length)]!;
        tone(this.ctx, this.bus, NOTE[note]!, this.nextAt, beat * 2.5, "sine", 0.6);
      }
      this.nextAt += beat;
      this.step += 1;
    }
  }
}
