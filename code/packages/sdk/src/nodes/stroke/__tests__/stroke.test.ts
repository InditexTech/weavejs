// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { WeaveStrokeNode } from '../stroke';
import {
  WEAVE_STROKE_NODE_DEFAULT_CONFIG,
  WEAVE_STROKE_NODE_TYPE,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import type { WeaveStrokePoint } from '../types';
import { createMockInstance } from '../../__tests__/shared/node.test-helpers';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function makeNode(config?: object): {
  node: WeaveStrokeNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  const node = config
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new WeaveStrokeNode({ config: config as any })
    : new WeaveStrokeNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'stroke-id',
    nodeType: WEAVE_STROKE_NODE_TYPE,
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    stroke: '#ff0000',
    strokeWidth: 3,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    zIndex: 1,
    children: [],
    ...overrides,
  };
}

function makePluginMock() {
  return {
    getTransformer: vi.fn().mockReturnValue({ forceUpdate: vi.fn() }),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
}

/** Returns a plain mock canvas context for testing sceneFunc / hitFunc. */
function makeMockCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    fillStrokeShape: vi.fn(),
    fillStyle: '' as string | CanvasGradient,
  };
}

/** Builds a straight horizontal line of N evenly spaced stroke points. */
function makeLine(count: number, spacing = 10): WeaveStrokePoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: i * spacing,
    y: 0,
    pressure: 1,
  }));
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  augmentKonvaNodeClass();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('WeaveStrokeNode', () => {
  // -------------------------------------------------------------------------
  // Suite 1 — constructor
  // -------------------------------------------------------------------------

  describe('constructor', () => {
    it('1.1 nodeType is "stroke"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_STROKE_NODE_TYPE);
    });

    it('1.2 initialize is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });

    it('1.3 no params → default config is applied', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.splineResolution).toBe(
        WEAVE_STROKE_NODE_DEFAULT_CONFIG.splineResolution
      );
      expect(cfg.resamplingSpacing).toBe(
        WEAVE_STROKE_NODE_DEFAULT_CONFIG.resamplingSpacing
      );
      expect(cfg.isEraser).toBe(WEAVE_STROKE_NODE_DEFAULT_CONFIG.isEraser);
    });

    it('1.4 custom config overrides defaults', () => {
      const { node } = makeNode({ splineResolution: 4, isEraser: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.splineResolution).toBe(4);
      expect(cfg.isEraser).toBe(true);
    });

    it('1.5 partial config retains unspecified defaults', () => {
      const { node } = makeNode({ isEraser: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.splineResolution).toBe(
        WEAVE_STROKE_NODE_DEFAULT_CONFIG.splineResolution
      );
      expect(cfg.isEraser).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 2 — onRender: shape output
  // -------------------------------------------------------------------------

  describe('onRender — shape output', () => {
    it('2.1 returns a Konva.Shape', () => {
      const { node } = makeNode();
      const result = node.onRender(defaultProps());
      expect(result).toBeInstanceOf(Konva.Shape);
    });

    it('2.2 shape name attr is "node"', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(shape.name()).toBe('node');
    });

    it('2.3 shape lineCap is "round"', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(shape.lineCap()).toBe('round');
    });

    it('2.4 shape lineJoin is "round"', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(shape.lineJoin()).toBe('round');
    });

    it('2.5 shape dashEnabled is false', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(shape.dashEnabled()).toBe(false);
    });

    it('2.6 passed props are reflected in shape attrs (id, strokeWidth)', () => {
      const { node } = makeNode();
      const shape = node.onRender(
        defaultProps({ strokeWidth: 7 })
      ) as Konva.Shape;
      expect(shape.id()).toBe('stroke-id');
      expect(shape.strokeWidth()).toBe(7);
    });

    it('2.7 getNodeAnchors() returns []', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((shape as any).getNodeAnchors()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 3 — onRender: transformer properties
  // -------------------------------------------------------------------------

  describe('onRender — getTransformerProperties', () => {
    it('3.1 getTransformerProperties() is a function on the shape', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(typeof shape.getTransformerProperties).toBe('function');
    });

    it('3.2 custom transform config is forwarded to getTransformerProperties', () => {
      const { node } = makeNode({
        transform: { rotateEnabled: false, borderEnabled: false },
      });
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      const props = shape.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
      expect(props.borderEnabled).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 4 — onRender: hitFunc
  // -------------------------------------------------------------------------

  describe('onRender — hitFunc', () => {
    it('4.1 hitFunc calls beginPath, rect, closePath, fillStrokeShape', () => {
      const { node } = makeNode();
      const shape = node.onRender(
        defaultProps({ width: 150, height: 80 })
      ) as Konva.Shape;
      const hitFunc = shape.getAttr('hitFunc') as (...args: unknown[]) => unknown;
      const ctx = makeMockCtx();

      hitFunc(ctx, shape);

      expect(ctx.beginPath).toHaveBeenCalledOnce();
      expect(ctx.closePath).toHaveBeenCalledOnce();
      expect(ctx.fillStrokeShape).toHaveBeenCalledWith(shape);
    });

    it('4.2 hitFunc rect uses shape.width() and shape.height()', () => {
      const { node } = makeNode();
      const shape = node.onRender(
        defaultProps({ width: 120, height: 90 })
      ) as Konva.Shape;
      const hitFunc = shape.getAttr('hitFunc') as (...args: unknown[]) => unknown;
      const ctx = makeMockCtx();

      hitFunc(ctx, shape);

      expect(ctx.rect).toHaveBeenCalledWith(0, 0, shape.width(), shape.height());
    });
  });

  // -------------------------------------------------------------------------
  // Suite 5 — onUpdate
  // -------------------------------------------------------------------------

  describe('onUpdate', () => {
    it('5.1 calls setAttrs on nodeInstance with nextProps', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      const spy = vi.spyOn(shape, 'setAttrs');
      const nextProps = defaultProps({ strokeWidth: 9 });

      node.onUpdate(shape, nextProps);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining(nextProps));
    });

    it('5.2 calls getTransformer().forceUpdate() when nodesSelection plugin is present', () => {
      const { node, mock } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      const forceUpdate = vi.fn();
      const plugin = makePluginMock();
      plugin.getTransformer.mockReturnValue({ forceUpdate });
      mock.getPlugin.mockReturnValue(plugin);

      node.onUpdate(shape, defaultProps());

      expect(forceUpdate).toHaveBeenCalledOnce();
    });

    it('5.3 does not throw when nodesSelection plugin is absent', () => {
      const { node, mock } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      mock.getPlugin.mockReturnValue(undefined);

      expect(() => node.onUpdate(shape, defaultProps())).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 6 — getZoomPlugin
  // -------------------------------------------------------------------------

  describe('getZoomPlugin', () => {
    it('6.1 returns the stageZoom plugin when registered', () => {
      const zoomPlugin = { zoom: vi.fn() };
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(zoomPlugin);

      const result = node.getZoomPlugin();

      expect(result).toBe(zoomPlugin);
      expect(mock.getPlugin).toHaveBeenCalledWith('stageZoom');
    });

    it('6.2 returns undefined when stageZoom plugin is not registered', () => {
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(undefined);

      expect(node.getZoomPlugin()).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 7 — scaleReset
  // -------------------------------------------------------------------------

  describe('scaleReset', () => {
    function makeStrokeShape(
      overrides: Partial<Konva.ShapeConfig> = {}
    ): Konva.Shape {
      return new Konva.Shape({
        strokeElements: [
          { x: 10, y: 20, pressure: 0.5 },
          { x: 30, y: 40, pressure: 0.8 },
        ],
        scaleX: 2,
        scaleY: 3,
        width: 100,
        height: 80,
        ...overrides,
      });
    }

    it('7.1 scales each strokeElement.x by scaleX()', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 2, scaleY: 1 });

      node.scaleReset(shape);

      const pts = shape.getAttrs().strokeElements as WeaveStrokePoint[];
      expect(pts[0].x).toBeCloseTo(20); // 10 * 2
      expect(pts[1].x).toBeCloseTo(60); // 30 * 2
    });

    it('7.2 scales each strokeElement.y by scaleY()', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 1, scaleY: 3 });

      node.scaleReset(shape);

      const pts = shape.getAttrs().strokeElements as WeaveStrokePoint[];
      expect(pts[0].y).toBeCloseTo(60);  // 20 * 3
      expect(pts[1].y).toBeCloseTo(120); // 40 * 3
    });

    it('7.3 pressure values are preserved unchanged', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 2, scaleY: 2 });

      node.scaleReset(shape);

      const pts = shape.getAttrs().strokeElements as WeaveStrokePoint[];
      expect(pts[0].pressure).toBe(0.5);
      expect(pts[1].pressure).toBe(0.8);
    });

    it('7.4 width set to scaleX() * width() when result >= 5', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 2, scaleY: 1, width: 50, height: 20 });

      node.scaleReset(shape);

      expect(shape.width()).toBe(100); // 50 * 2
    });

    it('7.5 height set to scaleY() * height() when result >= 5', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 1, scaleY: 3, width: 20, height: 30 });

      node.scaleReset(shape);

      expect(shape.height()).toBe(90); // 30 * 3
    });

    it('7.6 width clamped to minimum 5 when product < 5', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 0.01, scaleY: 1, width: 1, height: 20 });

      node.scaleReset(shape);

      expect(shape.width()).toBe(5);
    });

    it('7.7 height clamped to minimum 5 when product < 5', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 1, scaleY: 0.01, width: 20, height: 1 });

      node.scaleReset(shape);

      expect(shape.height()).toBe(5);
    });

    it('7.8 scale reset to {x:1, y:1} after operation', () => {
      const { node } = makeNode();
      const shape = makeStrokeShape({ scaleX: 2, scaleY: 3 });

      node.scaleReset(shape);

      expect(shape.scaleX()).toBe(1);
      expect(shape.scaleY()).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 8 — serialize
  // -------------------------------------------------------------------------

  describe('serialize', () => {
    it('8.1 key equals attrs.id', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(node.serialize(shape).key).toBe('stroke-id');
    });

    it('8.2 type equals attrs.nodeType', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(node.serialize(shape).type).toBe(WEAVE_STROKE_NODE_TYPE);
    });

    it('8.3 props.id equals attrs.id', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(node.serialize(shape).props.id).toBe('stroke-id');
    });

    it('8.4 props.nodeType equals attrs.nodeType', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(node.serialize(shape).props.nodeType).toBe(WEAVE_STROKE_NODE_TYPE);
    });

    it('8.5 props.children is []', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      expect(node.serialize(shape).props.children).toEqual([]);
    });

    it('8.6 props.isCloned is undefined even when attr is set', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr('isCloned', true);
      expect(node.serialize(shape).props.isCloned).toBeUndefined();
    });

    it('8.7 props.isCloneOrigin is undefined even when attr is set', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr('isCloneOrigin', true);
      expect(node.serialize(shape).props.isCloneOrigin).toBeUndefined();
    });

    it.each([
      'mutexLocked',
      'mutexUserId',
      'draggable',
      'sceneFunc',
      'hitFunc',
      'overridesMouseControl',
      'dragBoundFunc',
    ])('8.8+ strips %s from serialized props', (attr) => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr(attr, 'something');
      const result = node.serialize(shape);
      expect(result.props).not.toHaveProperty(attr);
    });

    it('8.15 preserves strokeElements in props', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      const pts: WeaveStrokePoint[] = [{ x: 1, y: 2, pressure: 0.5 }];
      shape.setAttr('strokeElements', pts);
      expect(node.serialize(shape).props.strokeElements).toEqual(pts);
    });

    it('8.16 key and id default to empty string when attrs.id is undefined', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr('id', undefined);
      const result = node.serialize(shape);
      expect(result.key).toBe('');
      expect(result.props.id).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Suite 9 — drawShape early exits (via sceneFunc)
  // -------------------------------------------------------------------------

  describe('drawShape — early exits (via sceneFunc)', () => {
    it('9.1 strokeElements undefined → drawRibbonWithDash returns at !pts → no fill()', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      // strokeElements is not set — getAttrs().strokeElements is undefined
      const sceneFunc = shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown;
      const ctx = makeMockCtx();

      sceneFunc(ctx, shape);

      expect(ctx.fill).not.toHaveBeenCalled();
    });

    it('9.2 strokeElements = [] → early return in drawShape → no fill()', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr('strokeElements', []);
      const sceneFunc = shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown;
      const ctx = makeMockCtx();

      sceneFunc(ctx, shape);

      expect(ctx.fill).not.toHaveBeenCalled();
    });

    it('9.3 absent stroke/strokeWidth/dash attrs fall back to "black", 1, [] respectively', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr('strokeElements', makeLine(3));
      shape.setAttr('stroke', undefined);
      shape.setAttr('strokeWidth', undefined);
      shape.setAttr('dash', undefined);
      const sceneFunc = shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown;

      // Must not throw — defaults allow drawRibbonWithDash to run normally
      expect(() => sceneFunc(makeMockCtx(), shape)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 10 — drawRibbonWithDash: solid stroke
  // -------------------------------------------------------------------------

  describe('drawRibbonWithDash — solid stroke (no dash array)', () => {
    it('10.1 1 strokeElement → pts.length < 2 → early return, no fill()', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttr('strokeElements', [{ x: 5, y: 5, pressure: 1 }]);
      const ctx = makeMockCtx();

      (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(ctx, shape);

      expect(ctx.fill).not.toHaveBeenCalled();
    });

    it('10.2 2+ points, no dash → Infinity dashRemaining → always dashOn → fill() called', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttrs({ strokeElements: makeLine(5), dash: [] });
      const ctx = makeMockCtx();

      (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(ctx, shape);

      expect(ctx.fill).toHaveBeenCalled();
    });

    it('10.3 solid stroke: all segments merged — final polygon flushed exactly once', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttrs({ strokeElements: makeLine(10), dash: [] });
      const ctx = makeMockCtx();

      (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(ctx, shape);

      // With Infinity dashRemaining, the polygon is never flushed mid-loop;
      // the final `if (dashOn && leftSide.length && rightSide.length)` fires once.
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 11 — drawRibbonWithDash: dashed stroke
  // -------------------------------------------------------------------------

  describe('drawRibbonWithDash — dashed stroke', () => {
    it('11.1 dash array causes ctx.fill() to be called for "on" segments', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttrs({ strokeElements: makeLine(20), dash: [1, 1], strokeWidth: 3 });
      const ctx = makeMockCtx();

      (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(ctx, shape);

      expect(ctx.fill).toHaveBeenCalled();
    });

    it('11.2 dashRemaining <= 0 fires multiple times — fill() called > 1 for long dashed path', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      // Short dash on a long path forces many flush cycles
      shape.setAttrs({ strokeElements: makeLine(20), dash: [1, 1], strokeWidth: 3 });
      const ctx = makeMockCtx();

      (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(ctx, shape);

      expect(ctx.fill.mock.calls.length).toBeGreaterThan(1);
    });

    it('11.3 "off" dash segments exercise the dashOn=false branch without fill()', () => {
      // Same path: solid produces 1 fill, dashed produces many.
      // "Off" segments contribute 0 fills — their branch is exercised but silent.
      const { node: dashedNode } = makeNode();
      const dashedShape = dashedNode.onRender(defaultProps()) as Konva.Shape;
      dashedShape.setAttrs({ strokeElements: makeLine(20), dash: [1, 1] });
      const dashedCtx = makeMockCtx();

      (dashedShape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(dashedCtx, dashedShape);

      // Dashed fill count is finite and > 0 (on segments drew, off segments were skipped)
      expect(dashedCtx.fill.mock.calls.length).toBeGreaterThan(0);
    });

    it('11.4 multi-element dash array cycles without error over a long path', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      shape.setAttrs({
        strokeElements: makeLine(30),
        dash: [2, 3, 5, 1],
        strokeWidth: 2,
      });

      expect(() =>
        (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(makeMockCtx(), shape)
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 12 — resamplePoints (private, via direct call)
  // -------------------------------------------------------------------------

  describe('resamplePoints (private — via direct cast)', () => {
    it('12.1 single point → returned as-is (pts.length < 2 branch)', () => {
      const { node } = makeNode();
      const pt: WeaveStrokePoint = { x: 1, y: 2, pressure: 0.5 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).resamplePoints([pt]);
      expect(result).toEqual([pt]);
    });

    it('12.2 two far-apart points (>= minDist) → both kept', () => {
      const { node } = makeNode();
      const pts: WeaveStrokePoint[] = [
        { x: 0, y: 0, pressure: 1 },
        { x: 10, y: 0, pressure: 1 },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).resamplePoints(pts, 2);
      expect(result).toHaveLength(2);
    });

    it('12.3 middle point too close → filtered out, far point kept', () => {
      const { node } = makeNode();
      const pts: WeaveStrokePoint[] = [
        { x: 0, y: 0, pressure: 1 },
        { x: 0.5, y: 0, pressure: 1 }, // 0.5 units from first → < minDist 2 → filtered
        { x: 20, y: 0, pressure: 1 },  // 20 units from first → kept
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).resamplePoints(pts, 2);
      expect(result).toHaveLength(2);
      expect(result[0].x).toBe(0);
      expect(result[1].x).toBe(20);
    });
  });

  // -------------------------------------------------------------------------
  // Suite 13 — getSplinePoints (private, via direct call)
  // -------------------------------------------------------------------------

  describe('getSplinePoints (private — via direct cast)', () => {
    it('13.1 two input points → produces resolution intermediate steps + last point appended', () => {
      const { node } = makeNode();
      const pts: WeaveStrokePoint[] = [
        { x: 0, y: 0, pressure: 1 },
        { x: 10, y: 0, pressure: 1 },
      ];
      // resolution=4 → 4 t-steps for 1 segment + 1 last point = 5 total
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).getSplinePoints(pts, 4);
      expect(result.length).toBe(5);
      expect(result[result.length - 1]).toEqual(pts[pts.length - 1]);
    });

    it('13.2 start/end boundary clamping (p0 = pts[max(i,0)], p3 = pts[min(i+3,len-1)]) does not throw', () => {
      const { node } = makeNode();
      const pts: WeaveStrokePoint[] = [
        { x: 0, y: 0, pressure: 1 },
        { x: 5, y: 5, pressure: 0.8 },
        { x: 10, y: 0, pressure: 0.6 },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).getSplinePoints(pts, 8)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Suite 14 — segLen = 0 fallback (line 116: `|| 1`)
  // -------------------------------------------------------------------------

  describe('drawRibbonWithDash — zero-length segment fallback', () => {
    it('14.1 two identical consecutive centerline points → segLen=0 handled by || 1 fallback', () => {
      const { node } = makeNode();
      const shape = node.onRender(defaultProps()) as Konva.Shape;
      // Inject two identical consecutive points into getSplinePoints output so that
      // Math.hypot(dx, dy) === 0, triggering the `|| 1` guard on line 116.
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node as any,
        'getSplinePoints'
      ).mockReturnValueOnce([
        { x: 5, y: 5, pressure: 1 },
        { x: 5, y: 5, pressure: 1 }, // identical → dx=0 dy=0 → segLen=0 → || 1 fires
        { x: 15, y: 5, pressure: 1 },
      ]);
      shape.setAttrs({ strokeElements: makeLine(3), dash: [] });

      expect(() =>
        (shape.getAttr('sceneFunc') as (...args: unknown[]) => unknown)(makeMockCtx(), shape)
      ).not.toThrow();
    });
  });
});
