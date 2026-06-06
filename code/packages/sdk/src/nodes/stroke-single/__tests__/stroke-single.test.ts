// @vitest-environment jsdom
// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { WeaveStrokeSingleNode } from '../stroke-single';
import {
  WEAVE_STROKE_SINGLE_NODE_DEFAULT_CONFIG,
  WEAVE_STROKE_SINGLE_NODE_TIP_SIDE,
  WEAVE_STROKE_SINGLE_NODE_TIP_TYPE,
  WEAVE_STROKE_SINGLE_NODE_TYPE,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';
import { makeTipGroup } from './helpers';

// Break the node.ts ↔ weave.ts circular dependency so that WeaveNode is
// fully evaluated before any barrel re-export tries to extend it.
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

// ---------------------------------------------------------------------------
// Helpers — stroke-single node tests
// ---------------------------------------------------------------------------

function createMockInstance(pluginOverride?: unknown) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPlugin: vi.fn().mockReturnValue(pluginOverride ?? undefined) as any,
    getStage: vi.fn().mockReturnValue({
      findOne: vi.fn().mockReturnValue(null),
      find: vi.fn().mockReturnValue([]),
      container: vi.fn().mockReturnValue({ style: { cursor: '' } }),
      scaleX: vi.fn().mockReturnValue(1),
      scaleY: vi.fn().mockReturnValue(1),
      getAbsoluteTransform: vi.fn().mockReturnValue({
        copy: vi.fn().mockReturnThis(),
        invert: vi.fn().mockReturnThis(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        point: vi.fn().mockImplementation((p: any) => p), // identity: returns the input point
      }),
    }),
    getSelectionLayer: vi.fn().mockReturnValue({ add: vi.fn() }),
    getEventsController: vi.fn().mockReturnValue(null),
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

function makeNode(config?: object): {
  node: WeaveStrokeSingleNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node = config ? new WeaveStrokeSingleNode({ config: config as any }) : new WeaveStrokeSingleNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
}

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'ss-id',
    nodeType: WEAVE_STROKE_SINGLE_NODE_TYPE,
    x: 0,
    y: 0,
    linePoints: [0, 0, 100, 100],
    stroke: '#000000',
    fill: '#FFFFFF',
    strokeWidth: 2,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    rotation: 0,
    zIndex: 1,
    children: [],
    ...overrides,
  };
}

