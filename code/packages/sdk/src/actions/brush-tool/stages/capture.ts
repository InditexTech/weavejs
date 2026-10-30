// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushCaptureConfig } from '../types';

export type CapturedSample = {
  pressure: number;
  /** Legacy: the event whose position the stage should adopt. */
  sourceEvent?: PointerEvent;
  /** Position in the stroke container, already resolved from the sample. */
  point?: { x: number; y: number };
  /** Time reported by the sample's event, in ms. */
  time?: number;
  isPredicted: boolean;
};

/** State of the capture stage; belongs to a single stroke. */
export type CaptureState = {
  /** Client position of the last recorded sample, for `minMovePx`. */
  lastClient: { x: number; y: number } | null;
};

export const createCaptureState = (): CaptureState => ({ lastClient: null });

export type CaptureDeps = {
  /** Smooths one raw pressure sample, advancing the smoothing state. */
  smooth: (
    raw: number,
    clientX: number,
    clientY: number,
    time?: number
  ) => number;
  /** Raw pressure a sample reports. */
  rawPressure: (
    pointerType: string,
    pressure: unknown,
    commit?: boolean
  ) => number;
  /** Pressure for a predicted sample, without advancing the state. */
  predictedPressure: (raw: number) => number;
};

/**
 * Legacy capture of a pointer move that carries batched (coalesced) samples.
 *
 * Every real sample is smoothed through the same path as any other sample but
 * deliberately carries no `sourceEvent`: coalesced samples keep using the
 * event's already-resolved pointer position. The last predicted sample, if
 * any, is appended as a provisional point.
 *
 * Returns `null` when the event has at most one sample, so the caller takes
 * the single-event path.
 */
export function captureLegacySamples(
  evt: PointerEvent,
  deps: CaptureDeps
): CapturedSample[] | null {
  const coalescedEvents = evt.getCoalescedEvents
    ? evt.getCoalescedEvents()
    : [];

  if (coalescedEvents.length <= 1) {
    return null;
  }

  const samples: CapturedSample[] = coalescedEvents.map((ce) => ({
    pressure: deps.smooth(
      deps.rawPressure(ce.pointerType, ce.pressure),
      ce.clientX,
      ce.clientY,
      ce.timeStamp
    ),
    isPredicted: false,
  }));

  const predictedEvents = evt.getPredictedEvents ? evt.getPredictedEvents() : [];
  if (predictedEvents.length > 0) {
    const last = predictedEvents[predictedEvents.length - 1];
    samples.push({
      pressure: deps.predictedPressure(
        deps.rawPressure(last.pointerType, last.pressure, false)
      ),
      sourceEvent: last,
      isPredicted: true,
    });
  }

  return samples;
}

export type CoalescedCaptureDeps = CaptureDeps & {
  /** Maps a client position to the stroke container, without touching the stage. */
  toContainerPoint: (clientX: number, clientY: number) => { x: number; y: number };
};

/**
 * Captures every sample a pointer move carries: each batched (coalesced) sample
 * becomes a point at its own position, pressure and time, in the order the
 * browser reported them. An event without a batch is one sample.
 *
 * Positions are computed from each sample's client coordinates, so no shared
 * stage state is changed. Samples closer than `minMovePx` (screen px) to the
 * last recorded one are skipped. The browser's predicted tail is appended as a
 * provisional point when enabled and at least one real sample was kept.
 */
export function captureCoalescedSamples(
  evt: PointerEvent,
  deps: CoalescedCaptureDeps,
  cfg: WeaveBrushCaptureConfig,
  state: CaptureState
): CapturedSample[] {
  const batch = evt.getCoalescedEvents ? evt.getCoalescedEvents() : [];
  const source: PointerEvent[] = batch.length > 0 ? batch : [evt];

  const samples: CapturedSample[] = [];
  for (const ce of source) {
    if (
      cfg.minMovePx > 0 &&
      state.lastClient &&
      Math.hypot(ce.clientX - state.lastClient.x, ce.clientY - state.lastClient.y) <
        cfg.minMovePx
    ) {
      continue;
    }
    state.lastClient = { x: ce.clientX, y: ce.clientY };

    samples.push({
      pressure: deps.smooth(
        deps.rawPressure(ce.pointerType, ce.pressure),
        ce.clientX,
        ce.clientY,
        ce.timeStamp
      ),
      point: deps.toContainerPoint(ce.clientX, ce.clientY),
      time: ce.timeStamp,
      isPredicted: false,
    });
  }

  if (samples.length > 0 && cfg.predicted === 'tail') {
    const predictedEvents = evt.getPredictedEvents ? evt.getPredictedEvents() : [];
    if (predictedEvents.length > 0) {
      const last = predictedEvents[predictedEvents.length - 1];
      samples.push({
        pressure: deps.predictedPressure(
          deps.rawPressure(last.pointerType, last.pressure, false)
        ),
        point: deps.toContainerPoint(last.clientX, last.clientY),
        time: last.timeStamp,
        isPredicted: true,
      });
    }
  }

  return samples;
}
