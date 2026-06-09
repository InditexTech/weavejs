// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import {
  downscaleImageFile,
  downscaleImageFromURL,
  getDownscaleRatio,
  getImageSizeFromFile,
  loadImageSource,
} from '../image';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name = 'test.png', type = 'image/png'): File {
  return new File([''], name, { type });
}

function makeFakeCanvas(overrides: Partial<{
  dataURL: string;
  blob: Blob | null;
}> = {}) {
  const dataURL = overrides.dataURL ?? 'data:image/png;base64,MOCK';
  const blob = overrides.blob ?? new Blob([''], { type: 'image/png' });

  const ctx = {
    drawImage: vi.fn(),
  };

  return {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(ctx),
    toDataURL: vi.fn().mockReturnValue(dataURL),
    toBlob: vi.fn().mockImplementation((cb: (b: Blob | null) => void) => cb(blob)),
    remove: vi.fn(),
    _ctx: ctx,
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — getDownscaleRatio
// ---------------------------------------------------------------------------

describe('1 — getDownscaleRatio', () => {
  it('1.1 image fits within default max (200×200) — returns 1', () => {
    expect(getDownscaleRatio(100, 100)).toBe(1);
  });

  it('1.2 width is the bottleneck — returns width ratio', () => {
    // 400 × 200, maxWidth=200, maxHeight=200: widthRatio=0.5, heightRatio=1 → min=0.5
    expect(getDownscaleRatio(400, 200)).toBe(0.5);
  });

  it('1.3 height is the bottleneck — returns height ratio', () => {
    // 100 × 600: widthRatio=2, heightRatio=1/3 → min=1/3
    expect(getDownscaleRatio(100, 600)).toBeCloseTo(1 / 3, 10);
  });

  it('1.4 both exceed max — min ratio used', () => {
    // 400 × 600: widthRatio=0.5, heightRatio=1/3 → min=1/3
    expect(getDownscaleRatio(400, 600)).toBeCloseTo(1 / 3, 10);
  });

  it('1.5 custom maxWidth / maxHeight options applied', () => {
    // 400 × 200, max 100×100: widthRatio=0.25, heightRatio=0.5 → 0.25
    expect(getDownscaleRatio(400, 200, { maxWidth: 100, maxHeight: 100 })).toBe(0.25);
  });

  it('1.6 already smaller than max — capped at 1 (no upscale)', () => {
    // 50 × 50, max 200×200: widthRatio=4, heightRatio=4 → min(4,4,1)=1
    expect(getDownscaleRatio(50, 50)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — loadImageSource
// ---------------------------------------------------------------------------

describe('2 — loadImageSource', () => {
  let capturedReader: {
    result: string;
    onloadend: (() => void) | null;
    onerror: (() => void) | null;
    readAsDataURL: ReturnType<typeof vi.fn>;
  };
  let capturedImageElement: {
    crossOrigin: string | null;
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  };

  beforeEach(() => {
    vi.stubGlobal('FileReader', function (this: typeof capturedReader) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      capturedReader = this; // NOSONAR
      this.result = 'data:image/png;base64,FAKE';
      this.onloadend = null;
      this.onerror = null;
      this.readAsDataURL = vi.fn();
    });

    vi.spyOn(Konva.Util, 'createImageElement').mockImplementation(() => {
      const el = {
        crossOrigin: null as string | null,
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      capturedImageElement = el;
      return el as unknown as HTMLImageElement;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('2.1 resolves with image element on successful read + load', async () => {
    const file = makeFile();
    const promise = loadImageSource(file);

    capturedReader.onloadend!();
    capturedImageElement.onload!();

    const result = await promise;
    expect(result).toBe(capturedImageElement);
  });

  it('2.2 default crossOrigin is "anonymous"', async () => {
    const file = makeFile();
    const promise = loadImageSource(file);

    capturedReader.onloadend!();
    capturedImageElement.onload!();
    await promise;

    expect(capturedImageElement.crossOrigin).toBe('anonymous');
  });

  it('2.3 custom crossOrigin option is applied', async () => {
    const file = makeFile();
    const promise = loadImageSource(file, { crossOrigin: 'use-credentials' });

    capturedReader.onloadend!();
    capturedImageElement.onload!();
    await promise;

    expect(capturedImageElement.crossOrigin).toBe('use-credentials');
  });

  it('2.4 imageSource.src is set to reader.result', async () => {
    const file = makeFile();
    const promise = loadImageSource(file);

    capturedReader.onloadend!();
    capturedImageElement.onload!();
    await promise;

    expect(capturedImageElement.src).toBe('data:image/png;base64,FAKE');
  });

  it('2.5 image onerror rejects with "Failed to load image source"', async () => {
    const file = makeFile();
    const promise = loadImageSource(file);

    capturedReader.onloadend!();
    capturedImageElement.onerror!();

    await expect(promise).rejects.toThrow('Failed to load image source');
  });

  it('2.6 reader onerror rejects with "Failed to read image file"', async () => {
    const file = makeFile();
    const promise = loadImageSource(file);

    capturedReader.onerror!();

    await expect(promise).rejects.toThrow('Failed to read image file');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — downscaleImageFile
// ---------------------------------------------------------------------------

describe('3 — downscaleImageFile', () => {
  let fakeCanvas: ReturnType<typeof makeFakeCanvas>;
  let fakeBitmap: { width: number; height: number; close?: () => void };

  beforeEach(() => {
    fakeCanvas = makeFakeCanvas();
    fakeBitmap = { width: 200, height: 100 };

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue(fakeBitmap)
    );

    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string) =>
        (tag === 'canvas'
          ? fakeCanvas
          : document.createElement(tag)) as unknown as HTMLElement
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('3.1 resolves with a Blob for a valid image with ratio 0.5', async () => {
    const file = makeFile();
    const blob = await downscaleImageFile(file, 0.5);

    expect(blob).toBeInstanceOf(Blob);
    expect(fakeCanvas.width).toBe(100);  // 200 * 0.5
    expect(fakeCanvas.height).toBe(50);  // 100 * 0.5
  });

  it('3.2 ratio 1.0 keeps original dimensions', async () => {
    const file = makeFile();
    await downscaleImageFile(file, 1);

    expect(fakeCanvas.width).toBe(200);
    expect(fakeCanvas.height).toBe(100);
  });

  it('3.3 bitmap width === 0 throws "Invalid image"', async () => {
    fakeBitmap.width = 0;
    const file = makeFile();

    await expect(downscaleImageFile(file, 0.5)).rejects.toThrow('Invalid image');
  });

  it('3.4 ctx.drawImage called with correct arguments', async () => {
    const file = makeFile();
    await downscaleImageFile(file, 0.5);

    expect(fakeCanvas._ctx.drawImage).toHaveBeenCalledWith(fakeBitmap, 0, 0, 100, 50);
  });

  it('3.5 canvas.remove() is called after drawing', async () => {
    const file = makeFile();
    await downscaleImageFile(file, 0.5);

    expect(fakeCanvas.remove).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — getImageSizeFromFile
// ---------------------------------------------------------------------------

describe('4 — getImageSizeFromFile', () => {
  let capturedImg: {
    naturalWidth: number;
    naturalHeight: number;
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  };
  let objectURL: string;

  beforeEach(() => {
    objectURL = 'blob:http://localhost/fake-id';

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue(objectURL),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal('Image', function (this: typeof capturedImg) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      capturedImg = this; // NOSONAR
      this.naturalWidth = 800;
      this.naturalHeight = 600;
      this.src = '';
      this.onload = null;
      this.onerror = null;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('4.1 resolves with naturalWidth and naturalHeight on load', async () => {
    const file = makeFile();
    const promise = getImageSizeFromFile(file);

    capturedImg.onload!();

    const result = await promise;
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it('4.2 URL.createObjectURL called and src set to that url', async () => {
    const file = makeFile();
    const promise = getImageSizeFromFile(file);

    capturedImg.onload!();
    await promise;

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(capturedImg.src).toBe(objectURL);
  });

  it('4.3 URL.revokeObjectURL called after successful load', async () => {
    const file = makeFile();
    const promise = getImageSizeFromFile(file);

    capturedImg.onload!();
    await promise;

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectURL);
  });

  it('4.4 naturalWidth === 0 rejects with "Invalid image"', async () => {
    const file = makeFile();
    const promise = getImageSizeFromFile(file);

    capturedImg.naturalWidth = 0;
    capturedImg.onload!();

    await expect(promise).rejects.toThrow('Invalid image');
  });

  it('4.5 image onerror rejects with "Invalid image"', async () => {
    const file = makeFile();
    const promise = getImageSizeFromFile(file);

    capturedImg.onerror!();

    await expect(promise).rejects.toThrow('Invalid image');
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — downscaleImageFromURL
// ---------------------------------------------------------------------------

describe('5 — downscaleImageFromURL', () => {
  let capturedImg: {
    naturalWidth: number;
    naturalHeight: number;
    width: number;
    height: number;
    crossOrigin: string | null;
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  };
  let fakeCanvas: ReturnType<typeof makeFakeCanvas>;

  beforeEach(() => {
    fakeCanvas = makeFakeCanvas();

    vi.stubGlobal('Image', function (this: typeof capturedImg) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      capturedImg = this; // NOSONAR
      this.naturalWidth = 800;
      this.naturalHeight = 600;
      this.width = 800;
      this.height = 600;
      this.crossOrigin = null;
      this.src = '';
      this.onload = null;
      this.onerror = null;
    });

    vi.spyOn(document, 'createElement').mockImplementation(
      (tag: string) =>
        (tag === 'canvas'
          ? fakeCanvas
          : document.createElement(tag)) as unknown as HTMLElement
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('5.1 image within max bounds — ratio 1, canvas matches original size', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png');

    capturedImg.width = 100;
    capturedImg.height = 100;
    capturedImg.naturalWidth = 100;
    capturedImg.onload!();

    await promise;

    expect(fakeCanvas.width).toBe(100);
    expect(fakeCanvas.height).toBe(100);
  });

  it('5.2 image wider than maxWidth — width-limited scaling', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png', {
      maxWidth: 200,
      maxHeight: 200,
    });

    capturedImg.width = 400;
    capturedImg.height = 100;
    capturedImg.naturalWidth = 400;
    capturedImg.onload!();

    await promise;

    // ratio = min(200/400, 200/100, 1) = 0.5
    expect(fakeCanvas.width).toBe(200);
    expect(fakeCanvas.height).toBe(50);
  });

  it('5.3 image taller than maxHeight — height-limited scaling', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png', {
      maxWidth: 200,
      maxHeight: 200,
    });

    capturedImg.width = 100;
    capturedImg.height = 600;
    capturedImg.naturalWidth = 100;
    capturedImg.onload!();

    await promise;

    // ratio = min(2, 200/600, 1) ≈ 0.333
    const expectedRatio = 200 / 600;
    expect(fakeCanvas.width).toBe(Math.round(100 * expectedRatio));
    expect(fakeCanvas.height).toBe(Math.round(600 * expectedRatio));
  });

  it('5.4 resolves with the dataURL returned by canvas.toDataURL', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png');

    capturedImg.naturalWidth = 800;
    capturedImg.onload!();

    const result = await promise;
    expect(result).toBe('data:image/png;base64,MOCK');
  });

  it('5.5 custom type option passed to canvas.toDataURL', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png', {
      type: 'image/jpeg',
    });

    capturedImg.naturalWidth = 800;
    capturedImg.onload!();

    await promise;
    expect(fakeCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg');
  });

  it('5.6 naturalWidth === 0 rejects with "Invalid image"', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png');

    capturedImg.naturalWidth = 0;
    capturedImg.onload!();

    await expect(promise).rejects.toThrow('Invalid image');
  });

  it('5.7 image onerror rejects with "Invalid image"', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png');

    capturedImg.onerror!();

    await expect(promise).rejects.toThrow('Invalid image');
  });

  it('5.8 canvas.remove() called after drawing', async () => {
    const promise = downscaleImageFromURL('http://example.com/img.png');

    capturedImg.naturalWidth = 800;
    capturedImg.onload!();

    await promise;
    expect(fakeCanvas.remove).toHaveBeenCalled();
  });
});
