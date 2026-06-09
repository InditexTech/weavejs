// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({
  default: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('@/utils/utils', () => ({
  clearContainerTargets: vi.fn(),
  containerOverCursor: vi.fn().mockReturnValue(undefined),
  hasFrames: vi.fn().mockReturnValue(false),
  moveNodeToContainerNT: vi.fn().mockReturnValue(false),
}));

vi.mock('konva', () => {
  class Layer {
    add = vi.fn();
    show = vi.fn();
    hide = vi.fn();
    find = vi.fn().mockReturnValue([]);
    hitGraphEnabled = vi.fn();
  }
  class Transformer {
    nodes = vi.fn().mockReturnValue([]);
    setNodes = vi.fn();
    setAttrs = vi.fn();
    getAttrs = vi.fn().mockReturnValue({});
    forceUpdate = vi.fn();
    getChildren = vi.fn().mockReturnValue([]);
    on = vi.fn();
    fire = vi.fn();
  }
  class Stage {
    container = vi.fn().mockReturnValue({ style: { cursor: '' } });
    on = vi.fn();
    findOne = vi.fn().mockReturnValue(undefined);
    find = vi.fn().mockReturnValue([]);
    getPointerPosition = vi.fn().mockReturnValue({ x: 50, y: 50 });
    getIntersection = vi.fn().mockReturnValue(null);
    handleMouseover = vi.fn();
  }
  return { default: { Layer, Transformer, Stage } };
});

import {
  clearContainerTargets,
  containerOverCursor,
  hasFrames,
  moveNodeToContainerNT,
} from '@/utils/utils';
import Konva from 'konva';
import { TransformerController } from '../transformer-controller';
import type { TransformerCallbacks } from '../transformer-controller';
import type { GestureDetector } from '../gesture-detector';
import type { WeaveNodesSelectionConfig } from '../types';
import { WEAVE_NODES_SELECTION_DEFAULT_CONFIG } from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeGesture(): GestureDetector {
  return {
    checkMoved: vi.fn().mockReturnValue(false),
    checkMovedDrag: vi.fn().mockReturnValue(false),
    checkDoubleTap: vi.fn(),
    setTapStart: vi.fn(),
    commitTap: vi.fn(),
    reset: vi.fn(),
    resetDoubleTap: vi.fn(),
    isDoubleTap: false,
    taps: 0,
    tapStart: null,
    previousTap: null,
    tapTimeoutId: null,
  } as unknown as GestureDetector;
}

function makeCallbacks(): TransformerCallbacks {
  return {
    isSelecting: vi.fn().mockReturnValue(true),
    setSelectedNodes: vi.fn(),
    triggerSelectedNodesEvent: vi.fn(),
    saveDragSelectedNodes: vi.fn(),
    setNodesOpacityOnDrag: vi.fn(),
    disablePlugin: vi.fn(),
    enablePlugin: vi.fn(),
    getContextMenuPlugin: vi.fn().mockReturnValue(undefined),
    getUsersPresencePlugin: vi.fn().mockReturnValue(undefined),
    getStagePanningPlugin: vi.fn().mockReturnValue(undefined),
    getNodesSelectionFeedbackPlugin: vi.fn().mockReturnValue(undefined),
  };
}

function makeKonvaNode(attrs: Record<string, unknown> = {}) {
  return {
    id: vi.fn().mockReturnValue(attrs.id ?? 'node-1'),
    x: vi.fn().mockReturnValue(10),
    y: vi.fn().mockReturnValue(10),
    width: vi.fn().mockReturnValue(100),
    height: vi.fn().mockReturnValue(100),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    rotation: vi.fn().mockReturnValue(0),
    getAttrs: vi
      .fn()
      .mockReturnValue({ id: 'node-1', nodeType: 'rect', ...attrs }),
    getParent: vi.fn().mockReturnValue(null),
    getAbsolutePosition: vi.fn().mockReturnValue({ x: 10, y: 10 }),
    getChildren: vi.fn().mockReturnValue([]),
    clone: vi.fn().mockReturnThis(),
    stopDrag: vi.fn(),
    updatePosition: vi.fn(),
    handleSelectNode: vi.fn(),
    handleDeselectNode: vi.fn(),
    handleMouseover: vi.fn(),
    handleMouseout: vi.fn(),
    setAttrs: vi.fn(),
    fire: vi.fn(),
  };
}

