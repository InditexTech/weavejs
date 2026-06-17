// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { describe, expect, it, vi } from 'vitest';
import { Weave } from '@/weave';

vi.mock('@/managers/setup');
vi.mock('@/managers/register');
vi.mock('@/managers/store');
vi.mock('@/managers/state');
vi.mock('@/managers/stage');
vi.mock('@/managers/groups');
vi.mock('@/managers/targeting');
vi.mock('@/managers/cloning');
vi.mock('@/managers/fonts');
vi.mock('@/managers/zindex');
vi.mock('@/managers/export/export');
vi.mock('@/managers/actions');
vi.mock('@/managers/plugins');
vi.mock('@/managers/users/users');
vi.mock('@/managers/mutex/mutex');
vi.mock('@/managers/async/async');
vi.mock('@/managers/hooks');
vi.mock('@/managers/drag-and-drop');
vi.mock('@/nodes/node', () => ({
  augmentKonvaNodeClass: vi.fn(),
  WeaveNode: class {},
}));
vi.mock('@/utils/utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...original,
    getBoundingBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
    getExportBoundingBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
  };
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeWeave() {
  const renderer = { register: vi.fn(), init: vi.fn(), render: vi.fn() };
  const doc = {
    destroy: vi.fn(),
    getMap: vi.fn().mockReturnValue({ toJSON: vi.fn().mockReturnValue({}) }),
  };
  const store = {
    setup: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getDocument: vi.fn().mockReturnValue(doc),
    getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    setState: vi.fn(),
  };
  const stage = { findOne: vi.fn().mockReturnValue(null), destroy: vi.fn() };

  const weave = new Weave(
    { store: store as any, renderer: renderer as any },
    { container: 'c', width: 100, height: 100 }
  );

  (weave as any).storeManager.getStore.mockReturnValue(store);
  (weave as any).stageManager.getStage.mockReturnValue(stage);
  (weave as any).stageManager.getConfiguration.mockReturnValue({ container: 'c', width: 100, height: 100 });
  (weave as any).stateManager.getElementsTree.mockReturnValue([]);
  (weave as any).registerManager.getNodeHandler.mockReturnValue(undefined);

  return { weave, store, stage };
}

// ---------------------------------------------------------------------------
// Suite 14 — Stage proxy methods
// ---------------------------------------------------------------------------

describe('Weave — stage proxy methods', () => {
  it('getStageManager() returns the stageManager instance', () => {
    const { weave } = makeWeave();
    expect(weave.getStageManager()).toBe((weave as any).stageManager);
  });

  it('getStage() delegates to stageManager.getStage()', () => {
    const { weave, stage } = makeWeave();
    expect(weave.getStage()).toBe(stage);
    expect((weave as any).stageManager.getStage).toHaveBeenCalled();
  });

  it('getMainLayer() delegates to stageManager.getMainLayer()', () => {
    const { weave } = makeWeave();
    const layer = { id: 'main' };
    (weave as any).stageManager.getMainLayer.mockReturnValue(layer);
    expect(weave.getMainLayer()).toBe(layer);
  });

  it('getSelectionLayer() delegates to stageManager.getSelectionLayer()', () => {
    const { weave } = makeWeave();
    const layer = { id: 'selection' };
    (weave as any).stageManager.getSelectionLayer.mockReturnValue(layer);
    expect(weave.getSelectionLayer()).toBe(layer);
  });

  it('getCommentsLayer() delegates to stageManager.getCommentsLayer()', () => {
    const { weave } = makeWeave();
    const layer = { id: 'comments' };
    (weave as any).stageManager.getCommentsLayer.mockReturnValue(layer);
    expect(weave.getCommentsLayer()).toBe(layer);
  });

  it('getGridLayer() delegates to stageManager.getGridLayer()', () => {
    const { weave } = makeWeave();
    const layer = { id: 'grid' };
    (weave as any).stageManager.getGridLayer.mockReturnValue(layer);
    expect(weave.getGridLayer()).toBe(layer);
  });

  it('getUtilityLayer() delegates to stageManager.getUtilityLayer()', () => {
    const { weave } = makeWeave();
    const layer = { id: 'utility' };
    (weave as any).stageManager.getUtilityLayer.mockReturnValue(layer);
    expect(weave.getUtilityLayer()).toBe(layer);
  });

  it('setStage(stage) delegates to stageManager.setStage()', () => {
    const { weave } = makeWeave();
    const newStage = {} as any;
    weave.setStage(newStage);
    expect((weave as any).stageManager.setStage).toHaveBeenCalledWith(newStage);
  });

  it('getStageConfiguration() delegates to stageManager.getConfiguration()', () => {
    const { weave } = makeWeave();
    const config = { container: 'c', width: 100, height: 100 };
    (weave as any).stageManager.getConfiguration.mockReturnValue(config);
    expect(weave.getStageConfiguration()).toBe(config);
  });

  it('getInstanceRecursive() delegates to stageManager.getInstanceRecursive()', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    const result = {} as any;
    (weave as any).stageManager.getInstanceRecursive.mockReturnValue(result);
    expect(weave.getInstanceRecursive(node, ['Group'], 'group-123')).toBe(result);
    expect((weave as any).stageManager.getInstanceRecursive).toHaveBeenCalledWith(node, ['Group'], 'group-123');
  });

  it('getContainerNodes() delegates to stageManager.getContainerNodes()', () => {
    const { weave } = makeWeave();
    const nodes = [{}] as any;
    (weave as any).stageManager.getContainerNodes.mockReturnValue(nodes);
    expect(weave.getContainerNodes()).toBe(nodes);
  });
});

