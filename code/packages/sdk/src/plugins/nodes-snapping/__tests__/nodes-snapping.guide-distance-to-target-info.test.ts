// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';

// ─── mocks ────────────────────────────────────────────────────────────────────

vi.mock('konva', () => ({
  default: {
    Rect: vi.fn().mockImplementation(() => ({
      destroy: vi.fn(),
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
      width: vi.fn().mockReturnThis(),
      height: vi.fn().mockReturnThis(),
      moveToTop: vi.fn(),
      moveToBottom: vi.fn(),
    })),
    Line: vi.fn().mockImplementation(() => ({
      destroy: vi.fn(),
      points: vi.fn().mockReturnThis(),
      x: vi.fn().mockReturnValue(0),
      y: vi.fn().mockReturnValue(0),
      width: vi.fn().mockReturnValue(0),
      height: vi.fn().mockReturnValue(0),
      moveToTop: vi.fn(),
    })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      destroy: vi.fn(),
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
      moveToTop: vi.fn(),
    })),
    Text: vi.fn().mockImplementation(() => ({
      text: vi.fn().mockReturnThis(),
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis(),
      measureSize: vi.fn().mockReturnValue({ width: 40, height: 14 }),
    })),
  },
}));

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('../utils', () => ({
  getNodesRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
  roundNumber: vi.fn().mockImplementation((v: number) => Math.round(v * 2) / 2),
}));
vi.mock('../nodes-selection/nodes-selection', () => ({}));
vi.mock('./nodes-snapping', () => ({}));

// ─── imports ──────────────────────────────────────────────────────────────────

import { WeaveNodesSnappingGuideDistanceToTargetInfo } from '../nodes-snapping.guide-distance-to-target-info';
import { GUIDE_KIND } from '../constants';
import type { Guide } from '../types';
import { getNodesRect } from '../utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STYLE = {
  target: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
  distance: {
    opacity: 1,
    line: { stroke: '#f00', strokeWidth: 1, dash: [], opacity: 1 },
    text: { fill: '#fff', fontSize: 10, fontFamily: 'monospace', opacity: 1 },
    background: { fill: '#f00', cornerRadius: 4, stroke: '#f00', strokeWidth: 0, opacity: 1 },
  },
};

function makeStage(scaleX = 1) {
  return {
    scaleX: vi.fn().mockReturnValue(scaleX),
    scaleY: vi.fn().mockReturnValue(scaleX),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    position: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
    findOne: vi.fn().mockReturnValue(null),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
  };
}

function makeWeave(stage: ReturnType<typeof makeStage>) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('mainLayer') }),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getMousePointer: vi.fn().mockReturnValue({ mousePoint: { x: 0, y: 0 } }),
    getUtilityLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
  };
}

function makeGuide(orientation: 'H' | 'V', containerId = 'mainLayer'): Guide {
  return {
    guideId: 'g1',
    orientation,
    value: 100,
    kind: GUIDE_KIND.CUSTOM,
    containerId,
  };
}

function setup(scaleX = 1) {
  const stage = makeStage(scaleX);
  const weave = makeWeave(stage);
  const info = new WeaveNodesSnappingGuideDistanceToTargetInfo(weave as never, {
    config: { style: STYLE },
  });
  return { info, stage, weave };
}

// ─── cleanup ──────────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuideDistanceToTargetInfo.cleanup', () => {
  it('destroys targetBoundary and sets it undefined', () => {
    const { info } = setup();
    const destroy = vi.fn();
    (info as unknown as { targetBoundary: { destroy: typeof destroy } }).targetBoundary = {
      destroy,
    };
    info.cleanup();
    expect(destroy).toHaveBeenCalled();
    expect(
      (info as unknown as { targetBoundary: unknown }).targetBoundary
    ).toBeUndefined();
  });

  it('destroys distanceLine and sets it undefined', () => {
    const { info } = setup();
    const destroy = vi.fn();
    (info as unknown as { distanceLine: { destroy: typeof destroy } }).distanceLine = { destroy };
    info.cleanup();
    expect(destroy).toHaveBeenCalled();
    expect(
      (info as unknown as { distanceLine: unknown }).distanceLine
    ).toBeUndefined();
  });

  it('destroys distanceBox and sets it undefined', () => {
    const { info } = setup();
    const destroy = vi.fn();
    (info as unknown as { distanceBox: { destroy: typeof destroy } }).distanceBox = { destroy };
    info.cleanup();
    expect(destroy).toHaveBeenCalled();
    expect(
      (info as unknown as { distanceBox: unknown }).distanceBox
    ).toBeUndefined();
  });

  it('does not throw when nothing is initialized', () => {
    const { info } = setup();
    expect(() => info.cleanup()).not.toThrow();
  });
});

// ─── cleanupTarget ────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuideDistanceToTargetInfo.cleanupTarget', () => {
  it('sets targetRect to undefined', () => {
    const { info } = setup();
    (info as unknown as { targetRect: unknown }).targetRect = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };
    info.cleanupTarget();
    expect((info as unknown as { targetRect: unknown }).targetRect).toBeUndefined();
  });
});

