/**
 * Motor de som do Roda de Bobo.
 *
 * Tres temas (Programa de TV, Fliperama, Tabuleiro), cada um com arquivos reais em public/sfx/<tema>/<evento>.mp3
 * (CC0, creditos em public/sfx/CREDITS.md). O que nao tem arquivo (buzina, fanfarra, alguns rufares) e sintetizado
 * com um timbre proprio de cada tema. A API publica continua a mesma: sounds.playTick(), sounds.playSuccess()...
 */

const SOUND_MUTE_STORAGE_KEY = 'RODA_DE_BOBO_MUTED';
const SOUND_THEME_STORAGE_KEY = 'RODA_DE_BOBO_SOUND_THEME';

export type SoundTheme = 'tv' | 'arcade' | 'mesa';
export type SfxEvent = 'tick' | 'flip' | 'powerup' | 'success' | 'buzzer' | 'alarm' | 'drumroll' | 'fanfare';

export const SOUND_THEMES: { value: SoundTheme; label: string; hint: string }[] = [
  { value: 'tv', label: 'Programa de TV', hint: 'Vinhetas limpas de auditório: clique macio, sino de acerto, buzina curta.' },
  { value: 'arcade', label: 'Fliperama', hint: 'Chiptune moderno, mixado e sem estridência.' },
  { value: 'mesa', label: 'Tabuleiro', hint: 'Sons de mesa: cliques secos, peças caindo, sinos de vidro.' }
];

export const SFX_EVENTS: { value: SfxEvent; label: string }[] = [
  { value: 'tick', label: 'Clique' },
  { value: 'flip', label: 'Virar' },
  { value: 'powerup', label: 'Confirmar' },
  { value: 'success', label: 'Acerto' },
  { value: 'buzzer', label: 'Erro' },
  { value: 'alarm', label: 'Alerta' },
  { value: 'drumroll', label: 'Suspense' },
  { value: 'fanfare', label: 'Pódio' }
];

/** Eventos que tem arquivo em cada tema; o resto e sintetizado. */
const FILES: Record<SoundTheme, SfxEvent[]> = {
  tv: ['tick', 'flip', 'powerup', 'success', 'alarm', 'drumroll', 'fanfare'],
  arcade: ['tick', 'flip', 'powerup', 'success', 'alarm', 'drumroll', 'fanfare'],
  mesa: ['tick', 'flip', 'powerup', 'success', 'alarm', 'buzzer', 'fanfare']
};

/** Ganho de cada evento (os arquivos ja vem nivelados): cliques baixos, momentos grandes mais altos. */
const GAIN: Record<SfxEvent, number> = {
  tick: 0.42,
  flip: 0.5,
  powerup: 0.55,
  success: 0.7,
  buzzer: 0.7,
  alarm: 0.75,
  drumroll: 0.6,
  fanfare: 0.8
};

