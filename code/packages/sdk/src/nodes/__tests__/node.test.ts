// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import Konva from 'konva';
import type {
  WeaveElementAttributes,
  WeaveElementInstance,
  WeaveUser,
} from '@inditextech/weave-types';
import {
  augmentKonvaNodeClass,
  WeaveNode,
} from '../node';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';
import { WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY } from '@/plugins/nodes-multi-selection-feedback/constants';
import { WEAVE_USERS_PRESENCE_PLUGIN_KEY } from '@/plugins/users-presence/constants';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return { ...actual, mergeExceptArrays: actual.mergeExceptArrays };
});

type MockLogger = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
};

type MockTransformer = {
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  forceUpdate: ReturnType<typeof vi.fn>;
  nodes: ReturnType<typeof vi.fn>;
};

type MockHoverTransformer = {
  nodes: ReturnType<typeof vi.fn>;
  moveToTop: ReturnType<typeof vi.fn>;
  forceUpdate: ReturnType<typeof vi.fn>;
};

type SelectionPluginMock = {
  getSelectedNodes: ReturnType<typeof vi.fn>;
  isEnabled: ReturnType<typeof vi.fn>;
  isDragging: ReturnType<typeof vi.fn>;
  isTransforming: ReturnType<typeof vi.fn>;
  isAreaSelecting: ReturnType<typeof vi.fn>;
  isSelecting: ReturnType<typeof vi.fn>;
  getTransformer: ReturnType<typeof vi.fn>;
  getHoverTransformer: ReturnType<typeof vi.fn>;
  setSelectedNodes: ReturnType<typeof vi.fn>;
  getSelectorConfig: ReturnType<typeof vi.fn>;
};

type MockStage = {
  findOne: ReturnType<typeof vi.fn>;
  mode: ReturnType<typeof vi.fn>;
  container: ReturnType<typeof vi.fn>;
  scaleX: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

type MockInstance = ReturnType<typeof createMockInstance>;

type NodeAnchor = { name: string; point: Konva.Vector2d };

type ClientRectConfig = { skipTransform?: boolean; relativeTo?: Konva.Container };

type AugmentedKonvaNode = Konva.Node & {
  getTransformerProperties: () => Record<string, unknown>;
  getExportClientRect: (config?: ClientRectConfig) => Konva.RectConfig;
  getRealClientRect: (config?: ClientRectConfig) => Konva.RectConfig;
  updatePosition: () => void;
  triggerCrop: () => void;
  closeCrop: () => void;
  resetCrop: () => void;
  dblClick: () => void;
  allowedAnchors: () => string[];
  isSelectable: () => boolean;
  handleMouseover: (...args: unknown[]) => unknown;
  handleMouseout: (...args: unknown[]) => unknown;
  handleSelectNode: () => void;
  handleDeselectNode: () => void;
  defineMousePointer: () => string;
  canBeHovered: () => boolean;
  canDrag: () => boolean;
  canMoveToContainer: () => boolean;
  getNodeAnchors: () => NodeAnchor[];
  lockMutex: (user: WeaveUser) => void;
  releaseMutex: () => void;
  add: (...nodes: Konva.Node[]) => AugmentedKonvaNode;
};

type TestNodePrivate = {
  instance: MockInstance;
  logger: MockLogger;
  nodeType: string;
  didMove: boolean;
  setHoverState: (node: Konva.Node) => void;
  hideHoverState: () => void;
  defaultGetTransformerProperties: (
    config?: Record<string, unknown>
  ) => Record<string, unknown>;
};

class TestNode extends WeaveNode {
  protected nodeType = 'test';

  initialize() { /* intentionally empty */ }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    return new Konva.Group({
      id: props.id ?? 'test',
      nodeType: 'test',
    }) as unknown as WeaveElementInstance;
  }

  onUpdate(
    _instance: WeaveElementInstance,
    _next: WeaveElementAttributes
  ): void {}
}

