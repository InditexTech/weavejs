// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import type { WeaveBrushPressureConfig } from '../types';

/**
 * Pressure-smoothing state. It belongs to exactly one stroke and is reset
 * before that stroke's first sample is computed.
 */
export type PressureState = {
  lastSmoothedPressure: number;
  hasPressureSample: boolean;
  lastPointerPos: { x: number; y: number } | null;
  lastPointerTime: number;
  predictedCount: number;
  /** Filtered rate of change (One Euro). */
  lastDerivative: number;
  /** Last non-zero pressure a pen reported, for the `holdLast` zero policy. */
  lastNonZeroPressure: number | null;
};

/** Time assumed between two samples whose times do not advance, in ms. */
const NOMINAL_SAMPLE_INTERVAL_MS = 5;

export function createPressureState(): PressureState {
  return {
    lastSmoothedPressure: 0.5,
    hasPressureSample: false,
    lastPointerPos: null,
    lastPointerTime: 0,
    predictedCount: 0,
    lastDerivative: 0,
    lastNonZeroPressure: null,
  };
}

export function resetPressureState(state: PressureState): void {
  state.lastSmoothedPressure = 0.5;
  state.hasPressureSample = false;
  state.lastPointerPos = null;
  state.lastPointerTime = 0;
  state.predictedCount = 0;
  state.lastDerivative = 0;
  state.lastNonZeroPressure = null;
}

/**
 * Raw pressure a pointer sample reports: the device's own reading for a pen, a
 * neutral constant for devices that do not sense pressure.
 *
 * `zero` decides what a reported pressure of 0 means for a pen: `legacy`
 * replaces it with 0.5, `keep` records it (the pressure floor still applies),
 * `holdLast` repeats the last non-zero reading. `commit: false` reads without
 * remembering the value, for speculative samples.
 */
export function getRawPressure(
  pointerType: string,
  pressure: unknown,
  zero: WeaveBrushPressureConfig['zero'] = 'legacy',
  state?: PressureState,
  commit = true
): number {
  if (pointerType !== 'pen') {
    return 0.5;
  }

  const value =
    typeof pressure === 'number' && Number.isFinite(pressure) ? pressure : 0;

  switch (zero) {
    case 'keep':
      return typeof pressure === 'number' && Number.isFinite(pressure)
        ? pressure
        : 0.5;
    case 'holdLast': {
      if (value > 0) {
        if (commit && state) state.lastNonZeroPressure = value;
        return value;
      }
      return state?.lastNonZeroPressure ?? 0.5;
    }
    default:
      return value || 0.5;
  }
}

/**
 * Legacy velocity-adaptive exponential smoothing of one raw pressure sample.
 *
 * The first sample of a stroke seeds the filter with its own value. Fast
 * movement gives a higher alpha (more responsive), slow movement a lower one.
 */
function smoothLegacy(
  state: PressureState,
  cfg: WeaveBrushPressureConfig,
  raw: number,
  clientX: number,
  clientY: number,
  now: number
): number {
  let velocity = 0;

  // A sample without usable coordinates must not produce a NaN velocity: the
  // filter is stateful, so a single NaN would poison the rest of the stroke.
  const hasPosition = Number.isFinite(clientX) && Number.isFinite(clientY);

  if (hasPosition && state.lastPointerPos && now - state.lastPointerTime > 0) {
    const dx = clientX - state.lastPointerPos.x;
    const dy = clientY - state.lastPointerPos.y;
    velocity = (Math.hypot(dx, dy) / (now - state.lastPointerTime)) * 1000; // px/s
  }
  if (hasPosition) {
    state.lastPointerPos = { x: clientX, y: clientY };
  }
  state.lastPointerTime = now;

  const safeRaw = Number.isFinite(raw) ? raw : 0.5;

  if (!state.hasPressureSample) {
    state.hasPressureSample = true;
    state.lastSmoothedPressure = safeRaw;
    return Math.max(state.lastSmoothedPressure, cfg.floor);
  }

  const alpha = Math.min(Math.max(velocity / 1500, 0.15), 0.6);

  const smoothed =
    alpha * safeRaw + (1 - alpha) * state.lastSmoothedPressure;
  state.lastSmoothedPressure = Number.isFinite(smoothed) ? smoothed : safeRaw;
  return Math.max(state.lastSmoothedPressure, cfg.floor);
}

/** Seconds between two samples; a non-advancing clock assumes a nominal rate. */
function elapsedSeconds(state: PressureState, now: number): number {
  const dt = now - state.lastPointerTime;
  return (dt > 0 ? dt : NOMINAL_SAMPLE_INTERVAL_MS) / 1000;
}

/** Seeds a filter with its first sample. */
function seed(state: PressureState, value: number, now: number): void {
  state.hasPressureSample = true;
  state.lastSmoothedPressure = value;
  state.lastPointerTime = now;
  state.lastDerivative = 0;
}

