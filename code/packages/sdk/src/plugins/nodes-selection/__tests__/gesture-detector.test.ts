// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GestureDetector } from '../gesture-detector';

describe('GestureDetector', () => {
  let detector: GestureDetector;
  let perfNow = 0;

  beforeEach(() => {
    perfNow = 0;
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockImplementation(() => perfNow);
    detector = new GestureDetector();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('zeros taps and clears all state', () => {
      detector.setTapStart(10, 20);
      detector.isDoubleTap = true;
      detector.reset();

      expect(detector.isDoubleTap).toBe(false);
      // After reset, checkMoved should return false (tapStart cleared)
      expect(detector.checkMoved(100, 100)).toBe(false);
    });

    it('clears the tap timeout if one is pending', () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout');
      // Trigger a timeout by going through checkDoubleTap
      detector.setTapStart(0, 0);
      detector.commitTap();
      detector.setTapStart(1, 1);
      detector.checkDoubleTap(1, 1); // creates tapTimeoutId
      clearSpy.mockClear();

      detector.reset();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('does not throw when tapTimeoutId is already null', () => {
      expect(() => detector.reset()).not.toThrow();
    });
  });

  // ── setTapStart ────────────────────────────────────────────────────────────

  describe('setTapStart()', () => {
    it('records the tap origin for subsequent checks', () => {
      detector.setTapStart(50, 60);
      // Movement of 0 px — not moved
      expect(detector.checkMoved(50, 60)).toBe(false);
    });

    it('increments the internal tap counter', () => {
      // Two rapid taps at same location → isDoubleTap
      detector.setTapStart(0, 0);
      detector.commitTap();
      perfNow = 100; // within 300ms window
      detector.setTapStart(0, 0);
      detector.checkDoubleTap(0, 0);
      expect(detector.isDoubleTap).toBe(true);
    });
  });

  // ── checkMoved ─────────────────────────────────────────────────────────────

  describe('checkMoved()', () => {
    it('returns false when tapStart has not been set', () => {
      expect(detector.checkMoved(100, 100)).toBe(false);
    });

    it('returns false when pointer stays within the movement threshold', () => {
      detector.setTapStart(0, 0);
      expect(detector.checkMoved(3, 3)).toBe(false); // hypot ≈ 4.24 < 5
    });

    it('returns true when pointer moves beyond the movement threshold', () => {
      detector.setTapStart(0, 0);
      expect(detector.checkMoved(10, 0)).toBe(true); // dist = 10 > 5
    });
  });

  // ── checkMovedDrag ─────────────────────────────────────────────────────────

  describe('checkMovedDrag()', () => {
    it('returns false when tapStart has not been set', () => {
      expect(detector.checkMovedDrag({ x: 0, y: 0 }, { x: 100, y: 100 })).toBe(false);
    });

    it('returns false when drag distance is within threshold', () => {
      detector.setTapStart(0, 0);
      expect(detector.checkMovedDrag({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(false);
    });

    it('returns true when drag distance exceeds threshold', () => {
      detector.setTapStart(0, 0);
      expect(detector.checkMovedDrag({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
    });
  });

  // ── checkDoubleTap ─────────────────────────────────────────────────────────

  describe('checkDoubleTap()', () => {
    it('does nothing when previousTap is null', () => {
      detector.setTapStart(0, 0);
      detector.checkDoubleTap(0, 0);
      expect(detector.isDoubleTap).toBe(false);
    });

    it('clears an existing tapTimeoutId before setting a new one', () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout');

      detector.setTapStart(0, 0);
      detector.commitTap();
      detector.setTapStart(1, 1);
      detector.checkDoubleTap(1, 1); // first call — sets timeout
      clearSpy.mockClear();

      detector.setTapStart(2, 2);
      detector.checkDoubleTap(2, 2); // second call — should clear previous timeout
      expect(clearSpy).toHaveBeenCalled();
    });

    it('sets isDoubleTap=true when taps > 1, within time and distance', () => {
      detector.setTapStart(0, 0);
      detector.commitTap();
      perfNow = 100; // within 300ms window
      detector.setTapStart(1, 1);
      detector.checkDoubleTap(1, 1);
      expect(detector.isDoubleTap).toBe(true);
    });

    it('does NOT set isDoubleTap when the time window is exceeded', () => {
      detector.setTapStart(0, 0);
      detector.commitTap();
      perfNow = 400; // beyond 300ms window
      detector.setTapStart(1, 1);
      detector.checkDoubleTap(1, 1);
      expect(detector.isDoubleTap).toBe(false);
    });

    it('does NOT set isDoubleTap when taps are too far apart spatially', () => {
      detector.setTapStart(0, 0);
      detector.commitTap();
      perfNow = 100;
      detector.setTapStart(50, 50);
      detector.checkDoubleTap(50, 50); // dist > 10px
      expect(detector.isDoubleTap).toBe(false);
    });

    it('schedules a timeout that resets taps after the window', () => {
      detector.setTapStart(0, 0);
      detector.commitTap();
      perfNow = 100;
      detector.setTapStart(1, 1);
      detector.checkDoubleTap(1, 1); // isDoubleTap = true, taps = 0 due to double-tap detection

      // After the tap-reset timeout fires the internal taps counter is reset;
      vi.runAllTimers();
      detector.resetDoubleTap();

      // Start fresh: one tap without a predecessor → need 2 taps for double-tap
      detector.setTapStart(2, 2);
      detector.commitTap();
      // Do NOT increment taps further — previous double-tap reset taps to 0
      // So now we only have 1 tap recorded, no double-tap possible
      perfNow = 200;
      detector.checkDoubleTap(2, 2);
      expect(detector.isDoubleTap).toBe(false);
    });
  });

  // ── commitTap ─────────────────────────────────────────────────────────────

  describe('commitTap()', () => {
    it('advances previousTap to the current tapStart', () => {
      detector.setTapStart(10, 20);
      detector.commitTap();
      // Now a second tap at the same position within time → double-tap
      perfNow = 50;
      detector.setTapStart(10, 20);
      detector.checkDoubleTap(10, 20);
      expect(detector.isDoubleTap).toBe(true);
    });
  });

  // ── resetDoubleTap ─────────────────────────────────────────────────────────

  describe('resetDoubleTap()', () => {
    it('sets isDoubleTap back to false', () => {
      detector.setTapStart(0, 0);
      detector.commitTap();
      perfNow = 50;
      detector.setTapStart(1, 1);
      detector.checkDoubleTap(1, 1);
      expect(detector.isDoubleTap).toBe(true);

      detector.resetDoubleTap();
      expect(detector.isDoubleTap).toBe(false);
    });
  });
});
