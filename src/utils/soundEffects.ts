/**
 * Motor de som do Roda de Bobo (100% sintetizado, sem arquivos).
 *
 * Identidade: tudo em Do maior e construido em cima do mesmo motivo de 3 notas (Sol - Do - Mi, "Ro-da-de"),
 * para os sons combinarem entre si e com a marca. Cada tema muda o timbre, nao a musica:
 *  - tv:     auditorio de programa de TV. Sino FM, metais, buzina de palco, rufar de caixa, aplauso, sala com eco.
 *  - arcade: gabinete de fliperama. Chip PSG (pulso 12,5/25/50%, triangulo, ruido LFSR) com afinacao em passos
 *            de 1/60 s como os drivers da epoca, notas sustentadas com vibrato, e o som saindo por um alto-falante
 *            de gabinete (filtro de banda, leve saturacao, mola).
 *  - mesa:   jogo de tabuleiro. Madeira (ressonadores), cartas, dados no copo, marimba e sinos de vidro, sala pequena.
 *
 * API publica (usada em ~440 pontos, nao mudou): playTick, playPowerup, playSuccess, playFlip, playBuzzer,
 * playFanfare, playAlarm, playDrumroll, playChord. Novos momentos: playSpinTick, playSpinStop, playRoundStart,
 * playTurn, playAchievement, playTimeUp.
 */

const SOUND_MUTE_STORAGE_KEY = 'RODA_DE_BOBO_MUTED';
const SOUND_THEME_STORAGE_KEY = 'RODA_DE_BOBO_SOUND_THEME';

export type SoundTheme = 'tv' | 'arcade' | 'mesa';
export type SfxEvent =
  | 'tick'
  | 'flip'
  | 'powerup'
  | 'success'
  | 'buzzer'
  | 'alarm'
  | 'drumroll'
  | 'fanfare'
  | 'spin'
  | 'round'
  | 'turn'
  | 'timeup'
  | 'achievement';

export const SOUND_THEMES: { value: SoundTheme; label: string; hint: string }[] = [
  { value: 'tv', label: 'Programa de TV', hint: 'Auditório: sino, metais, buzina de palco, rufar e aplauso.' },
  { value: 'arcade', label: 'Fliperama', hint: 'Gabinete anos 80: chip de som, ficha caindo, notas que sustentam.' },
  { value: 'mesa', label: 'Tabuleiro', hint: 'Mesa de jogo: madeira, cartas, dados no copo e marimba.' }
];

export const SFX_EVENTS: { value: SfxEvent; label: string }[] = [
  { value: 'tick', label: 'Clique' },
  { value: 'powerup', label: 'Confirmar' },
  { value: 'flip', label: 'Virar' },
  { value: 'turn', label: 'Vez' },
  { value: 'round', label: 'Rodada' },
  { value: 'spin', label: 'Sorteio' },
  { value: 'success', label: 'Acerto' },
  { value: 'buzzer', label: 'Erro' },
  { value: 'alarm', label: 'Alerta' },
  { value: 'drumroll', label: 'Suspense' },
  { value: 'timeup', label: 'Tempo' },
  { value: 'achievement', label: 'Conquista' },
  { value: 'fanfare', label: 'Pódio' }
];

const isTheme = (v: unknown): v is SoundTheme => v === 'tv' || v === 'arcade' || v === 'mesa';

/** MIDI -> Hz. Do maior: C=60, D=62, E=64, F=65, G=67, A=69, B=71. */
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const FRAME = 1 / 60; // passo dos drivers de som de fliperama
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type Dest = { dry: AudioNode; wet: AudioNode };

/**
 * Nivel por som e tema. Alvo de RMS por momento: clique ~0,025, virar ~0,022, sorteio ~0,03, confirmar ~0,05,
 * vez ~0,045, acerto ~0,08, erro ~0,09, alerta ~0,085, suspense ~0,065, rodada ~0,085, tempo ~0,07,
 * conquista ~0,06, podio ~0,11 (pico sempre abaixo de 0,8). Valores tirados de measure().
 */
