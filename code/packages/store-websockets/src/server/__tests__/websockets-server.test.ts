// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventEmitter from 'node:events';

// ---------------------------------------------------------------------------
// Mock heavy server-side dependencies before importing the module under test
// ---------------------------------------------------------------------------

// Mock ioredis so Redis constructor never opens a real connection
vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => {
    const emitter = new EventEmitter();
    return {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
      publish: vi.fn().mockResolvedValue(0),
      subscribe: vi.fn().mockResolvedValue(null),
    };
  });
  return { default: Redis };
});

// Mock ws so WebSocketServer never opens a real socket
const wssListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
const mockWssOn = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
  wssListeners[event] = wssListeners[event] ?? [];
  wssListeners[event].push(handler);
});
const mockWssEmit = vi.fn((event: string, ...args: unknown[]) => {
  (wssListeners[event] ?? []).forEach((h) => h(...args));
});
const mockHandleUpgrade = vi.fn((_req: unknown, _socket: unknown, _head: unknown, cb: (ws: unknown) => void) => {
  cb({ mockWs: true });
});

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: mockWssOn,
    emit: mockWssEmit,
    handleUpgrade: mockHandleUpgrade,
  })),
}));

// Mock websockets-utils so getYDoc and setServer can be inspected
vi.mock('../websockets-utils', () => ({
  getYDoc: vi.fn().mockResolvedValue({ name: 'room-1' }),
  setServer: vi.fn(),
  setupWSConnection: vi.fn().mockReturnValue(vi.fn()),
  docs: new Map(),
  destroyWSConnection: vi.fn(),
  WSSharedDoc: vi.fn(),
}));

