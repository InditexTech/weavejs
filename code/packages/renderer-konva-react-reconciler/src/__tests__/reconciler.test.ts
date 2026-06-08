// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import 'vitest-canvas-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { Weave } from '@inditextech/weave-sdk';
import { WeaveReactReconcilerReconciler } from '../reconciler';
import { DefaultEventPriority } from '../constants';

// ============================================================================
// Helpers
// ============================================================================

function makeHandler(nodeOverride?: Konva.Node) {
  const node = nodeOverride ?? new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
  return {
    onRender: vi.fn().mockReturnValue(node),
    onAdd: vi.fn(),
    onDestroy: vi.fn(),
    onUpdate: vi.fn(),
    _node: node,
  };
}

function makeMockWeave(handler?: ReturnType<typeof makeHandler> | null) {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const stageManager = { setStage: vi.fn() };
  return {
    getNodeHandler: vi.fn().mockReturnValue(handler ?? undefined),
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue(logger),
    getMainLogger: vi.fn().mockReturnValue({ info: vi.fn() }),
    getStageConfiguration: vi.fn().mockReturnValue({ container: 'cid', width: 800, height: 600 }),
    getStageManager: vi.fn().mockReturnValue(stageManager),
    _logger: logger,
    _stageManager: stageManager,
  };
}

let stageContainer: HTMLDivElement;
let mockWeave: ReturnType<typeof makeMockWeave>;
let reconciler: WeaveReactReconcilerReconciler;

