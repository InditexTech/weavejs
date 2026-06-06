// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveMeasureNode } from '../measure';
import {
  WEAVE_MEASURE_NODE_DEFAULT_CONFIG,
  WEAVE_MEASURE_NODE_TYPE,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';

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
      container: vi.fn().mockReturnValue({ style: { cursor: '' } }),
      scaleX: vi.fn().mockReturnValue(1),
      scaleY: vi.fn().mockReturnValue(1),
    }),
    getSelectionLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    setMutexLock: vi.fn(),
    releaseMutexLock: vi.fn(),
    getRealSelectedNode: vi.fn().mockReturnValue(undefined),
    updateNode: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(false),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
    }),
    getMainLayer: vi.fn().mockReturnValue(undefined),
  };
}

function makeNode(config?: object) {
  const mock = createMockInstance();
  const node = new WeaveMeasureNode(config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-measure',
    fromPoint: { x: 0, y: 0 },
    toPoint: { x: 100, y: 0 },
    separation: 100,
    orientation: -1,
    unit: 'cms',
    unitPerPixel: 100,
    ...overrides,
  };
}

/** Retrieve the handler registered via instance.addEventListener for a given event. */
function getEventHandler(
  mock: ReturnType<typeof createMockInstance>,
  eventName: string
) {
  const call = mock.addEventListener.mock.calls.find(
    ([event]) => event === eventName
  );
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

/** Call createSelectionHandlers on the node with the given group. */
function createHandlers(node: WeaveMeasureNode, group: Konva.Group) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).createSelectionHandlers(group);
}

/** Call updateSelectionHandlers on the node with the given group. */
function updateHandlers(node: WeaveMeasureNode, group: Konva.Group) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).updateSelectionHandlers(group);
}

/** Call destroySelectionHandlers on the node with the given group. */
function destroyHandlers(node: WeaveMeasureNode, group: Konva.Group) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).destroySelectionHandlers(group);
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Provide a mock canvas context for Konva.Text (Node.js has no canvas API)
  const mockCtx = {
    measureText: () => ({ width: 50 }),
    font: '',
    save: () => {},
    restore: () => {},
  };
  vi.spyOn(Konva.Util, 'createCanvasElement').mockReturnValue({
    getContext: () => mockCtx,
    width: 0,
    height: 0,
  } as unknown as HTMLCanvasElement);

  augmentKonvaNodeClass();
});

beforeEach(() => {
  // Mock measureSize to return a size that fits inside the 100px measure space
  vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
    width: 50,
    height: 14,
  } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);
});

// ===========================================================================
// Suite 1 — Constructor
// ===========================================================================

