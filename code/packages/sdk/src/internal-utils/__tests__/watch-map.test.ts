// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { watchMap } from '../watch-map';

describe('watchMap', () => {
  // ---------------------------------------------------------------------------
  // Suite 1: set
  // ---------------------------------------------------------------------------

  describe('set', () => {
    it('fires onChange with type "add" when key is new', () => {
      const onChange = vi.fn();
      const map = watchMap<string, number>(onChange);

      map.set('x', 42);

      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith({
        type: 'add',
        key: 'x',
        value: 42,
        prevValue: undefined,
        size: 1,
      });
    });

    it('fires onChange with type "update" and prevValue when key already exists', () => {
      const onChange = vi.fn();
      const map = watchMap<string, number>(onChange);
      map.set('x', 1);
      onChange.mockClear();

      map.set('x', 99);

      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith({
        type: 'update',
        key: 'x',
        value: 99,
        prevValue: 1,
        size: 1,
      });
    });

    it('returns the proxy (enabling chaining)', () => {
      const map = watchMap<string, number>(vi.fn());
      const result = map.set('a', 1);
      expect(result).toBe(map);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 2: delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    it('fires onChange with type "delete" and returns true for an existing key', () => {
      const onChange = vi.fn();
      const map = watchMap<string, number>(onChange);
      map.set('k', 7);
      onChange.mockClear();

      const result = map.delete('k');

      expect(result).toBe(true);
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith({
        type: 'delete',
        key: 'k',
        prevValue: 7,
        size: 0,
      });
    });

    it('does NOT fire onChange and returns false for a non-existing key', () => {
      const onChange = vi.fn();
      const map = watchMap<string, number>(onChange);

      const result = map.delete('missing');

      expect(result).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 3: clear
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('fires onChange with type "clear" when map is non-empty', () => {
      const onChange = vi.fn();
      const map = watchMap<string, number>(onChange);
      map.set('a', 1);
      map.set('b', 2);
      onChange.mockClear();

      map.clear();

      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith({ type: 'clear', size: 0 });
      expect(map.has('a')).toBe(false);
    });

    it('does NOT fire onChange when map is already empty', () => {
      const onChange = vi.fn();
      const map = watchMap<string, number>(onChange);

      map.clear();

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 4: proxy fallback (non-intercepted operations)
  // ---------------------------------------------------------------------------

  describe('proxy fallback', () => {
    let map: Map<string, number>;
    let onChange: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onChange = vi.fn();
      map = watchMap<string, number>(onChange);
      map.set('a', 1);
      map.set('b', 2);
      onChange.mockClear();
    });

    it('has() returns correct result through the proxy', () => {
      expect(map.has('a')).toBe(true);
      expect(map.has('z')).toBe(false);
    });

    it('get() returns correct value through the proxy', () => {
      expect(map.get('a')).toBe(1);
      expect(map.get('z')).toBeUndefined();
    });

    it('non-existent property returns undefined (non-function fallback path)', () => {
      // Accessing a non-existent property falls through the `return value` branch
      // (value is undefined, which is not a function)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((map as any)['__notAKey__']).toBeUndefined();
    });

    it('forEach iterates all entries through the proxy', () => {
      const collected: [string, number][] = [];
      map.forEach((value, key) => collected.push([key, value]));
      expect(collected).toEqual(
        expect.arrayContaining([
          ['a', 1],
          ['b', 2],
        ])
      );
      expect(collected).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Suite 5: default / custom map parameter
  // ---------------------------------------------------------------------------

  describe('default and custom map parameter', () => {
    it('starts as an empty Map when no second argument is provided', () => {
      const map = watchMap<string, number>(vi.fn());
      expect(map.has('anything')).toBe(false);
      map.set('x', 5);
      expect(map.get('x')).toBe(5);
    });

    it('uses the provided Map as backing store (initial data accessible)', () => {
      const backing = new Map<string, number>([['pre', 99]]);
      const map = watchMap<string, number>(vi.fn(), backing);
      expect(map.get('pre')).toBe(99);
      map.set('extra', 1);
      expect(backing.get('extra')).toBe(1);
    });
  });
});
