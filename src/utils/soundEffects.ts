/**
 * Native Web Audio API Sound Synthesizer
 * Generates arcade and party game sound effects without external MP3 dependencies.
 */

const SOUND_MUTE_STORAGE_KEY = 'RODA_DE_BOBO_MUTED';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.muted = window.localStorage.getItem(SOUND_MUTE_STORAGE_KEY) === 'true';
      }
    } catch {
      // ignore storage errors
    }
  }

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

  vibrate(pattern: number | number[] = [100, 50, 100]): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore vibration errors
    }
  }

  private initCtx(): boolean {
    if (this.muted) return false;
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  /**
   * Short digital beep for countdown (last 10 seconds), with haptic vibration on the last 5 seconds
   */
  playTick(secondsRemaining?: number) {
    if (
      typeof secondsRemaining === 'number' &&
      secondsRemaining >= 1 &&
      secondsRemaining <= 5
    ) {
      this.vibrate(secondsRemaining <= 2 ? [100, 40, 100] : 80);
    }
    try {
      if (!this.initCtx() || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio might be blocked until user interacts
    }
  }

  /**
   * Deep harsh double buzzer for infractions, strikes, or bust
   */
  playBuzzer() {
    this.vibrate([100, 50, 100]);
    try {
      if (!this.initCtx() || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(130, t);
      osc2.frequency.setValueAtTime(138, t); // Slight detune for harsh buzzing

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.6);
      osc2.stop(t + 0.6);
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Bright, cheerful ascending synth chime for correct answers & score reveal
   */
  playSuccess() {
    try {
      if (!this.initCtx() || !this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Suspenseful drumroll / tension roll before revealing answers
   */
  playDrumroll(durationMs = 1500) {
    try {
      if (!this.initCtx() || !this.ctx) return;
      const steps = Math.floor(durationMs / 70);
      for (let i = 0; i < steps; i++) {
        const t = this.ctx.currentTime + i * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100 + (i / steps) * 120, t);

        const vol = 0.05 + (i / steps) * 0.15;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.06);
      }
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Percussive flip sound for cards / board reveal
   */
  playFlip() {
    try {
      if (!this.initCtx() || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Arcade powerup sound when playing special items (x2, Troca, Ligação)
   */
  playPowerup() {
    try {
      if (!this.initCtx() || !this.ctx) return;
      const freqs = [330, 440, 550, 660, 880];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
      });
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Dramatic alarm sound when "DUVIDO!" is shouted
   */
  playAlarm() {
    this.vibrate([100, 50, 100]);
    try {
      if (!this.initCtx() || !this.ctx) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const start = t + i * 0.18;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, start);
        osc.frequency.linearRampToValueAtTime(450, start + 0.14);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.14);
      }
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Helper to synthesize a warm polyphonic brass/synth chord at a scheduled time
   */
  playChord(
    frequencies: number[],
    startOffsetSec: number,
    durationSec: number,
    waveType: OscillatorType = 'sawtooth',
    peakGain = 0.12
  ) {
    try {
      if (!this.initCtx() || !this.ctx) return;
      const startTime = this.ctx.currentTime + startOffsetSec;

      frequencies.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, startTime);

        // Warm brass low-pass filter envelope
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 2.5, startTime);
        filter.frequency.exponentialRampToValueAtTime(freq * 5, startTime + Math.min(0.08, durationSec * 0.4));
        filter.frequency.exponentialRampToValueAtTime(freq * 1.8, startTime + durationSec);

        // Attack-sustain-release amplitude envelope
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
        gain.gain.setValueAtTime(peakGain * 0.85, startTime + durationSec * 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + durationSec);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + durationSec + 0.02);
      });
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Celebratory multi-stage 'Fanfare' sequence for the Game Over podium screen.
   * Combines a classic triumphant brass fanfare motif (C major -> G -> C6),
   * bass foundation, and a sparkling confetti arpeggio flourish.
   */
  playFanfare() {
    try {
      if (!this.initCtx() || !this.ctx) return;

      // Stage 1: Triumphant brass triplet call (C5 - C5 - C5 -> E5 -> G5 -> C6!)
      const brassSequence: Array<{ freqs: number[]; start: number; dur: number; gain: number }> = [
        // 3 short staccato fanfare hits (G4 + C5 + E5)
        { freqs: [392.0, 523.25, 659.25], start: 0.0, dur: 0.13, gain: 0.11 },
        { freqs: [392.0, 523.25, 659.25], start: 0.16, dur: 0.13, gain: 0.11 },
        { freqs: [392.0, 523.25, 659.25], start: 0.32, dur: 0.13, gain: 0.12 },
        // Uplifting step chord (C5 + F5 + A5)
        { freqs: [261.63, 523.25, 698.46, 880.0], start: 0.48, dur: 0.28, gain: 0.13 },
        // Dominant build (B4 + D5 + G5)
        { freqs: [246.94, 493.88, 587.33, 783.99], start: 0.8, dur: 0.26, gain: 0.13 },
        // Grand Finale Sustained C Major Victory Chord (C4 + G4 + C5 + E5 + G5 + C6)
        { freqs: [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5], start: 1.1, dur: 1.25, gain: 0.14 }
      ];

      brassSequence.forEach((step) => {
        this.playChord(step.freqs, step.start, step.dur, 'sawtooth', step.gain);
        // Layer a triangle wave one octave higher for arcade brightness
        this.playChord(
          step.freqs.map((f) => f * 2),
          step.start,
          step.dur * 0.9,
          'triangle',
          step.gain * 0.4
        );
      });

      // Stage 2: Sparkling high-register confetti shimmer arpeggio
      const sparkleNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
      sparkleNotes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime + 1.15 + idx * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {
      // Audio context error ignore
    }
  }
}

export const sounds = new SoundSynthesizer();