function createMockInstance() {
  const mockContainer = { style: { cursor: '' } };
  const mockStage: MockStage = {
    findOne: vi.fn().mockReturnValue(null),
    mode: vi.fn().mockReturnValue('default'),
    container: vi.fn().mockReturnValue(mockContainer),
    scaleX: vi.fn().mockReturnValue(1),
    on: vi.fn(),
  };
  const mockTransformer: MockTransformer = {
    show: vi.fn(),
    hide: vi.fn(),
    forceUpdate: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
  };
  const mockHoverTransformer: MockHoverTransformer = {
    nodes: vi.fn(),
    moveToTop: vi.fn(),
    forceUpdate: vi.fn(),
  };
  const mockSelectionPlugin: SelectionPluginMock = {
    getSelectedNodes: vi.fn().mockReturnValue([]),
    isEnabled: vi.fn().mockReturnValue(true),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    isAreaSelecting: vi.fn().mockReturnValue(false),
    isSelecting: vi.fn().mockReturnValue(false),
    getTransformer: vi.fn().mockReturnValue(mockTransformer),
    getHoverTransformer: vi.fn().mockReturnValue(mockHoverTransformer),
    setSelectedNodes: vi.fn(),
    getSelectorConfig: vi.fn().mockReturnValue({}),
  };
  const logger: MockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };

  return {
    getStage: vi.fn().mockReturnValue(mockStage),
    getPlugin: vi.fn().mockImplementation((key: string) => {
      if (key === 'nodesSelection') return mockSelectionPlugin;
      return undefined;
    }),
    getActiveAction: vi.fn().mockReturnValue('selectionTool'),
    getChildLogger: vi.fn().mockReturnValue(logger),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    updateNode: vi.fn(),
    updateNodeNT: vi.fn(),
    getNodeHandler: vi.fn().mockReturnValue(null),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    getStore: vi.fn().mockReturnValue({
      getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    }),
    getInstanceRecursive: vi.fn().mockImplementation((node: Konva.Node) => node),
    getRealSelectedNode: vi.fn().mockImplementation((node: Konva.Node) => node),
    getMainLayer: vi.fn().mockReturnValue(new Konva.Layer()),
    getConfiguration: vi.fn().mockReturnValue({
      behaviors: { axisLockThreshold: 5 },
    }),
    _selectionPlugin: mockSelectionPlugin,
    _stage: mockStage,
    _container: mockContainer,
    _hoverTransformer: mockHoverTransformer,
  };
}

function makeNode(nodeType = 'test') {
  const node = new TestNode();
  const privateNode = getPrivateNode(node);
  privateNode.nodeType = nodeType;
  const mock = createMockInstance();
  privateNode.instance = mock;
  privateNode.logger = mock.getChildLogger('test') as MockLogger;
  privateNode.didMove = false;
  return { node, mock };
}

function getPrivateNode(node: TestNode): TestNodePrivate {
  return node as unknown as TestNodePrivate;
}

function asAugmented(node: Konva.Node): AugmentedKonvaNode {
  return node as unknown as AugmentedKonvaNode;
}

function createRenderableGroup(
  attrs: Record<string, unknown> = {}
): AugmentedKonvaNode {
  const group = asAugmented(
    new Konva.Group({
      id: 'test-id',
      name: 'node',
      nodeType: 'test',
      x: 0,
      y: 0,
      ...attrs,
    })
  );

  const rect = new Konva.Rect({
    id: `${group.id()}-rect`,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    fill: 'red',
  });
  group.add(rect);

  return group;
}

function makeEvent(
  group: Konva.Node,
  opts: { ctrlKey?: boolean; metaKey?: boolean } = {}
) {
  return {
    evt: { ctrlKey: false, metaKey: false, ...opts },
    target: group,
  } as unknown as Parameters<TestNode['handleMouseOver']>[0];
}

beforeAll(() => {
  augmentKonvaNodeClass();
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: [] }),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue([]),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    canvas: { width: 100, height: 100 },
  });
});

