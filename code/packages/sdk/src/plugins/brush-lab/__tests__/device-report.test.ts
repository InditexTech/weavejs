// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { DeviceReporter } from '../device-report';

const ev = (o: Partial<Parameters<DeviceReporter['record']>[0]>) => ({
  pointerType: 'pen',
  pressure: 0.5,
  timeStamp: 0,
  ...o,
});

describe('DeviceReporter', () => {
  it('reports nothing before an event', () => {
    const r = new DeviceReporter().report();
    expect(r).toMatchObject({
      pointerType: null,
      sampleRateHz: 0,
      pressure: null,
      tilt: false,
      warnings: [],
    });
  });

  it('reports pointer type, pressure range, tilt and rate', () => {
    const d = new DeviceReporter();
    for (let i = 0; i <= 10; i++) {
      d.record(
        ev({
          timeStamp: i * 8,
          pressure: 0.1 + i * 0.05,
          tiltX: 20,
          getCoalescedEvents: () => [1, 2, 3],
          getPredictedEvents: () => [],
        })
      );
    }
    const r = d.report();
    expect(r.pointerType).toBe('pen');
    expect(r.pressure?.min).toBeCloseTo(0.1);
    expect(r.pressure?.max).toBeCloseTo(0.6);
    expect(r.tilt).toBe(true);
    expect(r.predictedAvailable).toBe(true);
    expect(r.samplesPerEvent).toBe(3);
    expect(r.sampleRateHz).toBeCloseTo(125, 5);
  });

  it('reports no predicted support when the browser has none', () => {
    const d = new DeviceReporter();
    d.record(ev({}));
    expect(d.report().predictedAvailable).toBe(false);
  });

  it('warns when a pen reports as a mouse', () => {
    const d = new DeviceReporter();
    d.record(ev({ pointerType: 'mouse', pressure: 0.5 }));
    expect(d.report().warnings).toEqual([]);
    d.record(ev({ pointerType: 'mouse', pressure: 0.73, tiltX: 12 }));
    expect(d.report().warnings).toEqual(['penReportsAsMouse']);
  });

  it('carries the resolved profile, zoom and frame rate', () => {
    const d = new DeviceReporter();
    d.setResolvedProfile('pen.desktop');
    d.setZoom(2);
    d.setFps(59);
    expect(d.report()).toMatchObject({
      resolvedProfile: 'pen.desktop',
      zoom: 2,
      fps: 59,
    });
  });

  it('only keeps a short window of event times', () => {
    const d = new DeviceReporter();
    for (let i = 0; i < 1000; i++) d.record(ev({ timeStamp: i * 10 }));
    expect((d as unknown as { times: number[] }).times.length).toBeLessThan(
      250
    );
  });
});
