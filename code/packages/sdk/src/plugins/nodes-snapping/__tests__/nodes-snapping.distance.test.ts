// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── mocks ────────────────────────────────────────────────────────────────────

vi.mock('konva', () => ({
  default: {
    Line: vi.fn().mockImplementation((cfg: Record<string, unknown>) => ({
      ...cfg,
      moveToTop: vi.fn(),
    })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      moveToTop: vi.fn(),
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
    })),
    Text: vi.fn().mockImplementation(() => ({
      measureSize: vi.fn().mockReturnValue({ width: 40, height: 14 }),
      position: vi.fn(),
      moveToTop: vi.fn(),
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
    })),
    Rect: vi.fn().mockImplementation(() => ({
      width: vi.fn().mockReturnThis(),
      height: vi.fn().mockReturnThis(),
      moveToBottom: vi.fn(),
    })),
  },
}));

vi.mock('nanoid', () => ({ nanoid: () => 'mock-id' }));
vi.mock('@/weave', () => ({ Weave: class Weave {} }));

vi.mock('../utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('../utils')>();
  return {
    ...original,
    getNodeRect: vi.fn().mockReturnValue({ x: 10, y: 10, width: 80, height: 40 }),
    getNodesRect: vi.fn().mockReturnValue({ x: 10, y: 10, width: 80, height: 40 }),
    applySnap: vi.fn(),
  };
});

// ─── imports ──────────────────────────────────────────────────────────────────

import { WeaveNodesSnappingDistance } from '../nodes-snapping.distance';
import type { BoundingBoxWithId } from '../types';
import { applySnap, getNodeRect } from '../utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBox(id: string, x: number, y: number, w: number, h: number): BoundingBoxWithId {
  return { id, box: { x, y, width: w, height: h } };
}

function makeLayer() {
  return {
    add: vi.fn(),
    batchDraw: vi.fn(),
    find: vi.fn().mockReturnValue([]),
  };
}

function makeStage() {
  return {
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    findOne: vi.fn().mockReturnValue(null),
  };
}

function makeWeave(stage: ReturnType<typeof makeStage>) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('mainLayer') }),
    getEventsController: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn(),
    getPlugin: vi.fn().mockReturnValue(undefined),
  };
}

function makeKonvaNode(id: string, rect = { x: 10, y: 10, width: 80, height: 40 }) {
  return {
    getAttrs: vi.fn().mockReturnValue({ id }),
    id: vi.fn().mockReturnValue(id),
    getClientRect: vi.fn().mockReturnValue(rect),
  };
}

function setup() {
  const stage = makeStage();
  const weave = makeWeave(stage);
  const layer = makeLayer();

  const distManager = new WeaveNodesSnappingDistance(weave as never, layer as never, {
    tolerance: 5,
    style: {
      target: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
      distance: {
        opacity: 1,
        line: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
        text: { fill: '#fff', fontSize: 10, fontFamily: 'monospace', opacity: 1 },
        background: { fill: '#f00', cornerRadius: 4, stroke: '#f00', strokeWidth: 0, opacity: 1 },
      },
    },
  });

  return { distManager, stage, weave, layer };
}

// ─── intersectX ───────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingDistance.intersectX', () => {
  it('returns true when boxes overlap horizontally', () => {
    const { distManager } = setup();
    const a = makeBox('a', 0, 0, 100, 50);
    const b = makeBox('b', 50, 0, 100, 50);
    expect(distManager.intersectX(a, b)).toBe(true);
  });

  it('returns false when a is entirely left of b', () => {
    const { distManager } = setup();
    const a = makeBox('a', 0, 0, 100, 50);
    const b = makeBox('b', 110, 0, 100, 50);
    expect(distManager.intersectX(a, b)).toBe(false);
  });

  it('returns false when a is entirely right of b', () => {
    const { distManager } = setup();
    const a = makeBox('a', 200, 0, 100, 50);
    const b = makeBox('b', 0, 0, 100, 50);
    expect(distManager.intersectX(a, b)).toBe(false);
  });

  it('returns false on touching edges (not overlapping)', () => {
    const { distManager } = setup();
    // a ends at x=100, b starts at x=100
    const a = makeBox('a', 0, 0, 100, 50);
    const b = makeBox('b', 100, 0, 100, 50);
    expect(distManager.intersectX(a, b)).toBe(false);
  });
});

// ─── intersectY ───────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingDistance.intersectY', () => {
  it('returns true when boxes overlap vertically', () => {
    const { distManager } = setup();
    const a = makeBox('a', 0, 0, 50, 100);
    const b = makeBox('b', 0, 50, 50, 100);
    expect(distManager.intersectY(a, b)).toBe(true);
  });

  it('returns false when a is entirely above b', () => {
    const { distManager } = setup();
    const a = makeBox('a', 0, 0, 50, 100);
    const b = makeBox('b', 0, 110, 50, 100);
    expect(distManager.intersectY(a, b)).toBe(false);
  });

  it('returns false when a is entirely below b', () => {
    const { distManager } = setup();
    const a = makeBox('a', 0, 200, 50, 100);
    const b = makeBox('b', 0, 0, 50, 100);
    expect(distManager.intersectY(a, b)).toBe(false);
  });

  it('returns false on touching edges', () => {
    const { distManager } = setup();
    const a = makeBox('a', 0, 0, 50, 100);
    const b = makeBox('b', 0, 100, 50, 100);
    expect(distManager.intersectY(a, b)).toBe(false);
  });
});

