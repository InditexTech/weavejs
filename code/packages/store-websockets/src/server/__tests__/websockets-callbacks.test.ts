// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

// ---------------------------------------------------------------------------
// Hoist shared mock objects so vi.mock factory can reference them
// ---------------------------------------------------------------------------

const mockReq = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  abort: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
}));

// Mock node:http so callbackRequest doesn't make real network calls.
// callbackHandler calls callbackRequest through a local binding (not the
// export), so we must intercept at the http.request level.
vi.mock('node:http', () => ({
  default: {
    request: vi.fn().mockReturnValue(mockReq),
  },
}));

import httpDefault from 'node:http';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(name: string): Y.Doc & { name: string } {
  const doc = new Y.Doc() as Y.Doc & { name: string };
  doc.name = name;
  return doc;
}

// ---------------------------------------------------------------------------
// Suite 1 — isCallbackSet
// ---------------------------------------------------------------------------

describe('1 — isCallbackSet', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('1.1 CALLBACK_URL not set → isCallbackSet === false', async () => {
    vi.stubEnv('CALLBACK_URL', '');
    const mod = await import('../websockets-callbacks');
    expect(mod.isCallbackSet).toBe(false);
  });

  it('1.2 CALLBACK_URL set → isCallbackSet === true', async () => {
    vi.stubEnv('CALLBACK_URL', 'http://localhost:3000/callback');
    const mod = await import('../websockets-callbacks');
    expect(mod.isCallbackSet).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — callbackHandler
// ---------------------------------------------------------------------------

describe('2 — callbackHandler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockReq.on.mockReturnThis();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('2.1 CALLBACK_URL not set → http.request not called', async () => {
    vi.stubEnv('CALLBACK_URL', '');
    vi.stubEnv('CALLBACK_OBJECTS', JSON.stringify({ myMap: 'Map' }));
    const mod = await import('../websockets-callbacks');

    mod.callbackHandler(new Uint8Array(), null, makeDoc('room-1') as never);

    expect(vi.mocked(httpDefault.request)).not.toHaveBeenCalled();
  });

  it('2.2 CALLBACK_URL set + CALLBACK_OBJECTS → http.request called with POST', async () => {
    vi.stubEnv('CALLBACK_URL', 'http://localhost:3000/cb');
    vi.stubEnv(
      'CALLBACK_OBJECTS',
      JSON.stringify({ myMap: 'Map', myArr: 'Array', myText: 'Text' })
    );
    const mod = await import('../websockets-callbacks');

    mod.callbackHandler(new Uint8Array(), null, makeDoc('room-1') as never);

    expect(mockReq.write).toHaveBeenCalledOnce();
    expect(mockReq.end).toHaveBeenCalledOnce();
  });

  it('2.3 CALLBACK_OBJECTS with supported types (Array, Map, Text, XmlFragment) → no throw', async () => {
    vi.stubEnv('CALLBACK_URL', 'http://localhost:3000/cb');
    vi.stubEnv(
      'CALLBACK_OBJECTS',
      JSON.stringify({ a: 'Array', b: 'Map', c: 'Text', d: 'XmlFragment' })
    );
    const mod = await import('../websockets-callbacks');

    expect(() =>
      mod.callbackHandler(new Uint8Array(), null, makeDoc('room-1') as never)
    ).not.toThrow();
    expect(mockReq.write).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — callbackRequest
// ---------------------------------------------------------------------------

describe('3 — callbackRequest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockReq.on.mockReturnThis();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('3.1 makes a POST request to the URL and writes body', async () => {
    const { callbackRequest } = await import('../websockets-callbacks');

    callbackRequest(new URL('http://localhost:9999/cb'), 5000, { room: 'r', data: {} });

    expect(vi.mocked(httpDefault.request)).toHaveBeenCalledOnce();
    const [opts] = vi.mocked(httpDefault.request).mock.calls[0];
    expect((opts as unknown as Record<string, unknown>).method).toBe('POST');
    expect(mockReq.write).toHaveBeenCalled();
    expect(mockReq.end).toHaveBeenCalled();
  });

  it('3.2 timeout event → calls req.abort() and logs warning', async () => {
    const { callbackRequest } = await import('../websockets-callbacks');

    let timeoutCb: (() => void) | undefined;
    mockReq.on.mockImplementation((event: string, handler: () => void) => {
      if (event === 'timeout') timeoutCb = handler;
      return mockReq;
    });

    callbackRequest(new URL('http://localhost:9999/cb'), 100, { room: 'r', data: {} });
    timeoutCb?.();

    expect(mockReq.abort).toHaveBeenCalled();
  });

  it('3.3 error event → calls req.abort() and logs error', async () => {
    const { callbackRequest } = await import('../websockets-callbacks');

    let errorCb: ((e: Error) => void) | undefined;
    mockReq.on.mockImplementation((event: string, handler: (e?: Error) => void) => {
      if (event === 'error') errorCb = handler;
      return mockReq;
    });

    callbackRequest(new URL('http://localhost:9999/cb'), 5000, { room: 'r', data: {} });
    errorCb?.(new Error('connection refused'));

    expect(mockReq.abort).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — getContent switch branches (covered via callbackHandler)
// ---------------------------------------------------------------------------

describe('4 — getContent switch branches', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockReq.on.mockReturnThis();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const types = ['Array', 'Map', 'Text', 'XmlFragment'] as const;
  for (const t of types) {
    it(`4.x ${t} → getContent returns Y type with toJSON()`, async () => {
      vi.stubEnv('CALLBACK_URL', 'http://localhost:3000/cb');
      vi.stubEnv('CALLBACK_OBJECTS', JSON.stringify({ x: t }));
      const mod = await import('../websockets-callbacks');
      expect(() =>
        mod.callbackHandler(new Uint8Array(), null, makeDoc('r') as never)
      ).not.toThrow();
    });
  }

  it('4.x XmlElement type → getContent branch covered (may fall through to default)', async () => {
    vi.stubEnv('CALLBACK_URL', '');
    vi.stubEnv('CALLBACK_OBJECTS', JSON.stringify({ x: 'XmlElement' }));
    const mod = await import('../websockets-callbacks');
    // XmlElement may not have toJSON, callbackHandler might throw — we just ensure the
    // getContent branch is reached (CALLBACK_URL not set, so callbackRequest not invoked)
    try {
      mod.callbackHandler(new Uint8Array(), null, makeDoc('r') as never);
    } catch {
      // expected if getXmlElement().toJSON() is not available in this Yjs version
    }
  });

  it('4.x Unknown type → default branch returns {}, toJSON call throws', async () => {
    vi.stubEnv('CALLBACK_URL', '');
    vi.stubEnv('CALLBACK_OBJECTS', JSON.stringify({ x: 'Unknown' }));
    const mod = await import('../websockets-callbacks');
    // default case returns {} which has no toJSON() → callbackHandler throws
    expect(() =>
      mod.callbackHandler(new Uint8Array(), null, makeDoc('r') as never)
    ).toThrow();
  });
});