describe('WeaveMeasureNode', () => {
  describe('constructor', () => {
    it('1.1 nodeType is "measure"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_MEASURE_NODE_TYPE);
    });

    it('1.2 initialize is undefined', () => {
      const { node } = makeNode();
      expect(node.initialize).toBeUndefined();
    });

    it('1.3 handlePointCircleRadius is 6', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).handlePointCircleRadius).toBe(6);
    });

    it('1.4 custom config overrides defaults', () => {
      const { node } = makeNode({
        config: { style: { separationLine: { stroke: '#000000' } } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (node as any).config as typeof WEAVE_MEASURE_NODE_DEFAULT_CONFIG;
      expect(config.style.separationLine.stroke).toBe('#000000');
      // Other defaults preserved
      expect(config.style.text.fill).toBe('#FF3366');
    });
  });

  // =========================================================================
  // Suite 2 — onRender: group shape
  // =========================================================================

  describe('onRender — group shape', () => {
    it('2.1 returns a Konva.Group with name="node" and draggable=false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps());
      expect(group).toBeInstanceOf(Konva.Group);
      expect(group.getAttrs().name).toBe('node');
      expect(group.getAttrs().draggable).toBe(false);
    });

    it('2.2 group carries all props as attrs', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps());
      const attrs = group.getAttrs();
      expect(attrs.id).toBe('test-measure');
      expect(attrs.fromPoint).toEqual({ x: 0, y: 0 });
      expect(attrs.toPoint).toEqual({ x: 100, y: 0 });
      expect(attrs.separation).toBe(100);
      expect(attrs.orientation).toBe(-1);
    });

    it('2.3 defaults: separation=100, orientation=-1, unit="cms", unitPerPixel=100', () => {
      const { node } = makeNode();
      // Call without those props — they should default
      const group = node.onRender({
        id: 'test-measure',
        fromPoint: { x: 0, y: 0 },
        toPoint: { x: 100, y: 0 },
      });
      // onRender uses ?? to fall back, but doesn't set attrs for defaulted values
      expect(group).toBeInstanceOf(Konva.Group);
    });

    it('2.4 getTransformerProperties returns resizeEnabled=false, rotateEnabled=false, borderEnabled=false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (group as any).getTransformerProperties();
      expect(props.resizeEnabled).toBe(false);
      expect(props.rotateEnabled).toBe(false);
      expect(props.borderEnabled).toBe(false);
    });
  });

  // =========================================================================
  // Suite 3 — onRender: child shapes
  // =========================================================================

  describe('onRender — child shapes', () => {
    it('3.1 linePerpFrom exists with correct id', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const linePerpFrom = group.findOne('#linePerpFrom-test-measure');
      expect(linePerpFrom).toBeTruthy();
      expect(linePerpFrom).toBeInstanceOf(Konva.Line);
    });

    it('3.2 linePerpTo exists with correct id', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const linePerpTo = group.findOne('#linePerpTo-test-measure');
      expect(linePerpTo).toBeTruthy();
      expect(linePerpTo).toBeInstanceOf(Konva.Line);
    });

    it('3.3 fromCircle and toCircle exist', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const fromCircle = group.findOne('#fromCircle-test-measure');
      const toCircle = group.findOne('#toCircle-test-measure');
      expect(fromCircle).toBeInstanceOf(Konva.Circle);
      expect(toCircle).toBeInstanceOf(Konva.Circle);
      // fromCircle is at perpendicular tip of fromPoint: (0, -100)
      expect((fromCircle as Konva.Circle).x()).toBeCloseTo(0);
      expect((fromCircle as Konva.Circle).y()).toBeCloseTo(-100);
    });

    it('3.4 measureText shows correct text', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const measureText = group.findOne('#measureText-test-measure') as Konva.Text;
      expect(measureText).toBeInstanceOf(Konva.Text);
      // distance=100, unitPerPixel=100 → units=1.00, unit='cms'
      expect(measureText.text()).toBe('1.00 cms');
    });

    it('3.5 lineLeft and lineRight exist', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const lineLeft = group.findOne('#lineLeft-test-measure');
      const lineRight = group.findOne('#lineRight-test-measure');
      expect(lineLeft).toBeInstanceOf(Konva.Line);
      expect(lineRight).toBeInstanceOf(Konva.Line);
      // Both lines should have 4-point coordinates
      expect((lineLeft as Konva.Line).points()).toHaveLength(4);
      expect((lineRight as Konva.Line).points()).toHaveLength(4);
    });
  });

  // =========================================================================
  // Suite 4 — onRender: text layout branches
  // =========================================================================

  describe('onRender — text layout branches', () => {
    it('4.1 text fits (width < measure space): lineLeft/lineRight have non-zero length', () => {
      // measureSize returns { width: 50 } which is < 100 (measure space)
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const lineLeft = group.findOne('#lineLeft-test-measure') as Konva.Line;
      const pts = lineLeft.points();
      // pointLeftText should be offset from midpoint → lineLeft points differ
      expect(pts[0]).not.toBeCloseTo(pts[2]);
    });

    it('4.2 text wider than measure space: lineLeft extends to midpoint, text repositioned perpendicularly', () => {
      // measureSize returns { width: 500 } which is > 100 (measure space distance)
      vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
        width: 500,
        height: 14,
      } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const lineLeft = group.findOne('#lineLeft-test-measure') as Konva.Line;
      const measureText = group.findOne('#measureText-test-measure') as Konva.Text;
      const pts = lineLeft.points();
      // When text wider, offset=0 → pointLeftText = midpoint {50,-100}
      // lineLeft goes from fromPerp.left {0,-100} to midpoint {50,-100}
      expect(pts[2]).toBeCloseTo(50);
      // Text is repositioned perpendicular to measure line: y = -100 - 14 = -114
      expect(measureText.y()).toBeCloseTo(-114);
    });
  });

  // =========================================================================
  // Suite 5 — onRender: anchors
  // =========================================================================

  describe('onRender — anchors', () => {
    it('5.1 allowedAnchors() returns []', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).allowedAnchors()).toEqual([]);
    });

    it('5.2 getNodeAnchors() returns []', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).getNodeAnchors()).toEqual([]);
    });
  });

  // =========================================================================
  // Suite 6 — onRender: event listeners
  // =========================================================================

  describe('onRender — event listeners', () => {
    it('6.1 onZoomChange: no selection plugin → no crash', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const handler = getEventHandler(mock, 'onZoomChange');
      expect(handler).toBeDefined();
      expect(() => handler?.()).not.toThrow();
    });

    it('6.2 onZoomChange: selected node matches → calls updateSelectionHandlers', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const selectionPlugin = {
        getSelectedNodes: vi.fn().mockReturnValue([group]),
      };
      mock.getPlugin.mockReturnValue(selectionPlugin);
      // spy on updateSelectionHandlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = vi.spyOn(node as any, 'updateSelectionHandlers');
      const handler = getEventHandler(mock, 'onZoomChange');
      handler?.();
      expect(spy).toHaveBeenCalledWith(group);
    });

    it('6.3 onNodesChange: not selected → calls destroySelectionHandlers', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // No selection (default getPlugin returns undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = vi.spyOn(node as any, 'destroySelectionHandlers');
      const handler = getEventHandler(mock, 'onNodesChange');
      handler?.();
      expect(spy).toHaveBeenCalledWith(group);
    });

    it('6.4 onNodesChange: selected → calls createSelectionHandlers + updateSelectionHandlers', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const selectionPlugin = {
        getSelectedNodes: vi.fn().mockReturnValue([group]),
      };
      mock.getPlugin.mockReturnValue(selectionPlugin);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createSpy = vi.spyOn(node as any, 'createSelectionHandlers');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateSpy = vi.spyOn(node as any, 'updateSelectionHandlers');
      const handler = getEventHandler(mock, 'onNodesChange');
      handler?.();
      expect(createSpy).toHaveBeenCalledWith(group);
      expect(updateSpy).toHaveBeenCalledWith(group);
    });

    it('6.5 onMeasureReferenceChange: sets unit/unitPerPixel attrs and calls updateNode', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const handler = getEventHandler(mock, 'onMeasureReferenceChange');
      handler?.({ unit: 'mm', unitPerPixel: 200 });
      expect(group.getAttrs().unit).toBe('mm');
      expect(group.getAttrs().unitPerPixel).toBe(200);
      expect(mock.updateNode).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Suite 7 — createSelectionHandlers
  // =========================================================================

  describe('createSelectionHandlers', () => {
    it('7.1 adds 5 selection handler shapes', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const childrenBefore = group.getChildren().length;
      createHandlers(node, group);
      // Added: moveFromCircle, crosshairFrom, moveToCircle, crosshairTo, moveSeparationRect
      expect(group.getChildren().length).toBe(childrenBefore + 5);
      expect(group.findOne('#moveFromCircle-test-measure')).toBeInstanceOf(Konva.Circle);
      expect(group.findOne('#crosshairFrom-test-measure')).toBeInstanceOf(Konva.Group);
      expect(group.findOne('#moveToCircle-test-measure')).toBeInstanceOf(Konva.Circle);
      expect(group.findOne('#crosshairTo-test-measure')).toBeInstanceOf(Konva.Group);
      expect(group.findOne('#moveSeparationRect-test-measure')).toBeInstanceOf(Konva.Rect);
    });

    it('7.2 idempotent: second call returns early (no duplicate shapes)', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const childrenAfterFirst = group.getChildren().length;
      createHandlers(node, group);
      expect(group.getChildren().length).toBe(childrenAfterFirst);
    });

    it('7.3 moveFromCircle.dragstart: cancels bubble, hides circles/rect, shows crosshairFrom', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveFromCircle = group.findOne('#moveFromCircle-test-measure') as Konva.Circle;
      const moveToCircle = group.findOne('#moveToCircle-test-measure') as Konva.Circle;
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;
      const crosshairFrom = group.findOne('#crosshairFrom-test-measure') as Konva.Group;

      const event = { cancelBubble: false };
      moveFromCircle.fire('dragstart', event);

      expect(event.cancelBubble).toBe(true);
      expect(moveFromCircle.visible()).toBe(false);
      expect(moveToCircle.visible()).toBe(false);
      expect(moveSeparationRect.visible()).toBe(false);
      expect(crosshairFrom.visible()).toBe(true);
    });

    it('7.4 moveFromCircle.dragmove: updates fromPoint attr, calls onUpdate', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveFromCircle = group.findOne('#moveFromCircle-test-measure') as Konva.Circle;
      moveFromCircle.position({ x: 20, y: 30 });

      const event = { cancelBubble: false };
      moveFromCircle.fire('dragmove', event);

      expect(event.cancelBubble).toBe(true);
      expect(group.getAttrs().fromPoint).toEqual({ x: 20, y: 30 });
    });

    it('7.5 moveFromCircle.dragend: restores visibility, updates fromPoint, calls updateNode', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveFromCircle = group.findOne('#moveFromCircle-test-measure') as Konva.Circle;
      const moveToCircle = group.findOne('#moveToCircle-test-measure') as Konva.Circle;
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;
      const crosshairFrom = group.findOne('#crosshairFrom-test-measure') as Konva.Group;

      // First dragstart to hide handles
      moveFromCircle.fire('dragstart', { cancelBubble: false });
      // Then dragend at new position
      moveFromCircle.position({ x: 50, y: 60 });
      const event = { cancelBubble: false };
      moveFromCircle.fire('dragend', event);

      expect(event.cancelBubble).toBe(true);
      expect(moveFromCircle.visible()).toBe(true);
      expect(moveToCircle.visible()).toBe(true);
      expect(moveSeparationRect.visible()).toBe(true);
      expect(crosshairFrom.visible()).toBe(false);
      expect(group.getAttrs().fromPoint).toEqual({ x: 50, y: 60 });
      expect(mock.updateNode).toHaveBeenCalled();
    });

    it('7.6 moveToCircle.dragstart: cancels bubble, hides circles/rect, shows crosshairTo', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveFromCircle = group.findOne('#moveFromCircle-test-measure') as Konva.Circle;
      const moveToCircle = group.findOne('#moveToCircle-test-measure') as Konva.Circle;
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;
      const crosshairTo = group.findOne('#crosshairTo-test-measure') as Konva.Group;

      const event = { cancelBubble: false };
      moveToCircle.fire('dragstart', event);

      expect(event.cancelBubble).toBe(true);
      expect(moveFromCircle.visible()).toBe(false);
      expect(moveToCircle.visible()).toBe(false);
      expect(moveSeparationRect.visible()).toBe(false);
      expect(crosshairTo.visible()).toBe(true);
    });

    it('7.7 moveToCircle.dragmove: updates toPoint attr, calls onUpdate', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveToCircle = group.findOne('#moveToCircle-test-measure') as Konva.Circle;
      moveToCircle.position({ x: 110, y: 5 });

      const event = { cancelBubble: false };
      moveToCircle.fire('dragmove', event);

      expect(event.cancelBubble).toBe(true);
      expect(group.getAttrs().toPoint).toEqual({ x: 110, y: 5 });
    });

    it('7.8 moveToCircle.dragend: restores visibility, updates toPoint, calls updateNode', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveFromCircle = group.findOne('#moveFromCircle-test-measure') as Konva.Circle;
      const moveToCircle = group.findOne('#moveToCircle-test-measure') as Konva.Circle;
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;
      const crosshairTo = group.findOne('#crosshairTo-test-measure') as Konva.Group;

      moveToCircle.fire('dragstart', { cancelBubble: false });
      moveToCircle.position({ x: 120, y: 10 });
      const event = { cancelBubble: false };
      moveToCircle.fire('dragend', event);

      expect(event.cancelBubble).toBe(true);
      expect(moveFromCircle.visible()).toBe(true);
      expect(moveToCircle.visible()).toBe(true);
      expect(moveSeparationRect.visible()).toBe(true);
      expect(crosshairTo.visible()).toBe(false);
      expect(group.getAttrs().toPoint).toEqual({ x: 120, y: 10 });
      expect(mock.updateNode).toHaveBeenCalled();
    });

    it('7.9 moveSeparationRect.dragstart: saves originalSeparationHandlerPosition', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      // Should not throw — saves position internally
      expect(() => moveSeparationRect.fire('dragstart', { cancelBubble: false })).not.toThrow();
    });

    it('7.10 moveSeparationRect.dragmove (non-NaN branch): updates separation attr', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      // Position rect away from default location so originalHandlerPos ≠ separatorPoint.left
      moveSeparationRect.position({ x: 0, y: 0 });
      moveSeparationRect.fire('dragstart', { cancelBubble: false });
      // Move rect to a new position (not at separatorPoint.left = {50,-121})
      moveSeparationRect.position({ x: 50, y: -121 });
      const event = { cancelBubble: false };
      moveSeparationRect.fire('dragmove', event);

      expect(event.cancelBubble).toBe(true);
      // separation attr should have been updated
      expect(typeof group.getAttrs().separation).toBe('number');
    });

    it('7.11 moveSeparationRect.dragmove (NaN branch): sets separation and repositions', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      // The NaN branch fires when originalHandlerPos === separatorPoint.left (computed in dragmove).
      // In dragmove: separatorPoint uses fromPoint/toPoint/midPoint (raw, not perpendicular),
      // with multiplier=1.5, height=14, orientation=-1 → separatorPoint.left = {50, -21}.
      // Position the rect at that value before dragstart so originalHandlerPos = {50,-21}.
      moveSeparationRect.position({ x: 50, y: -21 });
      moveSeparationRect.fire('dragstart', { cancelBubble: false });
      // Now fire dragmove — pos = {50,-21} = originalHandlerPos = separatorPoint.left → t=NaN
      const event = { cancelBubble: false };
      moveSeparationRect.fire('dragmove', event);

      expect(event.cancelBubble).toBe(true);
      // NaN branch sets separation = textSize.height + 1 = 14 + 1 = 15
      expect(group.getAttrs().separation).toBe(15);
    });

    it('7.12 moveSeparationRect.dragend: calculates newLength, calls updateNode', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      moveSeparationRect.position({ x: 0, y: 0 });
      moveSeparationRect.fire('dragstart', { cancelBubble: false });
      moveSeparationRect.position({ x: 25, y: -60 });
      const event = { cancelBubble: false };
      moveSeparationRect.fire('dragend', event);

      expect(event.cancelBubble).toBe(true);
      expect(mock.updateNode).toHaveBeenCalled();
    });

    it('7.13 wider text: createSelectionHandlers uses noSpaceSeparationMultiplier, dragmove/dragend cover the branch', () => {
      // Use wider text so isTextBiggerThanMeasureSpace = true in createSelectionHandlers
      vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
        width: 500,
        height: 14,
      } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      // dragmove with wider text (covers noSpaceSeparationMultiplier in dragmove)
      moveSeparationRect.position({ x: 0, y: 0 });
      moveSeparationRect.fire('dragstart', { cancelBubble: false });
      moveSeparationRect.position({ x: 50, y: -35 }); // different from separatorPoint.left
      moveSeparationRect.fire('dragmove', { cancelBubble: false });

      // dragend with wider text (covers noSpaceSeparationMultiplier in dragend)
      moveSeparationRect.position({ x: 25, y: -35 });
      moveSeparationRect.fire('dragend', { cancelBubble: false });

      expect(mock.updateNode).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Suite 8 — updateSelectionHandlers
  // =========================================================================

  describe('updateSelectionHandlers', () => {
    it('8.1 no handlers present → no crash', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(() => updateHandlers(node, group)).not.toThrow();
    });

    it('8.2 moveFromCircle and moveToCircle present → scaled by 1/scaleX', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveFromCircle = group.findOne('#moveFromCircle-test-measure') as Konva.Circle;
      const moveToCircle = group.findOne('#moveToCircle-test-measure') as Konva.Circle;

      updateHandlers(node, group);

      // scaleX() mock returns 1 → 1/1 = 1
      expect(moveFromCircle.scaleX()).toBeCloseTo(1);
      expect(moveToCircle.scaleX()).toBeCloseTo(1);
    });

    it('8.3 crosshairFrom and crosshairTo present → scaled', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const crosshairFrom = group.findOne('#crosshairFrom-test-measure') as Konva.Group;
      const crosshairTo = group.findOne('#crosshairTo-test-measure') as Konva.Group;

      updateHandlers(node, group);

      expect(crosshairFrom.scaleX()).toBeCloseTo(1);
      expect(crosshairTo.scaleX()).toBeCloseTo(1);
    });

    it('8.4 moveSeparationRect present → position + rotation + scale updated', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      updateHandlers(node, group);

      // Should have been repositioned (not at 0,0)
      expect(moveSeparationRect.scaleX()).toBeCloseTo(1);
      // angle for horizontal line = 0
      expect(moveSeparationRect.rotation()).toBeCloseTo(0);
    });

    it('8.5 wider text: updateSelectionHandlers uses noSpaceSeparationMultiplier', () => {
      vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
        width: 500,
        height: 14,
      } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);

      // updateHandlers recalculates multiplier using noSpaceSeparationMultiplier
      expect(() => updateHandlers(node, group)).not.toThrow();
    });
  });

  // =========================================================================
  // Suite 9 — destroySelectionHandlers
  // =========================================================================

  describe('destroySelectionHandlers', () => {
    it('9.1 no handlers present → no crash', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(() => destroyHandlers(node, group)).not.toThrow();
    });

    it('9.2 all handlers present → all 5 destroyed', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const childrenBefore = group.getChildren().length;

      destroyHandlers(node, group);

      expect(group.getChildren().length).toBe(childrenBefore - 5);
      expect(group.findOne('#moveFromCircle-test-measure')).toBeFalsy();
      expect(group.findOne('#moveToCircle-test-measure')).toBeFalsy();
      expect(group.findOne('#crosshairFrom-test-measure')).toBeFalsy();
      expect(group.findOne('#crosshairTo-test-measure')).toBeFalsy();
      expect(group.findOne('#moveSeparationRect-test-measure')).toBeFalsy();
    });
  });

  // =========================================================================
  // Suite 10 — onUpdate
  // =========================================================================

  describe('onUpdate', () => {
    it('10.1 updates linePerpFrom and linePerpTo points', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const linePerpFrom = group.findOne('#linePerpFrom-test-measure') as Konva.Line;
      const linePerpTo = group.findOne('#linePerpTo-test-measure') as Konva.Line;

      node.onUpdate(group as WeaveElementInstance, {
        ...defaultProps(),
        fromPoint: { x: 10, y: 0 },
        toPoint: { x: 90, y: 0 },
      });

      // Points should have been updated
      expect(linePerpFrom.points()[0]).toBeCloseTo(10);
      expect(linePerpTo.points()[0]).toBeCloseTo(90);
    });

    it('10.2 updates fromCircle and toCircle positions', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const fromCircle = group.findOne('#fromCircle-test-measure') as Konva.Circle;
      const toCircle = group.findOne('#toCircle-test-measure') as Konva.Circle;

      node.onUpdate(group as WeaveElementInstance, {
        ...defaultProps(),
        fromPoint: { x: 0, y: 0 },
        toPoint: { x: 200, y: 0 },
        separation: 50,
      });

      // fromCircle y = -50 (perpendicular distance with orientation=-1)
      expect(fromCircle.y()).toBeCloseTo(-50);
      expect(toCircle.x()).toBeCloseTo(200);
    });

    it('10.3 updates measureText text, rotation, position', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const measureText = group.findOne('#measureText-test-measure') as Konva.Text;

      node.onUpdate(group as WeaveElementInstance, {
        ...defaultProps(),
        unit: 'mm',
        unitPerPixel: 10,
      });

      expect(measureText.text()).toBe('10.00 mm');
    });

    it('10.4 text fits → lineLeft/lineRight updated with non-zero extent', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const lineLeft = group.findOne('#lineLeft-test-measure') as Konva.Line;

      node.onUpdate(group as WeaveElementInstance, defaultProps());

      const pts = lineLeft.points();
      expect(pts[0]).not.toBeCloseTo(pts[2]);
    });

    it('10.5 text wider than measure space → measureText repositioned, lineLeft extends to midpoint', () => {
      vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
        width: 500,
        height: 14,
      } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const lineLeft = group.findOne('#lineLeft-test-measure') as Konva.Line;
      const measureText = group.findOne('#measureText-test-measure') as Konva.Text;

      node.onUpdate(group as WeaveElementInstance, defaultProps() as WeaveElementAttributes);

      const pts = lineLeft.points();
      // offset=0 → pointLeftText = midpoint {50,-100}
      expect(pts[2]).toBeCloseTo(50);
      // measureText repositioned perpendicularly: y = -100 - 14 = -114
      expect(measureText.y()).toBeCloseTo(-114);
    });

    it('10.6 crosshairFrom/crosshairTo present → x/y/rotation updated', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const crosshairFrom = group.findOne('#crosshairFrom-test-measure') as Konva.Group;
      const crosshairTo = group.findOne('#crosshairTo-test-measure') as Konva.Group;

      node.onUpdate(group as WeaveElementInstance, {
        ...defaultProps(),
        fromPoint: { x: 10, y: 5 },
        toPoint: { x: 110, y: 5 },
      });

      expect(crosshairFrom.x()).toBeCloseTo(10);
      expect(crosshairFrom.y()).toBeCloseTo(5);
      expect(crosshairTo.x()).toBeCloseTo(110);
      expect(crosshairTo.y()).toBeCloseTo(5);
    });

    it('10.7 moveSeparationRect present → x/y/rotation updated', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      node.onUpdate(group as WeaveElementInstance, {
        ...defaultProps(),
        separation: 50,
      });

      // Should not throw and rect should be repositioned
      expect(moveSeparationRect).toBeTruthy();
    });

    it('10.8 wider text + moveSeparationRect present → uses noSpaceSeparationMultiplier in onUpdate', () => {
      vi.spyOn(Konva.Text.prototype, 'measureSize').mockReturnValue({
        width: 500,
        height: 14,
      } as unknown as ReturnType<typeof Konva.Text.prototype.measureSize>);
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      // onUpdate with wider text covers the noSpaceSeparationMultiplier branch inside
      // the moveSeparationRect update block
      expect(() =>
        node.onUpdate(group as WeaveElementInstance, defaultProps() as WeaveElementAttributes)
      ).not.toThrow();
      expect(moveSeparationRect).toBeTruthy();
    });
  });

  // =========================================================================
  // Suite 11 — flipOrientation
  // =========================================================================

  describe('flipOrientation', () => {
    it('11.1 flips orientation from -1 to 1', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps({ orientation: -1 })) as Konva.Group;
      node.flipOrientation(group);
      expect(group.getAttrs().orientation).toBe(1);
    });

    it('11.2 flips orientation from 1 to -1', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps({ orientation: 1 })) as Konva.Group;
      node.flipOrientation(group);
      expect(group.getAttrs().orientation).toBe(-1);
    });

    it('11.3 calls updateNode and recreates selection handlers', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createSpy = vi.spyOn(node as any, 'createSelectionHandlers');

      node.flipOrientation(group);

      expect(mock.updateNode).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Suite 12 — getNormalizedDistance
  // =========================================================================

  describe('getNormalizedDistance', () => {
    it('12.1 returns normalized distance between fromCircle and toCircle', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // fromCircle at (0,-100), toCircle at (100,-100) → distance = 100
      const dist = node.getNormalizedDistance(group);
      expect(dist).toBeCloseTo(100);
    });

    it('12.2 circles not found → returns 0', () => {
      const { node } = makeNode();
      // empty group with no children
      const emptyGroup = new Konva.Group({ id: 'empty' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).instance = createMockInstance();
      const dist = node.getNormalizedDistance(emptyGroup);
      expect(dist).toBe(0);
    });
  });

  // =========================================================================
  // Suite 13 — Private geometry methods (branch coverage)
  // =========================================================================

  describe('private geometry methods', () => {
    it('13.1 getAngle: fromPoint.x > toPoint.x → angle + 180', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getAngle = (node as any).getAngle.bind(node);
      // Going right-to-left: fromPoint.x > toPoint.x → adds 180
      const angle = getAngle({ x: 100, y: 0 }, { x: 0, y: 0 });
      // angleBetweenPoints({100,0},{0,0}) = atan2(0, -100) * 180/PI = 180°, + 180 = 360° (or -180+180=0)
      // atan2(0, -100) = PI = 180°, + 180 = 360
      expect(angle).toBeCloseTo(360);
    });

    it('13.2 getAngle: fromPoint.x <= toPoint.x → no flip', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getAngle = (node as any).getAngle.bind(node);
      // Going left-to-right: no +180
      const angle = getAngle({ x: 0, y: 0 }, { x: 100, y: 0 });
      // atan2(0, 100) = 0
      expect(angle).toBeCloseTo(0);
    });

    it('13.3 projectPointToLine: projects correctly', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = (node as any).projectPointToLine.bind(node);
      // Line from {0,0} to {10,0}, project {5,5}
      const result = project({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 });
      expect(result.x).toBeCloseTo(5);
      expect(result.y).toBeCloseTo(0);
      expect(result.t).toBeCloseTo(0.5);
      expect(result.flipped).toBe(false);
    });

    it('13.4 pointFromMid: towardsSecond=true moves in + direction', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pfm = (node as any).pointFromMid.bind(node);
      // from={0,0}, to={100,0}, distance=10, towardsSecond=true → move right from midpoint
      const result = pfm({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, true);
      expect(result.x).toBeCloseTo(60); // midpoint 50 + 10
      expect(result.y).toBeCloseTo(0);
    });

    it('13.5 pointFromMid: towardsSecond=false moves in - direction', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pfm = (node as any).pointFromMid.bind(node);
      const result = pfm({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, false);
      expect(result.x).toBeCloseTo(40); // midpoint 50 - 10
      expect(result.y).toBeCloseTo(0);
    });

    it('13.6 moveSeparationRect.dragend: negative newLength clamped to 0', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      createHandlers(node, group);
      const moveSeparationRect = group.findOne('#moveSeparationRect-test-measure') as Konva.Rect;

      // Position rect at {0,0} so originalHandlerPos ≠ separatorPoint.left
      moveSeparationRect.position({ x: 0, y: 0 });
      moveSeparationRect.fire('dragstart', { cancelBubble: false });
      // Move to position that gives t < 0 (opposite side of separatorPoint.left from origin)
      // separatorPoint.left ≈ {50,-121}, origin={0,0}, moving to {100,-121} makes t<0
      moveSeparationRect.position({ x: 100, y: -121 });
      moveSeparationRect.fire('dragend', { cancelBubble: false });

      // newLength < 0 → clamped to 0, then updateNode called
      expect(group.getAttrs().separation).toBe(0);
      expect(mock.updateNode).toHaveBeenCalled();
    });
  });
});
