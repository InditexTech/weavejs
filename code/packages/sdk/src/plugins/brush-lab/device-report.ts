// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveBrushLabDeviceReport, WeaveBrushLabWarning } from './types';
import type { WeaveBrushInputProfileKey } from '@/actions/brush-tool/types';

export type DevicePointerEvent = {
  pointerType: string;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  timeStamp: number;
  getCoalescedEvents?: () => unknown[];
  getPredictedEvents?: () => unknown[];
};

const WINDOW_MS = 2000;

/**
 * Collects what pointer events say about the device. It keeps counters and a
 * short window of event times, nothing else.
 */
export class DeviceReporter {
  private pointerType: string | null = null;
  private times: number[] = [];
  private samples = 0;
  private events = 0;
  private minPressure = Infinity;
  private maxPressure = -Infinity;
  private tilt = false;
  private predicted = false;
  private penAsMouse = false;
  private resolvedProfile: WeaveBrushInputProfileKey | null = null;
  private zoom = 1;
  private fps = 0;

  record(e: DevicePointerEvent): void {
    this.pointerType = e.pointerType;
    this.events++;

    const coalesced = e.getCoalescedEvents?.().length ?? 0;
    this.samples += Math.max(coalesced, 1);

    if (typeof e.getPredictedEvents === 'function') {
      this.predicted = true;
    }

    this.times.push(e.timeStamp);
    const cutoff = e.timeStamp - WINDOW_MS;
    while (this.times.length > 1 && this.times[0] < cutoff) this.times.shift();

    if (e.pointerType === 'pen' || e.pointerType === 'touch') {
      this.minPressure = Math.min(this.minPressure, e.pressure);
      this.maxPressure = Math.max(this.maxPressure, e.pressure);
    }

    const tilted = Boolean(e.tiltX) || Boolean(e.tiltY);
    if (e.pointerType === 'pen' && tilted) this.tilt = true;

    // A pen that reports as a mouse still sends real pressure or tilt.
    if (
      e.pointerType === 'mouse' &&
      (tilted || (e.pressure > 0 && e.pressure !== 0.5))
    ) {
      this.penAsMouse = true;
    }
  }

  setResolvedProfile(key: WeaveBrushInputProfileKey): void {
    this.resolvedProfile = key;
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  setFps(fps: number): void {
    this.fps = fps;
  }

  report(): WeaveBrushLabDeviceReport {
    const first = this.times[0];
    const last = this.times[this.times.length - 1];
    const span = last - first;
    const warnings: WeaveBrushLabWarning[] = [];
    if (this.penAsMouse) warnings.push('penReportsAsMouse');

    return {
      pointerType: this.pointerType,
      resolvedProfile: this.resolvedProfile,
      sampleRateHz:
        this.times.length > 1 && span > 0
          ? ((this.times.length - 1) / span) * 1000
          : 0,
      samplesPerEvent: this.events ? this.samples / this.events : 0,
      pressure: Number.isFinite(this.minPressure)
        ? { min: this.minPressure, max: this.maxPressure }
        : null,
      tilt: this.tilt,
      predictedAvailable: this.predicted,
      zoom: this.zoom,
      fps: this.fps,
      warnings,
    };
  }
}