beforeEach(() => {
  stageContainer = document.createElement('div');
  stageContainer.id = 'stage-container';
  document.body.appendChild(stageContainer);
  mockWeave = makeMockWeave();
  reconciler = new WeaveReactReconcilerReconciler(mockWeave as never);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ============================================================================
// Suite 1 — Constructor
// ============================================================================

describe('1 — Constructor', () => {
  it('1.1 creates a WeaveReactReconcilerReconciler instance', () => {
    expect(reconciler).toBeInstanceOf(WeaveReactReconcilerReconciler);
  });

  it('1.2 calls getChildLogger("reconciler") on the weave instance', () => {
    expect(mockWeave.getChildLogger).toHaveBeenCalledWith('reconciler');
  });
});

// ============================================================================
// Suite 2 — addNode
// ============================================================================

describe('2 — addNode', () => {
  it('2.1 both undefined → returns early, no event emitted', () => {
    reconciler.addNode(undefined, undefined);
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('2.2 parentInstance undefined → returns early', () => {
    const child = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    reconciler.addNode(undefined, child);
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('2.3 child undefined → returns early', () => {
    const parent = new Konva.Layer({ id: 'l1' });
    reconciler.addNode(parent, undefined);
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('2.4 no handler for nodeType → returns early, no event', () => {
    mockWeave.getNodeHandler.mockReturnValue(undefined);
    const parent = new Konva.Layer({ id: 'l1' });
    const child = new Konva.Rect({ id: 'c1', nodeType: 'unknown' });
    reconciler.addNode(parent, child);
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('2.5 Stage parent + Layer child (not ancestor) → adds layer, calls onAdd, emits event', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1', nodeType: 'layer' });
    reconciler.addNode(stage, layer);
    expect(layer.getParent()).toBe(stage);
    expect(handler.onAdd).toHaveBeenCalledWith(layer);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedAdded', layer);
    stage.destroy();
  });

  it('2.6 Stage parent + Layer child already ancestor → no add', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1', nodeType: 'layer' });
    vi.spyOn(layer, 'isAncestorOf').mockReturnValue(true);
    reconciler.addNode(stage, layer);
    expect(layer.getParent()).toBeNull();
    stage.destroy();
  });

  it('2.7 Layer parent (child not ancestor) → adds child, calls onAdd, emits event', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    reconciler.addNode(layer, rect);
    expect(rect.getParent()).toBe(layer);
    expect(handler.onAdd).toHaveBeenCalledWith(rect);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedAdded', rect);
    stage.destroy();
  });

  it('2.8 Layer parent (child already ancestor) → no add', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    vi.spyOn(rect, 'isAncestorOf').mockReturnValue(true);
    reconciler.addNode(layer, rect);
    expect(rect.getParent()).toBeNull();
    stage.destroy();
  });

  it('2.9 Group parent with containerId, realParent found (not ancestor) → adds to realParent', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const realParent = new Konva.Group({ id: 'real-container' });
    const wrapper = new Konva.Group({ id: 'wrapper', containerId: 'real-container', nodeType: 'group' });
    layer.add(wrapper);
    wrapper.add(realParent);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    reconciler.addNode(wrapper, rect);
    expect(rect.getParent()).toBe(realParent);
    expect(handler.onAdd).toHaveBeenCalledWith(rect);
    stage.destroy();
  });

  it('2.10 Group parent with containerId, findOne returns null → no add', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const wrapper = new Konva.Group({ id: 'wrapper', containerId: 'nonexistent', nodeType: 'group' });
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    reconciler.addNode(wrapper, rect);
    expect(handler.onAdd).not.toHaveBeenCalled();
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('2.11 Group parent without containerId (not ancestor) → adds directly, calls onAdd', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const group = new Konva.Group({ id: 'g1', nodeType: 'group' });
    layer.add(group);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    reconciler.addNode(group, rect);
    expect(rect.getParent()).toBe(group);
    expect(handler.onAdd).toHaveBeenCalledWith(rect);
    stage.destroy();
  });

  it('2.12 Group parent without containerId, child already ancestor → no add', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const group = new Konva.Group({ id: 'g1', nodeType: 'group' });
    layer.add(group);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    vi.spyOn(rect, 'isAncestorOf').mockReturnValue(true);
    reconciler.addNode(group, rect);
    expect(rect.getParent()).toBeNull();
    stage.destroy();
  });

  it('2.13 childInitialZIndex truthy → calls child.zIndex()', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const placeholder = new Konva.Rect({ id: 'p1' });
    layer.add(placeholder);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect', initialZIndex: 1 });
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    reconciler.addNode(layer, rect);
    expect(zIndexSpy).toHaveBeenCalledWith(1);
    stage.destroy();
  });

  it('2.14 childInitialZIndex falsy → zIndex NOT called', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    reconciler.addNode(layer, rect);
    expect(zIndexSpy).not.toHaveBeenCalled();
    stage.destroy();
  });

  it('2.15 nodeAdded true → emits onNodeRenderedAdded', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1', nodeType: 'layer' });
    reconciler.addNode(stage, layer);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedAdded', layer);
    stage.destroy();
  });

  it('2.16 nodeAdded false → does NOT emit event', () => {
    mockWeave.getNodeHandler.mockReturnValue(undefined);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    reconciler.addNode(stage, layer);
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
    stage.destroy();
  });
});

// ============================================================================
// Suite 3 — updateNode
// ============================================================================

describe('3 — updateNode', () => {
  it('3.1 prevProps equal nextProps → no-op', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const node = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    const props = { fill: 'red' };
    reconciler.updateNode(node, 'rect', props as never, props as never);
    expect(handler.onUpdate).not.toHaveBeenCalled();
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('3.2 props differ, no handler → early return', () => {
    mockWeave.getNodeHandler.mockReturnValue(undefined);
    const node = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    expect(() =>
      reconciler.updateNode(node, 'unknown', { fill: 'red' } as never, { fill: 'blue' } as never)
    ).not.toThrow();
  });

  it('3.3 props differ, handler found → calls onUpdate', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const node = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    reconciler.updateNode(node, 'rect', { fill: 'red' } as never, { fill: 'blue' } as never);
    expect(handler.onUpdate).toHaveBeenCalledWith(node, { fill: 'blue' });
  });

  it('3.4 nextProps.zIndex truthy → calls node.zIndex()', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    const rect2 = new Konva.Rect({ id: 'r2' });
    layer.add(rect);
    layer.add(rect2);
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    reconciler.updateNode(rect, 'rect', { fill: 'red' } as never, { fill: 'blue', zIndex: 1 } as never);
    expect(zIndexSpy).toHaveBeenCalledWith(1);
    stage.destroy();
  });

  it('3.5 nextProps.zIndex falsy → zIndex NOT called', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const node = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    const zIndexSpy = vi.spyOn(node, 'zIndex');
    reconciler.updateNode(node, 'rect', { fill: 'red' } as never, { fill: 'blue' } as never);
    expect(zIndexSpy).not.toHaveBeenCalled();
  });

  it('3.6 props differ → emits onNodeRenderedUpdated', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const node = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    reconciler.updateNode(node, 'rect', { fill: 'red' } as never, { fill: 'blue' } as never);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedUpdated', node);
  });
});

