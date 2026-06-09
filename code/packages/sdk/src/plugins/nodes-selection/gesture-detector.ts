// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

type TapPoint = { x: number; y: number; time: number };

const MOVED_DISTANCE = 5; // px
const DOUBLE_TAP_DISTANCE = 10; // px
const DOUBLE_TAP_TIME = 300; // ms

/**
 * Tracks single-tap, double-tap, and drag-move gesture state for the
 * nodes-selection plugin. Has no dependency on Weave or Konva internals.
 */
export class GestureDetector {
  private taps = 0;
  private tapStart: TapPoint | null = null;
  private previousTap: TapPoint | null = null;
  private tapTimeoutId: ReturnType<typeof setTimeout> | null = null;
  isDoubleTap = false;

  /** Call on every pointerdown to record the tap origin. */
  setTapStart(clientX: number, clientY: number): void {
    this.taps += 1;
    this.tapStart = { x: clientX, y: clientY, time: performance.now() };
  }

  /** Returns true if the pointer moved more than the move threshold since tap start. */
  checkMoved(clientX: number, clientY: number): boolean {
    if (!this.tapStart) {
      return false;
    }
    const dist = Math.hypot(clientX - this.tapStart.x, clientY - this.tapStart.y);
    return dist > MOVED_DISTANCE;
  }

  /** Returns true if a drag moved further than the move threshold between two stage positions. */
  checkMovedDrag(
    init: { x: number; y: number },
    actual: { x: number; y: number }
  ): boolean {
    if (!this.tapStart) {
      return false;
    }
    const dist = Math.hypot(actual.x - init.x, actual.y - init.y);
    return dist > MOVED_DISTANCE;
  }

  /**
   * Call on pointerup after setTapStart to detect a double-tap.
   * Sets isDoubleTap = true when two taps occur close in time and space.
   */
  checkDoubleTap(clientX: number, clientY: number): void {
    if (!this.previousTap) {
      return;
    }

    const now = performance.now();
    const dist = Math.hypot(clientX - this.previousTap.x, clientY - this.previousTap.y);

    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
    }

    this.tapTimeoutId = setTimeout(() => {
      this.taps = 0;
    }, DOUBLE_TAP_TIME + 5);

    if (
      this.taps > 1 &&
      now - this.previousTap.time < DOUBLE_TAP_TIME &&
      dist < DOUBLE_TAP_DISTANCE
    ) {
      this.taps = 0;
      this.tapStart = null;
      this.isDoubleTap = true;
    }
  }

  /** Call after checkDoubleTap on pointerup to advance the tap history. */
  commitTap(): void {
    this.previousTap = this.tapStart;
  }

  resetDoubleTap(): void {
    this.isDoubleTap = false;
  }

  reset(): void {
    this.taps = 0;
    this.tapStart = null;
    this.previousTap = null;
    this.isDoubleTap = false;
    if (this.tapTimeoutId) {
      clearTimeout(this.tapTimeoutId);
      this.tapTimeoutId = null;
    }
  }
}
