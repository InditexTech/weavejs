// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { GestureRecorder } from '../recorder';

const ev = (pointerId: number, time: number, x: number, n = 1) => ({
  pointerId,
  time,
  samples: Array.from({ length: n }, (_, i) => ({
    x: x + i,
    y: 0,
    pressure: 0.5,
  })),
});

describe('GestureRecorder', () => {
  it('records every event of a gesture with all its samples', () => {
    const r = new GestureRecorder();
    r.begin(ev(1, 0, 0));
    r.add(ev(1, 8, 10, 3));
    r.add(ev(1, 16, 20, 2));
    const g = r.snapshot();
    expect(g.events.map((e) => e.samples.length)).toEqual([1, 3, 2]);
    expect(g.events.map((e) => e.time)).toEqual([0, 8, 16]);
  });

  it('ignores a second pointer while the first is down', () => {
    const r = new GestureRecorder();
    r.begin(ev(1, 0, 0));
    r.begin(ev(2, 1, 99));
    r.add(ev(2, 2, 99));
    expect(r.snapshot().events).toHaveLength(1);
  });

  it('starts a new gesture after the pointer goes up, forgetting the old one', () => {
    const r = new GestureRecorder();
    r.begin(ev(1, 0, 0));
    r.add(ev(1, 8, 5));
    r.end(1);
    r.add(ev(1, 16, 9));
    expect(r.snapshot().events).toHaveLength(2);
    r.begin(ev(1, 100, 50));
    expect(r.snapshot().events).toEqual([
      { time: 100, samples: [{ x: 50, y: 0, pressure: 0.5 }] },
    ]);
  });

  it('hands out a copy', () => {
    const r = new GestureRecorder();
    r.begin(ev(1, 0, 0));
    const g = r.snapshot();
    g.events[0].samples[0].x = 123;
    expect(r.snapshot().events[0].samples[0].x).toBe(0);
  });
});