function makeWeave() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  const stage = new Konva.Stage();
  const mainLayer = { hitGraphEnabled: vi.fn(), fire: vi.fn() };
  const selectionLayer = {
    hitGraphEnabled: vi.fn(),
    find: vi.fn().mockReturnValue([]),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getSelectionLayer: vi.fn().mockReturnValue(selectionLayer),
    emitEvent: vi.fn(),
    getHooks: vi.fn().mockReturnValue({ callHook: vi.fn() }),
    setMutexLock: vi.fn(),
    releaseMutexLock: vi.fn(),
    stateTransactional: vi.fn((fn: () => void) => fn()),
    updateNodesNT: vi.fn(),
    runPhaseHooks: vi.fn(),
    getCloningManager: vi.fn().mockReturnValue({ cleanupClones: vi.fn() }),
    getInstanceRecursive: vi.fn().mockReturnValue(null),
    getNodeHandler: vi.fn().mockReturnValue(null),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    addEventListener: vi.fn(
      (event: string, cb: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }
    ),
    _listeners: listeners,
    _trigger: (event: string, ...args: unknown[]) => {
      (listeners[event] ?? []).forEach((cb) => cb(...args));
    },
  };
}

type FakeWeave = ReturnType<typeof makeWeave>;

function makeController(weaveOverride?: FakeWeave) {
  const weave = weaveOverride ?? makeWeave();
  const stage = weave.getStage();
  const config = {
    ...WEAVE_NODES_SELECTION_DEFAULT_CONFIG,
  } as WeaveNodesSelectionConfig;
  const gesture = makeGesture();
  const callbacks = makeCallbacks();
  const ctrl = new TransformerController(
    weave as unknown as import('@/weave').Weave,
    config,
    gesture,
    callbacks
  );
  const layer = new Konva.Layer();
  ctrl.setup(layer);
  return { ctrl, weave, gesture, callbacks, layer, stage };
}

