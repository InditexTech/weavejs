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
import { WeaveNode, augmentKonvaNodeClass } from '../node';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../stage/constants';
import type {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import { WEAVE_NODE_CUSTOM_EVENTS } from '@inditextech/weave-types';
import type { KonvaEventObject } from 'konva/lib/Node';

const mockClearContainerTargets = vi.fn();
const mockContainerOverCursor = vi.fn().mockReturnValue(null);
const mockHasFrames = vi.fn().mockReturnValue(false);
const mockMoveNodeToContainerNT = vi.fn().mockReturnValue(false);

vi.mock('lodash/throttle', () => ({
  default: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...actual,
    clearContainerTargets: (...args: unknown[]) =>
      mockClearContainerTargets(...args),
    containerOverCursor: (...args: unknown[]) =>
      mockContainerOverCursor(...args),
    hasFrames: (...args: unknown[]) => mockHasFrames(...args),
    moveNodeToContainerNT: (...args: unknown[]) =>
      mockMoveNodeToContainerNT(...args),
  };
});

type MockLogger = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

type MockInstance = ReturnType<typeof createMockInstance>;

type TestNodePrivate = {
  instance: MockInstance;
  logger: MockLogger;
  didMove: boolean;
  previousPointer: string | null;
};

type EventfulNode = Konva.Group & {
  handleMouseover: (...args: unknown[]) => unknown;
  handleMouseout: (...args: unknown[]) => unknown;
  handleSelectNode: () => void;
  handleDeselectNode: () => void;
  canDrag: () => boolean;
  stopDrag: ReturnType<typeof vi.fn>;
  isDragging: ReturnType<typeof vi.fn>;
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

  onUpdate(): void {}

  exposedScaleReset = (node: Konva.Node) => this.scaleReset(node);
}

function createMockInstance() {
  const mockContainer = { style: { cursor: '' } };
  const mockStage = {
    findOne: vi.fn().mockReturnValue(null),
    mode: vi.fn().mockReturnValue(WEAVE_STAGE_DEFAULT_MODE),
    container: vi.fn().mockReturnValue(mockContainer),
    scaleX: vi.fn().mockReturnValue(1),
    on: vi.fn(),
    off: vi.fn(),
    setPointersPositions: vi.fn(),
  };
  const mockTransformer = {
    show: vi.fn(),
    hide: vi.fn(),
    forceUpdate: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
  };
  const mockHoverTransformer = {
    nodes: vi.fn(),
    moveToTop: vi.fn(),
    forceUpdate: vi.fn(),
  };
  const mockSelectionPlugin = {
    getSelectedNodes: vi.fn().mockReturnValue([]),
    isEnabled: vi.fn().mockReturnValue(true),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    isAreaSelecting: vi.fn().mockReturnValue(false),
    getTransformer: vi.fn().mockReturnValue(mockTransformer),
    getHoverTransformer: vi.fn().mockReturnValue(mockHoverTransformer),
    setSelectedNodes: vi.fn(),
    restoreNodesOpacityOnDrag: vi.fn(),
  };
  const mockFeedbackPlugin = {
    hideSelectionHalo: vi.fn(),
    showSelectionHalo: vi.fn(),
    updateSelectionHalo: vi.fn(),
    createSelectionHalo: vi.fn(),
    destroySelectionHalo: vi.fn(),
  };
  const mockPresencePlugin = {
    setPresence: vi.fn(),
  };
  const mockCloningManager = {
    cloneNode: vi.fn().mockReturnValue(null),
    addClone: vi.fn(),
    removeClone: vi.fn(),
    getClones: vi.fn().mockReturnValue([]),
    isClone: vi.fn().mockReturnValue(false),
  };
  const mockNodeHandler = {
    serialize: vi.fn().mockReturnValue({ key: 'test', type: 'test', props: {} }),
  };

  return {
    getStage: vi.fn().mockReturnValue(mockStage),
    getPlugin: vi.fn().mockImplementation((key: string) => {
      if (key === 'nodesSelection') return mockSelectionPlugin;
      if (key === 'nodesMultiSelectionFeedback') return mockFeedbackPlugin;
      if (key === 'usersPresence') return mockPresencePlugin;
      return null;
    }),
    getActiveAction: vi.fn().mockReturnValue(SELECTION_TOOL_ACTION_NAME),
    getChildLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    updateNode: vi.fn(),
    updateNodeNT: vi.fn(),
    getNodeHandler: vi.fn().mockReturnValue(mockNodeHandler),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    getStore: vi.fn().mockReturnValue({
      getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    }),
    getInstanceRecursive: vi.fn().mockImplementation((n: Konva.Node) => n),
    getRealSelectedNode: vi.fn().mockImplementation((n: Konva.Node) => n),
    getMainLayer: vi.fn().mockReturnValue(new Konva.Layer()),
    getConfiguration: vi.fn().mockReturnValue({
      behaviors: { axisLockThreshold: 5 },
    }),
    getCloningManager: vi.fn().mockReturnValue(mockCloningManager),
    stateTransactional: vi.fn().mockImplementation((fn: () => void) => fn()),
    runPhaseHooks: vi
      .fn()
      .mockImplementation(
        (_name: string, cb: (...args: unknown[]) => void) => cb(vi.fn())
      ),
    _stage: mockStage,
    _selectionPlugin: mockSelectionPlugin,
    _feedbackPlugin: mockFeedbackPlugin,
    _presencePlugin: mockPresencePlugin,
    _cloningManager: mockCloningManager,
    _nodeHandler: mockNodeHandler,
    _transformer: mockTransformer,
    _hoverTransformer: mockHoverTransformer,
  };
}

function getPrivateNode(node: TestNode): TestNodePrivate {
  return node as unknown as TestNodePrivate;
}

function makeNode() {
  const node = new TestNode();
  const mock = createMockInstance();
  const privateNode = getPrivateNode(node);
  privateNode.instance = mock;
  privateNode.logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as MockLogger;
  privateNode.didMove = false;
  privateNode.previousPointer = null;
  return { node, mock };
}

function fireKonvaEvent(
  target: Konva.Node,
  eventName: string,
  eventData: Record<string, unknown> = {}
) {
  target.fire(eventName, eventData);
}

function createGroup(attrs: Record<string, unknown> = {}): EventfulNode {
  return new Konva.Group({
    id: 'g',
    nodeType: 'test',
    name: 'node',
    width: 100,
    height: 50,
    ...attrs,
  }) as EventfulNode;
}

function getAddedListener(
  mock: MockInstance,
  eventName: string
): ((...args: unknown[]) => unknown) | undefined {
  const match = mock.addEventListener.mock.calls.find(
    (call: unknown[]) => call[0] === eventName
  );

  return match?.[1] as ((...args: unknown[]) => unknown) | undefined;
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
  vi.clearAllMocks();
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
  mockContainerOverCursor.mockReturnValue(null);
  mockHasFrames.mockReturnValue(false);
  mockMoveNodeToContainerNT.mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('WeaveNode setupDefaultNodeEvents', () => {
  describe('1 — locked nodes', () => {
    it('1.1 locked node removes all event listeners', () => {
      const { node } = makeNode();
      const group = createGroup({ locked: true });
      const offSpy = vi.spyOn(group, 'off');

      node.setupDefaultNodeEvents(group);

      expect(offSpy).toHaveBeenCalledWith('transformstart');
      expect(offSpy).toHaveBeenCalledWith('transform');
      expect(offSpy).toHaveBeenCalledWith('transformend');
      expect(offSpy).toHaveBeenCalledWith('dragstart');
      expect(offSpy).toHaveBeenCalledWith('dragmove');
      expect(offSpy).toHaveBeenCalledWith('dragend');
      expect(offSpy).toHaveBeenCalledWith('pointerover');
      expect(offSpy).toHaveBeenCalledWith('pointerleave');
    });

    it('1.2 locked node removes onNodesChange listener', () => {
      const { node, mock } = makeNode();
      const group = createGroup({ locked: true });

      node.setupDefaultNodeEvents(group);

      expect(mock.removeEventListener).toHaveBeenCalledWith(
        'onNodesChange',
        expect.any(Function)
      );
    });
  });

  describe('2 — transformstart', () => {
    it('2.1 disables stroke scaling and marks it for revert', () => {
      const { node } = makeNode();
      const group = createGroup({ strokeScaleEnabled: true });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformstart', { target: group, evt: {} });

      expect(group.getAttrs().strokeScaleEnabled).toBe(false);
      expect(group.getAttrs()._revertStrokeScaleEnabled).toBe(true);
    });

    it('2.2 keeps revert flag unset when stroke scaling is already disabled', () => {
      const { node } = makeNode();
      const group = createGroup({ strokeScaleEnabled: false });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformstart', { target: group, evt: {} });

      expect(group.getAttrs()._revertStrokeScaleEnabled).toBeFalsy();
    });

    it('2.3 emits onTransform with the target node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformstart', { target: group, evt: {} });

      expect(mock.emitEvent).toHaveBeenCalledWith('onTransform', group);
    });

    it('2.4 hides the selection halo', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformstart', { target: group, evt: {} });

      expect(mock._feedbackPlugin.hideSelectionHalo).toHaveBeenCalledWith(group);
    });

    it('2.5 locks the transform mutex for a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformstart', { target: group, evt: {} });

      expect(mock.setMutexLock).toHaveBeenCalledWith({
        nodeIds: [group.id()],
        operation: 'node-transform',
      });
    });

    it('2.6 does not lock mutex when selected count is not one', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformstart', { target: group, evt: {} });

      expect(mock.setMutexLock).not.toHaveBeenCalled();
    });
  });

  describe('3 — transform', () => {
    it('3.1 updates the transformer while selecting a selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transform', { target: group, evt: {} });

      expect(mock._transformer.forceUpdate).toHaveBeenCalled();
    });

    it('3.2 skips transformer updates when not selecting', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock.getActiveAction.mockReturnValue('moveTool');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transform', { target: group, evt: {} });

      expect(mock._transformer.forceUpdate).not.toHaveBeenCalled();
    });

    it('3.3 uses parent nodeId as the presence parent id', () => {
      const { node, mock } = makeNode();
      const parent = new Konva.Group({ id: 'wrapper', nodeId: 'container-id' });
      const group = createGroup({ x: 10, y: 20, width: 30, height: 40, rotation: 15 });
      group.scale({ x: 2, y: 3 });
      parent.add(group);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transform', { target: group, evt: {} });

      expect(mock._presencePlugin.setPresence).toHaveBeenCalledWith(
        group.id(),
        'container-id',
        expect.objectContaining({
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          scaleX: 2,
          scaleY: 3,
          rotation: 15,
          strokeScaleEnabled: false,
        })
      );
    });

    it('3.4 sets user presence with transform data', () => {
      const { node, mock } = makeNode();
      const parent = new Konva.Group({ id: 'parent-id' });
      const group = createGroup({ x: 5, y: 6, width: 70, height: 80, rotation: 25 });
      group.scale({ x: 1.5, y: 1.25 });
      parent.add(group);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transform', { target: group, evt: {} });

      expect(mock._presencePlugin.setPresence).toHaveBeenCalledWith(
        group.id(),
        'parent-id',
        {
          x: 5,
          y: 6,
          width: 70,
          height: 80,
          scaleX: 1.5,
          scaleY: 1.25,
          rotation: 25,
          strokeScaleEnabled: false,
        }
      );
    });
  });

  describe('4 — transformend', () => {
    it('4.1 releases the mutex for a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock.releaseMutexLock).toHaveBeenCalled();
    });

    it('4.2 does not release mutex when no node is selected', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock.releaseMutexLock).not.toHaveBeenCalled();
    });

    it('4.3 restores stroke scaling when revert flag is set', () => {
      const { node } = makeNode();
      const group = createGroup({ strokeScaleEnabled: false, _revertStrokeScaleEnabled: true });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(group.getAttrs().strokeScaleEnabled).toBe(true);
    });

    it('4.4 leaves stroke scaling unchanged when revert flag is not set', () => {
      const { node } = makeNode();
      const group = createGroup({ strokeScaleEnabled: false });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(group.getAttrs().strokeScaleEnabled).toBe(false);
    });

    it('4.5 emits onTransform with null', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock.emitEvent).toHaveBeenCalledWith('onTransform', null);
    });

    it('4.6 resets scale when performScaleReset is enabled', () => {
      const { node } = makeNode();
      const group = createGroup({ width: 100, height: 100 });
      group.scale({ x: 2, y: 2 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(group.width()).toBe(200);
      expect(group.height()).toBe(200);
      expect(group.scale()).toEqual({ x: 1, y: 1 });
    });

    it('4.7 skips scale reset when disabled by options', () => {
      const { node } = makeNode();
      const group = createGroup({ width: 100, height: 100 });
      group.scale({ x: 2, y: 2 });

      node.setupDefaultNodeEvents(group, { performScaleReset: false });
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(group.width()).toBe(100);
      expect(group.height()).toBe(100);
      expect(group.scale()).toEqual({ x: 2, y: 2 });
    });

    it('4.8 updates the node when handler exists and updates are enabled', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock.updateNode).toHaveBeenCalled();
    });

    it('4.9 skips node updates when shouldUpdateOnTransform is false', () => {
      const { node, mock } = makeNode();
      const group = createGroup({ shouldUpdateOnTransform: false });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('4.10 skips node updates when handler is missing', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock.getNodeHandler.mockReturnValue(null);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock.updateNode).not.toHaveBeenCalled();
    });

    it('4.11 shows and updates the selection halo for a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock._feedbackPlugin.showSelectionHalo).toHaveBeenCalledWith(group);
      expect(mock._feedbackPlugin.updateSelectionHalo).toHaveBeenCalledWith(group);
    });

    it('4.12 forces hover transformer updates', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'transformend', { target: group, evt: {} });

      expect(mock._hoverTransformer.forceUpdate).toHaveBeenCalled();
    });
  });

  describe('5 — dragstart', () => {
    it('5.1 returns early when native event data is missing', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', { target: group });

      expect(mock.emitEvent).not.toHaveBeenCalledWith('onDrag', group);
      expect(group.stopDrag).not.toHaveBeenCalled();
    });

    it('5.2 stops dragging when canDrag is false', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => false;
      group.stopDrag = vi.fn();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false, altKey: false },
      });

      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('5.3 stops dragging when buttons equals zero', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 0, shiftKey: false, altKey: false },
      });

      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('5.4 stops dragging while erase tool is active', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      mock.getActiveAction.mockReturnValue('eraseTool');

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false, altKey: false },
      });

      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('5.5 cancels bubbling and stops dragging for middle mouse button', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      const event = {
        target: group,
        evt: { button: 1, buttons: 1, shiftKey: false, altKey: false },
        cancelBubble: false,
      };

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', event);

      expect(event.cancelBubble).toBe(true);
      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('5.7 clones the node when alt is pressed', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      const clone = createGroup({ id: 'clone-id' });
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      mock._cloningManager.cloneNode.mockReturnValue(clone);
      mock._cloningManager.getClones.mockReturnValue([clone]);
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false, altKey: true },
        cancelBubble: false,
      });

      expect(mock._cloningManager.cloneNode).toHaveBeenCalledWith(group);
      expect(mock._cloningManager.addClone).toHaveBeenCalledWith(clone);
      expect(mock._selectionPlugin.setSelectedNodes).toHaveBeenCalledTimes(2);
    });

    it('5.8 locks the drag mutex for a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false, altKey: false },
      });

      expect(mock.setMutexLock).toHaveBeenCalledWith({
        nodeIds: [group.id()],
        operation: 'node-drag',
      });
    });

    it('5.9 hides the selection halo on drag start', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false, altKey: false },
      });

      expect(mock._feedbackPlugin.hideSelectionHalo).toHaveBeenCalledWith(group);
    });

    it('5.10 fires nodeDragStart on the real selected node', () => {
      const { node } = makeNode();
      const group = createGroup();
      const handler = vi.fn();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.on('nodeDragStart', handler);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false, altKey: false },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('6 — dragmove', () => {
    it('6.1 stops dragging when buttons equals zero', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.stopDrag = vi.fn();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragmove', {
        target: group,
        evt: { button: 0, buttons: 0, shiftKey: false },
      });

      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('6.2 stops dragging while erase tool is active', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      group.stopDrag = vi.fn();
      mock.getActiveAction.mockReturnValue('eraseTool');

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragmove', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false },
      });

      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('6.3 cancels bubbling and stops dragging for middle mouse button', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.stopDrag = vi.fn();
      const event = {
        target: group,
        evt: { button: 1, buttons: 1, shiftKey: false },
        cancelBubble: false,
      };

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragmove', event);

      expect(event.cancelBubble).toBe(true);
      expect(group.stopDrag).toHaveBeenCalled();
    });

    it('6.4 clears container targets for a single selected node in selection mode', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragmove', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false },
      });

      expect(mockClearContainerTargets).toHaveBeenCalledWith(mock);
    });

    it('6.5 fires onTargetEnter when a valid container is under the cursor', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      const layer = { fire: vi.fn() };
      group.isDragging = vi.fn().mockReturnValue(true);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);
      mockContainerOverCursor.mockReturnValue(layer);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragmove', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false },
      });

      expect(layer.fire).toHaveBeenCalledWith(
        WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter,
        { node: group }
      );
    });

    it('6.6 updates presence with drag position data', () => {
      const { node, mock } = makeNode();
      const parent = new Konva.Group({ id: 'parent-id' });
      const group = createGroup({ x: 12, y: 18 });
      parent.add(group);
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragmove', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false },
      });

      expect(mock._presencePlugin.setPresence).toHaveBeenCalledWith(
        group.id(),
        'parent-id',
        { x: 12, y: 18 }
      );
    });
  });

  describe('7 — dragBoundFunc', () => {
    it('7.1 returns the input position when no start position is set', () => {
      const { node } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;

      expect(boundFunc({ x: 50, y: 50 })).toEqual({ x: 50, y: 50 });
    });

    it('7.2 returns the input position when shift is released', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.absolutePosition({ x: 0, y: 0 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: true, altKey: false },
      });
      fireKonvaEvent(group, 'dragmove', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: false },
      });
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;

      expect(boundFunc({ x: 50, y: 25 })).toEqual({ x: 50, y: 25 });
    });

    it('7.3 does not lock movement before threshold is exceeded', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.absolutePosition({ x: 0, y: 0 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: true, altKey: false },
      });
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;

      expect(boundFunc({ x: 1, y: 1 })).toEqual({ x: 1, y: 1 });
    });

    it('7.4 locks movement to the x axis when horizontal delta dominates', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.absolutePosition({ x: 0, y: 0 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: true, altKey: false },
      });
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;

      expect(boundFunc({ x: 100, y: 10 })).toEqual({ x: 100, y: 0 });
    });

    it('7.5 locks movement to the y axis when vertical delta dominates', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.absolutePosition({ x: 0, y: 0 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: true, altKey: false },
      });
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;

      expect(boundFunc({ x: 10, y: 100 })).toEqual({ x: 0, y: 100 });
    });

    it('7.6 keeps y fixed after x-axis lock is established', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.absolutePosition({ x: 0, y: 0 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: true, altKey: false },
      });
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;
      boundFunc({ x: 100, y: 10 });

      expect(boundFunc({ x: 200, y: 200 })).toEqual({ x: 200, y: 0 });
    });

    it('7.7 keeps x fixed after y-axis lock is established', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.canDrag = () => true;
      group.stopDrag = vi.fn();
      group.absolutePosition({ x: 0, y: 0 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragstart', {
        target: group,
        evt: { button: 0, buttons: 1, shiftKey: true, altKey: false },
      });
      const boundFunc = group.getAttr('dragBoundFunc') as (
        pos: Konva.Vector2d
      ) => Konva.Vector2d;
      boundFunc({ x: 10, y: 100 });

      expect(boundFunc({ x: 200, y: 200 })).toEqual({ x: 0, y: 200 });
    });
  });

  describe('8 — dragend', () => {
    it('8.1 restores original position for clone origins and clears clone attrs', () => {
      const { node } = makeNode();
      const group = createGroup();
      group.absolutePosition({ x: 10, y: 10 });

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'mousedown', { target: group, evt: {} });
      group.absolutePosition({ x: 50, y: 50 });
      group.setAttrs({ isCloneOrigin: true, isCloned: true });
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(group.absolutePosition()).toEqual({ x: 10, y: 10 });
      expect(group.getAttrs().isCloneOrigin).toBeUndefined();
      expect(group.getAttrs().isCloned).toBeUndefined();
    });

    it('8.2 returns early when the node did not move', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(mock.emitEvent).not.toHaveBeenCalledWith('onDrag', null);
      expect(mock.stateTransactional).not.toHaveBeenCalled();
    });

    it('8.3 stops dragging and returns when erase tool is active', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      group.stopDrag = vi.fn();
      getPrivateNode(node).didMove = true;
      mock.getActiveAction.mockReturnValue('eraseTool');

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(group.stopDrag).toHaveBeenCalled();
      expect(mock.emitEvent).not.toHaveBeenCalledWith('onDrag', null);
    });

    it('8.4 runs a transactional move when dragging a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      getPrivateNode(node).didMove = true;
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(mock.stateTransactional).toHaveBeenCalled();
    });

    it('8.5 emits onNodeChangedContainer when the container changes', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      getPrivateNode(node).didMove = true;
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);
      mockMoveNodeToContainerNT.mockReturnValue(true);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(mock.emitEvent).toHaveBeenCalledWith(
        'onNodeChangedContainer',
        expect.objectContaining({ newNode: group })
      );
    });

    it('8.6 updates the node without transaction move when container does not change', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      getPrivateNode(node).didMove = true;
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);
      mockMoveNodeToContainerNT.mockReturnValue(false);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(mock.updateNodeNT).toHaveBeenCalled();
    });

    it('8.7 releases the mutex for a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(mock.releaseMutexLock).toHaveBeenCalled();
    });

    it('8.8 shows and updates selection halo for a single selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'dragend', {
        target: group,
        evt: {},
        cancelBubble: false,
      });

      expect(mock._feedbackPlugin.showSelectionHalo).toHaveBeenCalledWith(group);
      expect(mock._feedbackPlugin.updateSelectionHalo).toHaveBeenCalledWith(group);
    });
  });

  describe('9 — onSelectionState listener', () => {
    it('9.1 stores original position when selection is being cleared for a selected node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      const getAbsolutePositionSpy = vi.spyOn(group, 'getAbsolutePosition');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      const listener = getAddedListener(mock, 'onSelectionState');
      listener?.(false);

      expect(getAbsolutePositionSpy).toHaveBeenCalled();
    });

    it('9.2 does not store original position when state is true', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      const getAbsolutePositionSpy = vi.spyOn(group, 'getAbsolutePosition');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      node.setupDefaultNodeEvents(group);
      const listener = getAddedListener(mock, 'onSelectionState');
      listener?.(true);

      expect(getAbsolutePositionSpy).not.toHaveBeenCalled();
    });

    it('9.3 does not store original position for non-selected nodes', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      const other = createGroup({ id: 'other-id' });
      const getAbsolutePositionSpy = vi.spyOn(group, 'getAbsolutePosition');
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([other]);

      node.setupDefaultNodeEvents(group);
      const listener = getAddedListener(mock, 'onSelectionState');
      listener?.(false);

      expect(getAbsolutePositionSpy).not.toHaveBeenCalled();
    });
  });

  describe('10 — mousedown', () => {
    it('10.1 captures the original position on mousedown', () => {
      const { node } = makeNode();
      const group = createGroup();
      const getAbsolutePositionSpy = vi.spyOn(group, 'getAbsolutePosition');

      node.setupDefaultNodeEvents(group);
      fireKonvaEvent(group, 'mousedown', { target: group, evt: {} });

      expect(getAbsolutePositionSpy).toHaveBeenCalled();
    });
  });

  describe('11 — handleSelectNode and handleDeselectNode', () => {
    it('11.1 handleSelectNode does not throw without a transformer', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.getTransformer.mockReturnValue(undefined);

      node.setupDefaultNodeEvents(group);

      expect(() => group.handleSelectNode()).not.toThrow();
    });

    it('11.2 handleSelectNode creates halo when multiple nodes are transformed', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._transformer.nodes.mockReturnValue([new Konva.Group(), new Konva.Group()]);

      node.setupDefaultNodeEvents(group);
      group.handleSelectNode();

      expect(mock._feedbackPlugin.createSelectionHalo).toHaveBeenCalledWith(group);
    });

    it('11.3 handleSelectNode skips halo creation for a single node', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._transformer.nodes.mockReturnValue([new Konva.Group()]);

      node.setupDefaultNodeEvents(group);
      group.handleSelectNode();

      expect(mock._feedbackPlugin.createSelectionHalo).not.toHaveBeenCalled();
    });

    it('11.4 handleDeselectNode destroys the halo', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      group.handleDeselectNode();

      expect(mock._feedbackPlugin.destroySelectionHalo).toHaveBeenCalledWith(group);
    });
  });

  describe('12 — pointerover and pointerleave', () => {
    it('12.1 pointerover calls handleMouseover on the real node target', () => {
      const { node } = makeNode();
      const group = createGroup();
      const handleMouseover = vi.fn();

      node.setupDefaultNodeEvents(group);
      group.handleMouseover = handleMouseover;
      fireKonvaEvent(group, 'pointerover', {
        target: group,
        evt: { ctrlKey: false, metaKey: false },
      });

      expect(handleMouseover).toHaveBeenCalled();
    });

    it('12.2 pointerover cancels bubbling when handleMouseOver returns true', () => {
      const { node } = makeNode();
      const group = createGroup();
      const event = {
        target: group,
        evt: { ctrlKey: false, metaKey: false },
        cancelBubble: false,
      } as unknown as KonvaEventObject<MouseEvent, Konva.Node>;
      const handleMouseOverSpy = vi.spyOn(node, 'handleMouseOver').mockReturnValue(true);

      node.setupDefaultNodeEvents(group);
      group.fire('pointerover', event);

      expect(handleMouseOverSpy).toHaveBeenCalled();
      expect(event.cancelBubble).toBe(true);
    });

    it('12.3 pointerleave calls handleMouseout on the real node target', () => {
      const { node } = makeNode();
      const group = createGroup();
      const handleMouseout = vi.fn();

      node.setupDefaultNodeEvents(group);
      group.handleMouseout = handleMouseout;
      fireKonvaEvent(group, 'pointerleave', {
        target: group,
        evt: { ctrlKey: false, metaKey: false },
      });

      expect(handleMouseout).toHaveBeenCalled();
    });
  });

  describe('13 — xChange and yChange', () => {
    it('13.1 reselects the node when it is selected and idle', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      group.handleSelectNode = vi.fn();
      group.handleDeselectNode = vi.fn();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      fireKonvaEvent(group, 'xChange');

      expect(group.handleDeselectNode).toHaveBeenCalled();
      expect(group.handleSelectNode).toHaveBeenCalled();
    });

    it('13.2 does nothing when the node is not selected', () => {
      const { node, mock } = makeNode();
      const group = createGroup();

      node.setupDefaultNodeEvents(group);
      group.handleSelectNode = vi.fn();
      group.handleDeselectNode = vi.fn();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([]);

      fireKonvaEvent(group, 'xChange');

      expect(group.handleDeselectNode).not.toHaveBeenCalled();
      expect(group.handleSelectNode).not.toHaveBeenCalled();
    });

    it('13.3 does nothing while selection plugin reports dragging', () => {
      const { node, mock } = makeNode();
      const group = createGroup();
      mock._selectionPlugin.isDragging.mockReturnValue(true);

      node.setupDefaultNodeEvents(group);
      group.handleSelectNode = vi.fn();
      group.handleDeselectNode = vi.fn();
      mock._selectionPlugin.getSelectedNodes.mockReturnValue([group]);

      fireKonvaEvent(group, 'yChange');

      expect(group.handleDeselectNode).not.toHaveBeenCalled();
      expect(group.handleSelectNode).not.toHaveBeenCalled();
    });
  });
});