// ============================================================================
// Suite 4 — removeNode
// ============================================================================

describe('4 — removeNode', () => {
  it('4.1 emits onNodeRenderedRemoved with the node', () => {
    const node = new Konva.Rect({ id: 'r1' });
    reconciler.removeNode(node);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedRemoved', node);
  });
});

// ============================================================================
// Suites 5-12 — getConfig callbacks
// ============================================================================

describe('5 — getConfig simple/pass-through methods', () => {
  let cfg: ReturnType<typeof reconciler.getConfig>;

  beforeEach(() => {
    cfg = reconciler.getConfig();
  });

  it('5.1 getCurrentEventPriority returns DefaultEventPriority', () => {
    expect(cfg.getCurrentEventPriority()).toBe(DefaultEventPriority);
  });

  it('5.2 getInstanceFromNode logs debug and returns null', () => {
    expect(cfg.getInstanceFromNode({ id: 'x' })).toBeNull();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.3 beforeActiveInstanceBlur logs debug', () => {
    expect(() => cfg.beforeActiveInstanceBlur()).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.4 afterActiveInstanceBlur logs debug', () => {
    expect(() => cfg.afterActiveInstanceBlur()).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.5 prepareScopeUpdate logs debug', () => {
    expect(() => cfg.prepareScopeUpdate({}, {})).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.6 getInstanceFromScope logs debug and returns null', () => {
    expect(cfg.getInstanceFromScope({})).toBeNull();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.7 getRootHostContext returns the container', () => {
    const container = mockWeave as never;
    expect(cfg.getRootHostContext(container)).toBe(container);
  });

  it('5.8 prepareForCommit returns null', () => {
    expect(cfg.prepareForCommit(mockWeave as never)).toBeNull();
  });

  it('5.9 scheduleTimeout calls setTimeout and returns an id', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const id = cfg.scheduleTimeout(fn, 100);
    expect(id).toBeDefined();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalled();
  });

  it('5.10 cancelTimeout with a valid id calls clearTimeout', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const id = cfg.scheduleTimeout(fn, 1000);
    cfg.cancelTimeout(id);
    vi.runAllTimers();
    expect(fn).not.toHaveBeenCalled();
  });

  it('5.11 cancelTimeout with undefined does not throw', () => {
    expect(() => cfg.cancelTimeout(undefined)).not.toThrow();
  });

  it('5.12 preparePortalMount logs debug', () => {
    expect(() => cfg.preparePortalMount(mockWeave as never)).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.13 resetAfterCommit logs debug', () => {
    expect(() => cfg.resetAfterCommit(mockWeave as never)).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.14 createTextInstance logs debug and returns null', () => {
    expect(cfg.createTextInstance('hello', mockWeave as never, mockWeave as never)).toBeNull();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.15 getChildHostContext returns parentHostContext', () => {
    const parent = mockWeave as never;
    expect(cfg.getChildHostContext(parent, 'rect', mockWeave as never)).toBe(parent);
  });

  it('5.16 shouldSetTextContent returns false', () => {
    expect(cfg.shouldSetTextContent('rect', {} as never)).toBe(false);
  });

  it('5.17 detachDeletedInstance logs debug', () => {
    const node = new Konva.Rect({ id: 'r1' });
    expect(() => cfg.detachDeletedInstance(node)).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.18 getPublicInstance returns the instance', () => {
    const node = new Konva.Rect({ id: 'r1' });
    expect(cfg.getPublicInstance(node)).toBe(node);
  });

  it('5.19 finalizeInitialChildren returns false', () => {
    expect(cfg.finalizeInitialChildren()).toBe(false);
  });

  it('5.20 prepareUpdate returns an empty object', () => {
    const node = new Konva.Rect({ id: 'r1' });
    expect(cfg.prepareUpdate(node, 'rect', {}, {}, mockWeave as never, mockWeave as never)).toEqual({});
  });

  it('5.21 clearContainer logs debug', () => {
    expect(() => cfg.clearContainer(mockWeave as never)).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.22 setCurrentUpdatePriority logs debug', () => {
    expect(() => cfg.setCurrentUpdatePriority()).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.23 getCurrentUpdatePriority returns 1', () => {
    expect(cfg.getCurrentUpdatePriority()).toBe(1);
  });

  it('5.24 resolveUpdatePriority returns 1', () => {
    expect(cfg.resolveUpdatePriority()).toBe(1);
  });

  it('5.25 maySuspendCommit logs debug', () => {
    expect(() => cfg.maySuspendCommit()).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });

  it('5.26 removeChildFromContainer logs debug', () => {
    expect(() => cfg.removeChildFromContainer()).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 6 — getConfig.createInstance
// ============================================================================

describe('6 — getConfig.createInstance', () => {
  it('6.1 no handler → returns undefined', () => {
    mockWeave.getNodeHandler.mockReturnValue(undefined);
    const cfg = reconciler.getConfig();
    const result = cfg.createInstance('unknown', {}, mockWeave as never, mockWeave as never);
    expect(result).toBeUndefined();
  });

  it('6.2 strips zIndex and maps to initialZIndex', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    cfg.createInstance('rect', { zIndex: 3, fill: 'red' } as never, mockWeave as never, mockWeave as never);
    const calledProps = handler.onRender.mock.calls[0][0];
    expect(calledProps.initialZIndex).toBe(3);
    expect(calledProps).not.toHaveProperty('zIndex');
  });

  it('6.3 type === "stage" injects container, width, height', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    cfg.createInstance('stage', {}, mockWeave as never, mockWeave as never);
    expect(handler.onRender).toHaveBeenCalledWith(
      expect.objectContaining({ container: 'cid', width: 800, height: 600 })
    );
  });

  it('6.4 non-stage type does NOT inject stage config', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    cfg.createInstance('layer', {}, mockWeave as never, mockWeave as never);
    const calledProps = handler.onRender.mock.calls[0][0];
    expect(calledProps).not.toHaveProperty('container');
    expect(calledProps).not.toHaveProperty('width');
    expect(calledProps).not.toHaveProperty('height');
  });

  it('6.5 emits onNodeRenderedAdded via hostContext.emitEvent', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    cfg.createInstance('rect', {}, mockWeave as never, mockWeave as never);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedAdded', handler._node);
  });

  it('6.6 returns element from handler.onRender', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const result = cfg.createInstance('rect', {}, mockWeave as never, mockWeave as never);
    expect(result).toBe(handler._node);
  });
});

