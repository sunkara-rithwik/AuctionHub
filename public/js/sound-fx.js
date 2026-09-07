/**
 * sound-fx.js — Procedural Web Audio API Synthesizer for AuctionHub
 * Zero external audio files required. Produces rich, responsive audio.
 */

class SoundEffectsEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('ah_muted') === 'true';
  }

  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('ah_muted', this.muted ? 'true' : 'false');
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Powerful Gavel Strike / Auctioneer Hammer Knock
   * Low-frequency impact thud + crisp wood resonance click
   */
  gavelStrike() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Heavy low-end sub impact thud
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(32, now + 0.12);

    gain1.gain.setValueAtTime(0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // 2. Crisp wood transient crack
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(700, now);
    osc2.frequency.exponentialRampToValueAtTime(160, now + 0.05);

    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.08);
  }

  /**
   * Crisp Rising Bid Chime (High-stakes energy)
   */
  bidChime() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  /**
   * Regular countdown tick
   */
  timerTick() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * Urgent Heartbeat Countdown (Sub 3 seconds)
   */
  timerUrgent() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Sold Celebration Fanfare / Synth Chord
   */
  soldFanfare() {
    if (this.muted) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [
      { t: 0.0, freqs: [523.25, 659.25, 783.99] },
      { t: 0.18, freqs: [587.33, 739.99, 880.00] },
      { t: 0.38, freqs: [783.99, 987.77, 1174.66, 1567.98] }
    ];

    chords.forEach(c => {
      c.freqs.forEach(f => {
        const startTime = now + c.t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    });

    this.gavelStrike();
    setTimeout(() => this.gavelStrike(), 180);
  }
}

// Global singleton
window.soundFX = new SoundEffectsEngine();
