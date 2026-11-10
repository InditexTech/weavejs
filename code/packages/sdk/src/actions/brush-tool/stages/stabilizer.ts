// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushStabilizerConfig } from '../types';

export type StabilizerPoint = { x: number; y: number };

export type StabilizerContext = {
  /** Time of the sample, in ms. */
  now: number;
  /** Current stage zoom. */
  zoom: number;
};

export interface BrushStabilizer {
  /** Clears the state; called before the first sample of every stroke. */
  reset(): void;
  /** Starts a stroke at `point`, so the first sample continues from it. */
  seed(point: StabilizerPoint, ctx: StabilizerContext): void;
  /** Returns the position to record for a sample at `point`. */
  apply(point: StabilizerPoint, ctx: StabilizerContext): StabilizerPoint;
}

/** Time assumed between two samples whose times do not advance, in ms. */
const NOMINAL_SAMPLE_INTERVAL_MS = 5;

const seconds = (now: number, last: number) =>
  (now - last > 0 ? now - last : NOMINAL_SAMPLE_INTERVAL_MS) / 1000;

/**
 * Scale between canvas units and the units distances are configured in: screen
 * pixels when the stabilizer is zoom-aware, canvas units otherwise.
 */
const unitScale = (cfg: WeaveBrushStabilizerConfig, ctx: StabilizerContext) =>
  cfg.zoomAware && ctx.zoom > 0 && Number.isFinite(ctx.zoom) ? ctx.zoom : 1;

class NoStabilizer implements BrushStabilizer {
  reset(): void {
    // stateless
  }

  seed(): void {
    // stateless
  }

  apply(point: StabilizerPoint): StabilizerPoint {
    return point;
  }
}

/** One Euro low-pass filter on one axis. */
class OneEuroAxis {
  private last = 0;
  private derivative = 0;
  private lastTime = 0;
  private seeded = false;

  reset(): void {
    this.seeded = false;
    this.derivative = 0;
  }

  seed(value: number, time: number): void {
    this.last = value;
    this.lastTime = time;
    this.derivative = 0;
    this.seeded = true;
  }

  filter(value: number, time: number, minCutoff: number, beta: number): number {
    if (!this.seeded) {
      this.seed(value, time);
      return value;
    }
    const dt = seconds(time, this.lastTime);
    const factor = (cutoff: number) => {
      const r = 2 * Math.PI * cutoff * dt;
      return r / (r + 1);
    };

    const a = factor(1);
    this.derivative = a * ((value - this.last) / dt) + (1 - a) * this.derivative;

    const alpha = factor(minCutoff + beta * Math.abs(this.derivative));
    const filtered = alpha * value + (1 - alpha) * this.last;
    this.last = Number.isFinite(filtered) ? filtered : value;
    this.lastTime = time;
    return this.last;
  }
}

/**
 * One Euro filter (Casiez, Roussel, Vogel 2012) on the pen position: slow
 * movement is smoothed, fast movement is followed closely.
 */
class OneEuroStabilizer implements BrushStabilizer {
  private readonly x = new OneEuroAxis();
  private readonly y = new OneEuroAxis();

  constructor(private readonly cfg: WeaveBrushStabilizerConfig) {}

  reset(): void {
    this.x.reset();
    this.y.reset();
  }

  seed(point: StabilizerPoint, ctx: StabilizerContext): void {
    const s = unitScale(this.cfg, ctx);
    this.x.seed(point.x * s, ctx.now);
    this.y.seed(point.y * s, ctx.now);
  }

  apply(point: StabilizerPoint, ctx: StabilizerContext): StabilizerPoint {
    const s = unitScale(this.cfg, ctx);
    return {
      x: this.x.filter(point.x * s, ctx.now, this.cfg.minCutoff, this.cfg.beta) / s,
      y: this.y.filter(point.y * s, ctx.now, this.cfg.minCutoff, this.cfg.beta) / s,
    };
  }
}

/**
 * Pulled string: the recorded point is held back on a leash of fixed length
 * and only moves when the pen pulls it taut, so movement inside the leash
 * leaves no mark and tight curves are rounded.
 */
class PulledStringStabilizer implements BrushStabilizer {
  private tip: StabilizerPoint | null = null;

  constructor(private readonly cfg: WeaveBrushStabilizerConfig) {}

  reset(): void {
    this.tip = null;
  }

  seed(point: StabilizerPoint): void {
    this.tip = { ...point };
  }

  apply(point: StabilizerPoint, ctx: StabilizerContext): StabilizerPoint {
    if (!this.tip) {
      this.tip = { ...point };
      return point;
    }
    const leash = this.cfg.radiusPx / unitScale(this.cfg, ctx);
    const dx = point.x - this.tip.x;
    const dy = point.y - this.tip.y;
    const distance = Math.hypot(dx, dy);

    if (distance > leash && distance > 0) {
      const pull = (distance - leash) / distance;
      this.tip = { x: this.tip.x + dx * pull, y: this.tip.y + dy * pull };
    }
    return { ...this.tip };
  }
}

/** Longest time constant of the streamline stabilizer, at amount 1, in ms. */
const STREAMLINE_MAX_TAU_MS = 80;

/**
 * Streamline: the recorded point eases towards the pen with a time constant
 * proportional to `amount`, so the result does not depend on how often samples
 * arrive. Amount 0 follows the pen exactly.
 */
class StreamlineStabilizer implements BrushStabilizer {
  private tip: StabilizerPoint | null = null;
  private lastTime = 0;

  constructor(private readonly cfg: WeaveBrushStabilizerConfig) {}

  reset(): void {
    this.tip = null;
  }

  seed(point: StabilizerPoint, ctx: StabilizerContext): void {
    this.tip = { ...point };
    this.lastTime = ctx.now;
  }

  apply(point: StabilizerPoint, ctx: StabilizerContext): StabilizerPoint {
    const tau = this.cfg.amount * STREAMLINE_MAX_TAU_MS;
    if (!this.tip || tau <= 0) {
      this.tip = { ...point };
      this.lastTime = ctx.now;
      return point;
    }
    const dt = seconds(ctx.now, this.lastTime) * 1000;
    const alpha = 1 - Math.exp(-dt / tau);
    this.tip = {
      x: this.tip.x + (point.x - this.tip.x) * alpha,
      y: this.tip.y + (point.y - this.tip.y) * alpha,
    };
    this.lastTime = ctx.now;
    return { ...this.tip };
  }
}

/** Creates the stabilizer selected by a profile. */
export function createStabilizer(cfg: WeaveBrushStabilizerConfig): BrushStabilizer {
  switch (cfg.type) {
    case 'oneEuro':
      return new OneEuroStabilizer(cfg);
    case 'pulledString':
      return new PulledStringStabilizer(cfg);
    case 'streamline':
      return new StreamlineStabilizer(cfg);
    default:
      return new NoStabilizer();
  }
}
