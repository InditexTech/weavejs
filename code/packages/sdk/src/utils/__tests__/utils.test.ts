// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import {
  canComposite,
  containsNodeDeep,
  hasFrames,
  hasImages,
  intersectArrays,
  isInShadowDOM,
  isIOS,
  isNodeInSelection,
  isNumber,
  isServer,
  memoize,
  mergeExceptArrays,
  resetScale,
  getTopmostShadowHost,
} from '../utils';

// ---------------------------------------------------------------------------
// Suite 1 — isNumber
// ---------------------------------------------------------------------------

describe('1 — isNumber', () => {
  it('1.1 a plain number returns true', () => {
    expect(isNumber(42)).toBe(true);
  });

  it('1.2 NaN returns false', () => {
    expect(isNumber(Number.NaN)).toBe(false);
  });

  it('1.3 a string returns false', () => {
    expect(isNumber('42')).toBe(false);
  });

  it('1.4 undefined returns false', () => {
    expect(isNumber(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — isServer
// ---------------------------------------------------------------------------

describe('2 — isServer', () => {
  it('2.1 returns false when window is defined (jsdom)', () => {
    expect(isServer()).toBe(false);
  });

  it('2.2 returns true when window is undefined', () => {
    const orig = globalThis.window;
    // @ts-expect-error — intentionally removing window
    delete globalThis.window;
    expect(isServer()).toBe(true);
    // Restore
    globalThis.window = orig;
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — mergeExceptArrays
// ---------------------------------------------------------------------------

describe('3 — mergeExceptArrays', () => {
  it('3.1 source primitives override object defaults', () => {
    const result = mergeExceptArrays({ a: 1, b: 2 }, { b: 99 });
    expect(result).toEqual({ a: 1, b: 99 });
  });

  it('3.2 arrays in source replace (not merge) arrays in object', () => {
    const result = mergeExceptArrays({ tags: ['a', 'b'] }, { tags: ['c'] });
    expect(result.tags).toEqual(['c']);
  });

  it('3.3 undefined source leaves object values intact', () => {
    const result = mergeExceptArrays({ x: 10 }, undefined as unknown as Record<string, number>);
    expect(result.x).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — intersectArrays
// ---------------------------------------------------------------------------

describe('4 — intersectArrays', () => {
  it('4.1 empty outer array returns []', () => {
    expect(intersectArrays([])).toEqual([]);
  });

  it('4.2 one empty sub-array returns []', () => {
    expect(intersectArrays([[1, 2], [], [1, 3]])).toEqual([]);
  });

  it('4.3 single array returns all its elements', () => {
    expect(intersectArrays([[1, 2, 3]])).toEqual([1, 2, 3]);
  });

  it('4.4 two arrays — returns common elements', () => {
    expect(intersectArrays([[1, 2, 3], [2, 3, 4]])).toEqual([2, 3]);
  });

  it('4.5 three arrays — smallest used as base, result is correct intersection', () => {
    expect(
      intersectArrays([[1, 2, 3, 4], [2, 3, 4, 5], [3, 4]])
    ).toEqual([3, 4]);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — isNodeInSelection
// ---------------------------------------------------------------------------

describe('5 — isNodeInSelection', () => {
  it('5.1 node id is in the list returns true', () => {
    const node = new Konva.Rect({ id: 'abc' });
    const other = new Konva.Rect({ id: 'abc' });
    expect(isNodeInSelection(node, [other])).toBe(true);
  });

  it('5.2 node id not in list returns false', () => {
    const node = new Konva.Rect({ id: 'abc' });
    const other = new Konva.Rect({ id: 'xyz' });
    expect(isNodeInSelection(node, [other])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — containsNodeDeep
// ---------------------------------------------------------------------------

describe('6 — containsNodeDeep', () => {
  it('6.1 direct match returns true', () => {
    const node = new Konva.Rect({ id: 'n1' });
    expect(containsNodeDeep([node], node)).toBe(true);
  });

  it('6.2 deep child match returns true', () => {
    const child = new Konva.Rect({ id: 'child' });
    const parent = new Konva.Group({ id: 'parent' });
    parent.add(child);
    expect(containsNodeDeep([parent], child)).toBe(true);
  });

  it('6.3 target not present returns false', () => {
    const node = new Konva.Rect({ id: 'n1' });
    const other = new Konva.Rect({ id: 'other' });
    expect(containsNodeDeep([node], other)).toBe(false);
  });

  it('6.4 node without hasChildren does not crash', () => {
    const node = new Konva.Rect({ id: 'n1' });
    const target = new Konva.Rect({ id: 'target' });
    // Rect has no children API in konva — hasChildren should be falsy
    expect(containsNodeDeep([node], target)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — resetScale
// ---------------------------------------------------------------------------

describe('7 — resetScale', () => {
  it('7.1 multiplies width/height by scale and resets scale to 1', () => {
    const rect = new Konva.Rect({ width: 100, height: 50, scaleX: 2, scaleY: 3 });
    resetScale(rect);
    expect(rect.width()).toBe(200);
    expect(rect.height()).toBe(150);
    expect(rect.scaleX()).toBe(1);
    expect(rect.scaleY()).toBe(1);
  });

  it('7.2 dimension < 1 is clamped to 1', () => {
    const rect = new Konva.Rect({ width: 0, height: 0, scaleX: 0.5, scaleY: 0.5 });
    resetScale(rect);
    // Math.max(1, 0 * 0.5) = 1
    expect(rect.width()).toBe(1);
    expect(rect.height()).toBe(1);
  });

  it('7.3 x, y, rotation are rounded to 2 decimal places', () => {
    const rect = new Konva.Rect({ x: 10.123456, y: 20.987654, rotation: 45.999999, scaleX: 1, scaleY: 1, width: 100, height: 50 });
    resetScale(rect);
    expect(rect.x()).toBeCloseTo(10.12, 2);
    expect(rect.y()).toBeCloseTo(20.99, 2);
    expect(rect.rotation()).toBeCloseTo(46.0, 2);
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — hasImages
// ---------------------------------------------------------------------------

describe('8 — hasImages', () => {
  it('8.1 nodeType === "image" returns true', () => {
    const node = new Konva.Rect({ nodeType: 'image' });
    expect(hasImages(node)).toBe(true);
  });

  it('8.2 nodeType === "group" with image child returns true', () => {
    const group = new Konva.Group({ nodeType: 'group' });
    group.add(new Konva.Rect({ nodeType: 'image' }));
    expect(hasImages(group)).toBe(true);
  });

  it('8.3 nodeType === "group" with no image child returns false', () => {
    const group = new Konva.Group({ nodeType: 'group' });
    group.add(new Konva.Rect({ nodeType: 'rectangle' }));
    expect(hasImages(group)).toBe(false);
  });

  it('8.4 other nodeType (not image, not group) returns false', () => {
    const node = new Konva.Rect({ nodeType: 'rectangle' });
    expect(hasImages(node)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 9 — hasFrames
// ---------------------------------------------------------------------------

describe('9 — hasFrames', () => {
  it('9.1 nodeType === "frame" returns true', () => {
    const node = new Konva.Rect({ nodeType: 'frame' });
    expect(hasFrames(node)).toBe(true);
  });

  it('9.2 nodeType === "group" with frame child returns true', () => {
    const group = new Konva.Group({ nodeType: 'group' });
    group.add(new Konva.Rect({ nodeType: 'frame' }));
    expect(hasFrames(group)).toBe(true);
  });

  it('9.3 nodeType === "group" with no frame child returns false', () => {
    const group = new Konva.Group({ nodeType: 'group' });
    group.add(new Konva.Rect({ nodeType: 'rectangle' }));
    expect(hasFrames(group)).toBe(false);
  });

  it('9.4 other nodeType (not frame, not group) returns false', () => {
    const node = new Konva.Rect({ nodeType: 'rectangle' });
    expect(hasFrames(node)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 10 — canComposite
// ---------------------------------------------------------------------------

describe('10 — canComposite', () => {
  it('10.1 parent is Group with no nodeType or nodeId returns true', () => {
    const parent = new Konva.Group();
    const child = new Konva.Rect();
    parent.add(child);
    expect(canComposite(child)).toBe(true);
  });

  it('10.2 parent is Group with nodeType="frame" returns false', () => {
    const parent = new Konva.Group({ nodeType: 'frame' });
    const child = new Konva.Rect();
    parent.add(child);
    expect(canComposite(child)).toBe(false);
  });

  it('10.3 parent is Group with nodeId set returns false', () => {
    const parent = new Konva.Group({ nodeId: 'some-id' });
    const child = new Konva.Rect();
    parent.add(child);
    expect(canComposite(child)).toBe(false);
  });

  it('10.4 parent is a Layer (not Group className) returns false', () => {
    const layer = new Konva.Layer();
    const child = new Konva.Rect();
    layer.add(child);
    expect(canComposite(child)).toBe(false);
  });

  it('10.5 node with no parent returns false', () => {
    const node = new Konva.Rect();
    expect(canComposite(node)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 11 — memoize
// ---------------------------------------------------------------------------

describe('11 — memoize', () => {
  it('11.1 first call executes the function', () => {
    const fn = vi.fn().mockReturnValue(42);
    const memoized = memoize(fn);
    expect(memoized(1, 2)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('11.2 same args returns cached result without calling fn again', () => {
    const fn = vi.fn().mockReturnValue(42);
    const memoized = memoize(fn);
    memoized(1, 2);
    memoized(1, 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('11.3 different args call fn again with correct result', () => {
    const fn = vi.fn().mockImplementation((x: number) => x * 2);
    const memoized = memoize(fn);
    expect(memoized(3)).toBe(6);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 12 — isIOS
// ---------------------------------------------------------------------------

describe('12 — isIOS', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('12.1 iPhone userAgent returns true', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    );
    expect(isIOS()).toBe(true);
  });

  it('12.2 Mac userAgent with ontouchend in document returns true', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    );
    // jsdom doesn't add 'ontouchend', so inject it
    Object.defineProperty(document, 'ontouchend', {
      value: vi.fn(),
      configurable: true,
    });
    expect(isIOS()).toBe(true);
    // Cleanup
    Object.defineProperty(document, 'ontouchend', { value: undefined, configurable: true });
  });

  it('12.3 Windows Chrome returns false', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0'
    );
    expect(isIOS()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 13 — isInShadowDOM
// ---------------------------------------------------------------------------

describe('13 — isInShadowDOM', () => {
  it('13.1 element attached to document returns false', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(isInShadowDOM(el)).toBe(false);
    el.remove();
  });

  it('13.2 element inside a shadow root returns true', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    shadow.appendChild(inner);

    expect(isInShadowDOM(inner)).toBe(true);
    host.remove();
  });

  it('13.3 null element does not throw and returns false', () => {
    expect(isInShadowDOM(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 14 — getTopmostShadowHost
// ---------------------------------------------------------------------------

describe('14 — getTopmostShadowHost', () => {
  it('14.1 element in regular DOM returns null', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(getTopmostShadowHost(el)).toBeNull();
    el.remove();
  });

  it('14.2 element in one shadow root returns the host shadowRoot', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    shadow.appendChild(inner);

    const result = getTopmostShadowHost(inner);
    expect(result).toBe(host.shadowRoot);
    host.remove();
  });

  it('14.3 nested shadow DOM returns the outermost host shadowRoot', () => {
    const outerHost = document.createElement('div');
    document.body.appendChild(outerHost);
    const outerShadow = outerHost.attachShadow({ mode: 'open' });

    const innerHost = document.createElement('div');
    outerShadow.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({ mode: 'open' });

    const deepEl = document.createElement('span');
    innerShadow.appendChild(deepEl);

    const result = getTopmostShadowHost(deepEl);
    expect(result).toBe(outerHost.shadowRoot);
    outerHost.remove();
  });

  it('14.4 null element returns null', () => {
    expect(getTopmostShadowHost(null)).toBeNull();
  });
});