function getHandler(mockFn: ReturnType<typeof vi.fn>, event: string) {
  const call = (
    mockFn.mock.calls as [string, (...args: unknown[]) => void][]
  ).find(([e]) => e === event);
  if (!call) throw new Error(`No handler registered for '${event}'`);
  return call[1];
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('TransformerController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setup() and accessors', () => {
    it('getTransformer() returns the selection transformer', () => {
      const { ctrl } = makeController();
      expect(ctrl.getTransformer()).toBeTruthy();
    });

    it('getHoverTransformer() returns the hover transformer', () => {
      const { ctrl } = makeController();
      expect(ctrl.getHoverTransformer()).toBeTruthy();
    });

    it('isDragging() is false initially', () => {
      const { ctrl } = makeController();
      expect(ctrl.isDragging()).toBe(false);
    });

    it('isTransforming() is false initially', () => {
      const { ctrl } = makeController();
      expect(ctrl.isTransforming()).toBe(false);
    });

    it('adds both transformers to the layer on setup()', () => {
      const { ctrl, layer } = makeController();
      const tr = ctrl.getTransformer();
      const trHover = ctrl.getHoverTransformer();
      expect(layer.add).toHaveBeenCalledWith(tr);
      expect(layer.add).toHaveBeenCalledWith(trHover);
    });
  });

  describe('registerStagePointerMove', () => {
    it('does nothing when dragInProcess is true', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      // Simulate drag in process by triggering dragstart
      const dragstartHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      dragstartHandler({
        evt: { button: 0 },
        target: node,
        cancelBubble: false,
      });
      // Now pointermove should bail immediately (dragInProcess=true)
      vi.clearAllMocks();
      handler();
      expect(stage.getPointerPosition).not.toHaveBeenCalled();
    });

    it('does nothing when 0 nodes selected', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      handler();
      expect(stage.getPointerPosition).not.toHaveBeenCalled();
    });

    it('does nothing when selected node is not a container principal', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ isContainerPrincipal: false });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      handler();
      expect(stage.getPointerPosition).not.toHaveBeenCalled();
    });

    it('returns early when pointer position is null', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ isContainerPrincipal: true });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue(
        null
      );
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      handler();
      expect(tr.setAttrs).not.toHaveBeenCalled();
    });

    it('sets listening=true when no shape under pointer', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ isContainerPrincipal: true });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 10,
        y: 10,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      handler();
      expect(tr.setAttrs).toHaveBeenCalledWith({ listening: true });
    });

    it('sets listening=false when shape is transformer child named "back"', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ isContainerPrincipal: true });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const backShape = { name: vi.fn().mockReturnValue('back') };
      (tr.getChildren as ReturnType<typeof vi.fn>).mockReturnValue([backShape]);
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 10,
        y: 10,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(
        backShape
      );
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      handler();
      expect(tr.setAttrs).toHaveBeenCalledWith({ listening: false });
    });

    it('sets listening=false when shape is a child of the selected node', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const child = { name: vi.fn().mockReturnValue('rect') };
      const node = makeKonvaNode({ isContainerPrincipal: true });
      (node.getChildren as ReturnType<typeof vi.fn>).mockReturnValue([child]);
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (tr.getChildren as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 10,
        y: 10,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(
        child
      );
      const handler = getHandler(
        stage.on as ReturnType<typeof vi.fn>,
        'pointermove'
      );
      handler();
      expect(tr.setAttrs).toHaveBeenCalledWith({ listening: false });
    });
  });

  describe('transformer transform events', () => {
    it('transformstart sets transformInProcess=true and calls triggerSelectedNodesEvent', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transformstart'
      );
      handler({ evt: {} });
      expect(ctrl.isTransforming()).toBe(true);
      expect(callbacks.triggerSelectedNodesEvent).toHaveBeenCalled();
    });

    it('transformstart with multiple nodes sets mutex lock', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transformstart'
      );
      handler({ evt: {} });
      expect(weave.setMutexLock).toHaveBeenCalledWith({
        nodeIds: ['n1', 'n2'],
        operation: 'nodes-transform',
      });
    });

    it('transform calls triggerSelectedNodesEvent and hooks', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transform'
      );
      handler({ evt: { clientX: 10, clientY: 10 } });
      expect(callbacks.triggerSelectedNodesEvent).toHaveBeenCalled();
    });

    it('transform cancels context menu timer when moved', () => {
      const { ctrl, callbacks, gesture } = makeController();
      const tr = ctrl.getTransformer();
      const ctxMenu = { cancelLongPressTimer: vi.fn() };
      (
        callbacks.getContextMenuPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(ctxMenu);
      (gesture.checkMoved as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transform'
      );
      handler({ evt: { clientX: 10, clientY: 10 } });
      expect(ctxMenu.cancelLongPressTimer).toHaveBeenCalled();
    });

    it('transform updates usersPresence when plugin is available', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ id: 'n1' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const usersPresence = {
        setPresence: vi.fn(),
        forceSendPresence: vi.fn(),
      };
      (
        callbacks.getUsersPresencePlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(usersPresence);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transform'
      );
      handler({ evt: { clientX: 0, clientY: 0 } });
      expect(usersPresence.setPresence).toHaveBeenCalled();
      expect(usersPresence.forceSendPresence).toHaveBeenCalled();
    });

    it('transform uses parent nodeId as parentId when parent has nodeId attr', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ id: 'n1' });
      const parentWithNodeId = {
        id: vi.fn().mockReturnValue('p1'),
        getAttrs: vi.fn().mockReturnValue({ nodeId: 'real-parent-id' }),
      };
      (node.getParent as ReturnType<typeof vi.fn>).mockReturnValue(
        parentWithNodeId
      );
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const usersPresence = {
        setPresence: vi.fn(),
        forceSendPresence: vi.fn(),
      };
      (
        callbacks.getUsersPresencePlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(usersPresence);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transform'
      );
      handler({ evt: { clientX: 0, clientY: 0 } });
      expect(usersPresence.setPresence).toHaveBeenCalledWith(
        'n1',
        'real-parent-id',
        expect.any(Object),
        false
      );
    });

    it('transformend sets transformInProcess=false', () => {
      const { ctrl } = makeController();
      const tr = ctrl.getTransformer();
      // First start transform
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transformstart'
      );
      startHandler({ evt: {} });
      expect(ctrl.isTransforming()).toBe(true);
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transformend'
      );
      endHandler({ evt: {} });
      expect(ctrl.isTransforming()).toBe(false);
    });

    it('transformend calls releaseMutexLock when multiple nodes', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'transformend'
      );
      endHandler({ evt: {} });
      expect(weave.releaseMutexLock).toHaveBeenCalled();
    });
  });

  describe('transformer hover/mouse events', () => {
    it('mousemove returns early when dragInProcess is true', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      // Capture mousemove handler BEFORE triggering dragstart (which calls vi.clearAllMocks in beforeEach between tests)
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mousemove'
      );
      const dragstartHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      // Trigger drag to set dragInProcess=true
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      dragstartHandler({
        evt: { button: 0 },
        target: node,
        cancelBubble: false,
      });
      // Reset call counts
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockClear();
      moveHandler({ evt: {} });
      expect(stage.getPointerPosition).not.toHaveBeenCalled();
    });

    it('mousemove returns early when no pointer position', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue(
        null
      );
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mousemove'
      );
      moveHandler({ evt: {} });
      expect(stage.getIntersection).not.toHaveBeenCalled();
    });

    it('mousemove calls disablePlugin/enablePlugin for hit testing', () => {
      const { ctrl, stage, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 5,
        y: 5,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mousemove'
      );
      moveHandler({ evt: {} });
      expect(callbacks.disablePlugin).toHaveBeenCalled();
      expect(callbacks.enablePlugin).toHaveBeenCalled();
    });

    it('mousemove triggers handleMouseover when new node found', () => {
      const { ctrl, stage, weave } = makeController();
      const tr = ctrl.getTransformer();
      const targetNode = makeKonvaNode();
      const shape = { name: vi.fn().mockReturnValue('rect') };
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 5,
        y: 5,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(
        shape
      );
      (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue(
        targetNode
      );
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mousemove'
      );
      moveHandler({ evt: {} });
      expect(targetNode.handleMouseover).toHaveBeenCalled();
    });

    it('mousemove calls handleMouseout on previous node when no shape found', () => {
      const { ctrl, stage, weave } = makeController();
      const tr = ctrl.getTransformer();
      const targetNode = makeKonvaNode();
      const shape = { name: vi.fn().mockReturnValue('rect') };
      // First call: set nodeHovered
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 5,
        y: 5,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(
        shape
      );
      (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue(
        targetNode
      );
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mousemove'
      );
      moveHandler({ evt: {} });
      // Second call: no shape
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(null);
      moveHandler({ evt: {} });
      expect(targetNode.handleMouseout).toHaveBeenCalled();
    });

    it('mouseover sets cursor to grab when >1 nodes selected', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mouseover'
      );
      handler({});
      expect(stage.container().style.cursor).toBe('grab');
    });

    it('mouseout clears nodeHovered and calls stage.handleMouseover', () => {
      const { ctrl, stage } = makeController();
      const tr = ctrl.getTransformer();
      const handler = getHandler(tr.on as ReturnType<typeof vi.fn>, 'mouseout');
      const mockEvt = { evt: {} };
      handler(mockEvt);
      expect(stage.handleMouseover).toHaveBeenCalledWith(mockEvt);
    });

    it('window mouseout calls handleMouseout on nodeHovered', () => {
      const { ctrl, weave, stage } = makeController();
      const tr = ctrl.getTransformer();
      const targetNode = makeKonvaNode();
      const shape = { name: vi.fn().mockReturnValue('rect') };
      (stage.getPointerPosition as ReturnType<typeof vi.fn>).mockReturnValue({
        x: 5,
        y: 5,
      });
      (stage.getIntersection as ReturnType<typeof vi.fn>).mockReturnValue(
        shape
      );
      (weave.getInstanceRecursive as ReturnType<typeof vi.fn>).mockReturnValue(
        targetNode
      );
      // Set nodeHovered via mousemove
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'mousemove'
      );
      moveHandler({ evt: {} });
      // Fire window mouseout
      window.dispatchEvent(new MouseEvent('mouseout'));
      expect(targetNode.handleMouseout).toHaveBeenCalled();
    });
  });

  describe('drag events', () => {
    it('dragstart sets isDragging=true', () => {
      const { ctrl } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      handler({ evt: { button: 0 }, target: node, cancelBubble: false });
      expect(ctrl.isDragging()).toBe(true);
    });

    it('dragstart returns early when e.evt is null', () => {
      const { ctrl } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      handler({ evt: null, target: node, cancelBubble: false });
      // dragInProcess is still set to true, but nothing else runs
      expect(ctrl.isDragging()).toBe(true);
      expect(node.clone).not.toHaveBeenCalled();
    });

    it('dragstart returns early when mainLayer is null', () => {
      const weave = makeWeave();
      (weave.getMainLayer as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const { ctrl } = makeController(weave);
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      handler({ evt: { button: 0 }, target: node, cancelBubble: false });
      expect(node.clone).not.toHaveBeenCalled();
    });

    it('dragstart stops drag on wheel button press', () => {
      const { ctrl } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      handler({ evt: { button: 1 }, target: node, cancelBubble: false });
      expect(node.stopDrag).toHaveBeenCalled();
    });

    it('dragstart with multi nodes sets mutex lock', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      const handler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      handler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.setMutexLock).toHaveBeenCalledWith({
        nodeIds: ['n1', 'n2'],
        operation: 'nodes-drag',
      });
    });

    it('dragmove with wheel button stops drag', () => {
      const { ctrl } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      const handler = getHandler(tr.on as ReturnType<typeof vi.fn>, 'dragmove');
      handler({ evt: { button: 1 }, target: node, cancelBubble: false });
      expect(node.stopDrag).toHaveBeenCalled();
    });

    it('dragmove cancels context menu timer when moved', () => {
      const { ctrl, callbacks, gesture } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const ctxMenu = { cancelLongPressTimer: vi.fn() };
      (
        callbacks.getContextMenuPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(ctxMenu);
      (gesture.checkMovedDrag as ReturnType<typeof vi.fn>).mockReturnValue(
        true
      );
      // Set initialPos via dragstart
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      expect(ctxMenu.cancelLongPressTimer).toHaveBeenCalled();
    });

    it('dragmove with single node clears originalNodes/originalContainers', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ id: 'n1' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(
        false
      );
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      // Just ensure it runs without error
      moveHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      expect(node.updatePosition).toHaveBeenCalled();
    });

    it('dragmove with multi nodes calls clearContainerTargets and containerOverCursor', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(clearContainerTargets).toHaveBeenCalled();
      expect(containerOverCursor).toHaveBeenCalled();
    });

    it('dragmove updates usersPresence in multi-node drag', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const usersPresence = {
        setPresence: vi.fn(),
        forceSendPresence: vi.fn(),
      };
      (
        callbacks.getUsersPresencePlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(usersPresence);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(usersPresence.setPresence).toHaveBeenCalled();
      expect(usersPresence.forceSendPresence).toHaveBeenCalled();
    });

    it('dragstart: originalContainer resolved via stage.findOne when parent has nodeId', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const parentWithNodeId = {
        getAttrs: vi.fn().mockReturnValue({ nodeId: 'real-parent' }),
      };
      const n1 = makeKonvaNode({ id: 'n1' });
      (n1.getParent as ReturnType<typeof vi.fn>).mockReturnValue(
        parentWithNodeId
      );
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1]);
      const realParent = {};
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(
        realParent
      );
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.getStage().findOne).toHaveBeenCalledWith('#real-parent');
    });

    it('dragmove: parentId resolved via parent.nodeId when usersPresence is set', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      const parentWithNodeId = {
        id: vi.fn().mockReturnValue('p1'),
        getAttrs: vi.fn().mockReturnValue({ nodeId: 'p1-real' }),
      };
      (n1.getParent as ReturnType<typeof vi.fn>).mockReturnValue(
        parentWithNodeId
      );
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const usersPresence = {
        setPresence: vi.fn(),
        forceSendPresence: vi.fn(),
      };
      (
        callbacks.getUsersPresencePlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(usersPresence);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      // Ensure setPresence was called with the nodeId ('p1-real') as parentId
      expect(usersPresence.setPresence).toHaveBeenCalledWith(
        n1.id(),
        'p1-real',
        expect.any(Object),
        false
      );
    });

    it('dragmove: layerToMove fires onTargetEnter when containerOverCursor returns a layer', () => {
      const { ctrl, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const fakeLayer = { fire: vi.fn() };
      (containerOverCursor as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        fakeLayer
      );

      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(fakeLayer.fire).toHaveBeenCalled();
    });

    it('dragend: layerToMove is used as containerToMove when containerOverCursor returns a layer', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const nodeHandler = { serialize: vi.fn().mockReturnValue({ id: 'n1' }) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      const n1 = makeKonvaNode({ id: 'n1', nodeType: 'rect' });
      const n2 = makeKonvaNode({ id: 'n2', nodeType: 'rect' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const fakeLayer = { fire: vi.fn() };
      (containerOverCursor as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        fakeLayer
      );
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      (containerOverCursor as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        fakeLayer
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      // containerToMove was set to fakeLayer (line 509-510), moveNodeToContainerNT called with it
      expect(moveNodeToContainerNT).toHaveBeenCalled();
    });

    it('dragend: didMove=false → returns early after clearing hitGraph', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();

      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      // Do NOT call dragmove so didMove stays false
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      expect(ctrl.isDragging()).toBe(false);
      // stateTransactional should NOT be called when !didMove
      expect(weave.stateTransactional).not.toHaveBeenCalled();
    });

    it('dragend: multi nodes calls releaseMutexLock when didMove=true', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.releaseMutexLock).toHaveBeenCalled();
    });

    it('dragend: single node path calls hooks and cleans up', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const node = makeKonvaNode({ id: 'n1' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(
        false
      );
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: node, cancelBubble: false });
      expect(weave.getHooks().callHook).toHaveBeenCalledWith(
        'weave:onTransformerDragEnd',
        expect.any(Object)
      );
    });

    it('dragend: multi node with isSelecting triggers stateTransactional', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.stateTransactional).toHaveBeenCalled();
    });

    it('dragend: runPhaseHooks and findOne paths are covered when isSelecting+multiNode', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      // Make runPhaseHooks actually call the hook
      (weave.runPhaseHooks as ReturnType<typeof vi.fn>).mockImplementation(
        (_name: string, fn: (cb: (...args: unknown[]) => void) => void) =>
          fn(vi.fn())
      );
      // Make findOne return a node so lines 592-595 are covered
      const foundNode = makeKonvaNode({ id: 'n1' });
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(
        foundNode
      );
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.runPhaseHooks).toHaveBeenCalledWith(
        'onMoveNodesToContainer',
        expect.any(Function)
      );
      expect(foundNode.handleDeselectNode).toHaveBeenCalled();
      expect(foundNode.handleSelectNode).toHaveBeenCalled();
    });

    it('dragend: moveNodeToContainerNT=true covers emitEvent onNodeChangedContainer (lines 522-532)', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const nodeHandler = { serialize: vi.fn().mockReturnValue({ id: 'n1' }) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      // Make moveNodeToContainerNT return true so the moved=true branch is covered
      (moveNodeToContainerNT as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const n1 = makeKonvaNode({ id: 'n1', nodeType: 'rect' });
      const n2 = makeKonvaNode({ id: 'n2', nodeType: 'rect' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.emitEvent).toHaveBeenCalledWith(
        'onNodeChangedContainer',
        expect.any(Object)
      );
      // Reset mock
      (moveNodeToContainerNT as ReturnType<typeof vi.fn>).mockReturnValue(
        false
      );
    });

    it('dragend: selectionContainsFrames=true covers else branch (nodeId path) and serialize', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const nodeHandler = { serialize: vi.fn().mockReturnValue({ id: 'n1' }) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      // Make hasFrames return true so selectionContainsFrames=true → else branch at 538-543
      (hasFrames as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const n1 = makeKonvaNode({
        id: 'n1',
        nodeType: 'rect',
        nodeId: 'real-n1',
      });
      const n2 = makeKonvaNode({ id: 'n2', nodeType: 'rect' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      // nodeHandler.serialize called since nodeHandler is non-null and moved=false
      expect(nodeHandler.serialize).toHaveBeenCalled();
      // Reset mock
      (hasFrames as ReturnType<typeof vi.fn>).mockReturnValue(false);
    });

    it('dragend: node with lockToContainer serializes without move', () => {
      const { ctrl, weave, callbacks } = makeController();

      const tr = ctrl.getTransformer();
      const nodeHandler = { serialize: vi.fn().mockReturnValue({ id: 'n1' }) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      const n1 = makeKonvaNode({
        id: 'n1',
        lockToContainer: true,
        nodeType: 'rect',
      });
      const n2 = makeKonvaNode({
        id: 'n2',
        lockToContainer: true,
        nodeType: 'rect',
      });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(nodeHandler.serialize).toHaveBeenCalled();
      expect(weave.updateNodesNT).toHaveBeenCalled();
    });

    it('dragend: node with lockToContainer and null nodeHandler returns early (line 561)', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      // nodeHandler is null (default in makeWeave)
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const n1 = makeKonvaNode({
        id: 'n1',
        lockToContainer: true,
        nodeType: 'rect',
      });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(weave.updateNodesNT).not.toHaveBeenCalled(); // nodeHandler was null → returned early
    });

    it('dragend: nodeId on node uses nodeId in toSelect (ternary true branch, line 540)', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const nodeHandler = {
        serialize: vi.fn().mockReturnValue({ id: 'real-n1' }),
      };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      // node with nodeId attribute → ternary true branch uses nodeId
      const n1 = makeKonvaNode({
        id: 'n1',
        nodeType: 'rect',
        nodeId: 'real-n1',
      });
      const n2 = makeKonvaNode({
        id: 'n2',
        nodeType: 'rect',
        nodeId: 'real-n2',
      });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      (callbacks.isSelecting as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (hasFrames as ReturnType<typeof vi.fn>).mockReturnValue(true); // → else branch (nodeId path)
      const startHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragstart'
      );
      startHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const moveHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragmove'
      );
      moveHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      const endHandler = getHandler(
        tr.on as ReturnType<typeof vi.fn>,
        'dragend'
      );
      endHandler({ evt: { button: 0 }, target: n1, cancelBubble: false });
      expect(nodeHandler.serialize).toHaveBeenCalled();
      (hasFrames as ReturnType<typeof vi.fn>).mockReturnValue(false);
    });
  });

  describe('registerInstanceEvents', () => {
    it('onNodesChange with >1 nodes calls handleSelectNode on each', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      weave._trigger('onNodesChange');
      expect(n1.handleSelectNode).toHaveBeenCalled();
      expect(n2.handleSelectNode).toHaveBeenCalled();
    });

    it('onNodesChange with 1 node calls handleDeselectNode', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1]);
      weave._trigger('onNodesChange');
      expect(n1.handleDeselectNode).toHaveBeenCalled();
    });

    it('onNodesChange calls handleDeselectNode on previously selected but now unselected nodes', () => {
      const { ctrl, weave } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      // First change: 2 nodes → sets prevSelectedNodes
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      weave._trigger('onNodesChange');
      // Second change: only n1 remains
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1]);
      weave._trigger('onNodesChange');
      expect(n2.handleDeselectNode).toHaveBeenCalled();
    });

    it('onUndoChange calls handleUndoRedoSelectionChange', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const selFeedback = { cleanupSelectedHalos: vi.fn() };
      (
        callbacks.getNodesSelectionFeedbackPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(selFeedback);
      const node = makeKonvaNode({ id: 'n1' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      weave._trigger('onUndoChange');
      // cleanupSelectedHalos should be called
      expect(selFeedback.cleanupSelectedHalos).toHaveBeenCalled();
    });

    it('onRedoChange calls handleUndoRedoSelectionChange', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const selFeedback = { cleanupSelectedHalos: vi.fn() };
      (
        callbacks.getNodesSelectionFeedbackPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(selFeedback);
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      weave._trigger('onRedoChange');
      expect(selFeedback.cleanupSelectedHalos).toHaveBeenCalled();
    });
  });

  describe('handleUndoRedoSelectionChange', () => {
    it('destroys selection halos and calls cleanupSelectedHalos', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const haloNode = { destroy: vi.fn() };
      const selLayer = weave.getSelectionLayer()!;
      (selLayer.find as ReturnType<typeof vi.fn>).mockReturnValue([haloNode]);
      const selFeedback = { cleanupSelectedHalos: vi.fn() };
      (
        callbacks.getNodesSelectionFeedbackPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(selFeedback);
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      weave._trigger('onUndoChange');
      expect(haloNode.destroy).toHaveBeenCalled();
      expect(selFeedback.cleanupSelectedHalos).toHaveBeenCalled();
    });

    it('calls handleSelectNode when >1 nodes on undo/redo', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      const n2 = makeKonvaNode({ id: 'n2' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      const selLayer = weave.getSelectionLayer()!;
      (selLayer.find as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const selFeedback = { cleanupSelectedHalos: vi.fn() };
      (
        callbacks.getNodesSelectionFeedbackPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(selFeedback);
      weave._trigger('onUndoChange');
      expect(n1.handleSelectNode).toHaveBeenCalled();
      expect(n2.handleSelectNode).toHaveBeenCalled();
    });

    it('calls handleDeselectNode when exactly 1 node on undo/redo', () => {
      const { ctrl, weave, callbacks } = makeController();
      const tr = ctrl.getTransformer();
      const n1 = makeKonvaNode({ id: 'n1' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1]);
      const selLayer = weave.getSelectionLayer()!;
      (selLayer.find as ReturnType<typeof vi.fn>).mockReturnValue([]);
      const selFeedback = { cleanupSelectedHalos: vi.fn() };
      (
        callbacks.getNodesSelectionFeedbackPlugin as ReturnType<typeof vi.fn>
      ).mockReturnValue(selFeedback);
      weave._trigger('onUndoChange');
      expect(n1.handleDeselectNode).toHaveBeenCalled();
    });

    it('no-ops when selectionLayer or feedbackPlugin is missing', () => {
      const { weave } = makeController();
      (weave.getSelectionLayer as ReturnType<typeof vi.fn>).mockReturnValue(
        null
      );
      // Should not throw
      expect(() => weave._trigger('onUndoChange')).not.toThrow();
    });
  });
});