// ============================================================================
// Suite 7 — getConfig.appendChildToContainer
// ============================================================================

describe('7 — getConfig.appendChildToContainer', () => {
  it('7.1 child is Konva.Stage → calls container.getStageManager().setStage(child)', () => {
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    cfg.appendChildToContainer(mockWeave as never, stage);
    expect(mockWeave._stageManager.setStage).toHaveBeenCalledWith(stage);
    stage.destroy();
  });

  it('7.2 child is NOT Konva.Stage → setStage NOT called', () => {
    const cfg = reconciler.getConfig();
    const layer = new Konva.Layer({ id: 'l1' });
    cfg.appendChildToContainer(mockWeave as never, layer);
    expect(mockWeave._stageManager.setStage).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 8 — getConfig.appendInitialChild
// ============================================================================

describe('8 — getConfig.appendInitialChild', () => {
  it('8.1 delegates to addNode (Stage + Layer → layer added)', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1', nodeType: 'layer' });
    cfg.appendInitialChild(stage, layer);
    expect(layer.getParent()).toBe(stage);
    stage.destroy();
  });
});

// ============================================================================
// Suite 9 — getConfig.insertInContainerBefore
// ============================================================================

describe('9 — getConfig.insertInContainerBefore', () => {
  it('9.1 is a no-op (just logs)', () => {
    const cfg = reconciler.getConfig();
    const layer = new Konva.Layer({ id: 'l1' });
    expect(() => cfg.insertInContainerBefore(mockWeave as never, layer)).not.toThrow();
    expect(mockWeave._logger.debug).toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 10 — getConfig.insertBefore
// ============================================================================

describe('10 — getConfig.insertBefore', () => {
  it('10.1 child.getParent() !== parentInstance → calls addNode', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    const beforeRect = new Konva.Rect({ id: 'c2' });
    layer.add(beforeRect);
    cfg.insertBefore(layer, rect, beforeRect);
    expect(rect.getParent()).toBe(layer);
    stage.destroy();
  });

  it('10.2 child.getParent() === parentInstance → addNode NOT called again', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    const beforeRect = new Konva.Rect({ id: 'c2' });
    layer.add(rect);
    layer.add(beforeRect);
    handler.onAdd.mockClear();
    cfg.insertBefore(layer, rect, beforeRect);
    // addNode should NOT be called since parent is already set
    expect(handler.onAdd).not.toHaveBeenCalled();
    stage.destroy();
  });

  it('10.3 parentInstance is Konva.Layer → calls child.setZIndex(toIndex)', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const rect1 = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    const rect2 = new Konva.Rect({ id: 'c2' });
    layer.add(rect2);
    const setZIndexSpy = vi.spyOn(rect1, 'setZIndex');
    cfg.insertBefore(layer, rect1, rect2);
    expect(setZIndexSpy).toHaveBeenCalled();
    stage.destroy();
  });

  it('10.4 parentInstance is Konva.Group → calls child.setZIndex(toIndex)', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1' });
    stage.add(layer);
    const group = new Konva.Group({ id: 'g1', nodeType: 'group' });
    layer.add(group);
    const rect1 = new Konva.Rect({ id: 'c1', nodeType: 'rect' });
    const rect2 = new Konva.Rect({ id: 'c2' });
    group.add(rect2);
    const setZIndexSpy = vi.spyOn(rect1, 'setZIndex');
    cfg.insertBefore(group, rect1, rect2);
    expect(setZIndexSpy).toHaveBeenCalled();
    stage.destroy();
  });

  it('10.5 parentInstance is neither Layer nor Group → setZIndex NOT called', () => {
    const cfg = reconciler.getConfig();
    // Use a Konva.Stage as parent — not Layer or Group
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer1 = new Konva.Layer({ id: 'l1', nodeType: 'layer' });
    const layer2 = new Konva.Layer({ id: 'l2' });
    stage.add(layer2);
    const setZIndexSpy = vi.spyOn(layer1, 'setZIndex');
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    cfg.insertBefore(stage, layer1, layer2);
    expect(setZIndexSpy).not.toHaveBeenCalled();
    stage.destroy();
  });
});

// ============================================================================
// Suite 11 — getConfig.appendChild
// ============================================================================

describe('11 — getConfig.appendChild', () => {
  it('11.1 delegates to addNode', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'l1', nodeType: 'layer' });
    cfg.appendChild(stage, layer);
    expect(layer.getParent()).toBe(stage);
    stage.destroy();
  });
});

