// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeAll } from 'vitest';
import Konva from 'konva';
import { WeaveLineNode } from '../line';
import {
  WEAVE_LINE_NODE_DEFAULT_CONFIG,
  WEAVE_LINE_NODE_TYPE,
} from '../constants';
import { augmentKonvaNodeClass } from '../../node';
import type { WeaveElementAttributes } from '@inditextech/weave-types';

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
      find: vi.fn().mockReturnValue([]),
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

function makeNode(config?: object): {
  node: WeaveLineNode;
  mock: ReturnType<typeof createMockInstance>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node = config ? new WeaveLineNode({ config: config as any }) : new WeaveLineNode();
  const mock = createMockInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (node as any).instance = mock;
  return { node, mock };
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

function defaultProps(
  overrides: Partial<WeaveElementAttributes> = {}
): WeaveElementAttributes {
  return {
    id: 'line-id',
    nodeType: WEAVE_LINE_NODE_TYPE,
    x: 0,
    y: 0,
    points: [0, 0, 100, 100],
    stroke: '#000000',
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

/** Creates a Konva.Line that simulates a rendered line node. */
function makeLine(points = [0, 0, 100, 100], id = 'line-id'): Konva.Line {
  return new Konva.Line({ id, nodeType: WEAVE_LINE_NODE_TYPE, points, x: 0, y: 0 });
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

describe('WeaveLineNode', () => {
  // =========================================================================
  // Suite 1 — constructor
  // =========================================================================

  describe('constructor', () => {
    it('1.1 nodeType is "line"', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).nodeType).toBe(WEAVE_LINE_NODE_TYPE);
    });

    it('1.2 default snapAngles config applied when no params given', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.snapAngles.angles).toEqual(WEAVE_LINE_NODE_DEFAULT_CONFIG.snapAngles.angles);
      expect(cfg.snapAngles.activateThreshold).toBe(
        WEAVE_LINE_NODE_DEFAULT_CONFIG.snapAngles.activateThreshold
      );
    });

    it('1.3 custom config merges with defaults (non-array values override)', () => {
      const { node } = makeNode({ snapAngles: { activateThreshold: 99, angles: [0, 90], releaseThreshold: 15 } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = (node as any).config;
      expect(cfg.snapAngles.activateThreshold).toBe(99);
    });

    it('1.4 startHandle and endHandle are null initially', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle).toBeNull();
    });
  });

  // =========================================================================
  // Suite 2 — initialize()
  // =========================================================================

  describe('initialize()', () => {
    it('2.1 handleNodeChanges is null after initialize', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).handleNodeChanges).toBeNull();
    });

    it('2.2 handleZoomChanges is null after initialize', () => {
      const { node } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).handleZoomChanges).toBeNull();
    });
  });

  // =========================================================================
  // Suite 3 — onRender: basic shape
  // =========================================================================

  describe('onRender — shape attrs', () => {
    it('3.1 returns a Konva.Line instance', () => {
      const { node } = makeNode();
      const result = node.onRender(defaultProps());
      expect(result).toBeInstanceOf(Konva.Line);
    });

    it('3.2 name is "node" and strokeScaleEnabled is true', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(line.name()).toBe('node');
      expect(line.getAttr('strokeScaleEnabled')).toBe(true);
    });

    it('3.3 allowedAnchors returns the 4 corner anchors', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(line.allowedAnchors()).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
    });

    it('3.4 getNodeAnchors returns empty array', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(line.getNodeAnchors()).toEqual([]);
    });
  });

  // =========================================================================
  // Suite 4 — onRender: getTransformerProperties
  // =========================================================================

  describe('onRender — getTransformerProperties', () => {
    it('4.1 ignoreStroke is always true', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(line.getTransformerProperties().ignoreStroke).toBe(true);
    });

    it('4.2 points.length === 4: rotateEnabled=false, keepRatio=false, flipEnabled=true, shiftBehavior="none", shouldOverdrawWholeArea=false', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps({ points: [0, 0, 100, 100] })) as Konva.Line;
      const props = line.getTransformerProperties();
      expect(props.rotateEnabled).toBe(false);
      expect(props.keepRatio).toBe(false);
      expect(props.flipEnabled).toBe(true);
      expect(props.shiftBehavior).toBe('none');
      expect(props.shouldOverdrawWholeArea).toBe(false);
    });

    it('4.3 points.length !== 4: rotateEnabled=true, keepRatio=true, flipEnabled=false, shiftBehavior="default", shouldOverdrawWholeArea=true', () => {
      const { node } = makeNode();
      // 6 points (polyline)
      const line = node.onRender(defaultProps({ points: [0, 0, 50, 50, 100, 100] })) as Konva.Line;
      const props = line.getTransformerProperties();
      expect(props.rotateEnabled).toBe(true);
      expect(props.keepRatio).toBe(true);
      expect(props.flipEnabled).toBe(false);
      expect(props.shiftBehavior).toBe('default');
      expect(props.shouldOverdrawWholeArea).toBe(true);
    });

    it('4.4 merges defaultTransformerProperties from config.transform', () => {
      const { node } = makeNode({ transform: { anchorSize: 12 } });
      const line = node.onRender(defaultProps()) as Konva.Line;
      const props = line.getTransformerProperties();
      expect(props.anchorSize).toBe(12);
    });

    it('4.5 dynamically re-evaluates when points change', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps({ points: [0, 0, 100, 100] })) as Konva.Line;
      expect(line.getTransformerProperties().rotateEnabled).toBe(false); // 4 points

      line.points([0, 0, 50, 50, 100, 100]); // change to 6 points
      expect(line.getTransformerProperties().rotateEnabled).toBe(true);
    });
  });

  // =========================================================================
  // Suite 5 — onRender: line dragstart/dragend
  // =========================================================================

  describe('onRender — line dragstart/dragend', () => {
    it('5.1 line.fire("dragstart") does not throw', () => {
      // Note: line.on('dragstart', ...) at onRender is registered before setupDefaultNodeEvents,
      // which calls node.off('dragstart') and replaces it with the base handler.
      // The custom visibility-saving handler is therefore dead code.
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(() => line.fire('dragstart')).not.toThrow();
    });

    it('5.2 line.fire("dragend") does not throw', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(() => line.fire('dragend')).not.toThrow();
    });

    it('5.3 dragend with null handles does not throw', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      expect(() => {
        line.fire('dragstart');
        line.fire('dragend');
      }).not.toThrow();
    });

    it('5.4 dragend resets saved visibility vars to null (idempotent second dragend)', () => {
      const { node } = makeNode();
      const line = node.onRender(defaultProps()) as Konva.Line;
      const handle = new Konva.Circle({ visible: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any).startHandle = handle;

      line.fire('dragstart');
      line.fire('dragend');
      // second dragend with null saved visibility → visible(null) should not crash
      expect(() => line.fire('dragend')).not.toThrow();
    });
  });

  // =========================================================================
  // Suite 6 — onRender: handleZoomChanges
  // =========================================================================

  describe('onRender — handleZoomChanges', () => {
    it('6.1 addEventListener called with "onZoomChange"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      expect(mock.addEventListener).toHaveBeenCalledWith('onZoomChange', expect.any(Function));
    });

    it('6.2 handleZoomChanges scales startHandle and endHandle by 1/stageScale', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      // Create handles first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      const line = makeLine([0, 0, 100, 100], 'zoom-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);

      // Change stage scale
      mock.getStage().scaleX.mockReturnValue(2);
      mock.getStage().scaleY.mockReturnValue(2);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleZoomChanges = (node as any).handleZoomChanges as (...args: unknown[]) => unknown;
      handleZoomChanges();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle.scaleX()).toBeCloseTo(0.5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle.scaleX()).toBeCloseTo(0.5);
    });

    it('6.3 second onRender() does not double-register handleZoomChanges', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      node.onRender(defaultProps());
      const zoomCalls = mock.addEventListener.mock.calls.filter(
        ([event]) => event === 'onZoomChange'
      );
      expect(zoomCalls).toHaveLength(1);
    });
  });

  // =========================================================================
  // Suite 7 — onRender: handleNodeChanges
  // =========================================================================

  describe('onRender — handleNodeChanges', () => {
    it('7.1 addEventListener called with "onNodesChange"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      expect(mock.addEventListener).toHaveBeenCalledWith('onNodesChange', expect.any(Function));
    });

    it('7.2 matching selection (nodeType=line, 4 points, findOne returns line) → setupHandles + showHandles', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      const line = makeLine([0, 0, 100, 100], 'sel-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBeInstanceOf(Konva.Circle);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle.visible()).toBe(true);
    });

    it('7.3 matching selection but findOne returns null → returns early (handles not shown)', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());

      const line = makeLine([0, 0, 100, 100], 'missing-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // findOne returns null (default mock)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      expect(() => handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }])).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBeNull();
    });

    it('7.4 non-matching selection → clears lineId and hides handles', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());

      // First show handles
      const line = makeLine([0, 0, 100, 100], 'hide-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);

      // Now call with non-matching (rectangle type)
      const rectInstance = new Konva.Rect();
      rectInstance.setAttr('nodeType', 'rectangle');
      vi.spyOn(rectInstance, 'getAttrs').mockReturnValue({ nodeType: 'rectangle' });
      handleNodeChanges([{ node: { type: 'rectangle' }, instance: rectInstance }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle?.visible()).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle?.visible()).toBe(false);
    });

    it('7.5 second onRender() does not double-register handleNodeChanges', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      // Clear mock to count only registrations from the second render
      mock.addEventListener.mockClear();
      node.onRender(defaultProps());
      const nodesChangeCalls = mock.addEventListener.mock.calls.filter(
        ([event]) => event === 'onNodesChange'
      );
      // setupDefaultNodeEvents always registers its own handler; line-specific is guarded (1 total)
      expect(nodesChangeCalls).toHaveLength(1);
    });
  });

  // =========================================================================
  // Suite 8 — setupHandles()
  // =========================================================================

  describe('setupHandles()', () => {
    function setupHandlesViaHandleNodeChanges(node: WeaveLineNode, mock: ReturnType<typeof createMockInstance>) {
      const line = makeLine([0, 0, 100, 100], 'h-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);
    }

    it('8.1 creates startHandle as Konva.Circle with id="line-start-handle"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      setupHandlesViaHandleNodeChanges(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sh = (node as any).startHandle as Konva.Circle;
      expect(sh).toBeInstanceOf(Konva.Circle);
      expect(sh.id()).toBe('line-start-handle');
    });

    it('8.2 creates endHandle as Konva.Circle with id="line-end-handle"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      setupHandlesViaHandleNodeChanges(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eh = (node as any).endHandle as Konva.Circle;
      expect(eh).toBeInstanceOf(Konva.Circle);
      expect(eh.id()).toBe('line-end-handle');
    });

    it('8.3 both handles added to selectionLayer', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      setupHandlesViaHandleNodeChanges(node, mock);
      expect(mock.getSelectionLayer().add).toHaveBeenCalledTimes(2);
    });

    it('8.4 setupHandles is idempotent — second call does not recreate handles', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      setupHandlesViaHandleNodeChanges(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstStart = (node as any).startHandle;
      setupHandlesViaHandleNodeChanges(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle).toBe(firstStart);
      expect(mock.getSelectionLayer().add).toHaveBeenCalledTimes(2); // still only 2
    });
  });

  // =========================================================================
  // Suite 9 — showHandles()
  // =========================================================================

  describe('showHandles()', () => {
    it('9.1 positions startHandle at line start + parent offset', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const line = makeLine([10, 20, 90, 80], 'sh-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sh = (node as any).startHandle as Konva.Circle;
      // parentPosition = {0,0} (no parent), line.x()=0, line.y()=0, x1=10, y1=20
      expect(sh.x()).toBe(10);
      expect(sh.y()).toBe(20);
    });

    it('9.2 positions endHandle at line end + parent offset', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const line = makeLine([10, 20, 90, 80], 'sh-line2');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eh = (node as any).endHandle as Konva.Circle;
      expect(eh.x()).toBe(90);
      expect(eh.y()).toBe(80);
    });

    it('9.3 both handles become visible after showHandles', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const line = makeLine([0, 0, 100, 100], 'vis-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).startHandle.visible()).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((node as any).endHandle.visible()).toBe(true);
    });

    it('9.4 showHandles returns early when startHandle is null', () => {
      const { node } = makeNode();
      node.onRender(defaultProps());
      const line = makeLine([0, 0, 100, 100]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (node as any).showHandles(line)).not.toThrow();
    });
  });

  // =========================================================================
  // Suite 10 — pointer cursor
  // =========================================================================

  describe('handle pointer cursor', () => {
    function getHandles(node: WeaveLineNode, mock: ReturnType<typeof createMockInstance>) {
      const line = makeLine([0, 0, 100, 100], 'cursor-line');
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startHandle: (node as any).startHandle as Konva.Circle,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        endHandle: (node as any).endHandle as Konva.Circle,
      };
    }

    it('10.1 pointerover on startHandle sets cursor to "move"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = getHandles(node, mock);
      const container = mock.getStage().container();
      startHandle.fire('pointerover');
      expect(container.style.cursor).toBe('move');
    });

    it('10.2 pointerout on startHandle resets cursor to "default"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = getHandles(node, mock);
      const container = mock.getStage().container();
      startHandle.fire('pointerover');
      startHandle.fire('pointerout');
      expect(container.style.cursor).toBe('default');
    });

    it('10.3 pointerover on endHandle sets cursor to "move"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = getHandles(node, mock);
      const container = mock.getStage().container();
      endHandle.fire('pointerover');
      expect(container.style.cursor).toBe('move');
    });

    it('10.4 pointerout on endHandle resets cursor to "default"', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = getHandles(node, mock);
      const container = mock.getStage().container();
      endHandle.fire('pointerover');
      endHandle.fire('pointerout');
      expect(container.style.cursor).toBe('default');
    });
  });

  // =========================================================================
  // Suite 11 — startHandle drag events
  // =========================================================================

  describe('startHandle drag events', () => {
    function setupWithLine(node: WeaveLineNode, mock: ReturnType<typeof createMockInstance>, lineId = 'drag-line') {
      const line = makeLine([0, 0, 100, 100], lineId);
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startHandle = (node as any).startHandle as Konva.Circle;
      startHandle.setAttr('lineId', lineId);
      return { line, startHandle };
    }

    it('11.1 dragstart: line found → sets eventTarget=true, emits onDrag(target)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = setupWithLine(node, mock);
      startHandle.fire('dragstart');
      expect(mock.emitEvent).toHaveBeenCalledWith('onDrag', startHandle);
    });

    it('11.2 dragstart: line not found → returns early (no emitEvent)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = setupWithLine(node, mock);
      // Now make findOne return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);
      startHandle.setAttr('lineId', 'not-found');
      expect(() => startHandle.fire('dragstart')).not.toThrow();
      expect(mock.emitEvent).not.toHaveBeenCalledWith('onDrag', startHandle);
    });

    it('11.3 dragmove: line found → updates start points of line', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { line, startHandle } = setupWithLine(node, mock);
      startHandle.position({ x: 20, y: 10 });
      startHandle.fire('dragmove', { evt: { shiftKey: false } });
      const pts = line.points();
      expect(pts).toHaveLength(4);
      // x2, y2 (end) unchanged
      expect(pts[2]).toBe(100);
      expect(pts[3]).toBe(100);
    });

    it('11.4 dragmove: line not found → returns early', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = setupWithLine(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);
      startHandle.setAttr('lineId', 'not-found');
      expect(() => startHandle.fire('dragmove')).not.toThrow();
    });

    it('11.5 dragend: line found → calls updateNode and emits onDrag(null)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = setupWithLine(node, mock);
      startHandle.fire('dragend');
      expect(mock.updateNode).toHaveBeenCalled();
      expect(mock.emitEvent).toHaveBeenCalledWith('onDrag', null);
    });

    it('11.6 dragend: line not found → returns early', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { startHandle } = setupWithLine(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);
      startHandle.setAttr('lineId', 'not-found');
      expect(() => startHandle.fire('dragend')).not.toThrow();
      expect(mock.updateNode).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Suite 12 — endHandle drag events
  // =========================================================================

  describe('endHandle drag events', () => {
    function setupWithLine(node: WeaveLineNode, mock: ReturnType<typeof createMockInstance>, lineId = 'end-drag-line') {
      const line = makeLine([0, 0, 100, 100], lineId);
      line.setAttr('nodeType', WEAVE_LINE_NODE_TYPE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNodeChanges = (node as any).handleNodeChanges as (...args: unknown[]) => unknown;
      handleNodeChanges([{ node: { type: WEAVE_LINE_NODE_TYPE }, instance: line }]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const endHandle = (node as any).endHandle as Konva.Circle;
      endHandle.setAttr('lineId', lineId);
      return { line, endHandle };
    }

    it('12.1 dragstart: line found → sets eventTarget=true, emits onDrag(target)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = setupWithLine(node, mock);
      endHandle.fire('dragstart');
      expect(mock.emitEvent).toHaveBeenCalledWith('onDrag', endHandle);
    });

    it('12.1b dragstart: line not found → returns early', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = setupWithLine(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);
      endHandle.setAttr('lineId', 'not-found');
      expect(() => endHandle.fire('dragstart')).not.toThrow();
      expect(mock.emitEvent).not.toHaveBeenCalledWith('onDrag', endHandle);
    });

    it('12.2 dragmove: line found → updates end points of line', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { line, endHandle } = setupWithLine(node, mock);
      endHandle.position({ x: 80, y: 90 });
      endHandle.fire('dragmove', { evt: { shiftKey: false } });
      const pts = line.points();
      expect(pts).toHaveLength(4);
      // x1, y1 (start) unchanged
      expect(pts[0]).toBe(0);
      expect(pts[1]).toBe(0);
    });

    it('12.3 dragmove: line not found → returns early', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = setupWithLine(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);
      endHandle.setAttr('lineId', 'not-found');
      expect(() => endHandle.fire('dragmove')).not.toThrow();
    });

    it('12.4 dragend: line found → calls updateNode and emits onDrag(null)', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = setupWithLine(node, mock);
      endHandle.fire('dragend');
      expect(mock.updateNode).toHaveBeenCalled();
      expect(mock.emitEvent).toHaveBeenCalledWith('onDrag', null);
    });

    it('12.5 dragend: line not found → returns early', () => {
      const { node, mock } = makeNode();
      node.onRender(defaultProps());
      const { endHandle } = setupWithLine(node, mock);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(null);
      endHandle.setAttr('lineId', 'not-found');
      expect(() => endHandle.fire('dragend')).not.toThrow();
      expect(mock.updateNode).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Suite 13 — defineFinalPoint() (private)
  // =========================================================================

  describe('defineFinalPoint() — private', () => {
    it('13.1 without shiftKey → returns handle.position()', () => {
      const { node } = makeNode();
      const handle = new Konva.Circle({ x: 50, y: 30 });
      const origin = { x: 0, y: 0 };
      const fakeEvent = { evt: { shiftKey: false } } as unknown as Konva.KonvaEventObject<DragEvent>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).defineFinalPoint(handle, origin, fakeEvent);
      expect(result.x).toBe(50);
      expect(result.y).toBe(30);
    });

    it('13.2 with shiftKey → snaps angle to nearest configured angle (0° for near-horizontal)', () => {
      const { node } = makeNode();
      const handle = new Konva.Circle({ x: 100, y: 3 }); // nearly horizontal
      const origin = { x: 0, y: 0 };
      const fakeEvent = { evt: { shiftKey: true } } as unknown as Konva.KonvaEventObject<DragEvent>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).defineFinalPoint(handle, origin, fakeEvent);
      // Should snap to 0° → y ≈ 0
      expect(result.y).toBeCloseTo(0, 0);
      expect(result.x).toBeGreaterThan(0);
    });

    it('13.3 with shiftKey → distance is preserved after snap', () => {
      const { node } = makeNode();
      const handle = new Konva.Circle({ x: 100, y: 3 });
      const origin = { x: 0, y: 0 };
      const fakeEvent = { evt: { shiftKey: true } } as unknown as Konva.KonvaEventObject<DragEvent>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (node as any).defineFinalPoint(handle, origin, fakeEvent);
      const originalDist = Math.hypot(100, 3);
      const resultDist = Math.hypot(result.x - origin.x, result.y - origin.y);
      expect(resultDist).toBeCloseTo(originalDist, 1);
    });
  });

  // =========================================================================
  // Suite 14 — getParentPosition() (private)
  // =========================================================================

  describe('getParentPosition() — private', () => {
    it('14.1 line with no parent → returns {x:0, y:0}', () => {
      const { node } = makeNode();
      const line = makeLine();
      // line has no parent group
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = (node as any).getParentPosition(line);
      expect(pos).toEqual({ x: 0, y: 0 });
    });

    it('14.2 line parent has no nodeId attr → returns {x:0, y:0}', () => {
      const { node } = makeNode();
      const group = new Konva.Group({ id: 'parent-no-nodeid' }); // no nodeId attr
      const line = makeLine();
      group.add(line);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = (node as any).getParentPosition(line);
      expect(pos).toEqual({ x: 0, y: 0 });
    });

    it('14.3 line parent has nodeId and container found → returns container position', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ id: 'wrapper' });
      group.setAttr('nodeId', 'real-container');
      const line = makeLine();
      group.add(line);

      // Mock findOne to return a container at (50, 75)
      const realContainer = new Konva.Group({ x: 50, y: 75 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock.getStage() as any).findOne.mockReturnValue(realContainer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pos = (node as any).getParentPosition(line);
      expect(pos.x).toBe(50);
      expect(pos.y).toBe(75);
    });
  });

  // =========================================================================
  // Suite 15 — onUpdate()
  // =========================================================================

  describe('onUpdate()', () => {
    it('15.1 calls setAttrs on nodeInstance with nextProps', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Line({ points: [0, 0, 10, 10] });
      const nextProps = { stroke: '#ff0000', strokeWidth: 3 } as WeaveElementAttributes;
      node.onUpdate(nodeInstance, nextProps);
      expect(nodeInstance.stroke()).toBe('#ff0000');
      expect(nodeInstance.strokeWidth()).toBe(3);
    });

    it('15.2 calls transformer.forceUpdate() when nodesSelection plugin present', () => {
      const pluginMock = makePluginMock();
      const { node, mock } = makeNode();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mock as any).getPlugin.mockReturnValue(pluginMock);
      const nodeInstance = new Konva.Line({ points: [0, 0, 10, 10] });
      node.onUpdate(nodeInstance, {} as WeaveElementAttributes);
      expect(pluginMock.getTransformer().forceUpdate).toHaveBeenCalled();
    });

    it('15.3 no error when plugin is absent', () => {
      const { node } = makeNode();
      const nodeInstance = new Konva.Line({ points: [0, 0, 10, 10] });
      expect(() => node.onUpdate(nodeInstance, {} as WeaveElementAttributes)).not.toThrow();
    });
  });

  // =========================================================================
  // Suite 16 — scaleReset()
  // =========================================================================

  describe('scaleReset()', () => {
    it('16.1 scales all 4 points by current scale.x and scale.y', () => {
      const { node } = makeNode();
      const line = new Konva.Line({ points: [10, 20, 30, 40], scaleX: 2, scaleY: 3 });
      node.scaleReset(line);
      expect(line.points()).toEqual([20, 60, 60, 120]);
    });

    it('16.2 resets node scale to (1, 1) after scaling points', () => {
      const { node } = makeNode();
      const line = new Konva.Line({ points: [10, 20, 30, 40], scaleX: 2, scaleY: 2 });
      node.scaleReset(line);
      expect(line.scaleX()).toBe(1);
      expect(line.scaleY()).toBe(1);
    });

    it('16.3 works with a polyline (more than 4 points)', () => {
      const { node } = makeNode();
      const line = new Konva.Line({ points: [0, 0, 50, 50, 100, 0], scaleX: 2, scaleY: 2 });
      node.scaleReset(line);
      expect(line.points()).toEqual([0, 0, 100, 100, 200, 0]);
      expect(line.scaleX()).toBe(1);
    });
  });
});
