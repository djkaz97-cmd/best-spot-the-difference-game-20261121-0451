// All sound is synthesised live with WebAudio oscillators — no audio files.
// The context is created only on a user gesture; before that (and in screenshot
// staging) every cue is a silent no-op, so the game never needs a network or a
// permission prompt to render.

class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /** Create/resume the AudioContext. Call from a click or key handler. */
  ensure() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** One enveloped oscillator note. `slideTo` bends the pitch over the note. */
  tone(freq, dur, type, vol, delay = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A found difference: a bright two-note pluck that rises with the combo. */
  find(mult) {
    const base = 523.25 * (1 + 0.1 * (Math.min(mult, 5) - 1));
    this.tone(base, 0.16, 'triangle', 0.3);
    this.tone(base * 1.5, 0.22, 'sine', 0.24, 0.07);
  }

  /** A wrong click: a soft low thud, never harsh. */
  miss() {
    this.tone(150, 0.14, 'sine', 0.22, 0, 82);
  }

  /** A hint: a gentle descending shimmer. */
  hint() {
    this.tone(987, 0.3, 'sine', 0.16, 0, 494);
    this.tone(1318, 0.24, 'sine', 0.08, 0.05, 660);
  }

  /** Round cleared: a quick rising arpeggio. */
  clear() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.24, i * 0.09));
  }

  /** The whole hunt won: a brighter, longer arpeggio. */
  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.24, i * 0.11));
  }

  /** Time ran out: a soft descending sigh. */
  lose() {
    [392, 329.63, 261.63].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.2, i * 0.16));
  }

  /** A single second ticking away under ten seconds left. */
  tick() {
    this.tone(1244, 0.04, 'square', 0.05);
  }

  /** The hunt begins. */
  start() {
    this.tone(392, 0.14, 'triangle', 0.22);
    this.tone(523.25, 0.2, 'triangle', 0.22, 0.09);
  }
}

export const sfx = new Sfx();
