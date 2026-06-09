// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import {
  doPreloadCursors,
  extractCursorUrl,
  hasValidUrl,
  isAllowedUrl,
} from '../cursors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakeImage() {
  return {
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    src: '',
    width: 32,
    height: 32,
  };
}

function makeFakeCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(null),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,MOCK'),
    remove: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — isAllowedUrl
// ---------------------------------------------------------------------------

describe('1 — isAllowedUrl', () => {
  it('1.1 http URL is allowed', () => {
    expect(isAllowedUrl('http://example.com/cursor.cur')).toBe(true);
  });

  it('1.2 https URL is allowed', () => {
    expect(isAllowedUrl('https://cdn.example.com/cursor.svg')).toBe(true);
  });

  it('1.3 HTTP uppercase is allowed (case-insensitive)', () => {
    expect(isAllowedUrl('HTTP://EXAMPLE.COM/cursor.cur')).toBe(true);
  });

  it('1.4 javascript: scheme is blocked', () => {
    expect(isAllowedUrl('javascript:alert(1)')).toBe(false);
  });

  it('1.5 JAVASCRIPT: uppercase is blocked (case-insensitive)', () => {
    expect(isAllowedUrl('JAVASCRIPT:alert(1)')).toBe(false);
  });

  it('1.6 data: scheme is blocked', () => {
    expect(isAllowedUrl('data:image/png;base64,abc')).toBe(false);
  });

  it('1.7 blob: scheme is blocked', () => {
    expect(isAllowedUrl('blob:http://example.com/file')).toBe(false);
  });

  it('1.8 ftp: scheme is blocked', () => {
    expect(isAllowedUrl('ftp://files.example.com/cursor.cur')).toBe(false);
  });

  it('1.9 relative path is allowed', () => {
    expect(isAllowedUrl('cursors/pointer.cur')).toBe(true);
  });

  it('1.10 empty string is allowed (treated as relative)', () => {
    expect(isAllowedUrl('')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — hasValidUrl
// ---------------------------------------------------------------------------

describe('2 — hasValidUrl', () => {
  it('2.1 unquoted url() returns true', () => {
    expect(hasValidUrl('url(cursor.cur)')).toBe(true);
  });

  it('2.2 double-quoted url() returns true', () => {
    expect(hasValidUrl('url("cursor.cur")')).toBe(true);
  });

  it('2.3 single-quoted url() returns true', () => {
    expect(hasValidUrl("url('cursor.cur')")).toBe(true);
  });

  it('2.4 uppercase URL() is matched case-insensitively', () => {
    expect(hasValidUrl('URL(cursor.cur)')).toBe(true);
  });

  it('2.5 url() with trailing fallback token returns true', () => {
    expect(hasValidUrl('url(cursor.cur) auto')).toBe(true);
  });

  it('2.6 plain keyword without url() returns false', () => {
    expect(hasValidUrl('default')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — extractCursorUrl
// ---------------------------------------------------------------------------

describe('3 — extractCursorUrl', () => {
  it('3.1 no url() returns preload:false', () => {
    expect(extractCursorUrl('default')).toEqual({ preload: false, cursor: null });
  });

  it('3.2 unquoted relative URL is extracted', () => {
    expect(extractCursorUrl('url(cursor.cur)')).toEqual({
      preload: true,
      cursor: 'cursor.cur',
    });
  });

  it('3.3 double-quoted URL is extracted without quotes', () => {
    expect(extractCursorUrl('url("cursor.cur")')).toEqual({
      preload: true,
      cursor: 'cursor.cur',
    });
  });

  it('3.4 single-quoted URL is extracted without quotes', () => {
    expect(extractCursorUrl("url('cursor.cur')")).toEqual({
      preload: true,
      cursor: 'cursor.cur',
    });
  });

  it('3.5 whitespace inside url() is trimmed', () => {
    expect(extractCursorUrl('url(  cursor.cur  )')).toEqual({
      preload: true,
      cursor: 'cursor.cur',
    });
  });

  it('3.6 url() with trailing fallback token extracts only the url', () => {
    expect(extractCursorUrl('url(https://cdn.example.com/c.cur) auto')).toEqual({
      preload: true,
      cursor: 'https://cdn.example.com/c.cur',
    });
  });

  it('3.7 uppercase URL() is detected case-insensitively', () => {
    expect(extractCursorUrl('URL(cursor.cur)')).toEqual({
      preload: true,
      cursor: 'cursor.cur',
    });
  });

  it('3.8 data: URL is not preloaded (disallowed scheme)', () => {
    expect(extractCursorUrl('url(data:image/png;base64,abc)')).toEqual({
      preload: false,
      cursor: null,
    });
  });

  it('3.9 javascript: URL is not preloaded (disallowed scheme)', () => {
    expect(extractCursorUrl('url(javascript:alert(1))')).toEqual({
      preload: false,
      cursor: null,
    });
  });

  it('3.10 blob: URL is not preloaded (disallowed scheme)', () => {
    expect(extractCursorUrl('url(blob:http://example.com/id)')).toEqual({
      preload: false,
      cursor: null,
    });
  });

  it('3.11 https absolute URL is preloaded', () => {
    expect(extractCursorUrl('url(https://cdn.example.com/pointer.svg)')).toEqual({
      preload: true,
      cursor: 'https://cdn.example.com/pointer.svg',
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — doPreloadCursors
// ---------------------------------------------------------------------------

describe('4 — doPreloadCursors', () => {
  let fakeImage: ReturnType<typeof makeFakeImage>;
  let fakeCanvas: ReturnType<typeof makeFakeCanvas>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeImage = makeFakeImage();
    fakeCanvas = makeFakeCanvas();

    vi.spyOn(Konva.Util, 'createImageElement').mockReturnValue(
      fakeImage as unknown as HTMLImageElement
    );

    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return fakeCanvas as unknown as HTMLCanvasElement;
        }
        // Restore default behaviour for non-canvas elements
        createElementSpy.mockRestore();
        return document.createElement(tag);
      }) as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('4.1 empty cursor map resolves and calls resetCursors once', async () => {
    const setCursor = vi.fn();
    const getFallback = vi.fn();
    const resetCursors = vi.fn();

    await doPreloadCursors({}, setCursor, getFallback, resetCursors);

    expect(resetCursors).toHaveBeenCalledTimes(1);
    expect(setCursor).not.toHaveBeenCalled();
  });

  it('4.2 non-URL cursor is applied immediately via setCursor', async () => {
    const setCursor = vi.fn();
    const resetCursors = vi.fn();

    await doPreloadCursors(
      { pointer: 'default', crosshair: 'crosshair' },
      setCursor,
      vi.fn(),
      resetCursors
    );

    expect(setCursor).toHaveBeenCalledWith('pointer', 'default');
    expect(setCursor).toHaveBeenCalledWith('crosshair', 'crosshair');
    expect(Konva.Util.createImageElement).not.toHaveBeenCalled();
  });

  it('4.3 URL cursor with preload:false (disallowed scheme) skips setCursor', async () => {
    const setCursor = vi.fn();

    // data: URL → hasValidUrl true but isAllowedUrl false → preload: false
    await doPreloadCursors(
      { custom: 'url(data:image/png;base64,abc) auto' },
      setCursor,
      vi.fn(),
      vi.fn()
    );

    expect(setCursor).not.toHaveBeenCalled();
    expect(Konva.Util.createImageElement).not.toHaveBeenCalled();
  });

  it('4.4 URL cursor with image load success — setCursor called with dataURL replacement', async () => {
    const setCursor = vi.fn();
    const cursorValue = 'url(https://example.com/pointer.cur) auto';

    const preloadPromise = doPreloadCursors(
      { pointer: cursorValue },
      setCursor,
      vi.fn(),
      vi.fn()
    );

    // Trigger image load success synchronously
    fakeImage.onload!();

    await preloadPromise;

    expect(setCursor).toHaveBeenCalledTimes(1);
    const [state, value] = setCursor.mock.calls[0] as [string, string];
    expect(state).toBe('pointer');
    // The first token (url(...)) should be replaced with dataURL
    expect(value).toMatch(/^url\(data:image\/png;base64,MOCK\)/);
    // The fallback token is preserved
    expect(value).toContain('auto');
  });

  it('4.5 URL cursor with image load failure — fallback cursor applied', async () => {
    const setCursor = vi.fn();
    const getFallback = vi.fn().mockReturnValue('default');

    const preloadPromise = doPreloadCursors(
      { pointer: 'url(https://example.com/pointer.cur) auto' },
      setCursor,
      getFallback,
      vi.fn()
    );

    // Trigger image load failure synchronously
    fakeImage.onerror!();

    await preloadPromise;

    expect(getFallback).toHaveBeenCalledWith('pointer');
    expect(setCursor).toHaveBeenCalledWith('pointer', 'default');
  });

  it('4.6 mixed cursors: non-URL, success, and failure all handled', async () => {
    const setCursor = vi.fn();
    const getFallback = vi.fn().mockReturnValue('grab');

    // Two URL cursors need separate image mocks
    const image1 = makeFakeImage();
    const image2 = makeFakeImage();
    const canvas1 = makeFakeCanvas();
    const canvas2 = makeFakeCanvas();

    let imageCount = 0;
    let canvasCount = 0;

    vi.mocked(Konva.Util.createImageElement).mockImplementation(() => {
      return (imageCount++ === 0 ? image1 : image2) as unknown as HTMLImageElement;
    });

    vi.mocked(document.createElement).mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return (canvasCount++ === 0 ? canvas1 : canvas2) as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const preloadPromise = doPreloadCursors(
      {
        plain: 'default',
        success: 'url(https://example.com/ok.cur) auto',
        fail: 'url(https://example.com/fail.cur) auto',
      },
      setCursor,
      getFallback,
      vi.fn()
    );

    image1.onload!();
    image2.onerror!();

    await preloadPromise;

    // plain cursor applied immediately
    expect(setCursor).toHaveBeenCalledWith('plain', 'default');
    // success cursor applied with dataURL replacement
    const successCall = setCursor.mock.calls.find(
      (c) => (c as string[])[0] === 'success'
    ) as string[];
    expect(successCall[1]).toMatch(/^url\(data:image\/png;base64,MOCK\)/);
    // fail cursor applied with fallback
    expect(setCursor).toHaveBeenCalledWith('fail', 'grab');
  });
});
