// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  getJSONFromYjsBinary,
  isArray,
  isObject,
  mapJsonToYjsArray,
  mapJsonToYjsElements,
  mapJsonToYjsMap,
  weavejsToYjsBinary,
} from '../mapping';

/** Integrates a standalone Yjs type into a doc so get/length/forEach work. */
function integrate<T>(value: T): T {
  const doc = new Y.Doc();
  doc.getMap('root').set('v', value);
  return value;
}

// ---------------------------------------------------------------------------
// Suite 1: isArray
// ---------------------------------------------------------------------------

describe('isArray', () => {
  it('returns true for an array', () => {
    expect(isArray([1, 2, 3])).toBe(true);
  });

  it('returns false for a string', () => {
    expect(isArray('hello')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isArray(null)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isArray({ a: 1 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: isObject
// ---------------------------------------------------------------------------

describe('isObject', () => {
  it('returns true for a plain object', () => {
    expect(isObject({ a: 1 })).toBe(true);
  });

  it('returns false for an array', () => {
    expect(isObject([1, 2])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isObject('text')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: mapJsonToYjsMap
// ---------------------------------------------------------------------------

describe('mapJsonToYjsMap', () => {
  it('returns an empty Y.Map for an empty object', () => {
    const result = integrate(mapJsonToYjsMap({}));
    expect(result).toBeInstanceOf(Y.Map);
    expect(result.size).toBe(0);
  });

  it('stores primitive values directly (string, number, boolean)', () => {
    const result = integrate(mapJsonToYjsMap({ label: 'rect', x: 10, visible: true }));
    expect(result.get('label')).toBe('rect');
    expect(result.get('x')).toBe(10);
    expect(result.get('visible')).toBe(true);
  });

  it('converts array values to Y.Array', () => {
    const result = integrate(mapJsonToYjsMap({ tags: ['a', 'b'] }));
    expect(result.get('tags')).toBeInstanceOf(Y.Array);
  });

  it('converts nested object values to Y.Map (recursive)', () => {
    const result = integrate(mapJsonToYjsMap({ style: { color: 'red' } }));
    const style = result.get('style');
    expect(style).toBeInstanceOf(Y.Map);
    expect((style as Y.Map<unknown>).get('color')).toBe('red');
  });

  it('handles mixed object with array, nested object, and primitive', () => {
    // Note: array values must contain objects/arrays, not primitives,
    // because Y.Array.push(primitive) throws on unintegrated arrays
    const result = integrate(
      mapJsonToYjsMap({ name: 'node', items: [{ id: 'x' }], meta: { id: 'x' } })
    );
    expect(result.get('name')).toBe('node');
    expect(result.get('items')).toBeInstanceOf(Y.Array);
    expect(result.get('meta')).toBeInstanceOf(Y.Map);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: mapJsonToYjsArray
// ---------------------------------------------------------------------------

describe('mapJsonToYjsArray', () => {
  it('returns an empty Y.Array for an empty array', () => {
    const result = integrate(mapJsonToYjsArray([]));
    expect(result).toBeInstanceOf(Y.Array);
    expect(result.length).toBe(0);
  });

  it('throws when pushing primitive items (Y.Array.push requires array wrapper)', () => {
    // The source calls array.push(item) directly for primitives, but Y.Array.push
    // requires an array argument on unintegrated arrays — this is a known limitation.
    expect(() => mapJsonToYjsArray([1, 'a', true])).toThrow();
  });

  it('converts nested array items to Y.Array (with object content)', () => {
    // Nested arrays must contain objects, not primitives (see primitive limitation above)
    const result = integrate(mapJsonToYjsArray([[{ k: 1 }]]));
    expect(result.length).toBe(1);
    const inner = result.get(0) as Y.Array<unknown>;
    expect(inner).toBeInstanceOf(Y.Array);
    expect((inner.get(0) as Y.Map<unknown>).get('k')).toBe(1);
  });

  it('converts object items to Y.Map', () => {
    const result = integrate(mapJsonToYjsArray([{ key: 'val' }]));
    expect(result.length).toBe(1);
    const item = result.get(0) as Y.Map<unknown>;
    expect(item).toBeInstanceOf(Y.Map);
    expect(item.get('key')).toBe('val');
  });
});

// ---------------------------------------------------------------------------
// Suite 5: mapJsonToYjsElements
// ---------------------------------------------------------------------------

describe('mapJsonToYjsElements', () => {
  it('returns Y.Array when input is an array of objects', () => {
    // Primitives in arrays throw; use array of objects
    const result = integrate(mapJsonToYjsElements([{ a: 1 }, { b: 2 }]));
    expect(result).toBeInstanceOf(Y.Array);
    expect((result as Y.Array<unknown>).length).toBe(2);
  });

  it('returns Y.Map when input is a plain object', () => {
    const result = integrate(mapJsonToYjsElements({ a: 1 }));
    expect(result).toBeInstanceOf(Y.Map);
    expect((result as Y.Map<unknown>).get('a')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 6: weavejsToYjsBinary + getJSONFromYjsBinary
// ---------------------------------------------------------------------------

describe('weavejsToYjsBinary and getJSONFromYjsBinary', () => {
  const sampleWeaveState = {
    weave: {
      key: 'stage-1',
      type: 'stage',
      props: {
        width: 1920,
        height: 1080,
        children: [
          { key: 'node-1', type: 'rect', props: { x: 10, y: 20 } },
        ],
      },
    },
  };

  it('weavejsToYjsBinary returns a Uint8Array', () => {
    const binary = weavejsToYjsBinary(sampleWeaveState as never);
    expect(binary).toBeInstanceOf(Uint8Array);
    expect(binary.length).toBeGreaterThan(0);
  });

  it('round-trip: binary decoded by getJSONFromYjsBinary matches original weave', () => {
    const binary = weavejsToYjsBinary(sampleWeaveState as never);
    const json = getJSONFromYjsBinary(binary);

    expect(json.key).toBe('stage-1');
    expect(json.type).toBe('stage');
    expect(json.props.width).toBe(1920);
    expect(json.props.height).toBe(1080);
    expect(Array.isArray(json.props.children)).toBe(true);
    expect(json.props.children[0].key).toBe('node-1');
  });
});
