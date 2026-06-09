// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';

// ─── Konva mock ────────────────────────────────────────────────────────────────

vi.mock('konva', () => ({
  default: {},
}));

// ─── imports ──────────────────────────────────────────────────────────────────

import { roundNumber, applySnap, getNodeRect, getNodesRect } from '../utils';
import type { SnapResult } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNode(
  pos: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
) {
  return {
    position: vi.fn().mockImplementation((next?: { x: number; y: number }) => {
      if (next !== undefined) {
        pos.x = next.x;
        pos.y = next.y;
      }
      return { ...pos };
    }),
    getClientRect: vi.fn().mockReturnValue({ ...rect }),
    x: vi.fn().mockReturnValue(pos.x),
    y: vi.fn().mockReturnValue(pos.y),
  };
}

// ─── roundNumber ──────────────────────────────────────────────────────────────

describe('roundNumber', () => {
  it('rounds 1.0 to 1.0', () => {
    expect(roundNumber(1.0)).toBe(1.0);
  });

  it('rounds 1.2 down to 1.0', () => {
    expect(roundNumber(1.2)).toBe(1.0);
  });

  it('rounds 1.3 up to 1.5', () => {
    expect(roundNumber(1.3)).toBe(1.5);
  });

  it('rounds 1.8 to 2.0', () => {
    expect(roundNumber(1.8)).toBe(2.0);
  });

  it('rounds 0 to 0', () => {
    expect(roundNumber(0)).toBe(0);
  });

  it('rounds negative -1.2 to -1.0', () => {
    expect(roundNumber(-1.2)).toBe(-1.0);
  });

  it('rounds negative -1.3 to -1.5', () => {
    expect(roundNumber(-1.3)).toBe(-1.5);
  });

  it('rounds 0.25 to 0.5', () => {
    expect(roundNumber(0.25)).toBe(0.5);
  });
});

// ─── applySnap ────────────────────────────────────────────────────────────────

describe('applySnap', () => {
  it('updates x when vertical snap is present', () => {
    const pos = { x: 10, y: 20 };
    const node = makeNode(pos, { x: 10, y: 20, width: 50, height: 50 });
    const snap: SnapResult = {
      vertical: {
        orientation: 'V',
        guideId: 'g1',
        containerId: 'c1',
        guide: 100,
        offset: 0,
        diff: 2,
        kind: 'static',
      },
    };

    applySnap([node] as never, [{ x: 0, y: 0 }], snap);

    expect(node.position).toHaveBeenCalledWith({ x: 100, y: 20 });
  });

  it('updates y when horizontal snap is present', () => {
    const pos = { x: 10, y: 20 };
    const node = makeNode(pos, { x: 10, y: 20, width: 50, height: 50 });
    const snap: SnapResult = {
      horizontal: {
        orientation: 'H',
        guideId: 'g2',
        containerId: 'c1',
        guide: 200,
        offset: 0,
        diff: 1,
        kind: 'static',
      },
    };

    applySnap([node] as never, [{ x: 0, y: 0 }], snap);

    expect(node.position).toHaveBeenCalledWith({ x: 10, y: 200 });
  });

  it('updates both x and y when both snaps are present', () => {
    const pos = { x: 10, y: 20 };
    const node = makeNode(pos, { x: 10, y: 20, width: 50, height: 50 });
    const snap: SnapResult = {
      vertical: {
        orientation: 'V',
        guideId: 'g1',
        containerId: 'c1',
        guide: 100,
        offset: 0,
        diff: 1,
        kind: 'static',
      },
      horizontal: {
        orientation: 'H',
        guideId: 'g2',
        containerId: 'c1',
        guide: 200,
        offset: 0,
        diff: 1,
        kind: 'static',
      },
    };

    applySnap([node] as never, [{ x: 0, y: 0 }], snap);

    expect(node.position).toHaveBeenCalledWith({ x: 100, y: 200 });
  });

  it('does not change position when snap is empty', () => {
    const pos = { x: 10, y: 20 };
    const node = makeNode(pos, { x: 10, y: 20, width: 50, height: 50 });
    const snap: SnapResult = {};

    applySnap([node] as never, [{ x: 0, y: 0 }], snap);

    expect(node.position).toHaveBeenCalledWith({ x: 10, y: 20 });
  });

  it('applies offset from snap.vertical', () => {
    const pos = { x: 10, y: 20 };
    const node = makeNode(pos, { x: 10, y: 20, width: 50, height: 50 });
    const snap: SnapResult = {
      vertical: {
        orientation: 'V',
        guideId: 'g1',
        containerId: 'c1',
        guide: 100,
        offset: -25,
        diff: 1,
        kind: 'static',
      },
    };

    applySnap([node] as never, [{ x: 0, y: 0 }], snap);

    expect(node.position).toHaveBeenCalledWith({ x: 75, y: 20 });
  });

  it('adds offset from offsets[] array', () => {
    const pos = { x: 10, y: 20 };
    const node = makeNode(pos, { x: 10, y: 20, width: 50, height: 50 });
    const snap: SnapResult = {
      vertical: {
        orientation: 'V',
        guideId: 'g1',
        containerId: 'c1',
        guide: 100,
        offset: 0,
        diff: 1,
        kind: 'static',
      },
    };

    applySnap([node] as never, [{ x: 5, y: 0 }], snap);

    expect(node.position).toHaveBeenCalledWith({ x: 105, y: 20 });
  });

  it('handles multiple nodes with individual offsets', () => {
    const pos1 = { x: 10, y: 20 };
    const pos2 = { x: 50, y: 80 };
    const node1 = makeNode(pos1, { x: 10, y: 20, width: 50, height: 50 });
    const node2 = makeNode(pos2, { x: 50, y: 80, width: 50, height: 50 });
    const snap: SnapResult = {
      vertical: {
        orientation: 'V',
        guideId: 'g1',
        containerId: 'c1',
        guide: 100,
        offset: 0,
        diff: 1,
        kind: 'static',
      },
    };

    applySnap([node1, node2] as never, [{ x: 0, y: 0 }, { x: 40, y: 0 }], snap);

    expect(node1.position).toHaveBeenCalledWith({ x: 100, y: 20 });
    expect(node2.position).toHaveBeenCalledWith({ x: 140, y: 80 });
  });
});

