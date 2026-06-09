// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStateAsJson, hashJson, sleep } from '../utils';
import * as Y from 'yjs';

describe('getStateAsJson', () => {
  it('returns empty object for empty document', () => {
    const doc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(doc);
    const result = getStateAsJson(state);
    expect(result).toEqual({});
  });

  it('returns correct JSON for document with weave map data', () => {
    const doc = new Y.Doc();
    const map = doc.getMap('weave');
    map.set('key1', 'value1');
    map.set('key2', 42);
    const state = Y.encodeStateAsUpdate(doc);
    const result = getStateAsJson(state);
    expect(result.key1).toBe('value1');
    expect(result.key2).toBe(42);
  });

  it('correctly applies update from another doc', () => {
    const sourceDoc = new Y.Doc();
    sourceDoc.getMap('weave').set('foo', 'bar');
    const update = Y.encodeStateAsUpdate(sourceDoc);

    const result = getStateAsJson(update);
    expect(result.foo).toBe('bar');
  });
});

describe('hashJson', () => {
  it('returns a 64-char hex string', () => {
    const hash = hashJson({ key: 'value' });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for the same input', () => {
    const obj = { a: 1, b: 'hello' };
    expect(hashJson(obj)).toBe(hashJson(obj));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashJson({ a: 1 })).not.toBe(hashJson({ a: 2 }));
  });

  it('handles empty object', () => {
    const hash = hashJson({});
    expect(hash).toHaveLength(64);
  });

  it('handles null', () => {
    const hash = hashJson(null);
    expect(hash).toHaveLength(64);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the given delay', async () => {
    let resolved = false;
    sleep(200).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
  });
});