const isTheme = (v: unknown): v is SoundTheme => v === 'tv' || v === 'arcade' || v === 'mesa';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private theme: SoundTheme = 'tv';
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<SoundTheme, Promise<void>>();
  private listeners = new Set<(t: SoundTheme) => void>();

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
    // o navegador so libera audio depois de um gesto: no primeiro toque/tecla ja abre o contexto e carrega o tema
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const unlock = () => {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        if (this.initCtx()) void this.load(this.theme);
      };
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
    }
  }

  // ---------- estado ----------
  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = Boolean(muted);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SOUND_MUTE_STORAGE_KEY, String(this.muted));
      }
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
    if (this.ctx) void this.load(theme);
    this.listeners.forEach((fn) => fn(theme));
  }

  onThemeChange(fn: (t: SoundTheme) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Toca um evento pelo nome (usado no menu para ouvir cada som). */
  preview(ev: SfxEvent): void {
    const map: Record<SfxEvent, () => void> = {
      tick: () => this.playTick(),
      flip: () => this.playFlip(),
      powerup: () => this.playPowerup(),
      success: () => this.playSuccess(),
      buzzer: () => this.playBuzzer(),
      alarm: () => this.playAlarm(),
      drumroll: () => this.playDrumroll(1500),
      fanfare: () => this.playFanfare()
    };
    map[ev]();
  }

  vibrate(pattern: number | number[] = [100, 50, 100]): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore vibration errors
    }
  }

  // ---------- infraestrutura ----------
  private initCtx(): boolean {
    if (this.muted) return false;
    if (typeof window === 'undefined') return false;
    try {
      if (!this.ctx) {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return false;
        this.ctx = new AudioContextClass();
        // compressor leve no fim: varios sons juntos nao estouram
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 10;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.2;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        void this.load(this.theme);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return true;
    } catch {
      return false;
    }
  }

  private load(theme: SoundTheme): Promise<void> {
    const existing = this.loading.get(theme);
    if (existing) return existing;
    const ctx = this.ctx;
    if (!ctx || typeof fetch !== 'function') return Promise.resolve();
    const p = Promise.all(
      FILES[theme].map(async (ev) => {
        try {
          const res = await fetch(`/sfx/${theme}/${ev}.mp3`);
          if (!res.ok) return;
          const data = await res.arrayBuffer();
          const buf = await new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
          this.buffers.set(theme + '/' + ev, buf);
        } catch {
          // sem o arquivo, o evento cai na sintese
        }
      })
    ).then(() => undefined);
    this.loading.set(theme, p);
    return p;
  }

  private out(): AudioNode | null {
    return this.master || this.ctx?.destination || null;
  }

  /** Toca o arquivo do evento no tema atual. Devolve false se ainda nao carregou (quem chamou sintetiza). */
  private playFile(ev: SfxEvent, opts: { rate?: number; gain?: number; delay?: number; maxDur?: number } = {}): boolean {
    if (!this.ctx) return false;
    const buf = this.buffers.get(this.theme + '/' + ev);
    const out = this.out();
    if (!buf || !out) return false;
    const t = this.ctx.currentTime + (opts.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate || 1;
    const g = this.ctx.createGain();
    const vol = (opts.gain ?? 1) * GAIN[ev];
    g.gain.setValueAtTime(vol, t);
    src.connect(g);
    g.connect(out);
    src.start(t);
    if (opts.maxDur && opts.maxDur < buf.duration / (opts.rate || 1)) {
      const end = t + opts.maxDur;
      g.gain.setValueAtTime(vol, Math.max(t, end - 0.15));
      g.gain.linearRampToValueAtTime(0.0001, end);
      src.stop(end + 0.02);
    }
    return true;
  }

  /** Uma nota sintetizada com envelope e filtro, ligada ao master. */
  private tone(o: {
    freq: number;
    to?: number;
    type?: OscillatorType;
    start?: number;
    dur: number;
    gain: number;
    attack?: number;
    lowpass?: number;
    detune?: number;
  }) {
    if (!this.ctx) return;
    const out = this.out();
    if (!out) return;
    const t = this.ctx.currentTime + (o.start || 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = this.ctx.createGain();
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node: AudioNode = osc;
    if (o.lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(o.lowpass, t);
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + o.dur + 0.03);
  }

  // ---------- eventos ----------
  /** Clique de interface e bipe da contagem regressiva (vibra nos ultimos 5 s). */
  playTick(secondsRemaining?: number) {
    const counting = typeof secondsRemaining === 'number';
    if (counting && secondsRemaining! >= 1 && secondsRemaining! <= 5) {
      this.vibrate(secondsRemaining! <= 2 ? [100, 40, 100] : 80);
    }
    try {
      if (!this.initCtx()) return;
      // nos ultimos 3 segundos o bipe sobe um pouco, para dar urgencia
      const rate = counting && secondsRemaining! <= 3 ? 1.26 : 1;
      if (this.playFile('tick', { rate })) return;
      if (this.theme === 'arcade') this.tone({ freq: 1320 * rate, type: 'square', dur: 0.05, gain: 0.05, lowpass: 3000 });
      else if (this.theme === 'mesa') this.tone({ freq: 760 * rate, to: 520, type: 'triangle', dur: 0.05, gain: 0.16 });
      else this.tone({ freq: 1180 * rate, type: 'sine', dur: 0.06, gain: 0.12 });
    } catch {
      // audio bloqueado ate o primeiro gesto
    }
  }

  /** Erro, falta, estouro. */
  playBuzzer() {
    this.vibrate([100, 50, 100]);
    try {
      if (!this.initCtx()) return;
      if (this.theme === 'mesa') {
        // baque surdo na mesa + nota grave curta
        this.playFile('buzzer');
        this.tone({ freq: 140, to: 90, type: 'sine', dur: 0.32, gain: 0.22 });
        return;
      }
      if (this.theme === 'arcade') {
        // "uó-uó" de fliperama, filtrado para nao ferir
        this.tone({ freq: 330, to: 250, type: 'square', dur: 0.16, gain: 0.08, lowpass: 1800 });
        this.tone({ freq: 220, to: 130, type: 'square', start: 0.17, dur: 0.3, gain: 0.08, lowpass: 1500 });
        return;
      }
      // buzina de programa de auditorio: duas ondas desafinadas, metalica mas abafada
      this.tone({ freq: 146, type: 'sawtooth', dur: 0.48, gain: 0.12, attack: 0.01, lowpass: 1100 });
      this.tone({ freq: 152, type: 'square', dur: 0.48, gain: 0.07, attack: 0.01, lowpass: 900 });
      this.tone({ freq: 73, type: 'sine', dur: 0.45, gain: 0.12, attack: 0.01 });
    } catch {
      // ignore
    }
  }

  /** Acerto, ponto, revelacao boa. */
  playSuccess() {
    try {
      if (!this.initCtx()) return;
      if (this.playFile('success')) return;
      const notes = [659.25, 987.77, 1318.51];
      notes.forEach((f, i) =>
        this.tone({ freq: f, type: this.theme === 'arcade' ? 'square' : 'triangle', start: i * 0.07, dur: 0.3, gain: this.theme === 'arcade' ? 0.05 : 0.12, lowpass: 4000 })
      );
    } catch {
      // ignore
    }
  }

  /** Suspense antes de revelar. */
  playDrumroll(durationMs = 1500) {
    try {
      if (!this.initCtx()) return;
      const dur = Math.max(0.3, durationMs / 1000);
      if (this.playFile('drumroll', { maxDur: dur })) return;
      // rufar de tambor sintetizado (Tabuleiro sempre; outros enquanto o arquivo carrega)
      const steps = Math.floor(dur / 0.06);
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        this.tone({ freq: 110 + k * 60, to: 70, type: 'triangle', start: i * 0.06, dur: 0.07, gain: 0.06 + k * 0.14 });
      }
    } catch {
      // ignore
    }
  }

  /** Virar carta, trocar de tela, revelar casa. */
  playFlip() {
    try {
      if (!this.initCtx()) return;
      if (this.playFile('flip')) return;
      this.tone({ freq: 520, to: 180, type: 'sine', dur: 0.09, gain: 0.16 });
    } catch {
      // ignore
    }
  }

  /** Confirmar, escolher, item especial. */
  playPowerup() {
    try {
      if (!this.initCtx()) return;
      if (this.playFile('powerup')) return;
      [523.25, 783.99].forEach((f, i) => this.tone({ freq: f, type: 'triangle', start: i * 0.06, dur: 0.16, gain: 0.12 }));
    } catch {
      // ignore
    }
  }

  /** Alerta dramatico (DUVIDO!). */
  playAlarm() {
    this.vibrate([100, 50, 100]);
    try {
      if (!this.initCtx()) return;
      if (this.playFile('alarm')) return;
      for (let i = 0; i < 3; i++) {
        this.tone({ freq: 800, to: 450, type: 'sawtooth', start: i * 0.18, dur: 0.14, gain: 0.12, lowpass: 2200 });
      }
    } catch {
      // ignore
    }
  }

  /** Acorde sintetizado (mantido por compatibilidade). */
  playChord(frequencies: number[], startOffsetSec: number, durationSec: number, waveType: OscillatorType = 'sawtooth', peakGain = 0.12) {
    try {
      if (!this.initCtx()) return;
      frequencies.forEach((f) =>
        this.tone({ freq: f, type: waveType, start: startOffsetSec, dur: durationSec, gain: peakGain, attack: 0.025, lowpass: f * 4 })
      );
    } catch {
      // ignore
    }
  }

  /** Fanfarra do podio: melodia com o timbre do tema e um acento de arquivo no acorde final. */
  playFanfare() {
    try {
      if (!this.initCtx()) return;
      const seq: Array<{ f: number[]; s: number; d: number }> = [
        { f: [392.0, 523.25, 659.25], s: 0.0, d: 0.13 },
        { f: [392.0, 523.25, 659.25], s: 0.16, d: 0.13 },
        { f: [392.0, 523.25, 659.25], s: 0.32, d: 0.13 },
        { f: [523.25, 698.46, 880.0], s: 0.48, d: 0.28 },
        { f: [493.88, 587.33, 783.99], s: 0.8, d: 0.26 },
        { f: [261.63, 523.25, 659.25, 783.99, 1046.5], s: 1.1, d: 1.3 }
      ];
      const voice =
        this.theme === 'arcade'
          ? { type: 'square' as OscillatorType, gain: 0.035, lowpass: 2600, attack: 0.005 }
          : this.theme === 'mesa'
            ? { type: 'sine' as OscillatorType, gain: 0.09, lowpass: 0, attack: 0.003 }
            : { type: 'sawtooth' as OscillatorType, gain: 0.06, lowpass: 1800, attack: 0.03 };
      seq.forEach((st) =>
        st.f.forEach((f) => {
          this.tone({ freq: f, type: voice.type, start: st.s, dur: st.d, gain: voice.gain, attack: voice.attack, lowpass: voice.lowpass || undefined });
          // Tabuleiro: harmonico de sino (marimba/vibrafone)
          if (this.theme === 'mesa') this.tone({ freq: f * 4, type: 'sine', start: st.s, dur: st.d * 0.5, gain: voice.gain * 0.25 });
        })
      );
      this.playFile('fanfare', { delay: 1.08 });
      // brilho final
      [1046.5, 1318.51, 1567.98, 2093.0].forEach((f, i) => this.tone({ freq: f, type: 'sine', start: 1.15 + i * 0.07, dur: 0.35, gain: 0.05 }));
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundSynthesizer();
