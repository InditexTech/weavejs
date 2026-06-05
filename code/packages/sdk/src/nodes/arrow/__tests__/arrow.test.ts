// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { WeaveArrowNode } from '../arrow';
import { WEAVE_ARROW_NODE_TYPE } from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockInstance(pluginOverride?: unknown) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(pluginOverride ?? undefined) as any,
    getStage: vi.fn().mockReturnValue({
      findOne: vi.fn().mockReturnValue(null),
      container: vi.fn().mockReturnValue({ style: {} }),
    }),
    getMainLayer: vi.fn().mockReturnValue(undefined),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    setMutexLock: vi.fn(),
    releaseMutexLock: vi.fn(),
    getRealSelectedNode: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
  };
}

function makeNode(transformConfig?: object): {
  node: WeaveArrowNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = transformConfig
    ? new WeaveArrowNode({ config: { transform: transformConfig } })
    : new WeaveArrowNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'arrow-id',
    nodeType: WEAVE_ARROW_NODE_TYPE,
    x: 0,
    y: 0,
    points: [0, 0, 100, 100],
    stroke: '#000000',
    strokeWidth: 2,
    fill: '#000000',
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: 1,
    children: [],
    ...overrides,
  };
}

// Plugin mock satisfying setupDefaultNodeEvents and onUpdate requirements.
function makePluginMock(transformerOverride?: Konva.Transformer) {
  const transformer = transformerOverride ?? new Konva.Transformer();
  return {
    getTransformer: vi.fn().mockReturnValue(transformer),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
}

// ---------------------------------------------------------------------------
// Global setup: install Konva.Node prototype augmentations once
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveArrowNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 instantiates with no params and nodeType is "arrow"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_ARROW_NODE_TYPE);
    });

    it('1.2 accepts partial transform config and reflects it in getTransformerProperties', () => {
      const { node } = makeNode({ rotateEnabled: false });
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      const props = arrow.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
    });

    it('1.3 initialize property is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — onRender: arrow shape
  // -------------------------------------------------------------------------

  describe('onRender — arrow shape', () => {
    it('2.1 returns a Konva.Arrow (not a Konva.Group)', () => {
      const { node } = makeNode();
      const result = node.onRender(defaultProps());
      expect(result).toBeInstanceOf(Konva.Arrow);
    });

    it('2.2 arrow name is "node"', () => {
      const { node } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      expect(arrow.name()).toBe('node');
    });

    it('2.3 arrow id matches props.id', () => {
      const { node } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      expect(arrow.id()).toBe('arrow-id');
    });

    it('2.4 arrow points are set from props.points', () => {
      const { node } = makeNode();
      const points = [0, 0, 50, 50, 100, 0];
      const arrow = node.onRender(defaultProps({ points })) as Konva.Arrow;
      expect(arrow.points()).toEqual(points);
    });

    it('2.5 strokeScaleEnabled is true', () => {
      const { node } = makeNode();
      const arrow = node.onRender(
        defaultProps({ strokeScaleEnabled: false })
      ) as Konva.Arrow;
      // onRender explicitly overrides strokeScaleEnabled to true
      expect(arrow.strokeScaleEnabled()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: getTransformerProperties
  // -------------------------------------------------------------------------

  describe('onRender — getTransformerProperties', () => {
    it('3.1 is a function on the returned arrow', () => {
      const { node } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      expect(typeof arrow.getTransformerProperties).toBe('function');
    });

    it('3.2 returns default transformer properties with config values applied', () => {
      const { node } = makeNode({ rotateEnabled: false, borderEnabled: false });
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      const props = arrow.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
      expect(props.borderEnabled).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: getNodeAnchors
  // -------------------------------------------------------------------------

  describe('onRender — getNodeAnchors', () => {
    it('4.1 is a function on the returned arrow', () => {
      const { node } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (arrow as any).getNodeAnchors).toBe('function');
    });

    it('4.2 returns an empty array — no resize anchors for arrow nodes', () => {
      const { node } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((arrow as any).getNodeAnchors()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    it('5.1 calls setAttrs on the instance with nextProps', () => {
      const { node } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      const setAttrsSpy = vi.spyOn(arrow, 'setAttrs');
      const nextProps = defaultProps({ points: [0, 0, 200, 200], strokeWidth: 4 });
      node.onUpdate(arrow, nextProps);
      expect(setAttrsSpy).toHaveBeenCalledWith(
        expect.objectContaining(nextProps)
      );
    });

    it('5.2 calls getTransformer().forceUpdate() when plugin is present', () => {
      const { node, mock } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      const forceUpdate = vi.fn();
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(arrow, defaultProps());
      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('5.3 does NOT call getSelectedNodes or setSelectedNodes (arrow only uses forceUpdate)', () => {
      const { node, mock } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      const pluginMock = makePluginMock();
      pluginMock.getTransformer.mockReturnValue({ forceUpdate: vi.fn() });
      mock.getPlugin.mockReturnValue(pluginMock);
      node.onUpdate(arrow, defaultProps());
      expect(pluginMock.getSelectedNodes).not.toHaveBeenCalled();
      expect(pluginMock.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('5.4 does not throw when nodesSelectionPlugin is absent', () => {
      const { node, mock } = makeNode();
      const arrow = node.onRender(defaultProps()) as Konva.Arrow;
      mock.getPlugin.mockReturnValue(undefined);
      expect(() => node.onUpdate(arrow, defaultProps())).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    it('6.1 scales each point x-coordinate by scaleX', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [10, 20, 30, 40],
        scaleX: 2,
        scaleY: 1,
        width: 100,
        height: 100,
      });
      node.scaleReset(arrow);
      const pts = arrow.points();
      expect(pts[0]).toBe(20); // 10 * 2
      expect(pts[2]).toBe(60); // 30 * 2
    });

    it('6.2 scales each point y-coordinate by scaleY (independently from x)', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [10, 20, 30, 40],
        scaleX: 1,
        scaleY: 3,
        width: 100,
        height: 100,
      });
      node.scaleReset(arrow);
      const pts = arrow.points();
      expect(pts[1]).toBe(60);  // 20 * 3
      expect(pts[3]).toBe(120); // 40 * 3
    });

    it('6.3 handles a 4-point (8-value) array correctly', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [0, 0, 50, 0, 100, 50, 150, 100],
        scaleX: 2,
        scaleY: 2,
        width: 100,
        height: 100,
      });
      node.scaleReset(arrow);
      expect(arrow.points()).toEqual([0, 0, 100, 0, 200, 100, 300, 200]);
    });

    it('6.4 handles empty points array without error', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [],
        scaleX: 2,
        scaleY: 2,
        width: 100,
        height: 100,
      });
      expect(() => node.scaleReset(arrow)).not.toThrow();
      expect(arrow.points()).toEqual([]);
    });

    it('6.5 width code path executes without error at normal scale', () => {
      // Konva.Arrow computes width() from bounding box of points, not a stored
      // attr, so the setter is a no-op. We verify the code runs without error.
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [0, 0, 100, 0],
        scaleX: 3,
        scaleY: 1,
        width: 50,
        height: 50,
      });
      expect(() => node.scaleReset(arrow)).not.toThrow();
    });

    it('6.6 height code path executes without error at normal scale', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [0, 0, 0, 100],
        scaleX: 1,
        scaleY: 4,
        width: 50,
        height: 50,
      });
      expect(() => node.scaleReset(arrow)).not.toThrow();
    });

    it('6.7 Math.max(5, ...) min-width floor executes without error when scaled width < 5', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [0, 0, 0.1, 0],
        scaleX: 0.01,
        scaleY: 1,
        width: 0.1,
        height: 50,
      });
      expect(() => node.scaleReset(arrow)).not.toThrow();
    });

    it('6.8 Math.max(5, ...) min-height floor executes without error when scaled height < 5', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [0, 0, 0, 0.1],
        scaleX: 1,
        scaleY: 0.01,
        width: 50,
        height: 0.1,
      });
      expect(() => node.scaleReset(arrow)).not.toThrow();
    });

    it('6.9 resets scale to {x: 1, y: 1} — no position compensation', () => {
      const { node } = makeNode();
      const arrow = new Konva.Arrow({
        points: [0, 0, 100, 100],
        scaleX: 2,
        scaleY: 2,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      });
      const xBefore = arrow.x();
      const yBefore = arrow.y();
      node.scaleReset(arrow);
      expect(arrow.scaleX()).toBe(1);
      expect(arrow.scaleY()).toBe(1);
      // Arrow scaleReset does NOT adjust x/y (unlike ellipse/polygon/star)
      expect(arrow.x()).toBe(xBefore);
      expect(arrow.y()).toBe(yBefore);
    });
  });
});
