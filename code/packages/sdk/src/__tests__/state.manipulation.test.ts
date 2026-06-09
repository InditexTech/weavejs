// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { WeaveStateManipulation } from '../state.manipulation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Integrates a value into a Y.Doc so Yjs operations (get/length) work.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function integrate<T>(value: T): T {
  const doc = new Y.Doc();
  doc.getMap('root').set('v', value);
  return value;
}

/**
 * Builds a Y.Doc with layer → props → children so addElements/updateElements/deleteElements work.
 */
function makeLayerDoc(): { doc: Y.Doc; layer: Y.Map<unknown> } {
  const doc = new Y.Doc();
  const layer = new Y.Map<unknown>();
  const layerProps = new Y.Map<unknown>();
  layerProps.set('children', new Y.Array());
  layer.set('props', layerProps);
  doc.getMap('root').set('layer', layer);
  return { doc, layer };
}

/** Creates a WeaveStateElement-shaped object for test input */
const DEFAULT_MAKE_NODE_PROPS: Record<string, unknown> = { x: 0, y: 0, width: 100, height: 100 };
function makeNode(
  key: string,
  type: string,
  props: Record<string, unknown> = DEFAULT_MAKE_NODE_PROPS
) {
  return { key, type, props };
}

// ---------------------------------------------------------------------------
// Suite 1: mapValueToYjs
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.mapValueToYjs', () => {
  it('returns null for null', () => {
    expect(WeaveStateManipulation.mapValueToYjs(null)).toBeNull();
  });

  it('returns undefined for undefined', () => {
    expect(WeaveStateManipulation.mapValueToYjs(undefined)).toBeUndefined();
  });

  it('returns string primitive as-is', () => {
    expect(WeaveStateManipulation.mapValueToYjs('hello')).toBe('hello');
  });

  it('returns number primitive as-is', () => {
    expect(WeaveStateManipulation.mapValueToYjs(42)).toBe(42);
  });

  it('returns boolean primitive as-is', () => {
    expect(WeaveStateManipulation.mapValueToYjs(true)).toBe(true);
  });

  it('maps flat array to Y.Array with correct elements', () => {
    const result = integrate(WeaveStateManipulation.mapValueToYjs([1, 'a', true]));
    expect(result).toBeInstanceOf(Y.Array);
    expect(result.length).toBe(3);
    expect(result.get(0)).toBe(1);
    expect(result.get(1)).toBe('a');
    expect(result.get(2)).toBe(true);
  });

  it('maps nested array to nested Y.Array', () => {
    const result = integrate(WeaveStateManipulation.mapValueToYjs([[1, 2], [3]]));
    expect(result).toBeInstanceOf(Y.Array);
    expect(result.length).toBe(2);
    const inner = result.get(0) as Y.Array<unknown>;
    expect(inner).toBeInstanceOf(Y.Array);
    expect(inner.get(0)).toBe(1);
    expect(inner.get(1)).toBe(2);
  });

  it('maps plain object to Y.Map', () => {
    const result = integrate(WeaveStateManipulation.mapValueToYjs({ a: 1, b: 'x' }));
    expect(result).toBeInstanceOf(Y.Map);
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBe('x');
  });

  it('maps nested object recursively', () => {
    const result = integrate(WeaveStateManipulation.mapValueToYjs({ outer: { inner: 99 } }));
    expect(result).toBeInstanceOf(Y.Map);
    const inner = result.get('outer') as Y.Map<unknown>;
    expect(inner).toBeInstanceOf(Y.Map);
    expect(inner.get('inner')).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: mapPropsToYjs
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.mapPropsToYjs', () => {
  it('returns empty Y.Map for empty props', () => {
    const result = integrate(WeaveStateManipulation.mapPropsToYjs({}));
    expect(result).toBeInstanceOf(Y.Map);
    expect(result.size).toBe(0);
  });

  it('maps mixed-type props', () => {
    const result = integrate(
      WeaveStateManipulation.mapPropsToYjs({
        label: 'rect',
        x: 10,
        tags: ['a', 'b'],
        style: { color: 'red' },
      })
    );
    expect(result.get('label')).toBe('rect');
    expect(result.get('x')).toBe(10);
    expect(result.get('tags')).toBeInstanceOf(Y.Array);
    expect(result.get('style')).toBeInstanceOf(Y.Map);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: mapNodeToYjs
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.mapNodeToYjs', () => {
  it('returns nodeId matching node.key', () => {
    const node = makeNode('node-1', 'rect');
    const { nodeId } = WeaveStateManipulation.mapNodeToYjs(node);
    expect(nodeId).toBe('node-1');
  });

  it('element Y.Map has key, type, and props entries', () => {
    const node = makeNode('n1', 'circle', { r: 5 });
    const { element } = WeaveStateManipulation.mapNodeToYjs(node);
    integrate(element);
    expect(element.get('key')).toBe('n1');
    expect(element.get('type')).toBe('circle');
    expect(element.get('props')).toBeInstanceOf(Y.Map);
  });

  it('maps non-children props via mapValueToYjs', () => {
    const node = makeNode('n2', 'rect', { x: 10, y: 20, fill: 'blue' });
    const { element } = WeaveStateManipulation.mapNodeToYjs(node);
    integrate(element);
    const props = element.get('props') as unknown as Y.Map<unknown>;
    expect(props.get('y')).toBe(20);
    expect(props.get('fill')).toBe('blue');
  });

  it('maps children array to Y.Array of child Y.Maps', () => {
    const child = makeNode('child-1', 'text', { text: 'hi' });
    const parent = makeNode('parent-1', 'group', { children: [child] });
    const { element } = WeaveStateManipulation.mapNodeToYjs(parent);
    integrate(element);
    const props = element.get('props') as unknown as Y.Map<unknown>;
    const children = props.get('children') as Y.Array<unknown>;
    expect(children.length).toBe(1);
    const childMap = children.get(0) as Y.Map<unknown>;
    expect(childMap).toBeInstanceOf(Y.Map);
    expect(childMap.get('key')).toBe('child-1');
  });
});

// ---------------------------------------------------------------------------
// Suite 4: addElements
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.addElements', () => {
  it('pushes a single element into children', () => {
    const { layer } = makeLayerDoc();
    const { element } = WeaveStateManipulation.mapNodeToYjs(makeNode('a', 'rect'));
    WeaveStateManipulation.addElements(layer, [element]);
    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(1);
    expect((children.get(0) as Y.Map<unknown>).get('key')).toBe('a');
  });

  it('pushes multiple elements at once', () => {
    const { layer } = makeLayerDoc();
    const e1 = WeaveStateManipulation.mapNodeToYjs(makeNode('b1', 'rect')).element;
    const e2 = WeaveStateManipulation.mapNodeToYjs(makeNode('b2', 'circle')).element;
    WeaveStateManipulation.addElements(layer, [e1, e2]);
    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 5: updateElements
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.updateElements', () => {
  it('replaces an existing element matched by nodeId', () => {
    const { layer } = makeLayerDoc();
    const orig = WeaveStateManipulation.mapNodeToYjs(makeNode('u1', 'rect', { x: 0, y: 0, width: 10, height: 10 })).element;
    WeaveStateManipulation.addElements(layer, [orig]);

    const updated = WeaveStateManipulation.mapNodeToYjs(makeNode('u1', 'rect', { x: 99, y: 0, width: 10, height: 10 })).element;
    WeaveStateManipulation.updateElements(layer, [{ nodeId: 'u1', element: updated }]);

    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(1);
    const props = (children.get(0) as Y.Map<unknown>).get('props') as Y.Map<unknown>;
    expect(props.get('x')).toBe(99);
  });

  it('does nothing when nodeId not found', () => {
    const { layer } = makeLayerDoc();
    const e = WeaveStateManipulation.mapNodeToYjs(makeNode('x1', 'rect')).element;
    WeaveStateManipulation.addElements(layer, [e]);

    const ghost = WeaveStateManipulation.mapNodeToYjs(makeNode('ghost', 'rect')).element;
    WeaveStateManipulation.updateElements(layer, [{ nodeId: 'ghost', element: ghost }]);

    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(1);
    expect((children.get(0) as Y.Map<unknown>).get('key')).toBe('x1');
  });

  it('updates multiple elements', () => {
    const { layer } = makeLayerDoc();
    const e1 = WeaveStateManipulation.mapNodeToYjs(makeNode('m1', 'rect', { x: 1, y: 0, width: 10, height: 10 })).element;
    const e2 = WeaveStateManipulation.mapNodeToYjs(makeNode('m2', 'rect', { x: 2, y: 0, width: 10, height: 10 })).element;
    WeaveStateManipulation.addElements(layer, [e1, e2]);

    const u1 = WeaveStateManipulation.mapNodeToYjs(makeNode('m1', 'rect', { x: 10, y: 0, width: 10, height: 10 })).element;
    const u2 = WeaveStateManipulation.mapNodeToYjs(makeNode('m2', 'rect', { x: 20, y: 0, width: 10, height: 10 })).element;
    WeaveStateManipulation.updateElements(layer, [
      { nodeId: 'm1', element: u1 },
      { nodeId: 'm2', element: u2 },
    ]);

    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    const p1 = (children.get(0) as Y.Map<unknown>).get('props') as Y.Map<unknown>;
    const p2 = (children.get(1) as Y.Map<unknown>).get('props') as Y.Map<unknown>;
    expect(p1.get('x')).toBe(10);
    expect(p2.get('x')).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: deleteElements
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.deleteElements', () => {
  it('removes element at correct index', () => {
    const { layer } = makeLayerDoc();
    const e = WeaveStateManipulation.mapNodeToYjs(makeNode('d1', 'rect')).element;
    WeaveStateManipulation.addElements(layer, [e]);

    WeaveStateManipulation.deleteElements(layer, ['d1']);

    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(0);
  });

  it('does nothing when id not found', () => {
    const { layer } = makeLayerDoc();
    const e = WeaveStateManipulation.mapNodeToYjs(makeNode('keep', 'rect')).element;
    WeaveStateManipulation.addElements(layer, [e]);

    WeaveStateManipulation.deleteElements(layer, ['nope']);

    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(1);
  });

  it('deletes multiple elements', () => {
    const { layer } = makeLayerDoc();
    const e1 = WeaveStateManipulation.mapNodeToYjs(makeNode('del1', 'rect')).element;
    const e2 = WeaveStateManipulation.mapNodeToYjs(makeNode('del2', 'rect')).element;
    const e3 = WeaveStateManipulation.mapNodeToYjs(makeNode('keep2', 'rect')).element;
    WeaveStateManipulation.addElements(layer, [e1, e2, e3]);

    WeaveStateManipulation.deleteElements(layer, ['del1', 'del2']);

    const children = (layer.get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
    expect(children.length).toBe(1);
    expect((children.get(0) as Y.Map<unknown>).get('key')).toBe('keep2');
  });
});

// ---------------------------------------------------------------------------
// Suite 7: getYjsElement
// ---------------------------------------------------------------------------

function makeStageDoc(): Y.Doc {
  const doc = new Y.Doc();
  const stage = doc.getMap('weave');
  const stageProps = new Y.Map<unknown>();
  stageProps.set('children', new Y.Array());
  stage.set('props', stageProps);
  return doc;
}

function getStageChildren(doc: Y.Doc): Y.Array<unknown> {
  return (doc.getMap('weave').get('props') as Y.Map<unknown>).get('children') as Y.Array<unknown>;
}

function addStageChild(doc: Y.Doc, id: string, grandChildren?: Y.Map<unknown>[]): Y.Map<unknown> {
  const child = new Y.Map<unknown>();
  const props = new Y.Map<unknown>();
  props.set('id', id);
  if (grandChildren && grandChildren.length > 0) {
    const gcArr = new Y.Array<Y.Map<unknown>>();
    gcArr.push(grandChildren);
    props.set('children', gcArr);
  }
  child.set('props', props);
  getStageChildren(doc).push([child]);
  return child;
}

describe('WeaveStateManipulation.getYjsElement', () => {
  it('returns null when stage has no children', () => {
    const doc = makeStageDoc();
    expect(WeaveStateManipulation.getYjsElement(doc, 'anything')).toBeNull();
  });

  it('finds a direct child by props.id', () => {
    const doc = makeStageDoc();
    addStageChild(doc, 'child-a');
    const result = WeaveStateManipulation.getYjsElement(doc, 'child-a');
    expect(result).not.toBeNull();
    expect((result!.get('props') as Y.Map<unknown>).get('id')).toBe('child-a');
  });

  it('returns null when id not matched in direct children', () => {
    const doc = makeStageDoc();
    addStageChild(doc, 'child-x');
    expect(WeaveStateManipulation.getYjsElement(doc, 'missing')).toBeNull();
  });

  it('finds a grandchild by props.id', () => {
    const doc = makeStageDoc();
    const grandChild = new Y.Map<unknown>();
    const gcProps = new Y.Map<unknown>();
    gcProps.set('id', 'grandkid-1');
    grandChild.set('props', gcProps);
    addStageChild(doc, 'parent-1', [grandChild]);

    const result = WeaveStateManipulation.getYjsElement(doc, 'grandkid-1');
    expect(result).not.toBeNull();
    expect((result!.get('props') as Y.Map<unknown>).get('id')).toBe('grandkid-1');
  });

  it('returns null when id not found at any level', () => {
    const doc = makeStageDoc();
    const grandChild = new Y.Map<unknown>();
    const gcProps = new Y.Map<unknown>();
    gcProps.set('id', 'gc-known');
    grandChild.set('props', gcProps);
    addStageChild(doc, 'parent-2', [grandChild]);

    expect(WeaveStateManipulation.getYjsElement(doc, 'ghost')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 8: getNodesBoundingBox
// ---------------------------------------------------------------------------

describe('WeaveStateManipulation.getNodesBoundingBox', () => {
  it('single node — bbox equals node dimensions', () => {
    const nodes = [makeNode('n', 'rect', { x: 10, y: 20, width: 50, height: 30 })];
    const bb = WeaveStateManipulation.getNodesBoundingBox(nodes as never);
    expect(bb).toEqual({ x: 10, y: 20, width: 50, height: 30 });
  });

  it('two non-overlapping nodes — correct union bbox', () => {
    const nodes = [
      makeNode('a', 'rect', { x: 0, y: 0, width: 10, height: 10 }),
      makeNode('b', 'rect', { x: 20, y: 30, width: 15, height: 5 }),
    ];
    const bb = WeaveStateManipulation.getNodesBoundingBox(nodes as never);
    expect(bb).toEqual({ x: 0, y: 0, width: 35, height: 35 });
  });

  it('overlapping nodes — correct enclosing bbox', () => {
    const nodes = [
      makeNode('c', 'rect', { x: 5, y: 5, width: 20, height: 20 }),
      makeNode('d', 'rect', { x: 10, y: 10, width: 30, height: 30 }),
    ];
    const bb = WeaveStateManipulation.getNodesBoundingBox(nodes as never);
    expect(bb).toEqual({ x: 5, y: 5, width: 35, height: 35 });
  });
});