const TRIM: Record<SoundTheme, Record<string, number>> = {
  tv: { tick: 3.2, timer: 2.2, flip: 3.0, spin: 2.5, spinStop: 1.2, powerup: 1.14, turn: 1.08, success: 1.38, buzzer: 0.98, alarm: 2.75, drumroll: 1.44, round: 1.28, timeup: 1.22, achievement: 1.06, fanfare: 1.5 },
  arcade: { tick: 0.46, timer: 0.5, flip: 0.83, spin: 0.48, spinStop: 0.37, powerup: 0.22, turn: 0.4, success: 0.37, buzzer: 0.42, alarm: 0.27, drumroll: 0.5, round: 0.28, timeup: 0.33, achievement: 0.64, fanfare: 0.41 },
  mesa: { tick: 1.23, timer: 1.0, flip: 1.0, spin: 0.72, spinStop: 0.8, powerup: 1.0, turn: 1.24, success: 0.8, buzzer: 1.0, alarm: 1.47, drumroll: 0.92, round: 0.88, timeup: 1.9, achievement: 1.55, fanfare: 1.1 }
};
type Bus = { input: GainNode; send: GainNode };

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<SoundTheme, Bus>> = {};
  private noiseBuf: AudioBuffer | null = null;
  private lfsrLong: AudioBuffer | null = null;
  private lfsrShort: AudioBuffer | null = null;
  private pulses: Record<string, PeriodicWave> = {};
  private muted = false;
  private theme: SoundTheme = 'tv';
  private last = new Map<string, number>();
  private listeners = new Set<(t: SoundTheme) => void>();
  private tickParity = false;

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.muted = window.localStorage.getItem(SOUND_MUTE_STORAGE_KEY) === 'true';
        const t = window.localStorage.getItem(SOUND_THEME_STORAGE_KEY);
        if (isTheme(t)) this.theme = t;
      }
    } catch {
      // ignore storage errors
    }
    // o navegador so libera audio depois de um gesto: no primeiro toque/tecla o contexto ja fica pronto
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const unlock = () => {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        this.initCtx();
      };
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
    }
  }

  // ================= estado =================
  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = Boolean(muted);
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(SOUND_MUTE_STORAGE_KEY, String(this.muted));
    } catch {
      // ignore
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  getTheme(): SoundTheme {
    return this.theme;
  }

  setTheme(theme: SoundTheme): void {
    if (!isTheme(theme)) return;
    this.theme = theme;
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(SOUND_THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    this.listeners.forEach((fn) => fn(theme));
  }

  onThemeChange(fn: (t: SoundTheme) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Controle de qualidade: renderiza um evento fora de tempo real e mede pico, RMS e duracao audivel.
   * Usado para conferir a mixagem entre temas sem precisar ouvir (nao toca nada).
   */
  async measure(ev: SfxEvent, theme: SoundTheme): Promise<{ peak: number; rms: number; dur: number }> {
    const keep = { ctx: this.ctx, master: this.master, buses: this.buses, theme: this.theme, muted: this.muted, last: this.last, noise: this.noiseBuf, ll: this.lfsrLong, ls: this.lfsrShort, pulses: this.pulses };
    const sr = 44100;
    const off = new OfflineAudioContext(2, sr * 5, sr);
    try {
      this.ctx = off as unknown as AudioContext;
      this.buses = {};
      this.last = new Map();
      this.muted = false;
      this.theme = theme;
      const comp = off.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 3.5;
      this.master = off.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp);
      comp.connect(off.destination);
      this.noiseBuf = this.makeNoise();
      this.lfsrLong = this.makeLfsr(false);
      this.lfsrShort = this.makeLfsr(true);
      this.pulses = {};
      [0.125, 0.25, 0.5].forEach((d) => (this.pulses[String(d)] = this.makePulse(d)));
      if (ev === 'spin') {
        for (let s = 1; s <= 6; s++) {
          this.last = new Map();
          this.playSpinTick(s / 6);
        }
      } else this.preview(ev);
    } finally {
      Object.assign(this, { ctx: keep.ctx, master: keep.master, buses: keep.buses, theme: keep.theme, muted: keep.muted, last: keep.last, noiseBuf: keep.noise, lfsrLong: keep.ll, lfsrShort: keep.ls, pulses: keep.pulses });
    }
    const out = await off.startRendering();
    const d = out.getChannelData(0);
    let peak = 0;
    let sum = 0;
    let lastLoud = 0;
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      sum += v * v;
      if (v > 0.003) lastLoud = i;
    }
    const n = Math.max(1, lastLoud);
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(4), dur: +(lastLoud / sr).toFixed(2) };
  }

  /** Toca um evento pelo nome (menu: ouvir cada som). */
  preview(ev: SfxEvent): void {
    const map: Record<SfxEvent, () => void> = {
      tick: () => this.playTick(),
      flip: () => this.playFlip(),
      powerup: () => this.playPowerup(),
      success: () => this.playSuccess(),
      buzzer: () => this.playBuzzer(),
      alarm: () => this.playAlarm(),
      drumroll: () => this.playDrumroll(1800),
      fanfare: () => this.playFanfare(),
      spin: () => {
        // roleta desacelerando ate parar
        let t = 0;
        for (let s = 1; s <= 14; s++) {
          t += 60 + Math.pow(s / 14, 3) * 300;
          window.setTimeout(() => (s === 14 ? this.playSpinStop() : this.playSpinTick(s / 14)), t);
        }
      },
      round: () => this.playRoundStart(),
      turn: () => this.playTurn(),
      timeup: () => this.playTimeUp(),
      achievement: () => this.playAchievement()
    };
    map[ev]();
  }

  vibrate(pattern: number | number[] = [100, 50, 100]): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    } catch {
      // ignore vibration errors
    }
  }

  // ================= infraestrutura =================
  private initCtx(): boolean {
    if (this.muted || typeof window === 'undefined') return false;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return false;
        const ctx = new AC();
        this.ctx = ctx;
        // master -> compressor suave -> saida
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 12;
        comp.ratio.value = 3.5;
        comp.attack.value = 0.004;
        comp.release.value = 0.25;
        this.master = ctx.createGain();
        this.master.gain.value = 0.85;
        this.master.connect(comp);
        comp.connect(ctx.destination);
        this.noiseBuf = this.makeNoise();
        this.lfsrLong = this.makeLfsr(false);
        this.lfsrShort = this.makeLfsr(true);
        [0.125, 0.25, 0.5].forEach((d) => (this.pulses[String(d)] = this.makePulse(d)));
      }
      const isOffline = typeof OfflineAudioContext !== 'undefined' && this.ctx instanceof OfflineAudioContext;
      if (!isOffline && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  /** Barramento do tema: seco + envio para um eco do tamanho da "sala" de cada tema. */
  private bus(): Dest | null {
    const ctx = this.ctx;
    if (!ctx || !this.master) return null;
    let b = this.buses[this.theme];
    if (!b) {
      const input = ctx.createGain();
      const send = ctx.createGain();
      const verb = ctx.createConvolver();
      const wet = ctx.createGain();
      const room = this.theme === 'tv' ? { dur: 1.9, decay: 2.6, wet: 0.32 } : this.theme === 'arcade' ? { dur: 0.7, decay: 3.2, wet: 0.22 } : { dur: 0.6, decay: 3.8, wet: 0.18 };
      verb.buffer = this.makeImpulse(room.dur, room.decay);
      wet.gain.value = room.wet;
      send.connect(verb);
      verb.connect(wet);
      if (this.theme === 'arcade') {
        // alto-falante de gabinete: corta o grave fundo e o agudo de cima, realca o medio e satura de leve
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 110;
        const peak = ctx.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.value = 2200;
        peak.Q.value = 0.8;
        peak.gain.value = 3;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 7500;
        const sat = ctx.createWaveShaper();
        sat.curve = this.makeSat(1.6);
        input.connect(hp);
        hp.connect(peak);
        peak.connect(sat);
        sat.connect(lp);
        lp.connect(this.master);
        wet.connect(hp);
      } else {
        input.connect(this.master);
        wet.connect(this.master);
      }
      b = { input, send };
      this.buses[this.theme] = b;
    }
    return { dry: b.input, wet: b.send };
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Ruido do chip: registrador de deslocamento (15 bits; modo curto = 7 bits, metalico). */
  private makeLfsr(short: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let reg = 1;
    const hold = 6; // cada bit dura alguns samples (taxa de clock do ruido)
    for (let i = 0; i < d.length; i++) {
      if (i % hold === 0) {
        const bit = (reg ^ (reg >> (short ? 6 : 1))) & 1;
        reg = (reg >> 1) | (bit << 14);
      }
      d[i] = reg & 1 ? 0.8 : -0.8;
    }
    return buf;
  }

  private makePulse(duty: number): PeriodicWave {
    const ctx = this.ctx!;
    const n = 48;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private makeImpulse(dur: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private makeSat(k: number): Float32Array<ArrayBuffer> {
    const n = 1024;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    return curve;
  }

  /** Evita metralhar o mesmo som (cliques em rajada). */
  private gate(name: string, ms = 28): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.last.get(name) || 0;
    if (now - prev < ms) return false;
    this.last.set(name, now);
    return true;
  }

  /** Comeca um som: devolve o tempo zero e o destino, ou null se mudo/bloqueado. */
  private begin(name: string, gateMs?: number): { t: number; d: Dest } | null {
    if (!this.initCtx() || !this.ctx) return null;
    if (!this.gate(name, gateMs)) return null;
    const bus = this.bus();
    if (!bus) return null;
    // nivel de cada som no tema (medido com measure(): mesmo peso para o mesmo momento nos 3 temas)
    const trim = TRIM[this.theme][name] ?? 1;
    const dry = this.ctx.createGain();
    const wet = this.ctx.createGain();
    dry.gain.value = trim;
    wet.gain.value = trim;
    dry.connect(bus.dry);
    wet.connect(bus.wet);
    return { t: this.ctx.currentTime + 0.005, d: { dry, wet } };
  }

  // ================= vozes basicas =================
  /** Envelope ADSR com rampas exponenciais (nunca rampa a zero). */
  private env(p: AudioParam, t: number, peak: number, a: number, d: number, s: number, hold: number, r: number) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    const sus = Math.max(0.0001, peak * s);
    p.exponentialRampToValueAtTime(sus, t + a + d);
    if (hold > 0) p.setValueAtTime(sus, t + a + d + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + d + hold + r);
    return t + a + d + hold + r;
  }

  private connectOut(node: AudioNode, dest: Dest, send: number) {
    node.connect(dest.dry);
    if (send > 0 && this.ctx) {
      const g = this.ctx.createGain();
      g.gain.value = send;
      node.connect(g);
      g.connect(dest.wet);
    }
  }

  /** Oscilador generico. `steps`: lista de frequencias trocadas a cada `stepDur` (afinacao de chip). */
  private osc(dest: Dest, o: {
    t: number;
    f: number;
    wave?: OscillatorType | PeriodicWave;
    to?: number;
    glide?: number;
    steps?: number[];
    stepDur?: number;
    gain: number;
    a?: number;
    d?: number;
    s?: number;
    hold?: number;
    r?: number;
    lp?: number;
    lpTo?: number;
    hp?: number;
    detune?: number;
    vib?: { rate: number; depth: number; delay?: number };
    send?: number;
  }) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    if (o.wave && typeof o.wave !== 'string') osc.setPeriodicWave(o.wave);
    else osc.type = (o.wave as OscillatorType) || 'sine';
    osc.frequency.setValueAtTime(o.f, o.t);
    if (o.detune) osc.detune.setValueAtTime(o.detune, o.t);
    if (o.steps) o.steps.forEach((f, i) => osc.frequency.setValueAtTime(f, o.t + i * (o.stepDur || FRAME)));
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.t + (o.glide || 0.1));
    const g = ctx.createGain();
    const end = this.env(g.gain, o.t, o.gain, o.a ?? 0.004, o.d ?? 0.08, o.s ?? 0.5, o.hold ?? 0, o.r ?? 0.12);
    let node: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.lp, o.t);
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, end);
      node.connect(f);
      node = f;
    }
    if (o.hp) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = o.hp;
      node.connect(f);
      node = f;
    }
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = o.vib.rate;
      lg.gain.setValueAtTime(0, o.t);
      lg.gain.linearRampToValueAtTime(o.f * o.vib.depth, o.t + (o.vib.delay ?? 0.12));
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(o.t);
      lfo.stop(end + 0.05);
    }
    node.connect(g);
    this.connectOut(g, dest, o.send ?? 0);
    osc.start(o.t);
    osc.stop(end + 0.05);
  }

  /** Ruido filtrado (branco ou do chip). */
  private noise(dest: Dest, o: {
    t: number;
    dur: number;
    gain: number;
    a?: number;
    r?: number;
    type?: BiquadFilterType;
    f?: number;
    fTo?: number;
    q?: number;
    chip?: 'long' | 'short';
    rate?: number;
    send?: number;
  }) {
    const ctx = this.ctx!;
    const buf = o.chip === 'short' ? this.lfsrShort : o.chip === 'long' ? this.lfsrLong : this.noiseBuf;
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    const g = ctx.createGain();
    const a = o.a ?? 0.002;
    g.gain.setValueAtTime(0.0001, o.t);
    g.gain.linearRampToValueAtTime(o.gain, o.t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + a + o.dur);
    let node: AudioNode = src;
    if (o.f) {
      const f = ctx.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.f, o.t);
      if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, o.t + a + o.dur);
      f.Q.value = o.q ?? 1;
      src.connect(f);
      node = f;
    }
    node.connect(g);
    this.connectOut(g, dest, o.send ?? 0);
    src.start(o.t, Math.random() * 0.5);
    src.stop(o.t + a + o.dur + 0.05);
  }

  // ---------- timbres ----------
  /** Sino FM (vinheta de TV / sino de vidro). */
  private bell(dest: Dest, t: number, f: number, gain: number, dur = 1.1, ratio = 3.5, index = 2.2, send = 0.35) {
    const ctx = this.ctx!;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const mg = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g);
    this.connectOut(g, dest, send);
    car.start(t);
    mod.start(t);
    car.stop(t + dur + 0.05);
    mod.stop(t + dur + 0.05);
  }

  /** Naipe de metais (duas serras desafinadas com filtro que abre e fecha). */
  private brass(dest: Dest, t: number, notes: number[], dur: number, gain: number, send = 0.3) {
    notes.forEach((m) => {
      const f = mtof(m);
      [-7, 7].forEach((det) =>
        this.osc(dest, { t, f, wave: 'sawtooth', detune: det, gain: gain / 2, a: 0.03, d: 0.12, s: 0.75, hold: Math.max(0, dur - 0.25), r: 0.18, lp: f * 2, lpTo: f * 3.2, send })
      );
    });
  }

  /** Marimba (fundamental + parciais 4x e 10x que somem rapido). */
  private marimba(dest: Dest, t: number, m: number, gain: number, dur = 0.7, send = 0.2) {
    const f = mtof(m);
    this.osc(dest, { t, f, wave: 'sine', gain, a: 0.002, d: dur * 0.3, s: 0.3, r: dur * 0.7, send });
    this.osc(dest, { t, f: f * 4, wave: 'sine', gain: gain * 0.25, a: 0.001, d: 0.04, s: 0.2, r: 0.06, send });
    this.osc(dest, { t, f: f * 10, wave: 'sine', gain: gain * 0.08, a: 0.001, d: 0.015, s: 0.1, r: 0.02 });
  }

  /** Batida de madeira: ruido curtinho por dois ressonadores + o "corpo" senoidal. */
  private wood(dest: Dest, t: number, f: number, gain: number, send = 0.12) {
    this.noise(dest, { t, dur: 0.035, gain: gain * 0.9, f, q: 14, send });
    this.noise(dest, { t, dur: 0.02, gain: gain * 0.4, f: f * 2.76, q: 18 });
    this.osc(dest, { t, f, to: f * 0.92, glide: 0.06, wave: 'sine', gain: gain * 0.6, a: 0.001, d: 0.03, s: 0.2, r: 0.05, send });
  }

  /** Nota de chip: forma de onda de pulso, volume em degraus por quadro (como o registrador de volume do PSG). */
  private chip(dest: Dest, t: number, steps: number[], o: { duty?: number; tri?: boolean; gain: number; frames: number; vols?: number[]; vib?: number; send?: number }) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    if (o.tri) osc.type = 'triangle';
    else osc.setPeriodicWave(this.pulses[String(o.duty ?? 0.5)]);
    steps.forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * FRAME));
    const g = ctx.createGain();
    const vols = o.vols || Array.from({ length: o.frames }, (_, i) => Math.max(0, 1 - i / o.frames));
    g.gain.setValueAtTime(0, t);
    vols.forEach((v, i) => g.gain.setValueAtTime(v * o.gain, t + i * FRAME));
    const end = t + vols.length * FRAME;
    g.gain.setValueAtTime(0, end);
    if (o.vib) {
      // vibrato em passos (o driver mexia no registrador de periodo)
      const base = steps[steps.length - 1];
      for (let i = steps.length; i < vols.length; i++) {
        osc.frequency.setValueAtTime(base * (1 + Math.sin(i * 0.9) * o.vib), t + i * FRAME);
      }
    }
    osc.connect(g);
    this.connectOut(g, dest, o.send ?? 0.15);
    osc.start(t);
    osc.stop(end + 0.02);
  }

  /** Volume que sustenta e cai em degraus: `sus` quadros cheio, depois `rel` quadros caindo. */
  private chipVols(atk: number, sus: number, rel: number, level = 1): number[] {
    const v: number[] = [];
    for (let i = 0; i < atk; i++) v.push(((i + 1) / atk) * level);
    for (let i = 0; i < sus; i++) v.push(level * (i < 2 ? 1 : 0.85));
    for (let i = 0; i < rel; i++) v.push(level * 0.85 * Math.pow(1 - (i + 1) / rel, 1.4));
    return v;
  }

  /** Aplauso: muitas palmas curtinhas em bandas aleatorias, crescendo e sumindo. */
  private applause(dest: Dest, t: number, dur: number, gain: number, density = 70) {
    const n = Math.floor(dur * density);
    for (let i = 0; i < n; i++) {
      const at = t + Math.pow(Math.random(), 0.8) * dur;
      const k = (at - t) / dur;
      const swell = Math.min(1, k * 4) * (1 - Math.max(0, (k - 0.6) / 0.4));
      this.noise(dest, { t: at, dur: rnd(0.012, 0.03), gain: gain * swell * rnd(0.4, 1), f: rnd(900, 2600), q: rnd(1.5, 4), send: 0.5 });
    }
  }

  // ================= eventos =================
  /** Clique de interface; com segundos, e o bipe da contagem regressiva (vibra nos ultimos 5 s). */
  playTick(secondsRemaining?: number) {
    const counting = typeof secondsRemaining === 'number';
    if (counting && secondsRemaining! >= 1 && secondsRemaining! <= 5) this.vibrate(secondsRemaining! <= 2 ? [100, 40, 100] : 80);
    try {
      if (counting) return this.timerTick(secondsRemaining!);
      const s = this.begin('tick');
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') this.chip(d, t, [mtof(84), mtof(91)], { duty: 0.25, gain: 0.16, frames: 3, vols: [1, 0.7, 0.35], send: 0 });
      else if (this.theme === 'mesa') this.wood(d, t, rnd(1700, 1900), 0.32);
      else {
        // clique de mesa de corte de TV: transiente seco + "tic" agudo curto
        this.noise(d, { t, dur: 0.018, gain: 0.22, f: 3200, q: 3 });
        this.osc(d, { t, f: 2093, wave: 'sine', gain: 0.07, a: 0.001, d: 0.02, s: 0.2, r: 0.03 });
      }
    } catch {
      // audio bloqueado ate o primeiro gesto
    }
  }

  /** Relogio da contagem: tic-tac, e nos ultimos 3 s um bipe que sobe. */
  private timerTick(sec: number) {
    const s = this.begin('timer', 120);
    if (!s) return;
    const { t, d } = s;
    const urgent = sec <= 3;
    this.tickParity = !this.tickParity;
    if (this.theme === 'arcade') {
      const m = urgent ? 81 + (3 - sec) * 2 : 72;
      this.chip(d, t, [mtof(m)], { duty: urgent ? 0.5 : 0.125, gain: urgent ? 0.2 : 0.12, frames: urgent ? 8 : 3, send: 0.05 });
      return;
    }
    if (this.theme === 'mesa') {
      this.wood(d, t, this.tickParity ? 2300 : 1750, urgent ? 0.5 : 0.3);
      if (urgent) this.marimba(d, t, 84 + (3 - sec) * 2, 0.18, 0.3, 0.1);
      return;
    }
    this.noise(d, { t, dur: 0.02, gain: urgent ? 0.3 : 0.2, f: this.tickParity ? 2800 : 2100, q: 6 });
    if (urgent) this.osc(d, { t, f: mtof(83 + (3 - sec) * 2), wave: 'sine', gain: 0.16, a: 0.003, d: 0.06, s: 0.4, r: 0.12, send: 0.2 });
  }

  /** Confirmar, escolher, entrar. TV: dois toques de sino. Fliperama: ficha caindo. Tabuleiro: peca na mesa. */
  playPowerup() {
    try {
      const s = this.begin('powerup', 60);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        // "ficha": nota curta e depois a quinta acima sustentando
        this.chip(d, t, [mtof(83)], { duty: 0.5, gain: 0.17, frames: 4, vols: [1, 1, 1, 1] });
        this.chip(d, t + 4 * FRAME, [mtof(88)], { duty: 0.5, gain: 0.17, frames: 16, vols: this.chipVols(1, 5, 12), vib: 0.006 });
      } else if (this.theme === 'mesa') {
        this.wood(d, t, 420, 0.45, 0.15);
        this.wood(d, t + 0.006, 950, 0.2);
        this.marimba(d, t + 0.05, 79, 0.16, 0.4);
      } else {
        this.bell(d, t, mtof(79), 0.14, 0.7);
        this.bell(d, t + 0.085, mtof(84), 0.16, 0.9);
      }
    } catch {
      // ignore
    }
  }

  /** Acerto / ponto: o motivo Sol-Do-Mi subindo e uma nota que sustenta. */
  playSuccess() {
    try {
      const s = this.begin('success', 80);
      if (!s) return;
      const { t, d } = s;
      const motif = [79, 84, 88];
      if (this.theme === 'arcade') {
        motif.forEach((m, i) => this.chip(d, t + i * 4 * FRAME, [mtof(m)], { duty: 0.25, gain: 0.15, frames: 4, vols: [1, 1, 0.9, 0.8] }));
        this.chip(d, t + 12 * FRAME, [mtof(91)], { duty: 0.25, gain: 0.15, frames: 30, vols: this.chipVols(1, 12, 17), vib: 0.008 });
        this.chip(d, t + 12 * FRAME, [mtof(55)], { tri: true, gain: 0.22, frames: 18, vols: this.chipVols(1, 6, 11) });
      } else if (this.theme === 'mesa') {
        motif.forEach((m, i) => this.marimba(d, t + i * 0.075, m, 0.26, 0.6));
        this.bell(d, t + 0.23, mtof(96), 0.06, 1.2, 2.0, 1.2, 0.3);
      } else {
        motif.forEach((m, i) => this.bell(d, t + i * 0.07, mtof(m), 0.15, 1.0));
        this.brass(d, t + 0.2, [60, 64, 67, 72], 0.35, 0.05, 0.3);
      }
    } catch {
      // ignore
    }
  }

  /** Erro / estouro / falta. */
  playBuzzer() {
    this.vibrate([100, 50, 100]);
    try {
      const s = this.begin('buzzer', 120);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        // queda em degraus + ruido grave: o "perdeu" de fliperama
        const steps = Array.from({ length: 18 }, (_, i) => mtof(67 - i * 1.2));
        this.chip(d, t, steps, { duty: 0.5, gain: 0.15, frames: 26, vols: this.chipVols(1, 16, 9) });
        this.noise(d, { t, dur: 0.22, gain: 0.12, chip: 'long', rate: 0.25, f: 900, type: 'lowpass', q: 0.7 });
      } else if (this.theme === 'mesa') {
        this.wood(d, t, 150, 0.6, 0.2);
        this.marimba(d, t + 0.04, 55, 0.22, 0.5);
        this.marimba(d, t + 0.14, 54, 0.2, 0.6);
      } else {
        // buzina de palco: ondas desafinadas, cheias e abafadas, com cauda
        [138, 146].forEach((f) => this.osc(d, { t, f, wave: 'sawtooth', gain: 0.1, a: 0.012, d: 0.08, s: 0.85, hold: 0.36, r: 0.12, lp: 1300, send: 0.12 }));
        this.osc(d, { t, f: 69, wave: 'square', gain: 0.07, a: 0.012, d: 0.08, s: 0.85, hold: 0.36, r: 0.12, lp: 500 });
      }
    } catch {
      // ignore
    }
  }

  /** Suspense antes de revelar. */
  playDrumroll(durationMs = 1500) {
    try {
      const s = this.begin('drumroll', 200);
      if (!s) return;
      const { t, d } = s;
      const dur = Math.max(0.4, durationMs / 1000);
      if (this.theme === 'arcade') {
        // baixo do triangulo pulsando e "chimbal" de ruido acelerando
        let at = 0;
        let i = 0;
        while (at < dur) {
          const k = at / dur;
          this.noise(d, { t: t + at, dur: 0.03, gain: 0.05 + k * 0.1, chip: 'short', rate: 0.6, f: 6000, type: 'highpass' });
          if (i % 4 === 0) this.chip(d, t + at, [mtof(43 + Math.floor(k * 5))], { tri: true, gain: 0.22, frames: 6 });
          at += 0.11 - k * 0.07;
          i++;
        }
        return;
      }
      if (this.theme === 'mesa') {
        // dados chacoalhando no copo, cada vez mais rapido
        let at = 0;
        while (at < dur) {
          const k = at / dur;
          this.wood(d, t + at, rnd(2200, 3600), 0.12 + k * 0.18, 0.05);
          at += rnd(0.025, 0.06) * (1 - k * 0.5);
        }
        return;
      }
      // rufar de caixa: toques rapidos crescendo + tambor grave
      let at = 0;
      while (at < dur) {
        const k = at / dur;
        this.noise(d, { t: t + at, dur: 0.05, gain: 0.06 + k * 0.16, f: 2600, q: 0.9, send: 0.15 });
        at += 0.045;
      }
      this.osc(d, { t, f: 90, wave: 'sine', gain: 0.08, a: dur * 0.8, d: 0.1, s: 0.5, r: 0.2 });
    } catch {
      // ignore
    }
  }

  /** Virar carta / trocar de tela / revelar casa. */
  playFlip() {
    try {
      const s = this.begin('flip', 50);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        this.noise(d, { t, dur: 0.09, gain: 0.12, chip: 'short', rate: 1.6, f: 1500, fTo: 5000, type: 'bandpass', q: 1.2 });
        this.chip(d, t, [mtof(72), mtof(79), mtof(84)], { duty: 0.125, gain: 0.1, frames: 5 });
      } else if (this.theme === 'mesa') {
        // carta deslizando e batendo
        this.noise(d, { t, dur: 0.08, gain: 0.16, f: 3500, type: 'highpass', q: 0.6 });
        this.wood(d, t + 0.07, 3100, 0.18, 0.05);
      } else {
        // whoosh de vinheta
        this.noise(d, { t, dur: 0.2, a: 0.06, gain: 0.16, f: 500, fTo: 4200, q: 1.4, send: 0.2 });
      }
    } catch {
      // ignore
    }
  }

  /** Alerta dramatico (DUVIDO!). */
  playAlarm() {
    this.vibrate([100, 50, 100]);
    try {
      const s = this.begin('alarm', 300);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        // sirene de duas notas, 4 vezes
        for (let i = 0; i < 8; i++) this.chip(d, t + i * 6 * FRAME, [mtof(i % 2 ? 76 : 83)], { duty: 0.5, gain: 0.15, frames: 6, vols: [1, 1, 1, 1, 0.9, 0.8] });
      } else if (this.theme === 'mesa') {
        // sineta de mao
        for (let i = 0; i < 5; i++) this.bell(d, t + i * 0.11, mtof(i % 2 ? 86 : 88), 0.12, 0.5, 2.0, 3.0, 0.2);
      } else {
        // metais em alerta + pancada
        [0, 0.2, 0.4].forEach((o, i) => this.brass(d, t + o, i < 2 ? [64, 70] : [62, 68], 0.16, 0.1, 0.35));
        this.noise(d, { t, dur: 0.6, gain: 0.12, f: 120, type: 'lowpass', send: 0.4 });
      }
    } catch {
      // ignore
    }
  }

  /** Acorde sintetizado (compatibilidade). */
  playChord(frequencies: number[], startOffsetSec: number, durationSec: number, waveType: OscillatorType = 'sawtooth', peakGain = 0.12) {
    try {
      if (!this.initCtx() || !this.ctx) return;
      const d = this.bus();
      if (!d) return;
      const t = this.ctx.currentTime + startOffsetSec;
      frequencies.forEach((f) => this.osc(d, { t, f, wave: waveType, gain: Math.min(peakGain, 0.12), a: 0.025, d: 0.1, s: 0.7, hold: Math.max(0, durationSec - 0.2), r: 0.1, lp: f * 4 }));
    } catch {
      // ignore
    }
  }

  /** Pecas de roleta passando (letra da Dedanha, sorteio de jogo). progress 0..1 = quanto ja desacelerou. */
  playSpinTick(progress = 0) {
    try {
      const s = this.begin('spin', 35);
      if (!s) return;
      const { t, d } = s;
      const pent = [72, 74, 76, 79, 81, 84];
      if (this.theme === 'arcade') {
        this.chip(d, t, [mtof(pent[Math.floor(Math.random() * pent.length)] + (progress > 0.7 ? 0 : 12))], { duty: 0.125, gain: 0.12, frames: 3 });
      } else if (this.theme === 'mesa') {
        this.wood(d, t, 2600 - progress * 700, 0.28, 0.06);
      } else {
        // catraca da roda de premios
        this.noise(d, { t, dur: 0.025, gain: 0.22, f: 3600 - progress * 1200, q: 5 });
        this.osc(d, { t, f: 1500 - progress * 400, wave: 'triangle', gain: 0.05, a: 0.001, d: 0.02, s: 0.2, r: 0.03 });
      }
    } catch {
      // ignore
    }
  }

  /** A roleta parou: resultado. */
  playSpinStop() {
    try {
      const s = this.begin('spinStop', 200);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        [72, 76, 79, 84].forEach((m, i) => this.chip(d, t + i * 3 * FRAME, [mtof(m)], { duty: 0.25, gain: 0.15, frames: 3, vols: [1, 1, 0.9] }));
        this.chip(d, t + 12 * FRAME, [mtof(88)], { duty: 0.25, gain: 0.15, frames: 26, vols: this.chipVols(1, 10, 15), vib: 0.008 });
      } else if (this.theme === 'mesa') {
        this.wood(d, t, 500, 0.4, 0.15);
        this.marimba(d, t + 0.03, 84, 0.25, 0.6);
        this.marimba(d, t + 0.03, 88, 0.18, 0.6);
      } else {
        this.noise(d, { t, dur: 0.03, gain: 0.25, f: 2400, q: 4 });
        this.bell(d, t + 0.02, mtof(84), 0.18, 1.3);
        this.bell(d, t + 0.02, mtof(91), 0.08, 1.3);
      }
    } catch {
      // ignore
    }
  }

  /** Vinheta de rodada / fase. */
  playRoundStart() {
    try {
      const s = this.begin('round', 600);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        // "ready": motivo + nota longa, com prato de ruido
        [67, 72, 76].forEach((m, i) => this.chip(d, t + i * 6 * FRAME, [mtof(m)], { duty: 0.5, gain: 0.14, frames: 6, vols: [1, 1, 1, 0.9, 0.8, 0.6] }));
        this.chip(d, t + 18 * FRAME, [mtof(79)], { duty: 0.5, gain: 0.14, frames: 36, vols: this.chipVols(1, 16, 19), vib: 0.01 });
        this.chip(d, t + 18 * FRAME, [mtof(48)], { tri: true, gain: 0.24, frames: 30, vols: this.chipVols(1, 14, 15) });
        this.noise(d, { t: t + 18 * FRAME, dur: 0.5, gain: 0.08, chip: 'long', rate: 1, f: 5000, type: 'highpass' });
      } else if (this.theme === 'mesa') {
        // dados rolando na mesa e parando, depois o motivo na marimba
        let at = 0;
        for (let i = 0; i < 9; i++) {
          this.wood(d, t + at, rnd(1500, 3200), 0.32 - i * 0.025, 0.08);
          at += 0.04 + i * 0.012;
        }
        [67, 72, 76].forEach((m, i) => this.marimba(d, t + at + 0.05 + i * 0.09, m, 0.24, 0.8));
      } else {
        // pancada de metais + prato subindo (vinheta de programa)
        this.noise(d, { t, dur: 0.5, a: 0.45, gain: 0.08, f: 6000, type: 'highpass', send: 0.3 });
        this.brass(d, t + 0.45, [55, 60, 64, 67], 0.55, 0.07, 0.4);
        this.osc(d, { t: t + 0.45, f: 80, to: 50, glide: 0.4, wave: 'sine', gain: 0.25, a: 0.003, d: 0.2, s: 0.3, r: 0.3 });
        this.bell(d, t + 0.45, mtof(91), 0.06, 1.4);
      }
    } catch {
      // ignore
    }
  }

  /** Passou a vez para outra pessoa. */
  playTurn() {
    try {
      const s = this.begin('turn', 300);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        this.chip(d, t, [mtof(79)], { duty: 0.25, gain: 0.13, frames: 5, vols: [1, 1, 1, 0.8, 0.5] });
        this.chip(d, t + 6 * FRAME, [mtof(84)], { duty: 0.25, gain: 0.13, frames: 14, vols: this.chipVols(1, 5, 8) });
      } else if (this.theme === 'mesa') {
        this.wood(d, t, 900, 0.3);
        this.wood(d, t + 0.13, 1150, 0.3);
      } else {
        this.bell(d, t, mtof(72), 0.12, 0.9);
        this.bell(d, t + 0.12, mtof(79), 0.13, 1.1);
      }
    } catch {
      // ignore
    }
  }

  /** Fim do tempo. */
  playTimeUp() {
    this.vibrate([200]);
    try {
      const s = this.begin('timeup', 500);
      if (!s) return;
      const { t, d } = s;
      if (this.theme === 'arcade') {
        const steps = Array.from({ length: 24 }, (_, i) => mtof(84 - i));
        this.chip(d, t, steps, { duty: 0.5, gain: 0.14, frames: 34, vols: this.chipVols(1, 22, 11) });
      } else if (this.theme === 'mesa') {
        this.bell(d, t, mtof(72), 0.2, 1.8, 2.0, 2.5, 0.3);
        this.wood(d, t, 300, 0.4);
      } else {
        // gongo + metais descendo
        this.bell(d, t, mtof(48), 0.22, 2.2, 1.41, 4, 0.5);
        this.brass(d, t + 0.05, [67, 71], 0.18, 0.07);
        this.brass(d, t + 0.25, [62, 65], 0.45, 0.07);
      }
    } catch {
      // ignore
    }
  }

  /** Conquista / destaque individual. */
  playAchievement() {
    try {
      const s = this.begin('achievement', 400);
      if (!s) return;
      const { t, d } = s;
      const notes = [72, 76, 79, 84, 88];
      if (this.theme === 'arcade') {
        notes.forEach((m, i) => this.chip(d, t + i * 3 * FRAME, [mtof(m)], { duty: 0.125, gain: 0.13, frames: 3, vols: [1, 1, 0.8] }));
        this.chip(d, t + 15 * FRAME, [mtof(91)], { duty: 0.125, gain: 0.13, frames: 30, vols: this.chipVols(1, 12, 17), vib: 0.01 });
      } else if (this.theme === 'mesa') {
        notes.forEach((m, i) => this.bell(d, t + i * 0.06, mtof(m + 12), 0.07, 0.9, 2.0, 1.2, 0.3));
      } else {
        notes.forEach((m, i) => this.bell(d, t + i * 0.055, mtof(m), 0.1, 1.2));
        this.noise(d, { t: t + 0.25, dur: 0.8, gain: 0.04, f: 8000, type: 'highpass', send: 0.6 });
      }
    } catch {
      // ignore
    }
  }

  /** Podio: fanfarra com o motivo da marca, no timbre do tema. */
  playFanfare() {
    try {
      const s = this.begin('fanfare', 1500);
      if (!s) return;
      const { t, d } = s;
      // frase: Sol Sol Sol | Do -- Mi -- | Sol ----- (acordes: C, F, G, C)
      const lead: Array<[number, number, number]> = [
        [67, 0, 0.12],
        [67, 0.15, 0.12],
        [67, 0.3, 0.12],
        [72, 0.45, 0.28],
        [76, 0.78, 0.28],
        [79, 1.1, 1.3]
      ];
      if (this.theme === 'arcade') {
        lead.forEach(([m, at, du]) => {
          const frames = Math.round(du / FRAME);
          this.chip(d, t + at, [mtof(m + 12)], { duty: 0.25, gain: 0.13, frames, vols: this.chipVols(1, Math.max(2, frames - 8), Math.min(8, frames)), vib: du > 1 ? 0.012 : 0 });
          this.chip(d, t + at, [mtof(m + 7)], { duty: 0.5, gain: 0.07, frames, vols: this.chipVols(1, Math.max(2, frames - 8), Math.min(8, frames)) });
        });
        [
          [48, 0],
          [53, 0.45],
          [55, 0.78],
          [48, 1.1]
        ].forEach(([m, at]) => this.chip(d, t + at, [mtof(m)], { tri: true, gain: 0.25, frames: 18, vols: this.chipVols(1, 10, 8) }));
        [0, 0.45, 0.78, 1.1].forEach((at) => this.noise(d, { t: t + at, dur: 0.18, gain: 0.1, chip: 'long', rate: 0.5, f: 3000, type: 'highpass' }));
        return;
      }
      if (this.theme === 'mesa') {
        lead.forEach(([m, at, du]) => this.marimba(d, t + at, m + 12, 0.24, Math.max(0.5, du)));
        [
          [48, 0],
          [53, 0.45],
          [55, 0.78],
          [48, 1.1]
        ].forEach(([m, at]) => this.marimba(d, t + at, m, 0.2, 0.9));
        [84, 88, 91, 96].forEach((m, i) => this.bell(d, t + 1.15 + i * 0.08, mtof(m), 0.06, 1.4, 2.0, 1.2, 0.3));
        this.applause(d, t + 1.1, 2.2, 0.08, 45);
        return;
      }
      lead.forEach(([m, at, du]) => this.brass(d, t + at, [m, m - 5], du, 0.075, 0.35));
      this.brass(d, t + 1.1, [48, 55, 60, 64], 1.3, 0.05, 0.4);
      [0, 0.45, 1.1].forEach((at) => this.osc(d, { t: t + at, f: 98, to: 60, glide: 0.35, wave: 'sine', gain: 0.24, a: 0.003, d: 0.15, s: 0.3, r: 0.35 }));
      this.noise(d, { t: t + 1.1, dur: 1.4, gain: 0.07, f: 7000, type: 'highpass', send: 0.5 });
      this.applause(d, t + 1.2, 2.6, 0.1, 75);
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundSynthesizer();
