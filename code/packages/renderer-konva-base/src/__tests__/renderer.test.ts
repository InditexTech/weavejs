// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import 'vitest-canvas-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import type { WeaveState, WeaveStateElement } from '@inditextech/weave-types';
import { WEAVE_ROOT_NODE_TYPE } from '@inditextech/weave-types';
import { WeaveKonvaBaseRenderer } from '../renderer';
import { SIMPLE_RECONCILER } from '../reconciler';
// Importing index files ensures their re-export lines are covered
import * as indexMain from '../index';
import * as indexCommon from '../index.common';
import * as indexNode from '../index.node';
import * as indexTypes from '../index.types';

// ============================================================================
// Helpers
// ============================================================================

function makeStateEl(
  key: string,
  type = 'rect',
  props: Record<string, unknown> = {},
  children: WeaveStateElement[] = []
): WeaveStateElement {
  return { key, type, props: { ...props, children } } as WeaveStateElement;
}

/** Creates a state element WITHOUT a children array in props (exercises the ?? [] fallback) */
function makeStateElNoChildren(
  key: string,
  type = 'rect',
  props: Record<string, unknown> = {}
): WeaveStateElement {
  return { key, type, props: { ...props } } as WeaveStateElement;
}

function makeWeaveState(root?: WeaveStateElement): WeaveState {
  // When called without args, weave is undefined so the `!prevRoot || !nextRoot`
  // guard in deriveRendererInstructions triggers correctly.
  return { weave: root as WeaveState['weave'], weaveMetadata: {} } as WeaveState;
}

function makeMockStage() {
  const nodes: Map<string, Konva.Node> = new Map();
  return {
    findOne: vi.fn((selector: string) => {
      const id = selector.replace('#', '');
      return nodes.get(id);
    }),
    find: vi.fn((selector: string) => {
      const id = selector.replace('#', '');
      const node = nodes.get(id);
      return node ? [node] : [];
    }),
    _nodes: nodes,
  };
}

function makeMockWeave(stageOverride?: ReturnType<typeof makeMockStage>) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const mainLogger = { info: vi.fn() };
  const stage = stageOverride ?? makeMockStage();
  const store = { getState: vi.fn().mockReturnValue({ weave: {}, weaveMetadata: {} }) };

  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getMainLogger: vi.fn().mockReturnValue(mainLogger),
    getStage: vi.fn().mockReturnValue(stage),
    getStore: vi.fn().mockReturnValue(store),
    getStageConfiguration: vi.fn().mockReturnValue({ container: 'cid', width: 800, height: 600 }),
    getStageManager: vi.fn().mockReturnValue({ setStage: vi.fn() }),
    getNodeHandler: vi.fn(),
    emitEvent: vi.fn(),
    _logger: logger,
    _store: store,
    _stage: stage,
  };
}

let renderer: WeaveKonvaBaseRenderer;
let mockWeave: ReturnType<typeof makeMockWeave>;

