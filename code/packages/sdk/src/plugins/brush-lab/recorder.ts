// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { LabGesture, LabPressurePoint } from './types';

export type RecorderEvent = {
  pointerId: number;
  time: number;
  /** One entry per coalesced sample, or the event itself when there are none. */
  samples: LabPressurePoint[];
};

/**
 * Records the pointer events of one gesture, whatever brush is active: every
 * coalesced sample of every event, with its time. The first pointer that goes
 * down owns the gesture; others are ignored.
 */
export class GestureRecorder {
  private pointerId: number | null = null;
  private events: LabGesture['events'] = [];

  begin(e: RecorderEvent): void {
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.events = [{ time: e.time, samples: e.samples }];
  }

  add(e: RecorderEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.events.push({ time: e.time, samples: e.samples });
  }

  end(pointerId: number): void {
    if (pointerId === this.pointerId) this.pointerId = null;
  }

  /** A copy of the gesture so far. */
  snapshot(): LabGesture {
    return {
      events: this.events.map((ev) => ({
        time: ev.time,
        samples: ev.samples.map((s) => ({ ...s })),
      })),
    };
  }
}