// ============================================================================
// Suite 12 — getConfig.commitUpdate
// ============================================================================

describe('12 — getConfig.commitUpdate', () => {
  it('12.1 instance instanceof Weave → early return, no updateNode', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const fakeWeave = Object.create(Weave.prototype) as Weave;
    cfg.commitUpdate(fakeWeave as never, {}, 'rect', { fill: 'red' } as never, { fill: 'blue' } as never);
    expect(handler.onUpdate).not.toHaveBeenCalled();
  });

  it('12.2 instance not Weave → calls updateNode', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const node = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    cfg.commitUpdate(node, {}, 'rect', { fill: 'red' } as never, { fill: 'blue' } as never);
    expect(handler.onUpdate).toHaveBeenCalledWith(node, { fill: 'blue' });
  });
});

// ============================================================================
// Suite 13 — getConfig.removeChild
// ============================================================================

describe('13 — getConfig.removeChild', () => {
  it('13.1 no handler → early return, no onDestroy, no event', () => {
    mockWeave.getNodeHandler.mockReturnValue(undefined);
    const cfg = reconciler.getConfig();
    const parent = new Konva.Layer({ id: 'l1' });
    const child = new Konva.Rect({ id: 'r1', nodeType: 'unknown' });
    expect(() => cfg.removeChild(parent, child)).not.toThrow();
    expect(mockWeave.emitEvent).not.toHaveBeenCalled();
  });

  it('13.2 handler found → calls handler.onDestroy(child)', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const parent = new Konva.Layer({ id: 'l1' });
    const child = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    cfg.removeChild(parent, child);
    expect(handler.onDestroy).toHaveBeenCalledWith(child);
  });

  it('13.3 handler found → emits onNodeRenderedRemoved', () => {
    const handler = makeHandler();
    mockWeave.getNodeHandler.mockReturnValue(handler);
    const cfg = reconciler.getConfig();
    const parent = new Konva.Layer({ id: 'l1' });
    const child = new Konva.Rect({ id: 'r1', nodeType: 'rect' });
    cfg.removeChild(parent, child);
    expect(mockWeave.emitEvent).toHaveBeenCalledWith('onNodeRenderedRemoved', child);
  });
});