beforeEach(() => {
  renderer = new WeaveKonvaBaseRenderer();
  mockWeave = makeMockWeave();
  renderer.register(mockWeave as never);
  renderer.init();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ============================================================================
// Suite 1 — Constructor, init, getReconciler
// ============================================================================

describe('1 — Constructor, init, getReconciler', () => {
  it('1.1 creates a WeaveKonvaBaseRenderer instance', () => {
    expect(renderer).toBeInstanceOf(WeaveKonvaBaseRenderer);
  });

  it('1.2 init sets actualState to empty weave/weaveMetadata', () => {
    // actualState is set by init(); we verify render() uses it as prevState.
    // An indirect check: render() with empty prev and missing key returns early.
    const store = mockWeave._store;
    store.getState.mockReturnValue({ weave: {}, weaveMetadata: {} });
    // Should not throw and should not call deriveRendererInstructions with non-empty prev
    expect(() => renderer.render()).not.toThrow();
  });

  it('1.3 getReconciler returns SIMPLE_RECONCILER', () => {
    expect(renderer.getReconciler()).toBe(SIMPLE_RECONCILER);
  });
});

// ============================================================================
// Suite 2 — render
// ============================================================================

describe('2 — render', () => {
  it('2.1 returns early when state has no weave.key', () => {
    mockWeave._store.getState.mockReturnValue({ weave: { type: 'stage', props: {} }, weaveMetadata: {} });
    const spy = vi.spyOn(renderer, 'deriveRendererInstructions');
    renderer.render();
    expect(spy).not.toHaveBeenCalled();
  });

  it('2.2 returns early when state has no weave.type', () => {
    mockWeave._store.getState.mockReturnValue({ weave: { key: 'root', props: {} }, weaveMetadata: {} });
    const spy = vi.spyOn(renderer, 'deriveRendererInstructions');
    renderer.render();
    expect(spy).not.toHaveBeenCalled();
  });

  it('2.3 returns early when state has no weave.props', () => {
    mockWeave._store.getState.mockReturnValue({ weave: { key: 'root', type: 'stage' }, weaveMetadata: {} });
    const spy = vi.spyOn(renderer, 'deriveRendererInstructions');
    renderer.render();
    expect(spy).not.toHaveBeenCalled();
  });

  it('2.4 calls deriveRendererInstructions when state is valid', () => {
    const newState: WeaveState = {
      weave: makeStateEl('root', 'stage', {}, []),
      weaveMetadata: {},
    } as WeaveState;
    mockWeave._store.getState.mockReturnValue(newState);
    const spy = vi.spyOn(renderer, 'deriveRendererInstructions');
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    renderer.render();
    expect(spy).toHaveBeenCalled();
  });

  it('2.5 updates actualState to the new state after render', () => {
    const root = makeStateEl('root', 'stage', { fill: 'red' }, []);
    const newState: WeaveState = { weave: root, weaveMetadata: {} } as WeaveState;
    mockWeave._store.getState.mockReturnValue(newState);
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);

    renderer.render();
    // Second render with same state: deriveRendererInstructions should see equal prev/next
    const spy = vi.spyOn(renderer, 'deriveRendererInstructions');
    renderer.render();
    const [prevState] = spy.mock.calls[0];
    expect(JSON.stringify(prevState.weave)).toBe(JSON.stringify(root));
  });

  it('2.6 calls the callback via setTimeout', async () => {
    vi.useFakeTimers();
    const root = makeStateEl('root', 'stage', {}, []);
    mockWeave._store.getState.mockReturnValue({ weave: root, weaveMetadata: {} });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    const callback = vi.fn();
    renderer.render(callback);
    expect(callback).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('2.7 works without a callback (no error)', () => {
    const root = makeStateEl('root', 'stage', {}, []);
    mockWeave._store.getState.mockReturnValue({ weave: root, weaveMetadata: {} });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    expect(() => renderer.render()).not.toThrow();
  });
});

// ============================================================================
// Suite 3 — deriveRendererInstructions
// ============================================================================

describe('3 — deriveRendererInstructions', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    vi.spyOn(SIMPLE_RECONCILER, 'createRoot').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'appendChildToContainer').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'removeChild').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'commitUpdate').mockImplementation(() => {});
  });

  it('3.1 ROOT MOUNT: createInstance is called when prev has no root and next has root', () => {
    const prevState = makeWeaveState();
    const nextState = makeWeaveState(makeStateEl('root', 'stage', {}, []));
    renderer.deriveRendererInstructions(prevState, nextState);
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalled();
  });

  it('3.2 ROOT UNMOUNT: removeChild is called when prev has root and next has no root', () => {
    const prevState = makeWeaveState(makeStateEl('root', 'stage', {}, []));
    const nextState = makeWeaveState();
    const mockRect = new Konva.Rect({ id: 'root' });
    mockWeave._stage.find.mockReturnValue([mockRect]);
    vi.spyOn(mockRect, 'getParent').mockReturnValue({ getAttrs: () => ({}), id: () => WEAVE_ROOT_NODE_TYPE } as never);
    renderer.deriveRendererInstructions(prevState, nextState);
    expect(SIMPLE_RECONCILER.removeChild).toHaveBeenCalled();
  });

  it('3.3 returns early when both roots are absent', () => {
    const prevState = makeWeaveState();
    const nextState = makeWeaveState();
    // Should not throw, no instructions issued
    expect(() => renderer.deriveRendererInstructions(prevState, nextState)).not.toThrow();
    expect(SIMPLE_RECONCILER.createInstance).not.toHaveBeenCalled();
  });

  it('3.4 delegates to reconcileNode when both roots are present', () => {
    const root = makeStateEl('root', 'stage', { fill: 'red' }, []);
    const rootUpdated = makeStateEl('root', 'stage', { fill: 'blue' }, []);
    const prevState = makeWeaveState(root);
    const nextState = makeWeaveState(rootUpdated);
    // updateProps needs to find the node in stage to call commitUpdate
    const mockRootNode = new Konva.Rect({ id: 'root' });
    mockWeave._stage._nodes.set('root', mockRootNode);
    renderer.deriveRendererInstructions(prevState, nextState);
    // commitUpdate is called because props differ
    expect(SIMPLE_RECONCILER.commitUpdate).toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 4 — reconcileNode (tested via deriveRendererInstructions)
// ============================================================================

describe('4 — reconcileNode', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    vi.spyOn(SIMPLE_RECONCILER, 'createRoot').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'appendChildToContainer').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'removeChild').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'commitUpdate').mockImplementation(() => {});
  });

  it('4.1 same reference (prevNode === nextNode) → no update call', () => {
    const root = makeStateEl('root', 'stage', { fill: 'red' }, []);
    const state: WeaveState = { weave: root, weaveMetadata: {} } as WeaveState;
    renderer.deriveRendererInstructions(state, state);
    expect(SIMPLE_RECONCILER.commitUpdate).not.toHaveBeenCalled();
  });

  it('4.2 different keys → no update call', () => {
    const prev = makeStateEl('root1', 'stage', { fill: 'red' }, []);
    const next = makeStateEl('root2', 'stage', { fill: 'blue' }, []);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    // Key mismatch → no reconcile
    expect(SIMPLE_RECONCILER.commitUpdate).not.toHaveBeenCalled();
  });

  it('4.3 equal props → commitUpdate NOT called', () => {
    const props = { fill: 'red', x: 10 };
    const prev = makeStateEl('root', 'stage', props, []);
    const next = makeStateEl('root', 'stage', { ...props }, []);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    expect(SIMPLE_RECONCILER.commitUpdate).not.toHaveBeenCalled();
  });

  it('4.4 different props → commitUpdate IS called', () => {
    const prev = makeStateEl('root', 'stage', { fill: 'red' }, []);
    const next = makeStateEl('root', 'stage', { fill: 'blue' }, []);
    // Provide node in stage so updateProps can find it
    const mockRootNode = new Konva.Rect({ id: 'root' });
    mockWeave._stage._nodes.set('root', mockRootNode);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    expect(SIMPLE_RECONCILER.commitUpdate).toHaveBeenCalledWith(
      expect.anything(),
      mockRootNode,
      'stage',
      { fill: 'red' },
      { fill: 'blue' }
    );
  });

  it('4.5 calls reconcileChildren (child addition triggers createInstance)', () => {
    const prev = makeStateEl('root', 'stage', {}, []);
    const child = makeStateEl('child1', 'rect', { fill: 'red' }, []);
    const next = makeStateEl('root', 'stage', {}, [child]);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalled();
  });

  it('4.6 reconcileNode handles nodes where props has no children key (covers ?? [] branch)', () => {
    // Nodes without a children key trigger the `?? []` fallback on lines 130-131
    const prev = makeStateElNoChildren('root', 'stage', { fill: 'red' });
    const next = makeStateElNoChildren('root', 'stage', { fill: 'red' });
    expect(() =>
      renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next))
    ).not.toThrow();
    expect(SIMPLE_RECONCILER.createInstance).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 5 — reconcileChildren (tested via deriveRendererInstructions)
