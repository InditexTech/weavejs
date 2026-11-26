// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import {
  createHeadingLock,
  HEADING_LOCK_THRESHOLD_PX,
  lockToHeading,
} from '../heading-lock';

const deg = (d: number) => (d * Math.PI) / 180;
const at = (angle: number, distance: number, from = { x: 0, y: 0 }) => ({
  x: from.x + Math.cos(deg(angle)) * distance,
  y: from.y + Math.sin(deg(angle)) * distance,
});

describe('lockToHeading', () => {
  const lock = () => createHeadingLock({ x: 100, y: 100 });
  const T = HEADING_LOCK_THRESHOLD_PX;

  it('uses a threshold of 16 screen pixels', () => {
    expect(T).toBe(16);
  });

  it('leaves the position alone below the threshold', () => {
    const p = { x: 105, y: 108 };
    const out = lockToHeading(lock(), p, T);
    expect(out.point).toBe(p);
    expect(out.lock.heading).toBeNull();
  });

  it('chooses the nearest of eight headings at the threshold', () => {
    for (let k = -4; k < 4; k++) {
      const out = lockToHeading(lock(), at(k * 45 + 10, T, { x: 100, y: 100 }), T);
      expect(out.lock.heading).toBeCloseTo(deg(k * 45), 9);
    }
  });

  it('locks a pointer 16 px away at about 10 degrees to the 0 degree heading', () => {
    const out = lockToHeading(lock(), at(10, T, { x: 100, y: 100 }), T);
    expect(out.lock.heading).toBe(0);
    expect(out.point.y).toBeCloseTo(100, 9);
    expect(out.point.x).toBeCloseTo(100 + T * Math.cos(deg(10)), 9);
  });

  it('projects every later position onto the heading', () => {
    let state = lock();
    state = lockToHeading(state, at(10, 20, { x: 100, y: 100 }), T).lock;
    const a = lockToHeading(state, { x: 180, y: 140 }, T);
    expect(a.point.y).toBeCloseTo(100, 9);
    expect(a.point.x).toBeCloseTo(180, 9);
    const b = lockToHeading(a.lock, { x: 40, y: 60 }, T);
    expect(b.point.y).toBeCloseTo(100, 9);
    expect(b.point.x).toBeCloseTo(40, 9);
  });

  it('projects onto a diagonal heading', () => {
    const out = lockToHeading(lock(), { x: 130, y: 135 }, T);
    expect(out.lock.heading).toBeCloseTo(Math.PI / 4, 9);
    expect(out.point.x - 100).toBeCloseTo(out.point.y - 100, 9);
  });

  it('keeps the heading once chosen, even close to the anchor again', () => {
    const first = lockToHeading(lock(), at(0, 30, { x: 100, y: 100 }), T);
    const back = lockToHeading(first.lock, { x: 103, y: 120 }, T);
    expect(back.lock.heading).toBe(0);
    expect(back.point.y).toBeCloseTo(100, 9);
  });

  it('does not change the lock it is given', () => {
    const state = lock();
    lockToHeading(state, at(0, 30, { x: 100, y: 100 }), T);
    expect(state.heading).toBeNull();
  });

  it('works in another unit by scaling the threshold', () => {
    const zoom = 4;
    const out = lockToHeading(lock(), { x: 105, y: 100 }, T / zoom);
    expect(out.lock.heading).toBe(0);
    expect(lockToHeading(lock(), { x: 105, y: 100 }, T).lock.heading).toBeNull();
  });

  it('keeps every result finite', () => {
    const out = lockToHeading(lock(), { x: NaN, y: 5 }, T);
    expect(out.lock.heading).toBeNull();
  });
});
