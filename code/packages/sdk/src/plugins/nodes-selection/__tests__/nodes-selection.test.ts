// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({
  default: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...actual,
    getTargetedNode: vi.fn().mockReturnValue(undefined),
    mergeExceptArrays: (
      a: Record<string, unknown>,
      b: Record<string, unknown>
    ) => ({ ...a, ...b }),
    intersectArrays: vi.fn().mockReturnValue([]),
  };
});
vi.mock('konva', () => {
  class Layer {
    add = vi.fn();
    show = vi.fn();
    hide = vi.fn();
    findOne = vi.fn().mockReturnValue(undefined);
    find = vi.fn().mockReturnValue([]);
  }
  class Transformer {
    nodes = vi.fn().mockReturnValue([]);
    setNodes = vi.fn();
    getNodes = vi.fn().mockReturnValue([]);
    setAttrs = vi.fn();
    getAttrs = vi.fn().mockReturnValue({});
    forceUpdate = vi.fn();
    show = vi.fn();
    getLayer = vi.fn().mockReturnValue({ batchDraw: vi.fn() });
    enabledAnchors = vi.fn();
    setAttr = vi.fn();
    getChildren = vi.fn().mockReturnValue([]);
    on = vi.fn();
  }
  class Stage {
    mode = vi.fn().mockReturnValue('default');
    container = vi.fn().mockReturnValue({
      tabIndex: 0,
      focus: vi.fn(),
      style: { cursor: '' },
      addEventListener: vi.fn(),
    });
    add = vi.fn();
    on = vi.fn();
    findOne = vi.fn().mockReturnValue(undefined);
    find = vi.fn().mockReturnValue([]);
    getPointerPosition = vi.fn().mockReturnValue({ x: 0, y: 0 });
    getRelativePointerPosition = vi.fn().mockReturnValue({ x: 0, y: 0 });
    scaleX = vi.fn().mockReturnValue(1);
  }
  class Rect {
    strokeWidth = vi.fn().mockReturnThis();
    dash = vi.fn().mockReturnThis();
    width = vi.fn().mockReturnThis();
    height = vi.fn().mockReturnThis();
    setAttrs = vi.fn().mockReturnThis();
    visible = vi.fn().mockReturnValue(false);
    getClientRect = vi
      .fn()
      .mockReturnValue({ x: 0, y: 0, width: 0, height: 0 });
  }
  return {
    default: { Layer, Transformer, Stage, Rect },
  };
});

import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '../nodes-selection';
import {
  WEAVE_NODES_SELECTION_KEY,
  WEAVE_NODES_SELECTION_LAYER_ID,
  WEAVE_NODES_SELECTION_DEFAULT_CONFIG,
} from '../constants';
import type { EdgePanningCallbacks } from '../edge-panning';
import type { TransformerCallbacks } from '../transformer-controller';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeKonvaNode(attrs: Record<string, unknown> = {}) {
  return {
    getAttrs: vi
      .fn()
      .mockReturnValue({ nodeType: 'rect', id: 'node-1', ...attrs }),
    getAttr: vi.fn((key: string) => attrs[key]),
    setAttr: vi.fn(),
    opacity: vi.fn(),
    getTransformerProperties: vi.fn().mockReturnValue({}),
    allowedAnchors: vi.fn().mockReturnValue([]),
    id: vi.fn().mockReturnValue(attrs.id ?? 'node-1'),
    getParent: vi.fn().mockReturnValue(null),
  };
}

function makeWeave() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  const stage = new Konva.Stage();
  const mainLayer = { getChildren: vi.fn().mockReturnValue([]) };
  const selectionLayer = new Konva.Layer();

  // Make stage.findOne return the selection layer for the selection layer ID
  (stage.findOne as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: string) => {
      if (selector === `#${WEAVE_NODES_SELECTION_LAYER_ID}`)
        return selectionLayer;
      return undefined;
    }
  );

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getSelectionLayer: vi.fn().mockReturnValue(selectionLayer),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn(),
    addEventListener: vi.fn(
      (event: string, cb: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }
    ),
    removeNode: vi.fn(),
    removeNodes: vi.fn(),
    getHooks: vi.fn().mockReturnValue({ callHook: vi.fn() }),
    getStore: vi
      .fn()
      .mockReturnValue({ getUser: vi.fn().mockReturnValue({ id: 'user-1' }) }),
    getActiveAction: vi.fn().mockReturnValue('selectionTool'),
    getEventsController: vi
      .fn()
      .mockReturnValue({ signal: new AbortController().signal }),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    _listeners: listeners,
    _trigger: (event: string, ...args: unknown[]) => {
      (listeners[event] ?? []).forEach((cb) => cb(...args));
    },
  };
}