import { WeaveWebsocketsServer } from '../websockets-server';
import { getYDoc, setServer } from '../websockets-utils';
import http from 'node:http';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServer(overrides: Partial<ConstructorParameters<typeof WeaveWebsocketsServer>[0]> = {}) {
  return new WeaveWebsocketsServer({
    performUpgrade: vi.fn().mockResolvedValue(true),
    extractRoomId: vi.fn().mockReturnValue('room-1'),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Suite 1 — Module re-exports (index.server.ts)
// ---------------------------------------------------------------------------

describe('1 — Module re-exports (index.server.ts)', () => {
  it('1.1 WeaveWebsocketsServer is exported from server entry', async () => {
    const serverEntry = await import('../../index.server');
    expect(serverEntry.WeaveWebsocketsServer).toBe(WeaveWebsocketsServer);
  });

  it('1.2 WEAVE_STORE_WEBSOCKETS is exported from server entry', async () => {
    const serverEntry = await import('../../index.server');
    expect(serverEntry.WEAVE_STORE_WEBSOCKETS).toBe('store-websockets');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Constructor
// ---------------------------------------------------------------------------

describe('2 — Constructor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(wssListeners).forEach((k) => delete wssListeners[k]);
  });

  it('2.1 stores performUpgrade and extractRoomId', () => {
    const performUpgrade = vi.fn().mockResolvedValue(true);
    const extractRoomId = vi.fn().mockReturnValue('r1');
    const server = makeServer({ performUpgrade, extractRoomId });
    expect(server).toBeDefined();
  });

  it('2.2 stores persistRoom and fetchRoom when provided', () => {
    const persistRoom = vi.fn();
    const fetchRoom = vi.fn().mockResolvedValue(null);
    const server = makeServer({ persistRoom, fetchRoom });
    expect(server.persistRoom).toBe(persistRoom);
    expect(server.fetchRoom).toBe(fetchRoom);
  });

  it('2.3 horizontalSyncHandlerConfig type="redis" → creates sync handler', () => {
    const server = makeServer({
      horizontalSyncHandlerConfig: { type: 'redis', config: { host: 'localhost', port: 6379, keyPrefix: 'weave:' } },
    });
    expect(server.getHorizontalSyncHandler()).toBeDefined();
  });

  it('2.4 horizontalSyncHandlerConfig undefined → still creates sync handler (default branch)', () => {
    const server = makeServer();
    expect(server.getHorizontalSyncHandler()).toBeDefined();
  });

  it('2.7 horizontalSyncHandlerConfig non-redis type with config → default branch with defined config', () => {
    const server = makeServer({
      horizontalSyncHandlerConfig: {
        type: 'other' as never,
        config: { host: 'redis.example.com', port: 6380, keyPrefix: 'test:' },
      },
    });
    expect(server.getHorizontalSyncHandler()).toBeDefined();
  });

  it('2.5 calls setServer(this)', () => {
    makeServer();
    expect(setServer).toHaveBeenCalled();
  });

  it('2.6 registers connection event on WSS', () => {
    makeServer();
    const events = mockWssOn.mock.calls.map((c) => c[0]);
    expect(events).toContain('connection');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — getHorizontalSyncHandler()
// ---------------------------------------------------------------------------

describe('3 — getHorizontalSyncHandler()', () => {
  it('3.1 returns the handler instance created in constructor', () => {
    const server = makeServer();
    const handler = server.getHorizontalSyncHandler();
    expect(handler).toBeDefined();
    expect(typeof handler.isEnabledPubSub).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — emitEvent / addEventListener / removeEventListener
// ---------------------------------------------------------------------------

describe('4 — Event methods', () => {
  it('4.1 emitEvent triggers listeners registered with addEventListener', async () => {
    const server = makeServer();
    const cb = vi.fn();
    server.addEventListener('test-event', cb);

    // Emittery.emit() is async — await via a small promise
    const p = new Promise<void>((resolve) => {
      server.addEventListener('test-event', () => resolve());
    });
    server.emitEvent('test-event', { payload: 42 });
    await p;

    expect(cb).toHaveBeenCalledWith({ payload: 42 });
  });

  it('4.2 removeEventListener stops listener from being called', () => {
    const server = makeServer();
    const cb = vi.fn();
    server.addEventListener('test-event', cb);
    server.removeEventListener('test-event', cb);
    server.emitEvent('test-event', {});
    expect(cb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — getRoomDocument()
// ---------------------------------------------------------------------------

describe('5 — getRoomDocument()', () => {
  it('5.1 calls getYDoc and returns the result', async () => {
    const server = makeServer();
    const doc = await server.getRoomDocument('room-1');
    expect(getYDoc).toHaveBeenCalledWith(
      'room-1',
      expect.any(Function),
      expect.anything()
    );
    expect(doc).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — handleUpgrade()
// ---------------------------------------------------------------------------

describe('6 — handleUpgrade()', () => {
  it('6.1 performUpgrade returns true → wss.handleUpgrade called', async () => {
    const server = makeServer({ performUpgrade: vi.fn().mockResolvedValue(true) });
    const httpServer = new http.Server();
    server.handleUpgrade(httpServer);

    // Simulate 'upgrade' event on the http server
    const req = { headers: {}, url: '/room-1' };
    const socket = { destroy: vi.fn() };
    const head = Buffer.alloc(0);
    httpServer.emit('upgrade', req, socket, head);

    // Give async performUpgrade a tick to resolve
    await new Promise((r) => setTimeout(r, 10));

    expect(mockHandleUpgrade).toHaveBeenCalled();
    httpServer.removeAllListeners();
  });

  it('6.2 performUpgrade returns false → wss.handleUpgrade NOT called and socket is destroyed', async () => {
    mockHandleUpgrade.mockClear();
    const server = makeServer({ performUpgrade: vi.fn().mockResolvedValue(false) });
    const httpServer = new http.Server();
    server.handleUpgrade(httpServer);

    const req = { headers: {}, url: '/room-1' };
    const socket = { destroy: vi.fn(), write: vi.fn() };
    const head = Buffer.alloc(0);
    httpServer.emit('upgrade', req, socket, head);

    await new Promise((r) => setTimeout(r, 10));

    expect(mockHandleUpgrade).not.toHaveBeenCalled();
    expect(socket.destroy).toHaveBeenCalled();
    httpServer.removeAllListeners();
  });

  it('6.3 performUpgrade returns false → HTTP 401 error is written to socket before destroy', async () => {
    mockHandleUpgrade.mockClear();
    const server = makeServer({ performUpgrade: vi.fn().mockResolvedValue(false) });
    const httpServer = new http.Server();
    server.handleUpgrade(httpServer);

    const req = { headers: {}, url: '/room-1' };
    const socket = { destroy: vi.fn(), write: vi.fn() };
    const head = Buffer.alloc(0);
    httpServer.emit('upgrade', req, socket, head);

    await new Promise((r) => setTimeout(r, 10));

    expect(socket.write).toHaveBeenCalledWith(
      expect.stringContaining('401')
    );
    expect(socket.write).toHaveBeenCalledWith(
      expect.stringContaining('Connection: close')
    );
    // write must precede destroy
    const writeOrder = socket.write.mock.invocationCallOrder[0];
    const destroyOrder = socket.destroy.mock.invocationCallOrder[0];
    expect(writeOrder).toBeLessThan(destroyOrder);
    httpServer.removeAllListeners();
  });
});