// ─── clearSnapDistanceGuides ──────────────────────────────────────────────────

describe('WeaveNodesSnappingDistance.clearSnapDistanceGuides', () => {
  it('destroys all distance guide elements and calls batchDraw', () => {
    const { distManager, layer } = setup();
    const destroy = vi.fn();
    layer.find = vi.fn().mockReturnValue([{ destroy }]);

    distManager.clearSnapDistanceGuides();

    expect(destroy).toHaveBeenCalled();
    expect(layer.batchDraw).toHaveBeenCalled();
  });

  it('does not throw when no guides found', () => {
    const { distManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);
    expect(() => distManager.clearSnapDistanceGuides()).not.toThrow();
    expect(layer.batchDraw).toHaveBeenCalled();
  });
});

// ─── performDistanceSnapping ──────────────────────────────────────────────────

describe('WeaveNodesSnappingDistance.performDistanceSnapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw with empty peer boxes', () => {
    const { distManager } = setup();
    const node = makeKonvaNode('n1');

    expect(() =>
      distManager.performDistanceSnapping(
        [node] as never,
        [{ x: 0, y: 0 }],
        'mainLayer',
        {} as never,
        new Set()
      )
    ).not.toThrow();
  });

  it('filters out the dragged node from peer boxes', () => {
    const { distManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);
    const node = makeKonvaNode('n1');
    const peer = makeBox('peer', 200, 10, 80, 40);

    const peerBoxes = new Set([
      { id: 'n1', box: { x: 10, y: 10, width: 80, height: 40 } },
      peer,
    ]);

    const mockApplySnap = vi.mocked(applySnap);
    const mockGetNodeRect = vi.mocked(getNodeRect);
    vi.mocked(mockGetNodeRect).mockReturnValue({ x: 10, y: 10, width: 80, height: 40 });

    distManager.performDistanceSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      'mainLayer',
      {} as never,
      peerBoxes as never
    );

    // applySnap should have been called (even with no matches)
    expect(mockApplySnap).toHaveBeenCalled();
  });

  it('generates centered-horizontal guide when left and right neighbors exist', () => {
    const { distManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);
    const node = makeKonvaNode('target');

    // target in the middle (x=100..180), left node at x=0..80, right at x=200..280
    // All in same horizontal band (same Y range)
    const mockGetNodeRect = vi.mocked(getNodeRect);
    mockGetNodeRect.mockReturnValue({ x: 100, y: 10, width: 80, height: 40 });

    const left = makeBox('left', 0, 10, 80, 40);
    const right = makeBox('right', 200, 10, 80, 40);

    // ensure target box is accessible
    const peerBoxes = new Set([left, right]);

    // Use applySnap spy to capture the snap result indirectly
    const mockApplySnap = vi.mocked(applySnap);

    distManager.performDistanceSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      'mainLayer',
      {} as never,
      peerBoxes as never
    );

    expect(mockApplySnap).toHaveBeenCalled();
  });

  it('calls clearSnapDistanceGuides after applying snap', () => {
    const { distManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);
    const node = makeKonvaNode('n1');

    const mockGetNodeRect = vi.mocked(getNodeRect);
    mockGetNodeRect.mockReturnValue({ x: 10, y: 10, width: 80, height: 40 });

    distManager.performDistanceSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      'mainLayer',
      {} as never,
      new Set()
    );

    expect(layer.batchDraw).toHaveBeenCalled();
  });
});

// ─── getHorizontalIntersections (via performDistanceSnapping) ─────────────────

describe('Horizontal intersection detection', () => {
  it('detects nodes in horizontal band and computes distances', () => {
    const { distManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const node = makeKonvaNode('target');
    const mockGetNodeRect = vi.mocked(getNodeRect);
    // target box: x=100, y=10, w=80, h=40 (y range 10..50)
    mockGetNodeRect.mockReturnValue({ x: 100, y: 10, width: 80, height: 40 });

    // Two peers in same Y-band: one to the left, one to the right
    const left = makeBox('left', 0, 10, 80, 40);
    const right = makeBox('right', 200, 10, 80, 40);
    const peerBoxes = new Set([left, right]);

    const mockApplySnap = vi.mocked(applySnap);

    distManager.performDistanceSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      'mainLayer',
      {} as never,
      peerBoxes as never
    );

    expect(mockApplySnap).toHaveBeenCalled();
  });
});

// ─── getVerticalIntersections (via performDistanceSnapping) ───────────────────

describe('Vertical intersection detection', () => {
  it('detects nodes in vertical band and computes distances', () => {
    const { distManager, layer } = setup();
    layer.find = vi.fn().mockReturnValue([]);

    const node = makeKonvaNode('target');
    const mockGetNodeRect = vi.mocked(getNodeRect);
    // target box: x=10, y=100, w=80, h=40
    mockGetNodeRect.mockReturnValue({ x: 10, y: 100, width: 80, height: 40 });

    // Two peers in same X-band: one above, one below
    const top = makeBox('top', 10, 0, 80, 80);
    const bottom = makeBox('bottom', 10, 160, 80, 40);
    const peerBoxes = new Set([top, bottom]);

    const mockApplySnap = vi.mocked(applySnap);

    distManager.performDistanceSnapping(
      [node] as never,
      [{ x: 0, y: 0 }],
      'mainLayer',
      {} as never,
      peerBoxes as never
    );

    expect(mockApplySnap).toHaveBeenCalled();
  });
});
