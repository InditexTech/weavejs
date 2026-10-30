// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createStabilizer } from '@/actions/brush-tool/stages/stabilizer';
import { finalizePoints } from '@/actions/brush-tool/stages/finalize';
import type { WeaveBrushInputProfile } from '@/actions/brush-tool/types';
import type { LabPressurePoint, LabRecording } from './types';

/**
 * Draws a recorded gesture again through another brush: the same pointer
 * events, captured, stabilized and finished as that brush would have done.
 * Positions only: width, pressure smoothing and the outline are not replayed.
 */
export function replayRecording(
  recording: LabRecording,
  profile: WeaveBrushInputProfile,
  simplifyTolerance: number
): LabPressurePoint[] {
  const coalesced = profile.capture.source === 'coalesced';
  const minMove = profile.capture.minMovePx;

  // What the brush would have kept: every sample of an event, or just its last.
  const captured: { time: number; point: LabPressurePoint }[] = [];
  for (const event of recording.gesture.events) {
    const picked = coalesced ? event.samples : event.samples.slice(-1);
    // each coalesced sample has its own time, as the brush reads it
    for (const point of picked) {
      captured.push({ time: point.time ?? event.time, point });
    }
  }
  if (captured.length === 0) return [];

  const kept = captured.filter((c, i) => {
    if (i === 0 || minMove <= 0) return true;
    const prev = captured[i - 1].point;
    return (
      Math.hypot(c.point.x - prev.x, c.point.y - prev.y) * recording.zoom >=
      minMove
    );
  });

  const stabilizer = createStabilizer(profile.stabilizer);
  stabilizer.reset();
  const ctx = (time: number) => ({ now: time, zoom: recording.zoom });
  stabilizer.seed(kept[0].point, ctx(kept[0].time));

  const points: LabPressurePoint[] = kept.map((c) => {
    const p = stabilizer.apply(c.point, ctx(c.time));
    return { x: p.x, y: p.y, pressure: c.point.pressure };
  });

  // A stabilized stroke lags the pen: the brush completes it where the pen
  // was lifted.
  const cfg = profile.stabilizer;
  const lastRaw = kept[kept.length - 1].point;
  const lastOut = points[points.length - 1];
  if (
    cfg.type !== 'none' &&
    cfg.catchUpOnEnd &&
    (lastRaw.x !== lastOut.x || lastRaw.y !== lastOut.y)
  ) {
    points.push({ x: lastRaw.x, y: lastRaw.y, pressure: lastOut.pressure });
  }

  return finalizePoints(
    points,
    profile.finalize,
    simplifyTolerance,
    recording.zoom
  );
}

/** The last `max` recordings; the oldest are dropped. Memory only. */
export class RecordingStore {
  private items: LabRecording[] = [];

  constructor(private max: number) {}

  setMax(max: number): void {
    this.max = Math.max(1, Math.floor(max));
    this.trim();
  }

  add(recording: LabRecording): void {
    this.items.push(recording);
    this.trim();
  }

  all(): LabRecording[] {
    return [...this.items];
  }

  last(): LabRecording | undefined {
    return this.items[this.items.length - 1];
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }

  private trim(): void {
    while (this.items.length > this.max) this.items.shift();
  }
}
