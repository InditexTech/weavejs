// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import 'vitest-canvas-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { Weave } from '@inditextech/weave-sdk';
import { SIMPLE_RECONCILER } from '../reconciler';

// ============================================================================
// Helpers
// ============================================================================

function makeHandler(node?: Konva.Node) {
  const _node = node ?? new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
  return {
    onRender: vi.fn().mockReturnValue(_node),
    onAdd: vi.fn(),
    onDestroy: vi.fn(),
    onUpdate: vi.fn(),
    _node,
  };
}

function makeMockWeave(handler?: ReturnType<typeof makeHandler> | null) {
  const stageManager = { setStage: vi.fn() };
  return {
    getNodeHandler: vi.fn().mockReturnValue(handler ?? undefined),
    emitEvent: vi.fn(),
    getStageConfiguration: vi.fn().mockReturnValue({
      container: 'container-id',
      width: 800,
      height: 600,
    }),
    getStageManager: vi.fn().mockReturnValue(stageManager),
    _stageManager: stageManager,
  };
}

let stageContainer: HTMLDivElement;

beforeEach(() => {
  stageContainer = document.createElement('div');
  stageContainer.id = 'stage-container';
  document.body.appendChild(stageContainer);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

// ============================================================================
// Suite 1 — createInstance
// ============================================================================

describe('1 — SIMPLE_RECONCILER.createInstance', () => {
  it('1.1 returns undefined when no handler is registered for the type', () => {
    const instance = makeMockWeave(null);
    const result = SIMPLE_RECONCILER.createInstance(instance as never, 'unknown', {});
    expect(result).toBeUndefined();
  });

  it('1.2 strips zIndex and maps it to initialZIndex in the rendered props', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    SIMPLE_RECONCILER.createInstance(instance as never, 'rect', { zIndex: 3, fill: 'red' } as never);
    const calledProps = handler.onRender.mock.calls[0][0];
    expect(calledProps.initialZIndex).toBe(3);
    expect(calledProps.fill).toBe('red');
    expect(calledProps).not.toHaveProperty('zIndex');
  });

  it('1.3 injects container/width/height for stage type', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    SIMPLE_RECONCILER.createInstance(instance as never, 'stage', {});
    expect(handler.onRender).toHaveBeenCalledWith(
      expect.objectContaining({ container: 'container-id', width: 800, height: 600 })
    );
  });

  it('1.4 does NOT inject stage configuration for non-stage types', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    SIMPLE_RECONCILER.createInstance(instance as never, 'layer', {});
    const calledProps = handler.onRender.mock.calls[0][0];
    expect(calledProps).not.toHaveProperty('container');
    expect(calledProps).not.toHaveProperty('width');
    expect(calledProps).not.toHaveProperty('height');
  });

  it('1.5 emits onNodeRenderedAdded with the created element', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    SIMPLE_RECONCILER.createInstance(instance as never, 'rect', {});
    expect(instance.emitEvent).toHaveBeenCalledWith('onNodeRenderedAdded', handler._node);
  });

  it('1.6 returns the element from handler.onRender', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const result = SIMPLE_RECONCILER.createInstance(instance as never, 'rect', {});
    expect(result).toBe(handler._node);
  });
});

// ============================================================================
// Suite 2 — createRoot
// ============================================================================

