// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EdgePanning } from '../edge-panning';
import type { EdgePanningCallbacks } from '../edge-panning';
import type { WeaveNodesSelectionPanningOnSelectionConfig } from '../types';

const DEFAULT_CONFIG: WeaveNodesSelectionPanningOnSelectionConfig = {
  edgeThreshold: 50,
  minScrollSpeed: 1,
  maxScrollSpeed: 15,
};

function makeStage(pointerPos: { x: number; y: number } | null = { x: 250, y: 250 }) {
  return {
    getPointerPosition: vi.fn().mockReturnValue(pointerPos),
    width: vi.fn().mockReturnValue(500),
    height: vi.fn().mockReturnValue(500),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    scaleX: vi.fn().mockReturnValue(1),
    // Allow setting x/y
    _x: 0,
    _y: 0,
  };
}

function makeCallbacks(
  stage: ReturnType<typeof makeStage>,
  isSelectingFn = vi.fn().mockReturnValue(true)
): EdgePanningCallbacks & { onTick: ReturnType<typeof vi.fn> } {
  const onTick = vi.fn();
  return {
    getStage: () => stage as unknown as import('konva/lib/Stage').Stage,
    isSelecting: isSelectingFn,
    onTick,
  };
}

describe('EdgePanning', () => {
  let rafCallbacks: Array<FrameRequestCallback> = [];
  let rafIdCounter = 1;

  beforeEach(() => {
    rafCallbacks = [];
    rafIdCounter = 1;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = rafIdCounter++;
      rafCallbacks.push(cb);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushRaf() {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach((cb) => cb(0));
  }

  // ── start / stop ──────────────────────────────────────────────────────────

  describe('start()', () => {
    it('schedules a requestAnimationFrame', () => {
      const stage = makeStage();
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.start();
      expect(rafCallbacks).toHaveLength(1);
    });
  });

  describe('stop()', () => {
    it('cancels the rAF when one is running', () => {
      const stage = makeStage();
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.start();
      panning.stop();
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('no-ops when stop is called before start', () => {
      const stage = makeStage();
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      expect(() => panning.stop()).not.toThrow();
      expect(cancelAnimationFrame).not.toHaveBeenCalled();
    });
  });

  // ── reset ─────────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('zeros direction and speed vectors', () => {
      const stage = makeStage({ x: 5, y: 5 }); // near top-left edge
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(1);
      expect(panning.direction.y).toBe(1);

      panning.reset();
      expect(panning.direction.x).toBe(0);
      expect(panning.direction.y).toBe(0);
    });
  });

  // ── updateDirection ───────────────────────────────────────────────────────

  describe('updateDirection()', () => {
    it('no-ops when stage has no pointer position', () => {
      const stage = makeStage(null);
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(0);
      expect(panning.direction.y).toBe(0);
    });

    it('sets direction.x=1 (pan right) when pointer is near left edge', () => {
      const stage = makeStage({ x: 10, y: 250 });
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(1);
      expect(panning.direction.y).toBe(0);
    });

    it('sets direction.x=-1 (pan left) when pointer is near right edge', () => {
      const stage = makeStage({ x: 490, y: 250 });
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(-1);
      expect(panning.direction.y).toBe(0);
    });

    it('sets direction.y=1 (pan down) when pointer is near top edge', () => {
      const stage = makeStage({ x: 250, y: 10 });
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(0);
      expect(panning.direction.y).toBe(1);
    });

    it('sets direction.y=-1 (pan up) when pointer is near bottom edge', () => {
      const stage = makeStage({ x: 250, y: 490 });
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(0);
      expect(panning.direction.y).toBe(-1);
    });

    it('zeros direction when pointer is in the center', () => {
      const stage = makeStage({ x: 250, y: 250 });
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(0);
      expect(panning.direction.y).toBe(0);
    });

    it('sets both x and y direction when pointer is near a corner', () => {
      const stage = makeStage({ x: 5, y: 5 });
      const callbacks = makeCallbacks(stage);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      expect(panning.direction.x).toBe(1);
      expect(panning.direction.y).toBe(1);
    });
  });

  // ── loop (via rAF) ────────────────────────────────────────────────────────

  describe('loop() — rAF-driven pan', () => {
    it('moves the stage and calls onTick when isSelecting and direction is non-zero', () => {
      const stage = makeStage({ x: 10, y: 250 }); // near left → direction.x=1

      let stageX = 0;
      (stage.x as ReturnType<typeof vi.fn>).mockImplementation((val?: number) => {
        if (val !== undefined) { stageX = val; }
        return stageX;
      });

      const callbacks = makeCallbacks(stage, vi.fn().mockReturnValue(true));
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      panning.start();
      flushRaf(); // run one loop iteration

      expect(callbacks.onTick).toHaveBeenCalled();
      expect(stageX).toBeGreaterThan(0);
    });

    it('reschedules rAF when still selecting', () => {
      const stage = makeStage({ x: 10, y: 250 });
      const callbacks = makeCallbacks(stage, vi.fn().mockReturnValue(true));
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      panning.start();
      expect(rafCallbacks).toHaveLength(1);
      flushRaf(); // first loop iteration
      expect(rafCallbacks).toHaveLength(1); // one more scheduled
    });

    it('does NOT reschedule when isSelecting becomes false', () => {
      const stage = makeStage({ x: 10, y: 250 });
      const isSelecting = vi.fn().mockReturnValue(false);
      const callbacks = makeCallbacks(stage, isSelecting);
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.updateDirection();
      panning.start();
      flushRaf();
      expect(rafCallbacks).toHaveLength(0); // not rescheduled
    });

    it('skips pan when direction is (0,0) even if selecting', () => {
      const stage = makeStage({ x: 250, y: 250 }); // center — no direction
      const callbacks = makeCallbacks(stage, vi.fn().mockReturnValue(true));
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);

      panning.start();
      flushRaf();

      expect(callbacks.onTick).not.toHaveBeenCalled();
    });

    it('getSpeedFromEdge returns 0 when scaledDistance >= edgeThreshold (zoomed out)', () => {
      // scaleX=0.4: pointer at x=20, distLeft=20+0=20 < edgeThreshold=50
      // scaledDistance = 20/0.4 = 50 which is >= edgeThreshold → getSpeedFromEdge returns 0
      const stage = makeStage({ x: 20, y: 250 });
      (stage.scaleX as ReturnType<typeof vi.fn>).mockReturnValue(0.4);
      const callbacks = makeCallbacks(stage, vi.fn().mockReturnValue(true));
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);
      panning.updateDirection();
      // direction.x is set to 1 (still near left edge), but speed.x should be 0
      expect(panning.direction.x).toBe(1);
      expect(panning.speed.x).toBe(0);
    });

    it('uses || 0 fallback when speed.x/y is 0 during loop (line 115)', () => {
      // x=20, scale=0.4: scaledDistance=50 >= edgeThreshold=50 → speed.x=0
      // but distLeft=20 < edgeThreshold=50 → direction.x=1 still
      const stage = makeStage({ x: 20, y: 250 });
      (stage.scaleX as ReturnType<typeof vi.fn>).mockReturnValue(0.4);

      const callbacks = makeCallbacks(stage, vi.fn().mockReturnValue(true));
      const panning = new EdgePanning(DEFAULT_CONFIG, callbacks);
      panning.updateDirection(); // speed.x = 0, direction.x = 1
      expect(panning.speed.x).toBe(0);
      expect(panning.direction.x).toBe(1);

      panning.start();
      flushRaf(); // (0 || 0) / scale = 0 → stepX = 0 → onTick(0, 0)
      expect(callbacks.onTick).toHaveBeenCalledWith(0, 0);
    });
  });
});
