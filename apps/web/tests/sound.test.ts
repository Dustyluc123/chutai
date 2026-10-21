import { describe, expect, it } from "vitest";
import { SoundDirector, guessSound, type GameSnapshot, type SoundName } from "@/lib/sound/director";
import { SoundEngine } from "@/lib/sound/engine";

function director() {
  const played: SoundName[] = [];
  return { played, d: new SoundDirector((name) => played.push(name)) };
}

const base: GameSnapshot = { phase: "lobby", roundNumber: 0, othersSolved: 0 };

describe("qual evento toca qual som", () => {
  it("largada: 3, 2, 1 e Vai! (o 5 e o 4 ficam em silêncio)", () => {
    const { played, d } = director();
    d.update(base);
    for (const left of [5, 4, 3, 2, 1])
      d.update({ ...base, phase: "countdown", countdownLeft: left });
    d.update({ ...base, phase: "round", roundNumber: 1, roundLeft: 60 });
    expect(played).toEqual(["tick", "tick", "tick", "go"]);
  });

  it("o mesmo segundo não toca duas vezes", () => {
    const { played, d } = director();
    d.update({ ...base, phase: "countdown", countdownLeft: 4 });
    d.update({ ...base, phase: "countdown", countdownLeft: 3 });
    d.update({ ...base, phase: "countdown", countdownLeft: 3 });
    expect(played).toEqual(["tick"]);
  });

  it("rodada: alguém acertou, últimos 5 segundos e fim da rodada", () => {
    const { played, d } = director();
    const round = { ...base, phase: "round" as const, roundNumber: 1 };
    d.update({ ...round, roundLeft: 30 });
    d.update({ ...round, roundLeft: 29, othersSolved: 1 });
    d.update({ ...round, roundLeft: 6, othersSolved: 1 });
    d.update({ ...round, roundLeft: 5, othersSolved: 1 });
    d.update({ ...round, roundLeft: 4, othersSolved: 1 });
    d.update({
      ...base,
      phase: "intermission",
      roundNumber: 1,
      intermissionLeft: 10,
      othersSolved: 0,
    });
    expect(played).toEqual(["otherSolved", "urgent", "urgent", "roundEnd"]);
  });

  it("intervalo: 3, 2, 1 no fim e Vai! na rodada seguinte", () => {
    const { played, d } = director();
    const pause = { ...base, phase: "intermission" as const, roundNumber: 1 };
    d.update({ ...pause, intermissionLeft: 5 });
    d.update({ ...pause, intermissionLeft: 3 });
    d.update({ ...pause, intermissionLeft: 2 });
    d.update({ ...pause, intermissionLeft: 1 });
    d.update({ ...base, phase: "round", roundNumber: 2, roundLeft: 60 });
    expect(played).toEqual(["tick", "tick", "tick", "go"]);
  });

  it("pódio: fanfarra para o 1º, som de pódio para os outros", () => {
    const first = director();
    first.d.update({ ...base, phase: "round", roundNumber: 3, roundLeft: 2 });
    first.d.update({ ...base, phase: "finished", roundNumber: 3, myPosition: 1 });
    expect(first.played).toEqual(["victory"]);
    const second = director();
    second.d.update({ ...base, phase: "round", roundNumber: 3, roundLeft: 2 });
    second.d.update({ ...base, phase: "finished", roundNumber: 3, myPosition: 2 });
    expect(second.played).toEqual(["podium"]);
  });

  it("entrar ou recarregar no meio da partida não toca nada atrasado", () => {
    const { played, d } = director();
    d.update({ ...base, phase: "finished", roundNumber: 3, myPosition: 1 });
    expect(played).toEqual([]);
  });

  it("meu chute: errado ou certo", () => {
    expect(guessSound(false)).toBe("wrong");
    expect(guessSound(true)).toBe("correct");
  });
});

/** AudioContext falso: só conta quantos osciladores foram criados. */
function fakeAudio() {
  const stats = { oscillators: 0, contexts: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  });
  const node = () => ({ connect() {}, disconnect() {}, gain: param() });
  const ctx = {
    currentTime: 0,
    state: "running",
    destination: {},
    resume: async () => {},
    createGain: node,
    createBiquadFilter: () => ({ ...node(), type: "", frequency: param() }),
    createDelay: () => ({ ...node(), delayTime: param() }),
    createOscillator: () => {
      stats.oscillators += 1;
      return { ...node(), type: "", frequency: param(), start() {}, stop() {} };
    },
  };
  return {
    stats,
    createContext: () => {
      stats.contexts += 1;
      return ctx as unknown as AudioContext;
    },
  };
}

describe("motor de som (áudio simulado)", () => {
  it("nada toca antes da primeira interação", () => {
    const audio = fakeAudio();
    const engine = new SoundEngine({
      createContext: audio.createContext,
      isHidden: () => false,
      getSettings: () => ({ effects: true, music: false }),
    });
    engine.play("correct");
    expect(audio.stats).toEqual({ oscillators: 0, contexts: 0 });
    engine.unlock();
    engine.play("correct");
    expect(audio.stats.contexts).toBe(1);
    expect(audio.stats.oscillators).toBeGreaterThan(0);
  });

  it("aba escondida ou efeitos desligados: silêncio", () => {
    const audio = fakeAudio();
    let hidden = true;
    let effects = true;
    const engine = new SoundEngine({
      createContext: audio.createContext,
      isHidden: () => hidden,
      getSettings: () => ({ effects, music: false }),
    });
    engine.unlock();
    engine.play("wrong");
    expect(audio.stats.oscillators).toBe(0);
    hidden = false;
    effects = false;
    engine.play("wrong");
    expect(audio.stats.oscillators).toBe(0);
  });

  it("música: desligada por padrão, liga pela preferência e para com a aba escondida", () => {
    const audio = fakeAudio();
    let music = false;
    let hidden = false;
    const engine = new SoundEngine({
      createContext: audio.createContext,
      isHidden: () => hidden,
      getSettings: () => ({ effects: true, music }),
    });
    engine.unlock();
    expect(engine.musicPlaying).toBe(false);
    music = true;
    engine.syncMusic();
    expect(engine.musicPlaying).toBe(true);
    hidden = true;
    engine.syncMusic();
    expect(engine.musicPlaying).toBe(false);
  });
});