describe('2 — SIMPLE_RECONCILER.createRoot', () => {
  it('2.1 calls setStage when child is a Konva.Stage', () => {
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const instance = makeMockWeave();
    SIMPLE_RECONCILER.createRoot(instance as never, stage);
    expect(instance._stageManager.setStage).toHaveBeenCalledWith(stage);
    stage.destroy();
  });

  it('2.2 does NOT call setStage when child is not a Konva.Stage', () => {
    const layer = new Konva.Layer({ id: 'layer1' });
    const instance = makeMockWeave();
    SIMPLE_RECONCILER.createRoot(instance as never, layer);
    expect(instance._stageManager.setStage).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 3 — appendChildToContainer
// ============================================================================

describe('3 — SIMPLE_RECONCILER.appendChildToContainer', () => {
  it('3.1 returns early when no handler found for child nodeType', () => {
    const instance = makeMockWeave(null);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1', nodeType: 'layer' });
    // No error, no add
    expect(() =>
      SIMPLE_RECONCILER.appendChildToContainer(instance as never, stage, layer, 0)
    ).not.toThrow();
    expect(stage.getLayers().length).toBe(0);
    stage.destroy();
  });

  it('3.2 skips the add block when child already has parent as its parent', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1', nodeType: 'layer' });
    stage.add(layer);
    handler.onAdd.mockClear();
    // child.getParent() === parent → guard false → block skipped
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, stage, layer, 0);
    expect(handler.onAdd).not.toHaveBeenCalled();
    stage.destroy();
  });

  it('3.3 Stage parent + Layer child → adds layer and calls onAdd', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1', nodeType: 'layer' });
    handler.onRender.mockReturnValue(layer);
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, stage, layer, 0);
    expect(layer.getParent()).toBe(stage);
    expect(handler.onAdd).toHaveBeenCalledWith(layer);
    stage.destroy();
  });

  it('3.4 Layer parent → adds child and calls onAdd', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, layer, rect, 0);
    expect(rect.getParent()).toBe(layer);
    expect(handler.onAdd).toHaveBeenCalledWith(rect);
    stage.destroy();
  });

  it('3.5 Group parent with containerId → delegates to realParent.add', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const realParent = new Konva.Group({ id: 'real-container' });
    const wrapperGroup = new Konva.Group({ id: 'wrapper', containerId: 'real-container', nodeType: 'group' });
    layer.add(wrapperGroup);
    wrapperGroup.add(realParent);
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect' });
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, wrapperGroup, rect, 0);
    expect(rect.getParent()).toBe(realParent);
    expect(handler.onAdd).toHaveBeenCalledWith(rect);
    stage.destroy();
  });

  it('3.6 Group parent with containerId but findOne returns null → no add', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const wrapperGroup = new Konva.Group({ id: 'wrapper', containerId: 'non-existent', nodeType: 'group' });
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect' });
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, wrapperGroup, rect, 0);
    expect(handler.onAdd).not.toHaveBeenCalled();
  });

  it('3.7 Group parent without containerId → adds directly and calls onAdd', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const group = new Konva.Group({ id: 'group1', nodeType: 'group' });
    layer.add(group);
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect' });
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, group, rect, 0);
    expect(rect.getParent()).toBe(group);
    expect(handler.onAdd).toHaveBeenCalledWith(rect);
    stage.destroy();
  });

  it('3.8 sets child zIndex to initialZIndex when truthy', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect', initialZIndex: 0 });
    // Add two rects so zIndex(0) is valid
    const rect2 = new Konva.Rect({ id: 'child2' });
    layer.add(rect2);
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, layer, rect, 1);
    // initialZIndex = 0 is falsy so zIndex should NOT be called
    expect(zIndexSpy).not.toHaveBeenCalled();
    stage.destroy();
  });

  it('3.8b sets child zIndex to initialZIndex when truthy (non-zero)', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const rect2 = new Konva.Rect({ id: 'placeholder' });
    layer.add(rect2);
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect', initialZIndex: 1 });
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, layer, rect, 0);
    expect(zIndexSpy).toHaveBeenCalledWith(1);
    stage.destroy();
  });

  it('3.9 emits onNodeRenderedAdded when node was added', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1', nodeType: 'layer' });
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, stage, layer, 0);
    expect(instance.emitEvent).toHaveBeenCalledWith('onNodeRenderedAdded', layer);
    stage.destroy();
  });

  it('3.10 calls setZIndex on child when parent is Konva.Layer', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect' });
    const setZIndexSpy = vi.spyOn(rect, 'setZIndex');
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, layer, rect, 2);
    expect(setZIndexSpy).toHaveBeenCalledWith(2);
    stage.destroy();
  });

  it('3.11 calls setZIndex on child when parent is Konva.Group', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const group = new Konva.Group({ id: 'group1', nodeType: 'group' });
    layer.add(group);
    const rect = new Konva.Rect({ id: 'child1', nodeType: 'rect' });
    const setZIndexSpy = vi.spyOn(rect, 'setZIndex');
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, group, rect, 1);
    expect(setZIndexSpy).toHaveBeenCalledWith(1);
    stage.destroy();
  });

  it('3.12 does NOT call setZIndex when parent is Konva.Stage', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1', nodeType: 'layer' });
    const setZIndexSpy = vi.spyOn(layer, 'setZIndex');
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, stage, layer, 0);
    expect(setZIndexSpy).not.toHaveBeenCalled();
    stage.destroy();
  });

  it('3.13 skips add when child.isAncestorOf(parent) returns true for Stage+Layer', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1', nodeType: 'layer' });
    vi.spyOn(layer, 'isAncestorOf').mockReturnValue(true);
    SIMPLE_RECONCILER.appendChildToContainer(instance as never, stage, layer, 0);
    expect(layer.getParent()).toBeNull();
    stage.destroy();
  });
});