beforeEach(() => {
  augmentKonvaNodeClass();
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: [] }),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue([]),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    canvas: { width: 100, height: 100 },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WeaveNode', () => {
  describe('1 — augmentKonvaNodeClass', () => {
    it('1.1 no config returns empty transformer properties', () => {
      augmentKonvaNodeClass();
      const group = asAugmented(new Konva.Group());
      expect(group.getTransformerProperties()).toEqual({});
    });

    it('1.2 uses transform config overrides', () => {
      augmentKonvaNodeClass({ transform: { rotateEnabled: false } });
      const group = asAugmented(new Konva.Group());
      expect(group.getTransformerProperties()).toMatchObject({
        rotateEnabled: false,
      });
      augmentKonvaNodeClass();
    });

    it('1.3 getExportClientRect matches getClientRect', () => {
      const group = asAugmented(createRenderableGroup());
      expect(group.getExportClientRect()).toEqual(group.getClientRect());
    });

    it('1.4 getRealClientRect matches getClientRect', () => {
      const group = asAugmented(createRenderableGroup());
      expect(group.getRealClientRect()).toEqual(group.getClientRect());
    });

    it('1.5 exposes no-op helper methods', () => {
      const group = asAugmented(new Konva.Group());
      expect(() => {
        group.updatePosition();
        group.triggerCrop();
        group.closeCrop();
        group.resetCrop();
        group.dblClick();
      }).not.toThrow();
    });

    it('1.6 allowedAnchors returns an empty array', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.allowedAnchors()).toEqual([]);
    });

    it('1.7 isSelectable returns true', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.isSelectable()).toBe(true);
    });

    it('1.8 exposes no-op mouse/select handlers', () => {
      const group = asAugmented(new Konva.Group());
      expect(() => {
        group.handleMouseover();
        group.handleMouseout();
        group.handleSelectNode();
        group.handleDeselectNode();
      }).not.toThrow();
    });

    it('1.9 defineMousePointer returns default', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.defineMousePointer()).toBe('default');
    });

    it('1.10 canBeHovered returns false', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.canBeHovered()).toBe(false);
    });

    it('1.11 canDrag returns false', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.canDrag()).toBe(false);
    });

    it('1.12 canMoveToContainer returns false', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.canMoveToContainer()).toBe(false);
    });

    it('1.13 getNodeAnchors returns an empty array', () => {
      const group = asAugmented(new Konva.Group());
      expect(group.getNodeAnchors()).toEqual([]);
    });

    it('1.14 lockMutex and releaseMutex are callable', () => {
      const group = asAugmented(new Konva.Group());
      expect(() => {
        group.lockMutex({ id: 'user-1', name: 'User 1' } as WeaveUser);
        group.releaseMutex();
      }).not.toThrow();
    });
  });

  describe('2 — register', () => {
    it('2.1 stores instance and logger', async () => {
      const node = new TestNode();
      const mock = createMockInstance();

      await node.register(
        mock as unknown as Parameters<TestNode['register']>[0]
      );

      expect(getPrivateNode(node).instance).toBe(mock);
      expect(getPrivateNode(node).logger).toBeDefined();
    });

    it('2.2 calls onRegister during register', async () => {
      const node = new TestNode();
      const mock = createMockInstance();
      const onRegisterSpy = vi.spyOn(node, 'onRegister').mockResolvedValue();

      await node.register(
        mock as unknown as Parameters<TestNode['register']>[0]
      );

      expect(onRegisterSpy).toHaveBeenCalledTimes(1);
    });

    it('2.3 returns the node instance itself', async () => {
      const node = new TestNode();
      const mock = createMockInstance();

      const result = await node.register(
        mock as unknown as Parameters<TestNode['register']>[0]
      );

      expect(result).toBe(node);
    });
  });

  describe('3 — getters and defaults', () => {
    it('3.1 getNodeType returns the configured node type', () => {
      const { node } = makeNode();
      expect(node.getNodeType()).toBe('test');
    });

    it('3.2 getLogger returns the stored logger', () => {
      const { node } = makeNode();
      expect(node.getLogger()).toBe(getPrivateNode(node).logger);
    });

    it('3.3 getIsAsync returns false', () => {
      const { node } = makeNode();
      expect(node.getIsAsync()).toBe(false);
    });

    it('3.4 realOffset returns zero coordinates', () => {
      const { node } = makeNode();
      expect(
        node.realOffset(
          {} as unknown as Parameters<TestNode['realOffset']>[0]
        )
      ).toEqual({ x: 0, y: 0 });
    });
  });

  describe('4 — selection and paste helpers', () => {
    it('4.1 getSelectionPlugin returns the selection plugin', () => {
      const { node, mock } = makeNode();
      expect(node.getSelectionPlugin()).toBe(mock._selectionPlugin);
    });

    it('4.2 getSelectionPlugin returns undefined when plugin is missing', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockReturnValue(undefined);
      expect(node.getSelectionPlugin()).toBeUndefined();
    });

    it('4.3 isSelecting is true for selection tool action', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      expect(node.isSelecting()).toBe(true);
    });

    it('4.4 isSelecting is false for a non-selection action', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue('moveTool');
      expect(node.isSelecting()).toBe(false);
    });

    it('4.5 isPasting is true when copyPaste plugin reports pasting', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockImplementation((key: string) => {
        if (key === 'copyPasteNodes') {
          return { isPasting: vi.fn().mockReturnValue(true) };
        }
        if (key === 'nodesSelection') {
          return mock._selectionPlugin;
        }
        return null;
      });

      expect(node.isPasting()).toBe(true);
    });

    it('4.6 isPasting is false when copyPaste plugin is missing', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockImplementation((key: string) => {
        if (key === 'nodesSelection') {
          return mock._selectionPlugin;
        }
        return null;
      });

      expect(node.isPasting()).toBe(false);
    });

    it('4.7 isPasting is false when copyPaste plugin reports false', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockImplementation((key: string) => {
        if (key === 'copyPasteNodes') {
          return { isPasting: vi.fn().mockReturnValue(false) };
        }
        if (key === 'nodesSelection') {
          return mock._selectionPlugin;
        }
        return null;
      });

      expect(node.isPasting()).toBe(false);
    });
  });

  describe('5 — isNodeSelected', () => {
    it('5.1 returns true when node id is selected', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ id: 'test-id' });
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      expect(node.isNodeSelected(group)).toBe(true);
    });

    it('5.2 returns false for a different selected id', () => {
      const { node, mock } = makeNode();
      const selected = new Konva.Group({ id: 'other-id' });
      const current = new Konva.Group({ id: 'test-id' });
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([selected]);

      expect(node.isNodeSelected(current)).toBe(false);
    });

    it('5.3 returns false when selection plugin is missing', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockReturnValue(null);

      expect(node.isNodeSelected(new Konva.Group({ id: 'test-id' }))).toBe(false);
    });
  });

  describe('6 — scaleReset', () => {
    it('6.1 scales width and height then resets scale', () => {
      const { node } = makeNode();
      const group = new Konva.Group({ width: 100, height: 100 });
      group.scale({ x: 2, y: 2 });

      node.scaleReset(group);

      expect(group.width()).toBe(200);
      expect(group.height()).toBe(200);
      expect(group.scale()).toEqual({ x: 1, y: 1 });
    });

    it('6.2 clamps scaled size to the minimum of 5', () => {
      const { node } = makeNode();
      const group = new Konva.Group({ width: 1, height: 1 });
      group.scale({ x: 2, y: 2 });

      node.scaleReset(group);

      expect(group.width()).toBe(5);
      expect(group.height()).toBe(5);
    });
  });

  describe('7 — setupDefaultNodeAugmentation', () => {
    it('7.1 getTransformerProperties uses default transformer properties', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);

      expect(group.getTransformerProperties()).toEqual({});
    });

    it('7.2 allowedAnchors returns eight anchors', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);

      expect(group.allowedAnchors()).toHaveLength(8);
    });

    it('7.3 defineMousePointer returns grab for selected node in selection mode', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeAugmentation(group);

      expect(group.defineMousePointer()).toBe('grab');
    });

    it('7.4 defineMousePointer returns pointer when not selecting', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getActiveAction.mockReturnValue('moveTool');

      node.setupDefaultNodeAugmentation(group);

      expect(group.defineMousePointer()).toBe('pointer');
    });

    it('7.5 canBeHovered returns true', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);

      expect(group.canBeHovered()).toBe(true);
    });

    it('7.6 canDrag returns true', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);

      expect(group.canDrag()).toBe(true);
    });

    it('7.7 canMoveToContainer returns true', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);

      expect(group.canMoveToContainer()).toBe(true);
    });

    it('7.8 getNodeAnchors returns four anchors when parent is main layer', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      const layer = new Konva.Layer();
      layer.add(group as unknown as Konva.Group);
      mock.getMainLayer.mockReturnValue(layer);

      node.setupDefaultNodeAugmentation(group);

      expect(group.getNodeAnchors()).toHaveLength(4);
    });

    it('7.9 getNodeAnchors resolves container parent and applies container offset', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      const wrapper = new Konva.Group({ nodeId: 'container-id' });
      const container = new Konva.Group({ id: 'container-id', x: 10, y: 20 });
      wrapper.add(group as unknown as Konva.Group);
      mock._stage.findOne.mockReturnValue(container);
      mock._stage.scaleX.mockReturnValue(2);

      node.setupDefaultNodeAugmentation(group);

      const anchors = group.getNodeAnchors();
      expect(mock._stage.findOne).toHaveBeenCalledWith('#container-id');
      expect(anchors[0]).toEqual({
        name: 'top',
        point: { x: 70, y: 40 },
      });
    });

    it('7.10 getNodeAnchors returns empty array when node has no parent', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);

      expect(group.getNodeAnchors()).toEqual([]);
    });

    it('7.11 lockMutex deselects node for other users', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getStore.mockReturnValue({
        getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
      });
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeAugmentation(group);
      group.lockMutex({ id: 'user-2', name: 'User 2' } as WeaveUser);

      expect(mock._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('7.12 lockMutex keeps selection for the same user', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getStore.mockReturnValue({
        getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
      });
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeAugmentation(group);
      group.lockMutex({ id: 'user-1', name: 'User 1' } as WeaveUser);

      expect(mock._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('7.13 releaseMutex clears mutex attrs', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      node.setupDefaultNodeAugmentation(group);
      group.lockMutex({ id: 'user-2', name: 'User 2' } as WeaveUser);
      group.releaseMutex();

      expect(group.getAttrs().mutexLocked).toBe(false);
      expect(group.getAttrs().mutexUserId).toBeUndefined();
    });

    it('7.14 locked nodes disable listening', () => {
      const { node } = makeNode();
      const group = createRenderableGroup({ locked: true });

      node.setupDefaultNodeAugmentation(group);

      expect(group.listening()).toBe(false);
    });

    it('7.15 unlocked nodes keep listening enabled', () => {
      const { node } = makeNode();
      const group = createRenderableGroup({ locked: false });

      node.setupDefaultNodeAugmentation(group);

      expect(group.listening()).toBe(true);
    });
  });

  describe('8 — setHoverState and hideHoverState', () => {
    it('8.1 setHoverState does not crash without selection plugin', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getPlugin = vi.fn().mockReturnValue(null);

      expect(() => getPrivateNode(node).setHoverState(group)).not.toThrow();
    });

    it('8.2 dragging hides hover state', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock._selectionPlugin.isDragging.mockReturnValue(true);

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });

    it('8.3 transforming hides hover state', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock._selectionPlugin.isTransforming.mockReturnValue(true);

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });

    it('8.4 a single selected current node hides hover state', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });

    it('8.5 area selecting hides hover state', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock._selectionPlugin.isAreaSelecting.mockReturnValue(true);

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });

    it('8.6 hoverable nodes are shown in hover transformer', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      node.setupDefaultNodeAugmentation(group);

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        [group]
      );
    });

    it('8.7 non-hoverable nodes clear hover transformer', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      group.canBeHovered = () => false;

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });

    it('8.8 moveToTop is called when hover is shown', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      node.setupDefaultNodeAugmentation(group);

      getPrivateNode(node).setHoverState(group);

      expect(mock._hoverTransformer.moveToTop).toHaveBeenCalled();
    });

    it('8.9 hideHoverState does not crash without plugin', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockReturnValue(null);

      expect(() => getPrivateNode(node).hideHoverState()).not.toThrow();
    });

    it('8.10 hideHoverState clears hover transformer nodes', () => {
      const { node, mock } = makeNode();

      getPrivateNode(node).hideHoverState();

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });
  });

  describe('9 — handleMouseOver', () => {
    it('9.1 ctrlKey returns false without changing cursor', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();

      const result = node.handleMouseOver(makeEvent(group, { ctrlKey: true }), group);

      expect(result).toBe(false);
      expect(mock._container.style.cursor).toBe('');
    });

    it('9.2 metaKey returns false', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();

      expect(node.handleMouseOver(makeEvent(group, { metaKey: true }), group)).toBe(
        false
      );
    });

    it('9.3 move tool action returns false', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);

      expect(node.handleMouseOver(makeEvent(group), group)).toBe(false);
    });

    it('9.4 locked and not selected uses default cursor and cancels bubble', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup({ locked: true });
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(true);
      expect(mock._container.style.cursor).toBe('default');
    });

    it('9.5 mutex locked by another user uses default cursor and cancels bubble', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup({
        mutexLocked: true,
        mutexUserId: 'user-2',
      });
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(true);
      expect(mock._container.style.cursor).toBe('default');
    });

    it('9.6 non-targetable nodes cancel bubble', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup({ canBeTargeted: false });
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);

      expect(node.handleMouseOver(makeEvent(group), group)).toBe(true);
    });

    it('9.7 unselected targetable nodes in default mode use defineMousePointer', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._stage.mode.mockReturnValue(WEAVE_STAGE_DEFAULT_MODE);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);
      node.setupDefaultNodeAugmentation(group);

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(true);
      expect(mock._container.style.cursor).toBe('pointer');
    });

    it('9.8 selected targetable nodes in default mode use defineMousePointer', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._stage.mode.mockReturnValue(WEAVE_STAGE_DEFAULT_MODE);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);
      node.setupDefaultNodeAugmentation(group);

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(true);
      expect(mock._container.style.cursor).toBe('grab');
    });

    it('9.9 pasting mode uses crosshair cursor', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getPlugin = vi.fn().mockImplementation((key: string) => {
        if (key === 'copyPasteNodes') {
          return { isPasting: vi.fn().mockReturnValue(true) };
        }
        if (key === 'nodesSelection') {
          return mock._selectionPlugin;
        }
        return null;
      });

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(true);
      expect(mock._container.style.cursor).toBe('crosshair');
    });

    it('9.10 non-node names do not show hover state', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup({ name: 'other' });
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._stage.mode.mockReturnValue(WEAVE_STAGE_DEFAULT_MODE);

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(false);
      expect(mock._hoverTransformer.moveToTop).not.toHaveBeenCalled();
    });

    it('9.11 non-default stage mode does not show hover state', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._stage.mode.mockReturnValue('cropping');
      node.setupDefaultNodeAugmentation(group);

      const result = node.handleMouseOver(makeEvent(group), group);

      expect(result).toBe(false);
      expect(mock._hoverTransformer.moveToTop).not.toHaveBeenCalled();
    });
  });

  describe('10 — handleMouseout', () => {
    it('10.1 ctrlKey returns false without hiding hover state', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();
      const hideHoverStateSpy = vi.spyOn(getPrivateNode(node), 'hideHoverState');

      const result = node.handleMouseout(
        makeEvent(group, { ctrlKey: true }) as unknown as Parameters<
          TestNode['handleMouseout']
        >[0],
        group
      );

      expect(result).toBe(false);
      expect(hideHoverStateSpy).not.toHaveBeenCalled();
    });

    it('10.2 metaKey returns false', () => {
      const { node } = makeNode();
      const group = createRenderableGroup();
      const hideHoverStateSpy = vi.spyOn(getPrivateNode(node), 'hideHoverState');

      const result = node.handleMouseout(
        makeEvent(group, { metaKey: true }) as unknown as Parameters<
          TestNode['handleMouseout']
        >[0],
        group
      );

      expect(result).toBe(false);
      expect(hideHoverStateSpy).not.toHaveBeenCalled();
    });

    it('10.3 hides hover state when real node exists', () => {
      const { node, mock } = makeNode();
      const group = createRenderableGroup();
      mock.getInstanceRecursive.mockReturnValue(group);

      node.handleMouseout(
        makeEvent(group) as unknown as Parameters<TestNode['handleMouseout']>[0],
        group
      );

      expect(mock._hoverTransformer.nodes).toHaveBeenCalledWith(
        []
      );
    });
  });

  describe('11 — show and hide', () => {
    it('11.1 show ignores wrong nodeType', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'wrong', id: 'x' });

      node.show(group);

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('11.2 show updates visibility and cursor for matching nodeType', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'test', id: 'x', visible: false });

      node.show(group);

      expect(group.getAttrs().visible).toBe(true);
      expect(mock.updateNode).toHaveBeenCalledTimes(1);
      expect(mock._container.style.cursor).toBe('default');
    });

    it('11.3 hide ignores wrong nodeType', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'wrong', id: 'x' });

      node.hide(group);

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('11.4 hide updates visibility and cursor for matching nodeType', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'test', id: 'x', visible: true });

      node.hide(group);

      expect(group.getAttrs().visible).toBe(false);
      expect(mock.updateNode).toHaveBeenCalledTimes(1);
      expect(mock._container.style.cursor).toBe('default');
    });

    it('11.5 hide removes the hidden node from selection', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'test', id: 'x' });
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.hide(group);

      const call = mock._selectionPlugin.setSelectedNodes.mock.calls[0][0] as Konva.Node[];
      expect(call).not.toContain(group);
    });

    it('11.6 hide on frame removes both frame and selector area from selection', () => {
      const { node, mock } = makeNode('frame');
      const group = new Konva.Group({ nodeType: 'frame', id: 'frame-1' });
      const selectorArea = new Konva.Group({
        nodeType: 'frame',
        id: 'frame-1-selector-area',
      });
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group, selectorArea]);

      node.hide(group);

      expect(mock._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });
  });

  describe('12 — lock, unlock, isLocked and isVisible', () => {
    it('12.1 lock ignores wrong nodeType', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'wrong', id: 'x' });

      node.lock(group);

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('12.2 lock sets locked state, disables listening and removes selection', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'test', id: 'x' });
      group.listening(true);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.lock(group);

      expect(group.getAttrs().locked).toBe(true);
      expect(group.getAttrs().listening).toBe(false);
      expect(mock.updateNode).toHaveBeenCalledTimes(1);
      expect(mock._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('12.3 unlock ignores wrong nodeType', () => {
      const { node, mock } = makeNode();
      const group = new Konva.Group({ nodeType: 'wrong', id: 'x' });

      node.unlock(group);

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('12.4 unlock restores previous listening when there is no nodeId', () => {
      const { node } = makeNode();
      const group = new Konva.Group({
        nodeType: 'test',
        id: 'x',
        locked: true,
        previousListening: true,
      });
      group.listening(false);

      node.unlock(group);

      expect(group.getAttrs().locked).toBe(false);
      expect(group.getAttrs().listening).toBe(true);
    });

    it('12.5 unlock resolves real instance when nodeId exists', () => {
      const { node, mock } = makeNode();
      const proxy = new Konva.Group({ nodeType: 'test', nodeId: 'real-node' });
      const realNode = new Konva.Group({
        id: 'real-node',
        nodeType: 'test',
        locked: true,
      });
      mock._stage.findOne.mockReturnValue(realNode);

      node.unlock(proxy);

      expect(mock._stage.findOne).toHaveBeenCalledWith('#real-node');
    });

    it('12.6 unlock returns early when resolved instance is missing', () => {
      const { node, mock } = makeNode();
      const proxy = new Konva.Group({ nodeType: 'test', nodeId: 'missing-node' });
      mock._stage.findOne.mockReturnValue(null);

      node.unlock(proxy);

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('12.7 isLocked reflects locked attr', () => {
      const { node } = makeNode();
      expect(node.isLocked(new Konva.Group({ locked: true }))).toBe(true);
      expect(node.isLocked(new Konva.Group({ locked: false }))).toBe(false);
    });

    it('12.8 isLocked resolves recursive instance when nodeId is false', () => {
      const { node, mock } = makeNode();
      const proxy = new Konva.Group({ nodeId: false });
      const realNode = new Konva.Group({ locked: true });
      mock.getInstanceRecursive.mockReturnValue(realNode);

      expect(node.isLocked(proxy)).toBe(true);
      expect(mock.getInstanceRecursive).toHaveBeenCalledWith(proxy);
    });

    it('12.9 isVisible handles undefined, true and false', () => {
      const { node } = makeNode();
      expect(node.isVisible(new Konva.Group())).toBe(true);
      expect(node.isVisible(new Konva.Group({ visible: true }))).toBe(true);
      expect(node.isVisible(new Konva.Group({ visible: false }))).toBe(false);
    });
  });

  describe('13 — create', () => {
    it('13.1 creates a state element for the node type', () => {
      const { node } = makeNode();

      expect(node.create('key1', { x: 10, y: 20 })).toEqual({
        key: 'key1',
        type: 'test',
        props: {
          id: 'key1',
          nodeType: 'test',
          x: 10,
          y: 20,
          children: [],
        },
      });
    });
  });

  describe('14 — serialize', () => {
    it('14.1 removes transient attrs from the serialized props', () => {
      const { node } = makeNode();
      const group = new Konva.Group({
        id: 'node-1',
        nodeType: 'test',
        isSelected: true,
        mutexLocked: true,
        mutexUserId: 'user-2',
        draggable: true,
        overridesMouseControl: true,
        dragBoundFunc: vi.fn(),
      });

      const serialized = node.serialize(group as unknown as WeaveElementInstance);

      expect(serialized.props).not.toHaveProperty('isSelected');
      expect(serialized.props).not.toHaveProperty('mutexLocked');
      expect(serialized.props).not.toHaveProperty('mutexUserId');
      expect(serialized.props).not.toHaveProperty('draggable');
      expect(serialized.props).not.toHaveProperty('overridesMouseControl');
      expect(serialized.props).not.toHaveProperty('dragBoundFunc');
    });

    it('14.2 resets clone-related attrs to undefined', () => {
      const { node } = makeNode();
      const group = new Konva.Group({
        id: 'node-1',
        nodeType: 'test',
        isCloned: true,
        isCloneOrigin: true,
      });

      const serialized = node.serialize(group as unknown as WeaveElementInstance);

      expect(serialized.props.isCloned).toBeUndefined();
      expect(serialized.props.isCloneOrigin).toBeUndefined();
    });

    it('14.3 uses attrs.id as the state key', () => {
      const { node } = makeNode();
      const group = new Konva.Group({ id: 'node-1', nodeType: 'test' });

      expect(node.serialize(group as unknown as WeaveElementInstance).key).toBe(
        'node-1'
      );
    });
  });

  describe('15 — static defaultState', () => {
    it('15.1 returns the default unknown node state', () => {
      expect(TestNode.defaultState('node-1')).toMatchObject({
        key: 'node-1',
        type: 'unknown',
        props: {
          id: 'node-1',
          nodeType: 'unknown',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          zIndex: 1,
          children: [],
        },
      });
    });
  });

  describe('16 — static getSchema', () => {
    it('16.1 parses a valid node state', () => {
      const result = WeaveNode.getSchema().safeParse({
        key: 'node-1',
        type: 'test',
        props: {
          id: 'node-1',
          nodeType: 'test',
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          children: [],
        },
      });

      expect(result.success).toBe(true);
    });

    it('16.2 fails when x is missing', () => {
      const result = WeaveNode.getSchema().safeParse({
        key: 'node-1',
        type: 'test',
        props: {
          id: 'node-1',
          nodeType: 'test',
          y: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          children: [],
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('17 — lifecycle defaults', () => {
    it('17.1 onRegister resolves', async () => {
      const { node } = makeNode();
      await expect(node.onRegister()).resolves.toBeUndefined();
    });

    it('17.2 onAdd does not throw', () => {
      const { node } = makeNode();
      expect(() =>
        node.onAdd({} as unknown as WeaveElementInstance)
      ).not.toThrow();
    });

    it('17.3 onDestroy destroys the node instance', () => {
      const { node } = makeNode();
      const instance = { destroy: vi.fn() };

      node.onDestroy(instance as unknown as WeaveElementInstance);

      expect(instance.destroy).toHaveBeenCalledTimes(1);
    });

    it('17.4 onDestroyInstance does not throw', () => {
      const { node } = makeNode();
      expect(() => node.onDestroyInstance()).not.toThrow();
    });
  });

  describe('18 — defaultGetTransformerProperties', () => {
    it('18.1 returns empty object without selection plugin', () => {
      const { node, mock } = makeNode();
      mock.getPlugin = vi.fn().mockReturnValue(null);

      expect(getPrivateNode(node).defaultGetTransformerProperties()).toEqual({});
    });

    it('18.2 includes selector config from selection plugin', () => {
      const { node, mock } = makeNode();
      mock._selectionPlugin.getSelectorConfig.mockReturnValue({
        rotateEnabled: false,
      });

      expect(getPrivateNode(node).defaultGetTransformerProperties()).toEqual({
        rotateEnabled: false,
      });
    });

    it('18.3 merges node transform config with selector config', () => {
      const { node, mock } = makeNode();
      mock._selectionPlugin.getSelectorConfig.mockReturnValue({
        rotateEnabled: false,
      });

      expect(
        getPrivateNode(node).defaultGetTransformerProperties({
          keepRatio: false,
        })
      ).toEqual({
        rotateEnabled: false,
        keepRatio: false,
      });
    });
  });

  describe('19 — plugin getters', () => {
    it('19.1 returns the nodes selection feedback plugin when present', () => {
      const { node, mock } = makeNode();
      const feedbackPlugin = { updateSelectionHalo: vi.fn() };
      mock.getPlugin = vi.fn().mockImplementation((key: string) => {
        if (key === WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY) {
          return feedbackPlugin;
        }
        if (key === 'nodesSelection') {
          return mock._selectionPlugin;
        }
        return null;
      });

      expect(node.getNodesSelectionFeedbackPlugin()).toBe(feedbackPlugin);
    });

    it('19.2 returns undefined when nodes selection feedback plugin is absent', () => {
      const { node } = makeNode();
      expect(node.getNodesSelectionFeedbackPlugin()).toBeUndefined();
    });

    it('19.3 returns the users presence plugin when present', () => {
      const { node, mock } = makeNode();
      const usersPresencePlugin = { setPresence: vi.fn() };
      mock.getPlugin = vi.fn().mockImplementation((key: string) => {
        if (key === WEAVE_USERS_PRESENCE_PLUGIN_KEY) {
          return usersPresencePlugin;
        }
        if (key === 'nodesSelection') {
          return mock._selectionPlugin;
        }
        return null;
      });

      expect(node.getUsersPresencePlugin()).toBe(usersPresencePlugin);
    });

    it('19.4 returns undefined when users presence plugin is absent', () => {
      const { node } = makeNode();
      expect(node.getUsersPresencePlugin()).toBeUndefined();
    });
  });
});
