// AirSlice AI - Web Audio API Procedural Sound Synthesizer
import type { FruitType, PowerUpType } from '../types.js';

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private lastWhooshTime: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init(): void {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public resume(): void {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Helper to create a noise buffer for slicing / explosions
   */
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Whoosh sound when the virtual blade moves swiftly
   */
  public playWhoosh(speed: number): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const now = performance.now();
    if (now - this.lastWhooshTime < 180) return; // Prevent whoosh spam
    this.lastWhooshTime = now;

    try {
      const duration = 0.22;
      const noiseBuffer = this.createNoiseBuffer(duration);
      if (!noiseBuffer) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const normalizedSpeed = Math.min(Math.max((speed - 300) / 1000, 0), 1);
      const startFreq = 400 + normalizedSpeed * 600;
      const peakFreq = 1100 + normalizedSpeed * 900;

      filter.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(peakFreq, this.ctx.currentTime + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + duration);
      filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      const whooshVol = (0.2 + normalizedSpeed * 0.3) * this.volume;
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(whooshVol, this.ctx.currentTime + duration * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
      noise.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio fallback silent
    }
  }

  /**
   * Distinctive procedural slicing sounds for each fruit
   */
  public playFruitSlice(type: FruitType): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    try {
      const t = this.ctx.currentTime;
      // 1. Blade swish transient
      const swishOsc = this.ctx.createOscillator();
      const swishGain = this.ctx.createGain();
      swishOsc.type = 'triangle';
      swishOsc.frequency.setValueAtTime(800, t);
      swishOsc.frequency.exponentialRampToValueAtTime(200, t + 0.12);

      swishGain.gain.setValueAtTime(0.35 * this.volume, t);
      swishGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      swishOsc.connect(swishGain);
      swishGain.connect(this.masterGain);
      swishOsc.start(t);
      swishOsc.stop(t + 0.12);

      // 2. Fruit-specific flesh crunch & squelch
      const noiseBuffer = this.createNoiseBuffer(0.25);
      if (!noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      const fleshGain = this.ctx.createGain();

      switch (type) {
        case 'watermelon':
          // Heavy wet thud + low resonance + squelch
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(900, t);
          filter.frequency.exponentialRampToValueAtTime(140, t + 0.22);

          // Sub-bass thud
          this.playSubBass(95, 40, 0.25, 0.45);
          fleshGain.gain.setValueAtTime(0.6 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          break;

        case 'orange':
          // Juicy citrus pop with high bandpass squirt
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, t);
          filter.frequency.exponentialRampToValueAtTime(350, t + 0.18);
          filter.Q.setValueAtTime(3, t);

          this.playTone(520, 'sine', 0.12, 0.35);
          fleshGain.gain.setValueAtTime(0.55 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          break;

        case 'apple':
          // Crisp snap with high pitch transient
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(1800, t);
          filter.frequency.exponentialRampToValueAtTime(600, t + 0.14);

          this.playTone(740, 'triangle', 0.09, 0.4);
          fleshGain.gain.setValueAtTime(0.5 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          break;

        case 'banana':
          // Soft fleshy chop
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(650, t);
          filter.frequency.exponentialRampToValueAtTime(120, t + 0.16);

          this.playTone(280, 'sine', 0.15, 0.3);
          fleshGain.gain.setValueAtTime(0.4 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          break;

        case 'kiwi':
          // Zesty crisp pop
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, t);
          filter.frequency.exponentialRampToValueAtTime(280, t + 0.15);
          filter.Q.setValueAtTime(2, t);

          this.playTone(620, 'triangle', 0.1, 0.35);
          fleshGain.gain.setValueAtTime(0.5 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          break;

        case 'pineapple':
          // Woody fibrous crunch + bright splash
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1600, t);
          filter.frequency.exponentialRampToValueAtTime(250, t + 0.2);
          filter.Q.setValueAtTime(1.5, t);

          this.playSubBass(120, 60, 0.18, 0.35);
          this.playTone(480, 'sawtooth', 0.12, 0.25);
          fleshGain.gain.setValueAtTime(0.6 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          break;

        case 'coconut':
          // Hard hollow shell crack
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(700, t);
          filter.frequency.exponentialRampToValueAtTime(180, t + 0.2);
          filter.Q.setValueAtTime(4.5, t);

          this.playTone(210, 'sine', 0.2, 0.5);
          this.playTone(430, 'square', 0.08, 0.2);
          fleshGain.gain.setValueAtTime(0.65 * this.volume, t);
          fleshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          break;
      }

      noise.connect(filter);
      filter.connect(fleshGain);
      fleshGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.25);
    } catch {
      // Audio error safe
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playSubBass(startFreq: number, endFreq: number, duration: number, vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(vol * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Massive bomb explosion with sub-rumble and saturated blast
   */
  public playBombExplosion(): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      // 1. Heavy Sub-Bass punch
      this.playSubBass(120, 28, 0.9, 0.9);

      // 2. Saturated explosion noise blast
      const duration = 1.1;
      const noiseBuffer = this.createNoiseBuffer(duration);
      if (!noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + duration);
    } catch {
      // Audio safe
    }
  }

  /**
   * Musical ascending pentatonic chord for combos
   */
  public playCombo(comboCount: number): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
      const baseIdx = Math.min(comboCount - 2, pentatonic.length - 2);
      const root = pentatonic[Math.max(0, baseIdx)];
      const third = pentatonic[Math.min(baseIdx + 1, pentatonic.length - 1)];
      const fifth = pentatonic[Math.min(baseIdx + 2, pentatonic.length - 1)];

      const t = this.ctx.currentTime;
      [root, third, fifth].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.setValueAtTime(0.28 * this.volume, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.35);
      });
    } catch {
      // Audio safe
    }
  }

  /**
   * Power-up activation sound
   */
  public playPowerUp(type: PowerUpType): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const t = this.ctx.currentTime;
      if (type === 'double-score') {
        // High energetic double chime
        this.playTone(880, 'sine', 0.2, 0.4);
        setTimeout(() => this.playTone(1320, 'sine', 0.3, 0.45), 90);
      } else if (type === 'shield') {
        // Sci-fi forcefield hum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(660, t + 0.3);

        gain.gain.setValueAtTime(0.4 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      } else if (type === 'slow-motion') {
        // Pitch drop warp
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.4);

        gain.gain.setValueAtTime(0.4 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      }
    } catch {
      // Audio safe
    }
  }

  /**
   * Level up celebratory fanfare
   */
  public playLevelUp(): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'triangle', 0.28, 0.35);
        }, idx * 75);
      });
    } catch {
      // Audio safe
    }
  }

  /**
   * Game Over descending chime
   */
  public playGameOver(): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      const notes = [440, 392, 349.23, 293.66];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'sawtooth', 0.4, 0.28);
        }, idx * 160);
      });
    } catch {
      // Audio safe
    }
  }

  /**
   * Clean UI button click
   */
  public playClick(): void {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    try {
      this.playTone(950, 'sine', 0.04, 0.25);
    } catch {
      // Audio safe
    }
  }
}