// ---------------------------------------------------------------------------
// Suite 15 — getClosestParentWithWeaveId()
// ---------------------------------------------------------------------------

describe('Weave — getClosestParentWithWeaveId()', () => {
  it('uses HTMLElement.id when container is an HTMLElement', () => {
    const { weave } = makeWeave();
    const containerEl = document.createElement('div');
    containerEl.id = 'weave-container';
    (weave as any).stageManager.getConfiguration.mockReturnValue({ container: containerEl });

    const target = document.createElement('div');
    containerEl.appendChild(target);

    const result = weave.getClosestParentWithWeaveId(target as any);
    expect(result).toBe(containerEl);
  });

  it('uses string directly when container is a string id', () => {
    const { weave } = makeWeave();
    (weave as any).stageManager.getConfiguration.mockReturnValue({ container: 'myid' });

    const containerEl = document.createElement('div');
    containerEl.id = 'myid';
    document.body.appendChild(containerEl);

    const target = document.createElement('div');
    containerEl.appendChild(target);

    const result = weave.getClosestParentWithWeaveId(target as any);
    expect(result).toBe(containerEl);

    document.body.removeChild(containerEl);
  });

  it('traverses ancestors until matching id is found', () => {
    const { weave } = makeWeave();
    const containerEl = document.createElement('div');
    containerEl.id = 'root';
    (weave as any).stageManager.getConfiguration.mockReturnValue({ container: containerEl });

    const middle = document.createElement('div');
    const target = document.createElement('div');
    containerEl.appendChild(middle);
    middle.appendChild(target);

    const result = weave.getClosestParentWithWeaveId(target as any);
    expect(result).toBe(containerEl);
  });

  it('returns null when no ancestor matches weave container id', () => {
    const { weave } = makeWeave();
    (weave as any).stageManager.getConfiguration.mockReturnValue({ container: 'no-match-id' });

    const orphan = document.createElement('div');
    orphan.id = 'different-id';

    const result = weave.getClosestParentWithWeaveId(orphan as any);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 28 — Container / parent resolution
// ---------------------------------------------------------------------------

describe('Weave — container and parent resolution', () => {
  it('getContainerByNodeId returns parentId when nodeParent is found', () => {
    const { weave, stage } = makeWeave();
    const container = {
      getAttrs: vi.fn().mockReturnValue({ id: 'container-1', nodeId: undefined }),
      getParent: vi.fn().mockReturnValue(null),
    };
    const nodeParent = {
      getAttrs: vi.fn().mockReturnValue({}),
      getParent: vi.fn().mockReturnValue(container),
    };
    stage.findOne.mockReturnValue(nodeParent);
    const result = weave.getContainerByNodeId('node-1');
    expect(result).toBe('container-1');
  });

  it('getContainerByNodeId returns undefined when node not found', () => {
    const { weave, stage } = makeWeave();
    stage.findOne.mockReturnValue(null);
    const result = weave.getContainerByNodeId('missing-node');
    expect(result).toBeUndefined();
  });

  it('getNodeContainerId returns direct parent id when nodeId attr is undefined', () => {
    const { weave } = makeWeave();
    const node = {
      getParent: vi.fn().mockReturnValue({
        getAttrs: vi.fn().mockReturnValue({ id: 'parent-id', nodeId: undefined }),
      }),
    };
    const result = weave.getNodeContainerId(node as any);
    expect(result).toBe('parent-id');
  });

  it('getNodeContainerId uses realContainer when nodeId attr is defined', () => {
    const { weave, stage } = makeWeave();
    const realContainer = { getAttrs: vi.fn().mockReturnValue({ id: 'real-container-id' }) };
    stage.findOne.mockReturnValue(realContainer);
    const node = {
      getParent: vi.fn().mockReturnValue({
        getAttrs: vi.fn().mockReturnValue({ id: 'proxy-id', nodeId: 'real-id' }),
      }),
    };
    const result = weave.getNodeContainerId(node as any);
    expect(result).toBe('real-container-id');
  });

  it('getNodeContainer returns direct parent when nodeId attr is undefined', () => {
    const { weave } = makeWeave();
    const parent = { getAttrs: vi.fn().mockReturnValue({ nodeId: undefined }) };
    const node = { getParent: vi.fn().mockReturnValue(parent) };
    const result = weave.getNodeContainer(node as any);
    expect(result).toBe(parent);
  });

  it('getNodeContainer uses realContainer when nodeId attr is defined', () => {
    const { weave, stage } = makeWeave();
    const realContainer = { getAttrs: vi.fn().mockReturnValue({ id: 'real-id' }) };
    stage.findOne.mockReturnValue(realContainer);
    const node = {
      getParent: vi.fn().mockReturnValue({
        getAttrs: vi.fn().mockReturnValue({ nodeId: 'target-id' }),
      }),
    };
    const result = weave.getNodeContainer(node as any);
    expect(result).toBe(realContainer);
  });
});

// ---------------------------------------------------------------------------
// Suite 29 — getBoundingBox()
// ---------------------------------------------------------------------------

describe('Weave — getBoundingBox()', () => {
  it('delegates to the imported getBoundingBox utility', async () => {
    const { weave } = makeWeave();
    const { getBoundingBox } = await import('@/utils/utils');
    const nodes = [{}, {}] as any;
    const config = { skipTransform: true };
    weave.getBoundingBox(nodes, config);
    expect(getBoundingBox).toHaveBeenCalledWith(nodes, config);
  });
});

// ---------------------------------------------------------------------------
// Suite 30 — Z-index proxies
// ---------------------------------------------------------------------------

describe('Weave — z-index proxy methods', () => {
  it('moveUp() delegates to zIndexManager.moveUp()', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    weave.moveUp(node);
    expect((weave as any).zIndexManager.moveUp).toHaveBeenCalledWith(node);
  });

  it('moveDown() delegates to zIndexManager.moveDown()', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    weave.moveDown(node);
    expect((weave as any).zIndexManager.moveDown).toHaveBeenCalledWith(node);
  });

  it('sendToBack() delegates to zIndexManager.sendToBack()', () => {
    const { weave } = makeWeave();
    const nodes = [{}, {}] as any;
    weave.sendToBack(nodes);
    expect((weave as any).zIndexManager.sendToBack).toHaveBeenCalledWith(nodes);
  });

  it('bringToFront() delegates to zIndexManager.bringToFront()', () => {
    const { weave } = makeWeave();
    const nodes = [{}, {}] as any;
    weave.bringToFront(nodes);
    expect((weave as any).zIndexManager.bringToFront).toHaveBeenCalledWith(nodes);
  });
});

// ---------------------------------------------------------------------------
// Suite 31 — Group proxies
// ---------------------------------------------------------------------------

describe('Weave — group proxy methods', () => {
  it('group() delegates to groupsManager.group()', () => {
    const { weave } = makeWeave();
    const nodes = [{}] as any;
    weave.group(nodes);
    expect((weave as any).groupsManager.group).toHaveBeenCalledWith(nodes);
  });

  it('unGroup() delegates to groupsManager.unGroup()', () => {
    const { weave } = makeWeave();
    const group = {} as any;
    weave.unGroup(group);
    expect((weave as any).groupsManager.unGroup).toHaveBeenCalledWith(group);
  });
});

// ---------------------------------------------------------------------------
// Suite 32 — Targeting proxies
// ---------------------------------------------------------------------------

describe('Weave — targeting proxy methods', () => {
  it('getTargetingManager() returns the targeting manager', () => {
    const { weave } = makeWeave();
    expect(weave.getTargetingManager()).toBe((weave as any).targetingManager);
  });

  it('resolveNode() delegates to targetingManager.resolveNode()', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    const resolved = { id: 'resolved' } as any;
    (weave as any).targetingManager.resolveNode.mockReturnValue(resolved);
    expect(weave.resolveNode(node)).toBe(resolved);
    expect((weave as any).targetingManager.resolveNode).toHaveBeenCalledWith(node);
  });

  it('resolveNode() returns undefined when resolveNode returns falsy', () => {
    const { weave } = makeWeave();
    (weave as any).targetingManager.resolveNode.mockReturnValue(null);
    expect(weave.resolveNode({} as any)).toBeUndefined();
  });

  it('pointIntersectsElement() delegates to targetingManager', () => {
    const { weave } = makeWeave();
    const point = { x: 0, y: 0 };
    const result = {} as any;
    (weave as any).targetingManager.pointIntersectsElement.mockReturnValue(result);
    expect(weave.pointIntersectsElement(point)).toBe(result);
  });

  it('nodeIntersectsContainerElement() delegates to targetingManager', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    const layer = {} as any;
    const result = {} as any;
    (weave as any).targetingManager.nodeIntersectsContainerElement.mockReturnValue(result);
    expect(weave.nodeIntersectsContainerElement(node, layer)).toBe(result);
  });

  it('getMousePointer() delegates to targetingManager', () => {
    const { weave } = makeWeave();
    const point = { x: 1, y: 2 };
    const result = {} as any;
    (weave as any).targetingManager.getMousePointer.mockReturnValue(result);
    expect(weave.getMousePointer(point)).toBe(result);
  });

  it('getMousePointerRelativeToContainer() delegates to targetingManager', () => {
    const { weave } = makeWeave();
    const container = {} as any;
    const result = {} as any;
    (weave as any).targetingManager.getMousePointerRelativeToContainer.mockReturnValue(result);
    expect(weave.getMousePointerRelativeToContainer(container)).toBe(result);
  });

  it('getRealSelectedNode delegates to targetingManager.getRealSelectedNode()', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    const result = {} as any;
    const tm = (weave as any).targetingManager;
    // getRealSelectedNode may be a class property arrow fn — ensure it exists as a spy
    if (!tm.getRealSelectedNode) {
      tm.getRealSelectedNode = vi.fn();
    }
    tm.getRealSelectedNode.mockReturnValue(result);
    expect(weave.getRealSelectedNode(node)).toBe(result);
    expect(tm.getRealSelectedNode).toHaveBeenCalledWith(node);
  });
});

// ---------------------------------------------------------------------------
// Suite 34 — Cloning proxies
// ---------------------------------------------------------------------------

describe('Weave — cloning proxy methods', () => {
  it('getCloningManager() returns the cloning manager', () => {
    const { weave } = makeWeave();
    expect(weave.getCloningManager()).toBe((weave as any).cloningManager);
  });

  it('nodesToGroupSerialized() delegates to cloningManager', () => {
    const { weave } = makeWeave();
    const instances = [{}, {}] as any;
    const result = {} as any;
    (weave as any).cloningManager.nodesToGroupSerialized.mockReturnValue(result);
    expect(weave.nodesToGroupSerialized(instances)).toBe(result);
  });
});

// ---------------------------------------------------------------------------
// Suite 35 — Fonts proxy
// ---------------------------------------------------------------------------

describe('Weave — fonts proxy', () => {
  it('getFonts() delegates to fontsManager.getFonts()', () => {
    const { weave } = makeWeave();
    const fonts = [{ name: 'Roboto', url: 'https://example.com/roboto.woff2' }];
    (weave as any).fontsManager.getFonts.mockReturnValue(fonts);
    expect(weave.getFonts()).toBe(fonts);
  });
});