/** Exponential smoothing with a time constant, independent of the report rate. */
function smoothTimeEma(
  state: PressureState,
  cfg: WeaveBrushPressureConfig,
  safeRaw: number,
  now: number
): number {
  if (!state.hasPressureSample) {
    seed(state, safeRaw, now);
    return Math.max(safeRaw, cfg.floor);
  }
  const dt = elapsedSeconds(state, now) * 1000;
  const alpha = 1 - Math.exp(-dt / Math.max(cfg.timeConstantMs, 1e-6));
  const smoothed = alpha * safeRaw + (1 - alpha) * state.lastSmoothedPressure;
  state.lastSmoothedPressure = Number.isFinite(smoothed) ? smoothed : safeRaw;
  state.lastPointerTime = now;
  return Math.max(state.lastSmoothedPressure, cfg.floor);
}

const smoothingFactor = (dt: number, cutoff: number) => {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
};

/**
 * One Euro filter (Casiez, Roussel, Vogel 2012): a low-pass filter whose cutoff
 * rises with speed, so slow changes are smoothed and fast ones follow closely.
 */
function smoothOneEuro(
  state: PressureState,
  cfg: WeaveBrushPressureConfig,
  safeRaw: number,
  now: number
): number {
  if (!state.hasPressureSample) {
    seed(state, safeRaw, now);
    return Math.max(safeRaw, cfg.floor);
  }
  const dt = elapsedSeconds(state, now);
  const derivative = (safeRaw - state.lastSmoothedPressure) / dt;
  const a = smoothingFactor(dt, 1);
  state.lastDerivative = a * derivative + (1 - a) * state.lastDerivative;

  const cutoff =
    cfg.oneEuro.minCutoff + cfg.oneEuro.beta * Math.abs(state.lastDerivative);
  const alpha = smoothingFactor(dt, cutoff);
  const smoothed = alpha * safeRaw + (1 - alpha) * state.lastSmoothedPressure;
  state.lastSmoothedPressure = Number.isFinite(smoothed) ? smoothed : safeRaw;
  state.lastPointerTime = now;
  return Math.max(state.lastSmoothedPressure, cfg.floor);
}

/** Smooths one raw pressure sample with the filter selected by the profile. */
export function smoothPressure(
  state: PressureState,
  cfg: WeaveBrushPressureConfig,
  raw: number,
  clientX: number,
  clientY: number,
  now: number
): number {
  const safeRaw = Number.isFinite(raw) ? raw : 0.5;

  switch (cfg.filter) {
    case 'timeEma':
      return smoothTimeEma(state, cfg, safeRaw, now);
    case 'oneEuro':
      return smoothOneEuro(state, cfg, safeRaw, now);
    case 'none':
      state.hasPressureSample = true;
      state.lastSmoothedPressure = safeRaw;
      state.lastPointerTime = now;
      return Math.max(safeRaw, cfg.floor);
    default:
      return smoothLegacy(state, cfg, raw, clientX, clientY, now);
  }
}

/**
 * Pressure of a predicted (speculative) sample. It blends against the current
 * state read-only, because predicted samples are rolled back and must not
 * advance the state real samples depend on.
 */
export function peekPredictedPressure(
  state: PressureState,
  cfg: WeaveBrushPressureConfig,
  raw: number
): number {
  return Math.max(0.15 * raw + 0.85 * state.lastSmoothedPressure, cfg.floor);
}

/**
 * Start policy for the first point's pressure. A stroke's pointer-down reading
 * is frequently an unreliable contact spike.
 *
 * - `backfill`: the first real movement sample replaces it once it exists.
 * - `average`: it becomes the mean of the first `startSamples` real movement
 *   readings, refined as each one arrives, so it never keeps the contact value.
 * - `none`: it is left as reported.
 *
 * Predicted samples never change it.
 */
export function applyStartPolicy(
  elements: WeaveStrokePoint[],
  incoming: WeaveStrokePoint,
  isPredicted: boolean,
  cfg: WeaveBrushPressureConfig
): void {
  if (isPredicted || elements.length === 0) return;

  if (cfg.start === 'backfill' && elements.length === 1) {
    elements[0] = { ...elements[0], pressure: incoming.pressure };
  } else if (cfg.start === 'average' && elements.length <= cfg.startSamples) {
    const readings = [...elements.slice(1), incoming];
    elements[0] = {
      ...elements[0],
      pressure:
        readings.reduce((sum, p) => sum + p.pressure, 0) / readings.length,
    };
  }
}

/**
 * End policy. A lift-off reading can be as unreliable as the contact spike;
 * under `backfill` the last point takes the second-to-last point's pressure.
 */
export function applyEndPolicy(
  elements: WeaveStrokePoint[],
  cfg: WeaveBrushPressureConfig
): WeaveStrokePoint[] {
  if (cfg.end === 'backfill' && elements.length >= 2) {
    const result = [...elements];
    const lastIndex = result.length - 1;
    result[lastIndex] = {
      ...result[lastIndex],
      pressure: result[lastIndex - 1].pressure,
    };
    return result;
  }
  return elements;
}
