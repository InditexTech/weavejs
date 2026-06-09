// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOffscreenCanvas(width: number, height: number) {
  const fakeBuffer = new ArrayBuffer(3);
  const fakeBlob = {
    arrayBuffer: vi.fn().mockResolvedValue(fakeBuffer),
  };
  return {
    width,
    height,
    _fakeBuffer: fakeBuffer,
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }),
    convertToBlob: vi.fn().mockResolvedValue(fakeBlob),
  };
}

function makeBitmap(width: number, height: number) {
  return { width, height };
}

// ─── Suite 13: stage-minimap.worker.ts ───────────────────────────────────────

describe('stage-minimap.worker — onmessage handler', () => {
  let offscreenCanvasInstances: ReturnType<typeof makeOffscreenCanvas>[];
  let postedMessages: { data: unknown; transfer?: unknown[] }[];
  let capturedOnMessage: ((e: MessageEvent) => Promise<void>) | null = null;

  beforeEach(() => {
    offscreenCanvasInstances = [];
    postedMessages = [];

    vi.stubGlobal(
      'OffscreenCanvas',
      vi.fn().mockImplementation((w: number, h: number) => {
        const inst = makeOffscreenCanvas(w, h);
        offscreenCanvasInstances.push(inst);
        return inst;
      })
    );

    vi.stubGlobal('postMessage', vi.fn((data: unknown, transfer?: unknown[]) => {
      postedMessages.push({ data, transfer });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
    capturedOnMessage = null;
  });

  it('13.1 returns early without creating OffscreenCanvas when bitmap width and height are 0', async () => {
    await import('../stage-minimap.worker');
    capturedOnMessage = (globalThis as Record<string, unknown>).onmessage as
      (e: MessageEvent) => Promise<void>;

    const bitmap = makeBitmap(0, 0);
    await capturedOnMessage({ data: { bitmap } } as unknown as MessageEvent);

    expect(OffscreenCanvas).not.toHaveBeenCalled();
    expect(postedMessages).toHaveLength(0);
  });

  it('13.2 creates OffscreenCanvas with bitmap dimensions when non-zero', async () => {
    await import('../stage-minimap.worker');
    capturedOnMessage = (globalThis as Record<string, unknown>).onmessage as
      (e: MessageEvent) => Promise<void>;

    const bitmap = makeBitmap(100, 80);
    await capturedOnMessage({ data: { bitmap } } as unknown as MessageEvent);

    expect(OffscreenCanvas).toHaveBeenCalledWith(100, 80);
  });

  it('13.3 calls ctx.drawImage(bitmap, 0, 0)', async () => {
    await import('../stage-minimap.worker');
    capturedOnMessage = (globalThis as Record<string, unknown>).onmessage as
      (e: MessageEvent) => Promise<void>;

    const bitmap = makeBitmap(100, 80);
    await capturedOnMessage({ data: { bitmap } } as unknown as MessageEvent);

    const ctx = offscreenCanvasInstances[0].getContext.mock.results[0].value as {
      drawImage: ReturnType<typeof vi.fn>;
    };
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
  });

  it('13.4 calls canvas.convertToBlob with type image/png', async () => {
    await import('../stage-minimap.worker');
    capturedOnMessage = (globalThis as Record<string, unknown>).onmessage as
      (e: MessageEvent) => Promise<void>;

    const bitmap = makeBitmap(100, 80);
    await capturedOnMessage({ data: { bitmap } } as unknown as MessageEvent);

    expect(offscreenCanvasInstances[0].convertToBlob).toHaveBeenCalledWith({
      type: 'image/png',
    });
  });

  it('13.5 posts message with buffer, width, height and transfers the buffer', async () => {
    await import('../stage-minimap.worker');
    capturedOnMessage = (globalThis as Record<string, unknown>).onmessage as
      (e: MessageEvent) => Promise<void>;

    const bitmap = makeBitmap(100, 80);
    await capturedOnMessage({ data: { bitmap } } as unknown as MessageEvent);

    expect(postedMessages).toHaveLength(1);
    const msg = postedMessages[0];
    expect((msg.data as Record<string, unknown>).width).toBe(100);
    expect((msg.data as Record<string, unknown>).height).toBe(80);
    expect(msg.data).toHaveProperty('buffer');
    // buffer should be the first transferred item
    const transferred = msg.transfer as unknown[];
    expect(transferred).toHaveLength(1);
    expect(transferred[0]).toBe((msg.data as Record<string, unknown>).buffer);
  });
});