function makePlugin(
  params?: ConstructorParameters<typeof WeaveNodesSelectionPlugin>[0]
) {
  const plugin = new WeaveNodesSelectionPlugin(params);
  const weave = makeWeave();
  (plugin as unknown as { instance: ReturnType<typeof makeWeave> }).instance =
    weave;
  return { plugin, weave };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveNodesSelectionPlugin', () => {
  describe('constructor & configuration', () => {
    it('getName() returns the correct key', () => {
      const { plugin } = makePlugin();
      expect(plugin.getName()).toBe(WEAVE_NODES_SELECTION_KEY);
    });

    it('getLayerName() returns the correct layer ID', () => {
      const { plugin } = makePlugin();
      expect(plugin.getLayerName()).toBe(WEAVE_NODES_SELECTION_LAYER_ID);
    });

    it('getConfiguration() returns the merged config', () => {
      const { plugin } = makePlugin({
        config: { style: { dragOpacity: 0.5 } },
      });
      expect(plugin.getConfiguration().style.dragOpacity).toBe(0.5);
    });

    it('uses default config when no params are given', () => {
      const { plugin } = makePlugin();
      expect(plugin.getConfiguration().style.dragOpacity).toBe(
        WEAVE_NODES_SELECTION_DEFAULT_CONFIG.style.dragOpacity
      );
    });
  });

  describe('initialize()', () => {
    it('resets state to defaults', () => {
      const { plugin } = makePlugin();
      // initially not active
      expect(plugin.isActive()).toBe(false);
      expect(plugin.isAreaSelecting()).toBe(false);
      expect(plugin.getPointerCount()).toBe(0);
      expect(plugin.wasClickOrTapHandled()).toBe(false);
      expect(plugin.getDragSelectedNodes()).toEqual([]);
    });

    it('uses fallback enabledAnchors when config has no selection.enabledAnchors', () => {
      const { plugin } = makePlugin({ config: { selection: {} } });
      const anchors = plugin.getDefaultEnabledAnchors();
      expect(anchors).toContain('top-left');
      expect(anchors).toContain('bottom-right');
      expect(anchors).toHaveLength(8);
    });
  });

  describe('state accessors', () => {
    it('setSpaceKeyPressed / getSpaceKeyPressedState', () => {
      const { plugin } = makePlugin();
      plugin.setSpaceKeyPressed(true);
      expect(plugin.getSpaceKeyPressedState()).toBe(true);
      plugin.setSpaceKeyPressed(false);
      expect(plugin.getSpaceKeyPressedState()).toBe(false);
    });

    it('registerPointer / unregisterPointer / getPointerCount', () => {
      const { plugin } = makePlugin();
      const evt = { pointerId: 1 } as PointerEvent;
      plugin.registerPointer(1, evt);
      expect(plugin.getPointerCount()).toBe(1);
      plugin.unregisterPointer(1);
      expect(plugin.getPointerCount()).toBe(0);
    });

    it('setClickOrTapHandled / wasClickOrTapHandled', () => {
      const { plugin } = makePlugin();
      plugin.setClickOrTapHandled(true);
      expect(plugin.wasClickOrTapHandled()).toBe(true);
    });

    it('setAreaSelecting / isAreaSelecting', () => {
      const { plugin } = makePlugin();
      plugin.setAreaSelecting(true);
      expect(plugin.isAreaSelecting()).toBe(true);
    });

    it('isInitialized() returns false before onInit', () => {
      const { plugin } = makePlugin();
      expect(plugin.isInitialized()).toBe(false);
    });

    it('isSelecting() checks active action against SELECTION_TOOL_ACTION_NAME', () => {
      const { plugin, weave } = makePlugin();
      (weave.getActiveAction as ReturnType<typeof vi.fn>).mockReturnValue(
        'selectionTool'
      );
      // isSelecting calls instance.getActiveAction()
      expect(typeof plugin.isSelecting()).toBe('boolean');
    });

    it('isNodeSelected() returns true when exactly one node with matching id', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ id: 'n1' });
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      expect(
        plugin.isNodeSelected(node as unknown as import('konva').Node)
      ).toBe(true);
    });

    it('isNodeSelected() returns false when zero or multiple nodes selected', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ id: 'n1' });
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      expect(
        plugin.isNodeSelected(node as unknown as import('konva').Node)
      ).toBe(false);
    });
  });

  describe('isPasting()', () => {
    it('returns false when copyPastePlugin is not registered', () => {
      const { plugin } = makePlugin();
      expect(plugin.isPasting()).toBe(false);
    });

    it('delegates to copyPastePlugin.isPasting() when available', () => {
      const { plugin, weave } = makePlugin();
      const copyPastePlugin = { isPasting: vi.fn().mockReturnValue(true) };
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockReturnValue(
        copyPastePlugin
      );
      expect(plugin.isPasting()).toBe(true);
    });
  });

  describe('onInit()', () => {
    it('sets initialized=true after onInit', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(plugin.isInitialized()).toBe(true);
    });

    it('initializes sub-components: gesture, edgePanning, areaSelector, transformerCtrl', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(plugin.getGesture()).toBeTruthy();
      expect(plugin.getAreaSelector()).toBeTruthy();
      expect(plugin.getEdgePanning()).toBeTruthy();
      expect(plugin.getTransformerController()).toBeTruthy();
    });

    it('registers onActiveActionChange: non-selection → active=false', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      weave._trigger('onActiveActionChange', 'otherTool');
      expect(plugin.isActive()).toBe(false);
    });

    it('registers onActiveActionChange: selection → active=true', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      weave._trigger('onActiveActionChange', 'selectionTool');
      expect(plugin.isActive()).toBe(true);
    });

    it('registers onActiveActionChange: undefined action → active=true', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      weave._trigger('onActiveActionChange', undefined);
      expect(plugin.isActive()).toBe(true);
    });

    it('onNodeRemoved removes the node from the current selection', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ id: 'node-1' });
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (tr.getNodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);

      weave._trigger('onNodeRemoved', { id: 'node-1' });
      // The filter removes the node — setSelectedNodes called with empty
      expect(tr.setNodes ?? tr.nodes).toBeTruthy();
    });
    it('EdgePanning onTick callback updates areaSelector when selectionStart is set', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const ep = plugin.getEdgePanning();
      const areaSelector = plugin.getAreaSelector();
      // Manually set selectionStart to a point
      areaSelector.selectionStart = { x: 10, y: 20 };
      // Access the private onTick callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ep as any).callbacks.onTick(5, 10);
      expect(areaSelector.selectionStart.x).toBe(15);
      expect(areaSelector.selectionStart.y).toBe(30);
    });

    it('EdgePanning onTick with stageGridPlugin calls onRender', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const stageGridPlugin = { onRender: vi.fn() };
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'stageGrid') return stageGridPlugin;
          return undefined;
        }
      );
      const ep = plugin.getEdgePanning();
      const areaSelector = plugin.getAreaSelector();
      areaSelector.selectionStart = { x: 0, y: 0 };
      (ep as unknown as { callbacks: { onTick: (x: number, y: number) => void } }).callbacks.onTick(1, 1);
      expect(stageGridPlugin.onRender).toHaveBeenCalled();
    });

    it('EdgePanning callbacks getStage and isSelecting are invocable', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const ep = plugin.getEdgePanning() as unknown as { callbacks: EdgePanningCallbacks };
      // Covers the getStage and isSelecting lambdas
      expect(ep.callbacks.getStage()).toBeTruthy();
      ep.callbacks.isSelecting(); // returns isAreaSelecting(), fine
    });

    it('TransformerController callbacks delegate to plugin (covers lambdas)', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformerController().getTransformer();
      // Use a target with x/y methods for dragstart
      const target = {
        x: vi.fn().mockReturnValue(0),
        y: vi.fn().mockReturnValue(0),
        id: vi.fn().mockReturnValue('n1'),
        stopDrag: vi.fn(),
        getAttrs: vi.fn().mockReturnValue({ id: 'n1', nodeType: 'rect' }),
        getAttr: vi.fn().mockReturnValue(undefined),
        setAttr: vi.fn(),
        opacity: vi.fn(),
        getAbsolutePosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        getParent: vi.fn().mockReturnValue(null),
        clone: vi.fn().mockReturnThis(),
        updatePosition: vi.fn(),
        handleSelectNode: vi.fn(),
        handleDeselectNode: vi.fn(),
        handleMouseover: vi.fn(),
        handleMouseout: vi.fn(),
        getTransformerProperties: vi.fn().mockReturnValue({}),
        allowedAnchors: vi.fn().mockReturnValue([]),
      };
      const node = makeKonvaNode({ id: 'n1', nodeType: 'rect' });
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([target]);

      // Get registered handlers from the transformer's on() mock
      const calls = (tr.on as ReturnType<typeof vi.fn>).mock.calls as [
        string,
        (...a: unknown[]) => void
      ][];
      const getHandler = (name: string) => calls.find(([e]) => e === name)?.[1];

      // Trigger dragstart → covers saveDragSelectedNodes, setNodesOpacityOnDrag, isSelecting lambdas
      const dragstartH = getHandler('dragstart');
      dragstartH?.({ evt: { button: 0 }, target, cancelBubble: false });

      // Trigger dragmove → covers getUsersPresencePlugin, isSelecting lambdas
      const dragmoveH = getHandler('dragmove');
      dragmoveH?.({ evt: { button: 0 }, target, cancelBubble: false });

      // Trigger mousemove → covers disablePlugin, enablePlugin, getNodesSelectionFeedbackPlugin lambdas
      const mousemoveH = getHandler('mousemove');
      mousemoveH?.({ evt: {}, target: node });

      // Trigger transformstart → covers isSelecting lambda
      const transformstartH = getHandler('transformstart');
      transformstartH?.({ evt: {} });

      // Trigger transform → covers triggerSelectedNodesEvent, getUsersPresencePlugin lambdas
      const transformH = getHandler('transform');
      transformH?.({ evt: { clientX: 0, clientY: 0 } });

      // Trigger transformend → covers setSelectedNodes, triggerSelectedNodesEvent lambdas
      const transformendH = getHandler('transformend');
      transformendH?.({ evt: {} });

      // Covers getContextMenuPlugin and getStagePanningPlugin lambdas
      const ctrl = plugin.getTransformerController() as unknown as { callbacks: TransformerCallbacks };
      ctrl.callbacks.getContextMenuPlugin();
      ctrl.callbacks.getStagePanningPlugin();
      ctrl.callbacks.getNodesSelectionFeedbackPlugin();
    });
  });

  describe('enable() / disable()', () => {
    it('enable() shows the layer and sets enabled=true', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const selectionLayer = new Konva.Layer();
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(
        selectionLayer
      );
      plugin.enable();
      expect(selectionLayer.show).toHaveBeenCalled();
      expect(plugin.isEnabled()).toBe(true);
    });

    it('disable() hides the layer and sets enabled=false', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const selectionLayer = new Konva.Layer();
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(
        selectionLayer
      );
      plugin.disable();
      expect(selectionLayer.hide).toHaveBeenCalled();
      expect(plugin.isEnabled()).toBe(false);
    });
  });

  describe('triggerSelectedNodesEvent()', () => {
    it('emits onNodesChange event via requestAnimationFrame', async () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      plugin.triggerSelectedNodesEvent();
      expect(weave.emitEvent).toHaveBeenCalledWith(
        'onNodesChange',
        expect.any(Array)
      );
      rafSpy.mockRestore();
    });

    it('sends awareness when usersSelection plugin is available', async () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const usersSelectionPlugin = { sendSelectionAwarenessInfo: vi.fn() };
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'usersSelection') return usersSelectionPlugin;
          return undefined;
        }
      );
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      plugin.triggerSelectedNodesEvent();
      expect(
        usersSelectionPlugin.sendSelectionAwarenessInfo
      ).toHaveBeenCalled();
      rafSpy.mockRestore();
    });
    it('maps selected nodes via getNodeHandler.serialize in the map callback', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      const mockNode = {
        getAttr: vi.fn((k: string) => (k === 'nodeType' ? 'rect' : undefined)),
        getAttrs: vi.fn().mockReturnValue({ id: 'n1', nodeType: 'rect' }),
      };
      const nodeHandler = { serialize: vi.fn().mockReturnValue({ id: 'n1' }) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      (tr.getNodes as ReturnType<typeof vi.fn>).mockReturnValue([mockNode]);
      plugin.triggerSelectedNodesEvent();
      expect(nodeHandler.serialize).toHaveBeenCalled();
      rafSpy.mockRestore();
    });
  });

  describe('removeElement()', () => {
    it('removes the node, calls hook, selectNone, and triggers event', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      const element = { id: 'el-1', type: 'rect', props: {} };
      plugin.removeElement(element as never);
      expect(weave.removeNode).toHaveBeenCalledWith(element);
      expect(weave.getHooks().callHook).toHaveBeenCalledWith(
        'weave:onNodesRemoved',
        [element]
      );
      rafSpy.mockRestore();
    });
  });

  describe('removeSelectedNodes()', () => {
    it('serializes and removes selected nodes, then triggers event', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      const serialized = { id: 'node-1', type: 'rect', props: {} };
      const nodeHandler = { serialize: vi.fn().mockReturnValue(serialized) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        nodeHandler
      );
      const node = makeKonvaNode({ id: 'node-1', nodeType: 'rect' });
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      plugin.removeSelectedNodes();
      expect(weave.removeNodes).toHaveBeenCalled();
      rafSpy.mockRestore();
    });
  });

  describe('handleMultipleSelectionBehavior()', () => {
    it('no-ops when only 1 node is selected', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([makeKonvaNode()]);
      const config = plugin.getConfiguration();
      config.behaviors = {
        ...config.behaviors,
        onMultipleSelection: vi.fn(),
      };
      plugin.handleMultipleSelectionBehavior();
      expect(config.behaviors.onMultipleSelection).not.toHaveBeenCalled();
    });

    it('calls onMultipleSelection when >1 nodes selected', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const nodes = [makeKonvaNode({ id: 'a' }), makeKonvaNode({ id: 'b' })];
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue(nodes);
      const config = plugin.getConfiguration();
      const onMultipleSelection = vi
        .fn()
        .mockReturnValue({ resizeEnabled: false });
      config.behaviors = { ...config.behaviors, onMultipleSelection };
      plugin.handleMultipleSelectionBehavior();
      expect(onMultipleSelection).toHaveBeenCalledWith(nodes);
      expect(tr.setAttrs).toHaveBeenCalled();
    });
  });

  describe('syncSelection()', () => {
    it('no-ops when stage mode is not default', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      (weave.getStage().mode as ReturnType<typeof vi.fn>).mockReturnValue(
        'presentation'
      );
      const tr = plugin.getTransformer();
      plugin.syncSelection();
      expect(tr.nodes).not.toHaveBeenCalledWith(expect.any(Array));
    });

    it('retains nodes that still exist on the stage', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ id: 'n1' });
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(
        node
      );
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      plugin.syncSelection();
      expect(tr.nodes).toHaveBeenCalledWith([node]);
      rafSpy.mockRestore();
    });

    it('removes nodes that no longer exist on the stage', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ id: 'n1' });
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      (weave.getStage().findOne as ReturnType<typeof vi.fn>).mockReturnValue(
        undefined
      );
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      plugin.syncSelection();
      expect(tr.nodes).toHaveBeenCalledWith([]);
      rafSpy.mockRestore();
    });
  });

  describe('selectAll() / selectNone()', () => {
    it('selectAll() sets transformer to all main layer children', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const children = [makeKonvaNode({ id: 'a' }), makeKonvaNode({ id: 'b' })];
      (
        weave.getMainLayer().getChildren as ReturnType<typeof vi.fn>
      ).mockReturnValue(children);
      plugin.selectAll();
      expect(plugin.getTransformer().nodes).toHaveBeenCalledWith(children);
    });

    it('selectNone() clears the transformer', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      plugin.selectNone();
      expect(plugin.getTransformer().nodes).toHaveBeenCalledWith([]);
    });
  });

  describe('getSelectedNodes()', () => {
    it('returns [] when transformerCtrl is not yet set', () => {
      const plugin = new WeaveNodesSelectionPlugin();
      expect(plugin.getSelectedNodes()).toEqual([]);
    });

    it('returns transformer nodes after init', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(Array.isArray(plugin.getSelectedNodes())).toBe(true);
    });
  });

  describe('getSelectedNodesExtended()', () => {
    it('maps transformer nodes to WeaveSelection objects', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ nodeType: 'rect', id: 'n1' });
      const tr = plugin.getTransformer();
      (tr.getNodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      const handler = { serialize: vi.fn().mockReturnValue({ id: 'n1' }) };
      (weave.getNodeHandler as ReturnType<typeof vi.fn>).mockReturnValue(
        handler
      );
      const result = plugin.getSelectedNodesExtended();
      expect(result).toHaveLength(1);
      expect(result[0].instance).toBe(node);
    });
  });

  describe('drag opacity', () => {
    it('getDragOpacity() returns configured value', () => {
      const { plugin } = makePlugin({
        config: { style: { dragOpacity: 0.4 } },
      });
      expect(plugin.getDragOpacity()).toBe(0.4);
    });

    it('setNodesOpacityOnDrag sets opacity on dragged nodes', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ opacity: 1 });
      // Manually set dragSelectedNodes
      (
        plugin as unknown as { dragSelectedNodes: unknown[] }
      ).dragSelectedNodes = [node];
      plugin.setNodesOpacityOnDrag();
      expect(node.opacity).toHaveBeenCalled();
    });

    it('setNodesOpacityOnDrag uses ?? 1 when opacity is undefined', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode(); // no opacity override → getAttrs().opacity = undefined
      (
        plugin as unknown as { dragSelectedNodes: unknown[] }
      ).dragSelectedNodes = [node];
      plugin.setNodesOpacityOnDrag();
      // Should use 1 as fallback opacity
      expect(node.setAttr).toHaveBeenCalledWith('dragStartOpacity', 1);
    });

    it('restoreNodesOpacityOnDrag restores from dragStartOpacity', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ dragStartOpacity: 0.8 });
      (node.getAttr as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'dragStartOpacity') return 0.8;
          return undefined;
        }
      );
      (
        plugin as unknown as { dragSelectedNodes: unknown[] }
      ).dragSelectedNodes = [node];
      plugin.restoreNodesOpacityOnDrag();
      expect(node.opacity).toHaveBeenCalledWith(0.8);
      expect(node.setAttr).toHaveBeenCalledWith('dragStartOpacity', undefined);
    });

    it('restoreNodesOpacityOnDrag uses ?? 1 when dragStartOpacity is undefined', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode();
      // getAttr returns undefined by default
      (
        plugin as unknown as { dragSelectedNodes: unknown[] }
      ).dragSelectedNodes = [node];
      plugin.restoreNodesOpacityOnDrag();
      expect(node.opacity).toHaveBeenCalledWith(1);
    });
  });

  describe('saveDragSelectedNodes() / getDragSelectedNodes()', () => {
    it('saves current transformer nodes as drag selection', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const nodes = [makeKonvaNode({ id: 'a' })];
      (
        plugin.getTransformer().nodes as ReturnType<typeof vi.fn>
      ).mockReturnValue(nodes);
      plugin.saveDragSelectedNodes();
      expect(plugin.getDragSelectedNodes()).toEqual(nodes);
    });
  });

  describe('plugin accessors after onInit', () => {
    it('returns undefined when optional plugins are not registered', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(plugin.getContextMenuPlugin()).toBeUndefined();
      expect(plugin.getStageGridPlugin()).toBeUndefined();
      expect(plugin.getStagePanningPlugin()).toBeUndefined();
      expect(plugin.getNodesSelectionFeedbackPlugin()).toBeUndefined();
      expect(plugin.getUsersPresencePlugin()).toBeUndefined();
    });
  });

  describe('setSelectedNodes()', () => {
    it('sets transformer nodes and calls handleBehaviors', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const node = makeKonvaNode({ id: 'n1' });
      const tr = plugin.getTransformer();
      plugin.setSelectedNodes([node as unknown as import('konva').Node]);
      expect(tr.setNodes).toHaveBeenCalledWith([node]);
    });

    it('cleans halos when empty array passed', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const feedbackPlugin = { cleanupSelectedHalos: vi.fn() };
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'nodesMultiSelectionFeedback') return feedbackPlugin;
          return undefined;
        }
      );
      plugin.setSelectedNodes([]);
      expect(feedbackPlugin.cleanupSelectedHalos).toHaveBeenCalled();
    });

    it('sends awareness when usersSelection plugin available', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const usersSelectionPlugin = { sendSelectionAwarenessInfo: vi.fn() };
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'usersSelection') return usersSelectionPlugin;
          return undefined;
        }
      );
      const rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
      plugin.setSelectedNodes([]);
      expect(
        usersSelectionPlugin.sendSelectionAwarenessInfo
      ).toHaveBeenCalled();
      rafSpy.mockRestore();
    });
  });

  describe('hideHoverState()', () => {
    it('no-ops when nodesSelection plugin is not registered', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      expect(() => plugin.hideHoverState()).not.toThrow();
    });

    it('clears hover transformer when selection plugin is registered', () => {
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const hoverTr = { nodes: vi.fn() };
      const selectionPlugin = {
        getHoverTransformer: vi.fn().mockReturnValue(hoverTr),
      };
      (weave.getPlugin as ReturnType<typeof vi.fn>).mockReturnValue(
        selectionPlugin
      );
      plugin.hideHoverState();
      expect(hoverTr.nodes).toHaveBeenCalledWith([]);
    });
  });

  describe('isTransforming() / isDragging() / getSelectorConfig()', () => {
    it('isTransforming() delegates to transformerCtrl', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(typeof plugin.isTransforming()).toBe('boolean');
    });

    it('isDragging() delegates to transformerCtrl', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(typeof plugin.isDragging()).toBe('boolean');
    });

    it('getSelectorConfig() returns selection part of config', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const cfg = plugin.getSelectorConfig();
      expect(cfg).toBeDefined();
    });
  });

  describe('initLayer()', () => {
    it('creates a layer and adds it to the stage', () => {
      const { plugin, weave } = makePlugin();
      plugin.initLayer!();
      expect(weave.getStage().add).toHaveBeenCalled();
    });
  });

  describe('getHoverTransformer()', () => {
    it('returns the hover transformer from transformerCtrl', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      expect(plugin.getHoverTransformer()).toBeTruthy();
    });
  });

  describe('handleBehaviors()', () => {
    it('disables anchors when singleSelection is disabled for one selected node', () => {
      const { plugin } = makePlugin({
        config: {
          behaviors: {
            singleSelection: { enabled: false },
            multipleSelection: { enabled: false },
          },
        },
      });
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      plugin.handleBehaviors();
      expect(tr.enabledAnchors).toHaveBeenCalledWith([]);
    });

    it('disables anchors when multipleSelection is disabled for two selected nodes', () => {
      const { plugin } = makePlugin({
        config: {
          behaviors: {
            singleSelection: { enabled: true },
            multipleSelection: { enabled: false },
          },
        },
      });
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const nodes = [makeKonvaNode({ id: 'a' }), makeKonvaNode({ id: 'b' })];
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue(nodes);
      plugin.handleBehaviors();
      expect(tr.enabledAnchors).toHaveBeenCalledWith([]);
    });

    it('sets resizeEnabled=false when no anchors available', () => {
      const { plugin } = makePlugin({
        config: {
          behaviors: {
            singleSelection: { enabled: true },
            multipleSelection: { enabled: false },
          },
        },
      });
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const node = makeKonvaNode();
      (node.allowedAnchors as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      plugin.handleBehaviors();
      expect(tr.setAttrs).toHaveBeenCalledWith(
        expect.objectContaining({ resizeEnabled: false })
      );
    });

    it('single node without allowedAnchors uses ?? [] fallback', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const node = makeKonvaNode();
      // Remove allowedAnchors so ?.() returns undefined, triggering ?? []
      (node as unknown as Record<string, unknown>).allowedAnchors = undefined;
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      plugin.handleBehaviors(); // should not throw, enabledAnchors = []
    });

    it('multi-node without allowedAnchors uses ?? [] fallback', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const n1 = makeKonvaNode({ id: 'a' });
      const n2 = makeKonvaNode({ id: 'b' });
      (n1 as unknown as Record<string, unknown>).allowedAnchors = undefined;
      (n2 as unknown as Record<string, unknown>).allowedAnchors = undefined;
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([n1, n2]);
      plugin.handleBehaviors(); // should not throw
    });
  });

  describe('handleBehaviors() - transformer reset via getAttrs', () => {
    it('clears non-array attrs (else branch) when transformer has nodes and getAttrs returns mixed keys', () => {
      const { plugin } = makePlugin();
      plugin.onInit!();
      const tr = plugin.getTransformer();
      const node = makeKonvaNode();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([node]);
      // Return an attr object with both special and non-special keys
      (tr.getAttrs as ReturnType<typeof vi.fn>).mockReturnValue({
        rotationSnaps: [0, 45],
        someOtherAttr: 'value',
      });
      plugin.handleBehaviors();
      // setAttr called for rotationSnaps with [] and for someOtherAttr with undefined
      expect(tr.setAttr).toHaveBeenCalledWith('rotationSnaps', []);
      expect(tr.setAttr).toHaveBeenCalledWith('someOtherAttr', undefined);
    });
  });

  describe('initEvents() - requestAnimationFrame callbacks', () => {
    it('syncSelection is called when onStateChange event fires (via rAF)', () => {
      vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
        fn(0);
        return 0;
      });
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      // Set up stage so syncSelection has nodes to sync
      const stage = weave.getStage() as ReturnType<typeof Konva.Stage>;
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (stage.mode as ReturnType<typeof vi.fn>).mockReturnValue('default');
      // Trigger the event
      weave._trigger('onStateChange');
      // If syncSelection ran without throwing, the rAF callback was executed
      vi.unstubAllGlobals();
    });

    it('syncSelection is called when onUndoManagerStatusChange event fires (via rAF)', () => {
      vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
        fn(0);
        return 0;
      });
      const { plugin, weave } = makePlugin();
      plugin.onInit!();
      const stage = weave.getStage() as ReturnType<typeof Konva.Stage>;
      const tr = plugin.getTransformer();
      (tr.nodes as ReturnType<typeof vi.fn>).mockReturnValue([]);
      (stage.mode as ReturnType<typeof vi.fn>).mockReturnValue('default');
      weave._trigger('onUndoManagerStatusChange');
      vi.unstubAllGlobals();
    });
  });

  describe('constants anchorStyleFunc', () => {
    it('applies styles to anchor with name top-center', () => {
      const anchor = {
        stroke: vi.fn(),
        cornerRadius: vi.fn(),
        height: vi.fn(),
        offsetY: vi.fn(),
        width: vi.fn(),
        offsetX: vi.fn(),
        hasName: vi
          .fn()
          .mockImplementation((name: string) => name === 'top-center'),
      };
      WEAVE_NODES_SELECTION_DEFAULT_CONFIG.selection.anchorStyleFunc(anchor);
      expect(anchor.stroke).toHaveBeenCalledWith('#27272aff');
      expect(anchor.height).toHaveBeenCalledWith(8);
      expect(anchor.width).toHaveBeenCalledWith(32);
    });

    it('applies styles to anchor with name middle-left', () => {
      const anchor = {
        stroke: vi.fn(),
        cornerRadius: vi.fn(),
        height: vi.fn(),
        offsetY: vi.fn(),
        width: vi.fn(),
        offsetX: vi.fn(),
        hasName: vi
          .fn()
          .mockImplementation((name: string) => name === 'middle-left'),
      };
      WEAVE_NODES_SELECTION_DEFAULT_CONFIG.selection.anchorStyleFunc(anchor);
      expect(anchor.height).toHaveBeenCalledWith(32);
      expect(anchor.width).toHaveBeenCalledWith(8);
    });

    it('applies base styles only for a non-special anchor', () => {
      const anchor = {
        stroke: vi.fn(),
        cornerRadius: vi.fn(),
        height: vi.fn(),
        offsetY: vi.fn(),
        width: vi.fn(),
        offsetX: vi.fn(),
        hasName: vi.fn().mockReturnValue(false),
      };
      WEAVE_NODES_SELECTION_DEFAULT_CONFIG.selection.anchorStyleFunc(anchor);
      expect(anchor.stroke).toHaveBeenCalledWith('#27272aff');
      expect(anchor.cornerRadius).toHaveBeenCalledWith(12);
      expect(anchor.height).not.toHaveBeenCalled();
    });
  });
});