// ─── getNodeRect ──────────────────────────────────────────────────────────────

describe('getNodeRect', () => {
  it('calls getClientRect without relativeTo when not provided', () => {
    const rect = { x: 5, y: 10, width: 100, height: 50 };
    const node = { getClientRect: vi.fn().mockReturnValue(rect) };

    const result = getNodeRect(node as never);

    expect(node.getClientRect).toHaveBeenCalledWith({ skipStroke: true });
    expect(result).toEqual(rect);
  });

  it('calls getClientRect with relativeTo when provided', () => {
    const rect = { x: 5, y: 10, width: 100, height: 50 };
    const node = { getClientRect: vi.fn().mockReturnValue(rect) };
    const container = {};

    const result = getNodeRect(node as never, container as never);

    expect(node.getClientRect).toHaveBeenCalledWith({
      relativeTo: container,
      skipStroke: true,
    });
    expect(result).toEqual(rect);
  });
});

// ─── getNodesRect ─────────────────────────────────────────────────────────────

describe('getNodesRect', () => {
  const container = {};

  it('returns correct bounding box for a single node', () => {
    const node = { getClientRect: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 50 }) };

    const result = getNodesRect([node] as never, container as never);

    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('returns union bounding box for non-overlapping nodes', () => {
    // node1: x=0..100, y=0..50  node2: x=200..300, y=100..200
    const node1 = { getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }) };
    const node2 = { getClientRect: vi.fn().mockReturnValue({ x: 200, y: 100, width: 100, height: 100 }) };

    const result = getNodesRect([node1, node2] as never, container as never);

    expect(result).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });

  it('returns union bounding box for overlapping nodes', () => {
    const node1 = { getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }) };
    const node2 = { getClientRect: vi.fn().mockReturnValue({ x: 50, y: 50, width: 100, height: 100 }) };

    const result = getNodesRect([node1, node2] as never, container as never);

    expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('handles a node entirely inside another', () => {
    const outer = { getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 200, height: 200 }) };
    const inner = { getClientRect: vi.fn().mockReturnValue({ x: 50, y: 50, width: 50, height: 50 }) };

    const result = getNodesRect([outer, inner] as never, container as never);

    expect(result).toEqual({ x: 0, y: 0, width: 200, height: 200 });
  });

  it('passes relativeTo to each getNodeRect call', () => {
    const node = { getClientRect: vi.fn().mockReturnValue({ x: 10, y: 10, width: 50, height: 50 }) };

    getNodesRect([node] as never, container as never);

    expect(node.getClientRect).toHaveBeenCalledWith({
      relativeTo: container,
      skipStroke: true,
    });
  });
});