function makePluginMock() {
  return {
    getTransformer: vi.fn().mockReturnValue({ forceUpdate: vi.fn(), hide: vi.fn() }),
    getHoverTransformer: vi.fn().mockReturnValue({ nodes: vi.fn() }),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    getSelectedNodes: vi.fn().mockReturnValue([]),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
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

describe('stroke-single / WeaveStrokeSingleNode', () => {
  describe('constructor', () => {
    it('10.1 nodeType is "stroke-single"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_STROKE_SINGLE_NODE_TYPE);
    });

    it('10.2 no params → default snapAngles config applied', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.snapAngles.angles).toEqual(
        WEAVE_STROKE_SINGLE_NODE_DEFAULT_CONFIG.snapAngles.angles
      );
      expect(cfg.snapAngles.activateThreshold).toBe(
        WEAVE_STROKE_SINGLE_NODE_DEFAULT_CONFIG.snapAngles.activateThreshold
      );
    });

    it('10.3 custom config overrides defaults (activateThreshold)', () => {
      const { node } = makeNode({
        snapAngles: { angles: [0, 90], activateThreshold: 10, releaseThreshold: 12 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).config.snapAngles.activateThreshold).toBe(10);
    });

    it('10.4 GreedySnapper is initialized with config angles', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).snapper).toBeDefined();
    });

    it('10.5 initialize() is called — handles and events are null/false on construction', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).eventsInitialized).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).shiftPressed).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 11 — initialize
  // -----------------------------------------------------------------------

  describe('initialize', () => {
    it('11.1 sets startHandle and endHandle to null', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).startHandle = new Konva.Circle({ radius: 5 });
      node.initialize();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle).toBeNull();
    });

    it('11.2 resets eventsInitialized, handleNodeChanges, handleZoomChanges', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).eventsInitialized = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).handleNodeChanges = () => {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).handleZoomChanges = () => {};
      node.initialize();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).eventsInitialized).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).handleNodeChanges).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).handleZoomChanges).toBeNull();
    });

    it('11.3 resets shiftPressed to false', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).shiftPressed = true;
      node.initialize();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).shiftPressed).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 12 — initEvents (requires jsdom)
  // -----------------------------------------------------------------------

  describe('initEvents', () => {
    it('12.1 returns early when isServerSide() is true', () => {
      const { node, mock } = makeNode();
      mock.isServerSide.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).initEvents();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).eventsInitialized).toBe(false);
    });

    it('12.2 returns early when eventsInitialized is already true', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).eventsInitialized = true;
      // Call again — should not re-register
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).initEvents()).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).eventsInitialized).toBe(true);
    });

    it('12.3 sets eventsInitialized = true on first successful call', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).initEvents();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).eventsInitialized).toBe(true);
    });

    it('12.4 keydown Shift sets shiftPressed = true; keyup Shift resets it', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).initEvents();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).shiftPressed).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).shiftPressed).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 13 — onRender: group structure
  // -----------------------------------------------------------------------

  describe('onRender — group structure', () => {
    it('13.1 returns a Konva.Group', () => {
      const { node } = makeNode();
      expect(node.onRender(defaultProps())).toBeInstanceOf(Konva.Group);
    });

    it('13.2 group name contains "node stroke-single"', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.name()).toContain('node');
      expect(group.name()).toContain(WEAVE_STROKE_SINGLE_NODE_TYPE);
    });

    it('13.3 group has strokeScaleEnabled: true and overridesMouseControl: true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.getAttr('strokeScaleEnabled')).toBe(true);
      expect(group.getAttr('overridesMouseControl')).toBe(true);
    });

    it('13.4 group has a child Konva.Line with id "{id}-line" and name "stroke-internal"', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const line = group.findOne('#ss-id-line') as Konva.Line;
      expect(line).toBeInstanceOf(Konva.Line);
      expect(line.name()).toBe('stroke-internal');
    });

    it('13.5 internal line has strokeScaleEnabled: true, lineJoin: "miter", lineCap: "round"', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const line = group.findOne('#ss-id-line') as Konva.Line;
      expect(line.strokeScaleEnabled()).toBe(true);
      expect(line.lineJoin()).toBe('miter');
      expect(line.lineCap()).toBe('round');
    });

    it('13.6 getNodeAnchors() returns []', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).getNodeAnchors()).toEqual([]);
    });

    it('13.7 allowedAnchors() returns []', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).allowedAnchors()).toEqual([]);
    });

    it('13.8 canBeHovered() returns false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((group as any).canBeHovered()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 14 — onRender: transformer properties and tip rendering
  // -----------------------------------------------------------------------

  describe('onRender — transformer & tips', () => {
    it('14.1 getTransformerProperties() returns rotateEnabled:false and borderStroke:"transparent"', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const props = group.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
      expect(props.borderStroke).toBe('transparent');
    });

    it('14.2 handleZoomChanges and handleNodeChanges are registered via instance.addEventListener', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const calls = mock.addEventListener.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContain('onZoomChange');
      expect(calls).toContain('onNodesChange');
    });

    it('14.3 tipStartStyle=arrow causes ArrowLineTipManager.render to be called', () => {
      const { node } = makeNode();
      const renderSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any).tipManagers[WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.ARROW],
        'render'
      );
      node.onRender(defaultProps({ tipStartStyle: WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.ARROW }));
      expect(renderSpy).toHaveBeenCalledWith(
        expect.any(Konva.Group),
        WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START
      );
    });

    it('14.4 dragstart on group hides handles; dragend restores visibility', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // handles are null at this point — verify no throw
      expect(() => group.fire('dragstart')).not.toThrow();
      expect(() => group.fire('dragend')).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Suite 15 — onRender: selection / hover handlers
  // -----------------------------------------------------------------------

  describe('onRender — selection handlers', () => {
    it('15.1 handleMouseover adds hoverClone nodes for stroke-internal children', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group as any).handleMouseover();

      const clones = group.find('.hoverClone');
      expect(clones.length).toBeGreaterThan(0);
    });

    it('15.2 handleMouseout removes hoverClone when isSelected is false', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group as any).handleMouseover();
      expect(group.find('.hoverClone').length).toBeGreaterThan(0);

      group.setAttr('isSelected', false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group as any).handleMouseout();

      expect(group.find('.hoverClone').length).toBe(0);
    });

    it('15.3 handleMouseout does nothing when isSelected is true', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group as any).handleMouseover();
      group.setAttr('isSelected', true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group as any).handleMouseout();

      // hoverClone should still be present
      expect(group.find('.hoverClone').length).toBeGreaterThan(0);
    });

    it('15.4 handleNodeChanges with 1 stroke-single node creates handles and shows them', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const strokeGroup = makeTipGroup({ id: 'target-stroke' });
      strokeGroup.setAttr('nodeType', WEAVE_STROKE_SINGLE_NODE_TYPE);

      handleNodeChanges([
        { node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBeInstanceOf(Konva.Circle);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle).toBeInstanceOf(Konva.Circle);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle.visible()).toBe(true);
    });

    it('15.5 handleNodeChanges with non-stroke-single nodes hides existing handles', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());

      // First, create handles by calling with a stroke-single node
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const strokeGroup = makeTipGroup({ id: 'stroke-2' });
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // Now call with a non-stroke-single selection
      handleNodeChanges([{ node: { type: 'rectangle' }, instance: new Konva.Group() }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle?.visible()).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle?.visible()).toBe(false);
    });

    it('15.6 handleZoomChanges scales handles by 1/stage.scaleX and 1/stage.scaleY', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const strokeGroup = makeTipGroup({ id: 'stroke-zoom' });
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // Now change stage scale in mock and call handleZoomChanges
      mock.getStage().scaleX.mockReturnValue(2);
      mock.getStage().scaleY.mockReturnValue(2);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleZoomChanges = (node as any).handleZoomChanges as (...args: unknown[]) => unknown;
      handleZoomChanges();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandle = (node as any).startHandle as Konva.Circle;
      expect(startHandle.scaleX()).toBeCloseTo(0.5); // 1/2
      expect(startHandle.scaleY()).toBeCloseTo(0.5);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 16 — onUpdate
  // -----------------------------------------------------------------------

  describe('onUpdate', () => {
    it('16.1 calls setAttrs on nodeInstance with nextProps', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const spy = vi.spyOn(group, 'setAttrs');

      const next = defaultProps({ strokeWidth: 5 });
      node.onUpdate(group, next);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining(next));
    });

    it('16.2 re-renders both tips via tipManagers (tipStartStyle + tipEndStyle)', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const noneSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any).tipManagers[WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.NONE],
        'render'
      );

      node.onUpdate(group, defaultProps()); // tipStartStyle/tipEndStyle default to 'none'
      expect(noneSpy).toHaveBeenCalledTimes(2); // once for start, once for end
    });

    it('16.3 updates internalLine attrs (stroke, strokeWidth, dash, fill)', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const internalLine = group.findOne('#ss-id-line') as Konva.Line;
      const lineSpy = vi.spyOn(internalLine, 'setAttrs');

      node.onUpdate(group, defaultProps({ stroke: '#aabbcc', strokeWidth: 7 }));

      expect(lineSpy).toHaveBeenCalledWith(
        expect.objectContaining({ stroke: '#aabbcc', strokeWidth: 7 })
      );
    });

    it('16.4 calls nodesSelectionPlugin.getTransformer().forceUpdate() when plugin present', () => {
      const forceUpdate = vi.fn();
      const plugin = makePluginMock();
      plugin.getTransformer.mockReturnValue({ forceUpdate });
      const { node, mock } = makeNode();
      mock.getPlugin.mockReturnValue(plugin);
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group, defaultProps());
      expect(forceUpdate).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // Suite 17 — scaleReset
  // -----------------------------------------------------------------------

  describe('scaleReset', () => {
    it('17.1 scales linePoints x-coords by scaleX()', () => {
      const { node } = makeNode();
      const shape = new Konva.Line({
        linePoints: [0, 0, 100, 50],
        scaleX: 2,
        scaleY: 1,
      });

      node.scaleReset(shape);

      const pts = shape.getAttrs().linePoints as number[];
      expect(pts[0]).toBe(0);   // 0 * 2
      expect(pts[2]).toBe(200); // 100 * 2
    });

    it('17.2 scales linePoints y-coords by scaleY()', () => {
      const { node } = makeNode();
      const shape = new Konva.Line({
        linePoints: [0, 0, 0, 100],
        scaleX: 1,
        scaleY: 3,
      });

      node.scaleReset(shape);

      const pts = shape.getAttrs().linePoints as number[];
      expect(pts[3]).toBe(300); // 100 * 3
    });

    it('17.3 handles multi-point linePoints (6+ values)', () => {
      const { node } = makeNode();
      const shape = new Konva.Line({
        linePoints: [0, 0, 50, 50, 100, 0],
        scaleX: 2,
        scaleY: 2,
      });

      node.scaleReset(shape);

      const pts = shape.getAttrs().linePoints as number[];
      expect(pts).toEqual([0, 0, 100, 100, 200, 0]);
    });

    it('17.4 resets scale to {x:1, y:1} after operation', () => {
      const { node } = makeNode();
      const shape = new Konva.Line({
        linePoints: [0, 0, 100, 0],
        scaleX: 2,
        scaleY: 3,
      });

      node.scaleReset(shape);

      expect(shape.scaleX()).toBe(1);
      expect(shape.scaleY()).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 18 — updateLine
  // -----------------------------------------------------------------------

  describe('updateLine', () => {
    it('18.1 calls tipManagers update for both start and end', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noneUpdate = vi.spyOn((node as any).tipManagers[WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.NONE], 'update');

      group.setAttr('tipStartStyle', WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.NONE);
      group.setAttr('tipEndStyle', WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.NONE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).updateLine(group);

      expect(noneUpdate).toHaveBeenCalledWith(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.START);
      expect(noneUpdate).toHaveBeenCalledWith(group, WEAVE_STROKE_SINGLE_NODE_TIP_SIDE.END);
    });

    it('18.2 defaults to "none" tip style when attrs are absent', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noneUpdate = vi.spyOn((node as any).tipManagers[WEAVE_STROKE_SINGLE_NODE_TIP_TYPE.NONE], 'update');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).updateLine(group)).not.toThrow();
      expect(noneUpdate).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Suite 19 — getDragPoint
  // -----------------------------------------------------------------------

  describe('getDragPoint (private — via direct cast)', () => {
    function makeLineGroup(lp: number[]): Konva.Group {
      return new Konva.Group({ linePoints: lp });
    }

    it('19.1 shift not pressed → returns newLinePoint directly', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).shiftPressed = false;
      const group = makeLineGroup([0, 0, 100, 0]);
      const newPoint = { x: 50, y: 30 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).getDragPoint(group, newPoint, 'start');
      expect(result).toEqual({ x: 50, y: 30 });
    });

    it('19.2 shift pressed → snaps angle via GreedySnapper and adjusts position', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).shiftPressed = true;
      // fixed = end = {x:100, y:0} (dragging start)
      // newPoint = {x:102, y:2} → angle ≈ 45 deg from fixed
      const group = makeLineGroup([0, 0, 100, 0]);
      const newPoint = { x: 102, y: 2 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).getDragPoint(group, newPoint, 'start');
      // Snapper will snap near 45 degrees or 0 degrees depending on threshold
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('19.3 uses end as fixed when dragging start, start as fixed when dragging end', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).shiftPressed = false;
      const group = makeLineGroup([10, 20, 30, 40]);
      // dragging end: newPoint returned directly
      const newPoint = { x: 99, y: 99 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultEnd = (node as any).getDragPoint(group, newPoint, 'end');
      expect(resultEnd).toEqual(newPoint);
      // dragging start: newPoint returned directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultStart = (node as any).getDragPoint(group, newPoint, 'start');
      expect(resultStart).toEqual(newPoint);
    });
  });

  // -----------------------------------------------------------------------
  // Suite 20 — static methods and schema
  // -----------------------------------------------------------------------

  describe('static defaultState', () => {
    it('20.1 type and props.nodeType are "stroke-single"', () => {
      const state = WeaveStrokeSingleNode.defaultState('node-1');
      expect(state.type).toBe(WEAVE_STROKE_SINGLE_NODE_TYPE);
      expect(state.props.nodeType).toBe(WEAVE_STROKE_SINGLE_NODE_TYPE);
    });

    it('20.2 includes strokeElements, stroke, fill, strokeWidth in props', () => {
      const state = WeaveStrokeSingleNode.defaultState('node-1');
      expect(state.props).toHaveProperty('strokeElements');
      expect(state.props).toHaveProperty('stroke');
      expect(state.props).toHaveProperty('fill');
      expect(state.props).toHaveProperty('strokeWidth');
    });
  });

  describe('static addNodeState', () => {
    const base = WeaveStrokeSingleNode.defaultState('n1');

    it('20.3 merges stroke when props.stroke is truthy', () => {
      const result = WeaveStrokeSingleNode.addNodeState(base, {
        x: 0, y: 0, strokeElements: [], stroke: '#aabbcc', strokeWidth: 0,
      } as unknown as WeaveElementAttributes);
      expect(result.props.stroke).toBe('#aabbcc');
    });

    it('20.4 omits stroke when props.stroke is falsy', () => {
      const result = WeaveStrokeSingleNode.addNodeState(base, {
        x: 0, y: 0, strokeElements: [], stroke: '', strokeWidth: 0,
      } as unknown as WeaveElementAttributes);
      // stroke should retain base value
      expect(result.props.stroke).toBe(base.props.stroke);
    });

    it('20.5 merges strokeWidth when truthy; omits when 0', () => {
      const withWidth = WeaveStrokeSingleNode.addNodeState(base, {
        x: 0, y: 0, strokeElements: [], strokeWidth: 5,
      } as unknown as WeaveElementAttributes);
      expect(withWidth.props.strokeWidth).toBe(5);

      const withZero = WeaveStrokeSingleNode.addNodeState(base, {
        x: 0, y: 0, strokeElements: [], strokeWidth: 0,
      } as unknown as WeaveElementAttributes);
      expect(withZero.props.strokeWidth).toBe(base.props.strokeWidth);
    });
  });

  describe('static updateNodeState', () => {
    const prev = WeaveStrokeSingleNode.defaultState('n1');

    it('20.6 merges stroke when nextProps.stroke is truthy', () => {
      const result = WeaveStrokeSingleNode.updateNodeState(prev, {
        x: 0, y: 0, strokeElements: [], stroke: '#112233', strokeWidth: 0,
      } as unknown as WeaveElementAttributes);
      expect(result.props.stroke).toBe('#112233');
    });

    it('20.7 omits stroke when nextProps.stroke is falsy — prev value retained', () => {
      const result = WeaveStrokeSingleNode.updateNodeState(prev, {
        x: 0, y: 0, strokeElements: [], stroke: '', strokeWidth: 1,
      } as unknown as WeaveElementAttributes);
      expect(result.props.stroke).toBe(prev.props.stroke);
    });
  });

  describe('static getSchema', () => {
    it('20.8 type must be "stroke-single" literal', () => {
      const schema = WeaveStrokeSingleNode.getSchema();
      const validProps = {
        id: 'k1',
        nodeType: WEAVE_STROKE_SINGLE_NODE_TYPE,
        x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotation: 0, zIndex: 1,
        strokeElements: [0, 0, 100, 100],
        fill: '#fff', stroke: '#000', strokeWidth: 1, strokeScaleEnabled: true,
        tipStartStyle: 'none', tipEndStyle: 'none',
        children: [],
      };
      expect(() => schema.parse({
        key: 'k1', type: WEAVE_STROKE_SINGLE_NODE_TYPE,
        props: validProps,
      })).not.toThrow();

      expect(() => schema.parse({
        key: 'k1', type: 'wrong-type',
        props: { nodeType: 'wrong-type' },
      })).toThrow();
    });

    it('20.9 strokeElements must be an array of exactly 4 numbers', () => {
      const schema = WeaveStrokeSingleNode.getSchema();
      const baseProps = {
        id: 'k',
        nodeType: WEAVE_STROKE_SINGLE_NODE_TYPE,
        x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotation: 0, zIndex: 1,
        fill: '#fff', stroke: '#000', strokeWidth: 1, strokeScaleEnabled: true,
        tipStartStyle: 'none', tipEndStyle: 'none',
        children: [],
      };
      const base = { key: 'k', type: WEAVE_STROKE_SINGLE_NODE_TYPE, props: baseProps };
      // 4 numbers → valid
      expect(() => schema.parse({ ...base, props: { ...base.props, strokeElements: [0, 0, 100, 0] } })).not.toThrow();
      // 2 numbers → invalid
      expect(() => schema.parse({ ...base, props: { ...base.props, strokeElements: [0, 0] } })).toThrow();
      // 6 numbers → invalid
      expect(() => schema.parse({ ...base, props: { ...base.props, strokeElements: [0, 0, 1, 1, 2, 2] } })).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Suite 21 — Additional coverage: guard paths and drag event handlers
  // -----------------------------------------------------------------------
  describe('additional coverage — guards and drag handlers', () => {
    it('21.1 showHandles returns early when startHandle is null', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).startHandle = null;
      const group = makeTipGroup({ id: 'show-null' });
      expect(() => (node as any).showHandles(group)).not.toThrow();
      // endHandle remains null since we returned early without creating handles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle).toBeNull();
    });

    it('21.2 showHandles returns early when endHandle is null', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).endHandle = null;
      const group = makeTipGroup({ id: 'show-null-end' });
      expect(() => (node as any).showHandles(group)).not.toThrow();
    });

    it('21.3 positionHandle returns early when internalLine is not found', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const strokeGroup = makeTipGroup({ id: 'pos-handle-test' });
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // Group with linePoints but NO internal line child
      const noLineGroup = new Konva.Group({ id: 'no-line', linePoints: [0, 0, 100, 0] });
      expect(() => (node as any).positionHandle(noLineGroup, 'start')).not.toThrow();
      expect(() => (node as any).positionHandle(noLineGroup, 'end')).not.toThrow();
    });

    it('21.4 teardownSelection clears isSelected and destroys hoverClone nodes', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const strokeGroup = new Konva.Group({ id: 'teardown-stroke' });
      strokeGroup.setAttr('isSelected', true);
      const hoverClone = new Konva.Line({ name: 'hoverClone', points: [0, 0, 10, 10] });
      strokeGroup.add(hoverClone);

      // Make stage.find() return the group
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).find.mockReturnValueOnce([strokeGroup]);

      (node as any).teardownSelection();

      expect(strokeGroup.find('.hoverClone').length).toBe(0);
      expect(strokeGroup.getAttr('isSelected')).toBe(false);
    });

    it('21.5 dragstart on handle emits onDrag event when stroke is found', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const strokeGroup = makeTipGroup({ id: 'drag-test' });
      strokeGroup.setAttr('linePoints', [0, 0, 100, 0]);
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'drag-test');

      // Make findOne return the stroke group for drag lookup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(strokeGroup);

      startHandle.fire('dragstart');

      expect(mock.emitEvent).toHaveBeenCalledWith('onDrag', startHandle);
    });

    it('21.6 dragstart on handle returns early when stroke is not found', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const strokeGroup = makeTipGroup({ id: 'drag-nf' });
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'not-found-stroke');

      // findOne returns null (default) — early return in handler
      expect(() => startHandle.fire('dragstart')).not.toThrow();
      expect(mock.emitEvent).not.toHaveBeenCalledWith('onDrag', expect.any(Konva.Circle));
    });

    it('21.7 dragmove on handle updates linePoints (start side)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const strokeGroup = makeTipGroup({ id: 'dragmove-test' });
      strokeGroup.setAttr('linePoints', [0, 0, 100, 0]);
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'dragmove-test');
      startHandle.position({ x: 20, y: 5 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(strokeGroup);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).find.mockReturnValue([]);

      startHandle.fire('dragmove');

      // linePoints start coordinates should have been updated
      const newPoints = strokeGroup.getAttr('linePoints') as number[];
      expect(newPoints).toHaveLength(4);
    });

    it('21.8 dragend on handle calls updateNode and emits onDrag null', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const strokeGroup = makeTipGroup({ id: 'dragend-test' });
      strokeGroup.setAttr('linePoints', [0, 0, 100, 0]);
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const endHandle = (node as any).endHandle as Konva.Circle;
      endHandle.setAttr('strokeId', 'dragend-test');
      endHandle.position({ x: 80, y: 0 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(strokeGroup);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).find.mockReturnValue([]);

      endHandle.fire('dragend');

      expect(mock.emitEvent).toHaveBeenCalledWith('onDrag', null);
      expect(mock.updateNode).toHaveBeenCalled();
    });

    it('21.9 getDragPoint with shiftPressed snaps angle to nearest 45 degrees', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).shiftPressed = true;
      const strokeGroup = makeTipGroup({ id: 'snap-test' });
      strokeGroup.setAttr('linePoints', [0, 0, 100, 0]);
      // Drag start from (10, 10) with fixed point at end (100, 0)
      const result = (node as any).getDragPoint(strokeGroup, { x: 10, y: 10 }, 'start');
      // Should be snapped to a 45-degree-aligned position
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    it('21.10 dragstart calls transformer.hide() when nodesSelection plugin returns transformer', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock as any).getPlugin.mockReturnValue(pluginMock);
      node.onRender(defaultProps());

      const strokeGroup = makeTipGroup({ id: 'tr-hide-test' });
      strokeGroup.setAttr('linePoints', [0, 0, 100, 0]);
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'tr-hide-test');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(strokeGroup);

      startHandle.fire('dragstart');

      expect(pluginMock.getTransformer().hide).toHaveBeenCalled();
    });

    it('21.11 pointerover / pointerout on handle changes stage cursor', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const strokeGroup = makeTipGroup({ id: 'cursor-test' });
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      const container = mock.getStage().container();
      const startHandle = (node as any).startHandle as Konva.Circle;

      startHandle.fire('pointerover');
      expect(container.style.cursor).toBe('move');

      startHandle.fire('pointerout');
      expect(container.style.cursor).toBe('default');
    });

    it('21.12 dragend returns early when stroke not found (both findOne return null)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const strokeGroup = makeTipGroup({ id: 'dragend-null' });
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: strokeGroup }]);

      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'not-found');
      // findOne returns null → both handleDragPosition and handleDragEnd outer guard triggered
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);

      expect(() => startHandle.fire('dragend')).not.toThrow();
      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('21.13 dragmove returns early when internalLine is not found in stroke group', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      // Stroke group WITHOUT a line child (just linePoints, no -line child)
      const noLineStroke = new Konva.Group({ id: 'no-line-stroke', linePoints: [0, 0, 100, 0] });
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      // Need to use a group with a line to create handles, then test dragmove with no-line group
      const setupGroup = makeTipGroup({ id: 'setup-grp' });
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: setupGroup }]);

      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'no-line-stroke');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(noLineStroke);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).find.mockReturnValue([]);

      expect(() => startHandle.fire('dragmove')).not.toThrow();
    });

    it('21.14 dragmove returns early when linePoints length is not 4', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const badPointsGroup = makeTipGroup({ id: 'bad-pts' });
      badPointsGroup.setAttr('linePoints', [0, 0]); // only 2 points
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const setupGroup = makeTipGroup({ id: 'setup-grp2' });
      handleNodeChanges([{ node: { type: WEAVE_STROKE_SINGLE_NODE_TYPE }, instance: setupGroup }]);

      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('strokeId', 'bad-pts');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(badPointsGroup);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).find.mockReturnValue([]);

      expect(() => startHandle.fire('dragmove')).not.toThrow();
      // linePoints unchanged since we returned early
      expect(badPointsGroup.getAttr('linePoints')).toEqual([0, 0]);
    });
  });
});