// ============================================================================
// Suite 4 — removeChild
// ============================================================================

describe('4 — SIMPLE_RECONCILER.removeChild', () => {
  it('4.1 returns early when no handler found for child nodeType', () => {
    const instance = makeMockWeave(null);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'unknown' });
    expect(() => SIMPLE_RECONCILER.removeChild(instance as never, rect)).not.toThrow();
  });

  it('4.2 calls handler.onDestroy with the child', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    SIMPLE_RECONCILER.removeChild(instance as never, rect);
    expect(handler.onDestroy).toHaveBeenCalledWith(rect);
  });

  it('4.3 emits onNodeRenderedRemoved event with the child', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    SIMPLE_RECONCILER.removeChild(instance as never, rect);
    expect(instance.emitEvent).toHaveBeenCalledWith('onNodeRenderedRemoved', rect);
  });
});

// ============================================================================
// Suite 5 — commitUpdate
// ============================================================================

describe('5 — SIMPLE_RECONCILER.commitUpdate', () => {
  it('5.1 returns immediately when node is a Weave instance (no onUpdate called)', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    // Create a fake Weave-like object via prototype chain
    const fakeWeave = Object.create(Weave.prototype) as Weave;
    SIMPLE_RECONCILER.commitUpdate(
      instance as never,
      fakeWeave as never,
      'rect',
      { fill: 'red' } as never,
      { fill: 'blue' } as never
    );
    expect(handler.onUpdate).not.toHaveBeenCalled();
  });

  it('5.2 is a no-op when prevProps and nextProps are deeply equal', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    const props = { fill: 'red', x: 10 };
    SIMPLE_RECONCILER.commitUpdate(instance as never, rect, 'rect', props as never, props as never);
    expect(handler.onUpdate).not.toHaveBeenCalled();
  });

  it('5.3 calls handler.onUpdate when props differ', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    SIMPLE_RECONCILER.commitUpdate(
      instance as never,
      rect,
      'rect',
      { fill: 'red' } as never,
      { fill: 'blue' } as never
    );
    expect(handler.onUpdate).toHaveBeenCalledWith(rect, { fill: 'blue' });
  });

  it('5.4 returns early when no handler found', () => {
    const instance = makeMockWeave(null);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    expect(() =>
      SIMPLE_RECONCILER.commitUpdate(
        instance as never,
        rect,
        'unknown',
        { fill: 'red' } as never,
        { fill: 'blue' } as never
      )
    ).not.toThrow();
  });

  it('5.5 calls node.zIndex when nextProps.zIndex is truthy', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const stage = new Konva.Stage({ container: stageContainer, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    const rect2 = new Konva.Rect({ id: 'rect2' });
    layer.add(rect);
    layer.add(rect2);
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    SIMPLE_RECONCILER.commitUpdate(
      instance as never,
      rect,
      'rect',
      { fill: 'red' } as never,
      { fill: 'blue', zIndex: 1 } as never
    );
    expect(zIndexSpy).toHaveBeenCalledWith(1);
    stage.destroy();
  });

  it('5.6 does NOT call node.zIndex when nextProps.zIndex is falsy', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    const zIndexSpy = vi.spyOn(rect, 'zIndex');
    SIMPLE_RECONCILER.commitUpdate(
      instance as never,
      rect,
      'rect',
      { fill: 'red' } as never,
      { fill: 'blue' } as never
    );
    expect(zIndexSpy).not.toHaveBeenCalled();
  });

  it('5.7 emits onNodeRenderedUpdated event after update', () => {
    const handler = makeHandler();
    const instance = makeMockWeave(handler);
    const rect = new Konva.Rect({ id: 'rect1', nodeType: 'rect' });
    SIMPLE_RECONCILER.commitUpdate(
      instance as never,
      rect,
      'rect',
      { fill: 'red' } as never,
      { fill: 'blue' } as never
    );
    expect(instance.emitEvent).toHaveBeenCalledWith('onNodeRenderedUpdated', rect);
  });
});