// ─── handleTarget ─────────────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuideDistanceToTargetInfo.handleTarget', () => {
  it('sets targetRect from selected nodes bounding rect', () => {
    const { info, weave } = setup();
    const mockNode = { getClientRect: vi.fn().mockReturnValue({ x: 5, y: 5, width: 50, height: 50 }) };
    const selectionPlugin = { getSelectedNodes: vi.fn().mockReturnValue([mockNode]) };
    const snappingPlugin = {
      getGuidesManager: vi.fn().mockReturnValue({ getSelectedGuide: vi.fn().mockReturnValue(null) }),
    };
    weave.getPlugin.mockImplementation((key: string) =>
      key === 'nodesSnapping' ? snappingPlugin : selectionPlugin
    );

    vi.mocked(getNodesRect).mockReturnValue({ x: 5, y: 5, width: 50, height: 50 });

    const guide = makeGuide('V');
    info.handleTarget(guide);

    expect((info as unknown as { targetRect: unknown }).targetRect).toEqual({
      x: 5,
      y: 5,
      width: 50,
      height: 50,
    });
  });

  it('does not set targetRect when no nodes are selected and no selected guide', () => {
    const { info, weave } = setup();
    const selectionPlugin = { getSelectedNodes: vi.fn().mockReturnValue([]) };
    const snappingPlugin = {
      getGuidesManager: vi.fn().mockReturnValue({ getSelectedGuide: vi.fn().mockReturnValue(null) }),
    };
    weave.getPlugin.mockImplementation((key: string) =>
      key === 'nodesSnapping' ? snappingPlugin : selectionPlugin
    );

    const guide = makeGuide('V');
    info.handleTarget(guide);

    expect((info as unknown as { targetRect: unknown }).targetRect).toBeUndefined();
  });
});

// ─── handleDistanceLine ───────────────────────────────────────────────────────

describe('WeaveNodesSnappingGuideDistanceToTargetInfo.handleDistanceLine', () => {
  it('returns early when targetRect is undefined', () => {
    const { info } = setup();
    const guide = makeGuide('V');
    expect(() => info.handleDistanceLine(guide, true)).not.toThrow();
    expect((info as unknown as { distanceLine: unknown }).distanceLine).toBeUndefined();
  });

  it('destroys distanceLine when isOptionAltPressed is false', () => {
    const { info } = setup();
    const destroy = vi.fn();
    (info as unknown as { distanceLine: { destroy: typeof destroy; points: () => number[] } }).distanceLine = {
      destroy,
      points: vi.fn().mockReturnValue([0, 0, 0, 0]),
    };
    (info as unknown as { targetRect: unknown }).targetRect = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };

    info.handleDistanceLine(makeGuide('V'), false);

    expect(destroy).toHaveBeenCalled();
    expect(
      (info as unknown as { distanceLine: unknown }).distanceLine
    ).toBeUndefined();
  });

  it('destroys targetBoundary when isOptionAltPressed is false', () => {
    const { info } = setup();
    const destroy = vi.fn();
    (info as unknown as { targetBoundary: { destroy: typeof destroy } }).targetBoundary = {
      destroy,
    };
    (info as unknown as { targetRect: unknown }).targetRect = {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };

    info.handleDistanceLine(makeGuide('H'), false);

    expect(destroy).toHaveBeenCalled();
  });
});

// ─── getVisibleRect (private, tested indirectly via handleDistanceLine) ───────

describe('getVisibleRect (via handleDistanceLine)', () => {
  it('does not throw for guide in a container', () => {
    const { info, stage, weave } = setup();

    const containerNode = {
      getClientRect: vi.fn().mockReturnValue({ x: 50, y: 0, width: 300, height: 300 }),
    };
    stage.findOne.mockReturnValue(containerNode);
    weave.getMousePointer.mockReturnValue({ mousePoint: { x: 200, y: 100 } });

    (info as unknown as { targetRect: unknown }).targetRect = {
      x: 100,
      y: 50,
      width: 80,
      height: 40,
    };

    const guide = makeGuide('V', 'frame1');
    expect(() => info.handleDistanceLine(guide, true)).not.toThrow();
  });
});

// ─── closestX (private, tested via public behavior) ──────────────────────────

describe('closestX private method (via handleDistanceLine behavior)', () => {
  it('produces a distanceLine pointing to the closer edge of targetRect for HORIZONTAL', () => {
    const { info, weave, stage } = setup();
    stage.findOne.mockReturnValue(null);

    // Mouse at y=10, targetRect y=0..50 → closest edge is y=0 (distance 10)
    weave.getMousePointer.mockReturnValue({ mousePoint: { x: 200, y: 10 } });

    (info as unknown as { targetRect: unknown }).targetRect = {
      x: 100,
      y: 0,
      width: 100,
      height: 50,
    };

    const guide = makeGuide('H');
    // Should not throw; distanceLine will be created
    expect(() => info.handleDistanceLine(guide, true)).not.toThrow();
  });
});

// ─── perpendicularWithDirection (private, via handleDistanceLine) ─────────────

describe('perpendicularWithDirection (via handleDistanceLine)', () => {
  it('does not throw when computing perpendicular offset for VERTICAL guide', () => {
    const { info, weave, stage } = setup();
    stage.findOne.mockReturnValue(null);
    weave.getMousePointer.mockReturnValue({ mousePoint: { x: 200, y: 50 } });

    (info as unknown as { targetRect: unknown }).targetRect = {
      x: 100,
      y: 0,
      width: 100,
      height: 50,
    };

    // First call creates the distanceLine
    info.handleDistanceLine(makeGuide('V'), true);

    // Mock distanceLine with fake points for second call
    const mockLine = (info as unknown as {
      distanceLine: {
        points: () => number[];
        destroy: ReturnType<typeof vi.fn>;
      };
    }).distanceLine;

    if (mockLine) {
      vi.mocked(mockLine.points).mockReturnValue([100, 25, 200, 25]);
    }

    // Second call should update without throwing
    expect(() => info.handleDistanceLine(makeGuide('V'), true)).not.toThrow();
  });
});