// ============================================================================

describe('5 — reconcileChildren', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    vi.spyOn(SIMPLE_RECONCILER, 'createRoot').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'appendChildToContainer').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'removeChild').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'commitUpdate').mockImplementation(() => {});
  });

  it('5.1 child in prev but not in next → removeChild called', () => {
    const child = makeStateEl('child1', 'rect', {}, []);
    const prev = makeStateEl('root', 'stage', {}, [child]);
    const next = makeStateEl('root', 'stage', {}, []);
    const mockRect = new Konva.Rect({ id: 'child1' });
    mockWeave._stage.find.mockImplementation((sel: string) =>
      sel === '#child1' ? [mockRect] : []
    );
    vi.spyOn(mockRect, 'getParent').mockReturnValue({
      getAttrs: () => ({}),
      id: () => 'root',
    } as never);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    expect(SIMPLE_RECONCILER.removeChild).toHaveBeenCalled();
  });

  it('5.2 child in next but not in prev → createInstance called', () => {
    const child = makeStateEl('child1', 'rect', {}, []);
    const prev = makeStateEl('root', 'stage', {}, []);
    const next = makeStateEl('root', 'stage', {}, [child]);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalled();
  });

  it('5.3 prevIndex >= lastPlacedIndex → no move, recursive reconcile', () => {
    const childA = makeStateEl('A', 'rect', { fill: 'red' }, []);
    const childB = makeStateEl('B', 'rect', { fill: 'red' }, []);
    const prev = makeStateEl('root', 'stage', {}, [childA, childB]);
    const nextA = makeStateEl('A', 'rect', { fill: 'blue' }, []);
    const nextB = makeStateEl('B', 'rect', { fill: 'blue' }, []);
    const next = makeStateEl('root', 'stage', {}, [nextA, nextB]);
    // Provide nodes in stage so updateProps can find them
    mockWeave._stage._nodes.set('A', new Konva.Rect({ id: 'A' }));
    mockWeave._stage._nodes.set('B', new Konva.Rect({ id: 'B' }));
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    // Both A and B should trigger updates, no removes (no move)
    expect(SIMPLE_RECONCILER.removeChild).not.toHaveBeenCalled();
    expect(SIMPLE_RECONCILER.commitUpdate).toHaveBeenCalledTimes(2);
  });

  it('5.4 prevIndex < lastPlacedIndex → remove + createSubtree (move heuristic)', () => {
    // Prev: [A(0), B(1), C(2)]  Next: [B, A, C]
    // B is at prevIndex=1, A is at prevIndex=0 which < lastPlacedIndex(1) → move
    const childA = makeStateEl('A', 'rect', {}, []);
    const childB = makeStateEl('B', 'rect', {}, []);
    const childC = makeStateEl('C', 'rect', {}, []);
    const prev = makeStateEl('root', 'stage', {}, [childA, childB, childC]);
    const next = makeStateEl('root', 'stage', {}, [
      makeStateEl('B', 'rect', {}, []),
      makeStateEl('A', 'rect', {}, []),
      makeStateEl('C', 'rect', {}, []),
    ]);

    const nodeA = new Konva.Rect({ id: 'A' });
    mockWeave._stage.find.mockImplementation((sel: string) => {
      if (sel === '#A') {
        return [nodeA];
      }
      return [];
    });
    vi.spyOn(nodeA, 'getParent').mockReturnValue({
      getAttrs: () => ({}),
      id: () => 'root',
    } as never);

    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    // A was moved: remove + createSubtree
    expect(SIMPLE_RECONCILER.removeChild).toHaveBeenCalled();
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalled();
  });

  it('5.5 recursive reconciliation: child updates propagate', () => {
    const grandchild = makeStateEl('gc1', 'rect', { fill: 'red' }, []);
    const child = makeStateEl('child1', 'layer', {}, [grandchild]);
    const prev = makeStateEl('root', 'stage', {}, [child]);

    const gcNext = makeStateEl('gc1', 'rect', { fill: 'blue' }, []);
    const childNext = makeStateEl('child1', 'layer', {}, [gcNext]);
    const next = makeStateEl('root', 'stage', {}, [childNext]);

    // Provide the grandchild node in stage so updateProps can find it
    mockWeave._stage._nodes.set('gc1', new Konva.Rect({ id: 'gc1' }));
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    // grandchild props differ → commitUpdate called
    expect(SIMPLE_RECONCILER.commitUpdate).toHaveBeenCalled();
  });

  it('5.6 empty prev and next children → no instructions emitted', () => {
    const prev = makeStateEl('root', 'stage', {}, []);
    const next = makeStateEl('root', 'stage', {}, []);
    renderer.deriveRendererInstructions(makeWeaveState(prev), makeWeaveState(next));
    expect(SIMPLE_RECONCILER.createInstance).not.toHaveBeenCalled();
    expect(SIMPLE_RECONCILER.removeChild).not.toHaveBeenCalled();
    expect(SIMPLE_RECONCILER.commitUpdate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 6 — findElementByKey
// ============================================================================

describe('6 — findElementByKey', () => {
  it('6.1 finds element at root level', () => {
    const root = makeStateEl('root', 'stage', {}, []);
    const state = makeWeaveState(root);
    const result = renderer.findElementByKey(state, 'root');
    expect(result.key).toBe('root');
  });

  it('6.2 finds element deep in tree', () => {
    const grandchild = makeStateEl('gc1', 'rect', {}, []);
    const child = makeStateEl('child1', 'layer', {}, [grandchild]);
    const root = makeStateEl('root', 'stage', {}, [child]);
    const state = makeWeaveState(root);
    const result = renderer.findElementByKey(state, 'gc1');
    expect(result.key).toBe('gc1');
  });

  it('6.3 returns null (or undefined) when key not found', () => {
    const root = makeStateEl('root', 'stage', {}, []);
    const state = makeWeaveState(root);
    const result = renderer.findElementByKey(state, 'nonexistent');
    expect(result).toBeNull();
  });

  it('6.4 traverses nodes with no children key (covers the ?? [] fallback at line 210)', () => {
    // Root has no children key in props — walk should still work without throwing
    const root = makeStateElNoChildren('root', 'stage');
    const state = makeWeaveState(root);
    const result = renderer.findElementByKey(state, 'nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================================================
// Suite 7 — stripChildren
// ============================================================================

describe('7 — stripChildren', () => {
  it('7.1 removes children from props', () => {
    const result = renderer.stripChildren({ children: [], fill: 'red', x: 10 } as never);
    expect(result).not.toHaveProperty('children');
    expect(result).toMatchObject({ fill: 'red', x: 10 });
  });

  it('7.2 props without children remain unchanged', () => {
    const result = renderer.stripChildren({ fill: 'blue', x: 5 } as never);
    expect(result).toMatchObject({ fill: 'blue', x: 5 });
  });
});

// ============================================================================
// Suite 8 — buildSubtree
// ============================================================================

describe('8 — buildSubtree', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'createRoot').mockImplementation(() => {});
    vi.spyOn(SIMPLE_RECONCILER, 'appendChildToContainer').mockImplementation(() => {});
  });

  it('8.1 logs warn and returns when handler produces no instance', () => {
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    const el = makeStateEl('el1', 'rect', {}, []);
    expect(() => renderer.buildSubtree(undefined, el, 0)).not.toThrow();
    expect(SIMPLE_RECONCILER.createRoot).not.toHaveBeenCalled();
  });

  it('8.2 calls createRoot when parentInstance is undefined', () => {
    const mockNode = new Konva.Rect({ id: 'el1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(mockNode);
    const el = makeStateEl('el1', 'rect', {}, []);
    renderer.buildSubtree(undefined, el, 0);
    expect(SIMPLE_RECONCILER.createRoot).toHaveBeenCalledWith(
      expect.anything(),
      mockNode
    );
  });

  it('8.3 calls appendChildToContainer for Stage parent', () => {
    const stageContainer2 = document.createElement('div');
    document.body.appendChild(stageContainer2);
    const stage = new Konva.Stage({ container: stageContainer2, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(layer);
    const el = makeStateEl('layer1', 'layer', {}, []);
    renderer.buildSubtree(stage, el, 0);
    expect(SIMPLE_RECONCILER.appendChildToContainer).toHaveBeenCalledWith(
      expect.anything(),
      stage,
      layer,
      0
    );
    stage.destroy();
  });

  it('8.4 calls appendChildToContainer for Layer parent', () => {
    const stageContainer2 = document.createElement('div');
    document.body.appendChild(stageContainer2);
    const stage = new Konva.Stage({ container: stageContainer2, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const rect = new Konva.Rect({ id: 'rect1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(rect);
    const el = makeStateEl('rect1', 'rect', {}, []);
    renderer.buildSubtree(layer, el, 0);
    expect(SIMPLE_RECONCILER.appendChildToContainer).toHaveBeenCalledWith(
      expect.anything(),
      layer,
      rect,
      0
    );
    stage.destroy();
  });

  it('8.5 calls appendChildToContainer for Group parent', () => {
    const stageContainer2 = document.createElement('div');
    document.body.appendChild(stageContainer2);
    const stage = new Konva.Stage({ container: stageContainer2, width: 100, height: 100 });
    const layer = new Konva.Layer({ id: 'layer1' });
    stage.add(layer);
    const group = new Konva.Group({ id: 'group1' });
    layer.add(group);
    const rect = new Konva.Rect({ id: 'rect1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(rect);
    const el = makeStateEl('rect1', 'rect', {}, []);
    renderer.buildSubtree(group, el, 0);
    expect(SIMPLE_RECONCILER.appendChildToContainer).toHaveBeenCalledWith(
      expect.anything(),
      group,
      rect,
      0
    );
    stage.destroy();
  });

  it('8.6 does NOT call appendChildToContainer for non-Stage/Layer/Group parent', () => {
    const plainRect = new Konva.Rect({ id: 'parent-rect' });
    const childRect = new Konva.Rect({ id: 'child-rect' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(childRect);
    const el = makeStateEl('child-rect', 'rect', {}, []);
    renderer.buildSubtree(plainRect, el, 0);
    expect(SIMPLE_RECONCILER.appendChildToContainer).not.toHaveBeenCalled();
  });

  it('8.7 recursively calls buildSubtree for each child element', () => {
    const childEl = makeStateEl('child1', 'rect', {}, []);
    const parentEl = makeStateEl('parent1', 'layer', {}, [childEl]);
    const layer = new Konva.Layer({ id: 'parent1' });
    const childRect = new Konva.Rect({ id: 'child1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance')
      .mockReturnValueOnce(layer)
      .mockReturnValueOnce(childRect);
    renderer.buildSubtree(undefined, parentEl, 0);
    // createInstance called twice: once for parent, once for child
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalledTimes(2);
  });

  it('8.8 no recursion when element has no children', () => {
    const el = makeStateEl('el1', 'rect', {}, []);
    const rect = new Konva.Rect({ id: 'el1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(rect);
    renderer.buildSubtree(undefined, el, 0);
    // Only one createInstance call (the element itself, no children)
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalledTimes(1);
  });

  it('8.9 element with no children key in props does not crash (covers ?? [] branch at line 263)', () => {
    const el = makeStateElNoChildren('el1', 'rect');
    const rect = new Konva.Rect({ id: 'el1' });
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(rect);
    expect(() => renderer.buildSubtree(undefined, el, 0)).not.toThrow();
    expect(SIMPLE_RECONCILER.createInstance).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Suite 9 — createSubtree (private, accessed via cast)
// ============================================================================

describe('9 — createSubtree (private)', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'createInstance').mockReturnValue(undefined);
    vi.spyOn(SIMPLE_RECONCILER, 'createRoot').mockImplementation(() => {});
  });

  it('9.1 throws when instruction kind is not CREATE_SUBTREE', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (renderer as any).createSubtree({ kind: 'REMOVE', parentKey: 'root', key: 'k1' })
    ).toThrow('Invalid instruction kind for createSubtree: REMOVE');
  });

  it('9.2 parentKey === WEAVE_ROOT_NODE_TYPE → calls buildSubtree with undefined parent', () => {
    const el = makeStateEl('root', 'stage', {}, []);
    const buildSpy = vi.spyOn(renderer, 'buildSubtree');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).createSubtree({
      kind: 'CREATE_SUBTREE',
      element: el,
      parentKey: WEAVE_ROOT_NODE_TYPE,
      index: 0,
    });
    expect(buildSpy).toHaveBeenCalledWith(undefined, el, 0);
  });

  it('9.3 parentKey !== WEAVE_ROOT_NODE_TYPE → looks up parent via stage.findOne', () => {
    const el = makeStateEl('child1', 'rect', {}, []);
    const mockParent = new Konva.Rect({ id: 'parent1' });
    mockWeave._stage.findOne.mockReturnValue(mockParent);
    const buildSpy = vi.spyOn(renderer, 'buildSubtree');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).createSubtree({
      kind: 'CREATE_SUBTREE',
      element: el,
      parentKey: 'parent1',
      index: 1,
    });
    expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#parent1');
    expect(buildSpy).toHaveBeenCalledWith(mockParent, el, 1);
  });
});

// ============================================================================
// Suite 10 — remove (private)
// ============================================================================

describe('10 — remove (private)', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'removeChild').mockImplementation(() => {});
  });

  it('10.1 throws when instruction kind is not REMOVE', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (renderer as any).remove({ kind: 'UPDATE_PROPS', key: 'k', type: 't', prevProps: {}, nextProps: {} })
    ).toThrow('Invalid instruction kind for remove: UPDATE_PROPS');
  });

  it('10.2 calls removeChild when parent.id() matches parentKey', () => {
    const mockChild = new Konva.Rect({ id: 'child1' });
    mockWeave._stage.find.mockReturnValue([mockChild]);
    vi.spyOn(mockChild, 'getParent').mockReturnValue({
      getAttrs: () => ({}),
      id: () => 'parent1',
    } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).remove({ kind: 'REMOVE', parentKey: 'parent1', key: 'child1' });
    expect(SIMPLE_RECONCILER.removeChild).toHaveBeenCalledWith(
      expect.anything(),
      mockChild
    );
  });

  it('10.3 does NOT call removeChild when parent.id() does not match parentKey', () => {
    const mockChild = new Konva.Rect({ id: 'child1' });
    mockWeave._stage.find.mockReturnValue([mockChild]);
    vi.spyOn(mockChild, 'getParent').mockReturnValue({
      getAttrs: () => ({}),
      id: () => 'other-parent',
    } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).remove({ kind: 'REMOVE', parentKey: 'parent1', key: 'child1' });
    expect(SIMPLE_RECONCILER.removeChild).not.toHaveBeenCalled();
  });

  it('10.4 re-looks-up parent when parent.getAttrs().nodeId is truthy', () => {
    const mockChild = new Konva.Rect({ id: 'child1' });
    const realParent = new Konva.Rect({ id: 'real-parent' });
    mockWeave._stage.find.mockReturnValue([mockChild]);
    const intermediateParent = {
      getAttrs: () => ({ nodeId: 'real-parent' }),
      id: () => 'intermediate',
    };
    vi.spyOn(mockChild, 'getParent').mockReturnValue(intermediateParent as never);
    mockWeave._stage.findOne.mockReturnValue(realParent);
    vi.spyOn(realParent, 'id').mockReturnValue('parent1' as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).remove({ kind: 'REMOVE', parentKey: 'parent1', key: 'child1' });
    expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#real-parent');
    expect(SIMPLE_RECONCILER.removeChild).toHaveBeenCalled();
  });

  it('10.5 does nothing when stage.find returns empty array', () => {
    mockWeave._stage.find.mockReturnValue([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).remove({ kind: 'REMOVE', parentKey: 'parent1', key: 'missing' });
    expect(SIMPLE_RECONCILER.removeChild).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Suite 11 — updateProps (private)
// ============================================================================

describe('11 — updateProps (private)', () => {
  beforeEach(() => {
    vi.spyOn(SIMPLE_RECONCILER, 'commitUpdate').mockImplementation(() => {});
  });

  it('11.1 throws when instruction kind is not UPDATE_PROPS', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (renderer as any).updateProps({ kind: 'REMOVE', parentKey: 'p', key: 'k' })
    ).toThrow('Invalid instruction kind for updateProps: REMOVE');
  });

  it('11.2 returns early when node is not found in stage', () => {
    mockWeave._stage.findOne.mockReturnValue(undefined);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (renderer as any).updateProps({
        kind: 'UPDATE_PROPS',
        key: 'missing',
        type: 'rect',
        prevProps: { fill: 'red' },
        nextProps: { fill: 'blue' },
      })
    ).not.toThrow();
    expect(SIMPLE_RECONCILER.commitUpdate).not.toHaveBeenCalled();
  });

  it('11.3 calls reconciler.commitUpdate with correct args when node is found', () => {
    const mockNode = new Konva.Rect({ id: 'rect1' });
    mockWeave._stage.findOne.mockReturnValue(mockNode);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (renderer as any).updateProps({
      kind: 'UPDATE_PROPS',
      key: 'rect1',
      type: 'rect',
      prevProps: { fill: 'red' },
      nextProps: { fill: 'blue' },
    });
    expect(SIMPLE_RECONCILER.commitUpdate).toHaveBeenCalledWith(
      expect.anything(),
      mockNode,
      'rect',
      { fill: 'red' },
      { fill: 'blue' }
    );
  });
});

// ============================================================================
// Index coverage checks (re-export lines)
// ============================================================================

describe('12 — Index re-export coverage', () => {
  it('12.1 index.common exports WeaveKonvaBaseRenderer', () => {
    expect(indexCommon.WeaveKonvaBaseRenderer).toBe(WeaveKonvaBaseRenderer);
  });

  it('12.2 index.node re-exports same as index.common', () => {
    expect(indexNode.WeaveKonvaBaseRenderer).toBe(WeaveKonvaBaseRenderer);
  });

  it('12.3 index.types re-exports same as index.common', () => {
    expect(indexTypes.WeaveKonvaBaseRenderer).toBe(WeaveKonvaBaseRenderer);
  });

  it('12.4 main index.ts re-exports WeaveKonvaBaseRenderer', () => {
    expect(indexMain.WeaveKonvaBaseRenderer).toBe(WeaveKonvaBaseRenderer);
  });
});
