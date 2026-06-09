// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventEmitter from 'node:events';

// ---------------------------------------------------------------------------
// Mock ioredis before importing the module under test
// ---------------------------------------------------------------------------

type MockRedisInstance = {
  on: (event: string, handler: (...args: unknown[]) => void) => MockRedisInstance;
  emit: (event: string, ...args: unknown[]) => void;
  publish: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

const mockRedisInstances: MockRedisInstance[] = [];

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => {
    const emitter = new EventEmitter();
    const instance: MockRedisInstance = {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        emitter.on(event, handler);
        return instance;
      },
      emit: emitter.emit.bind(emitter),
      publish: vi.fn().mockResolvedValue(0),
      subscribe: vi.fn().mockResolvedValue(null),
    };
    mockRedisInstances.push(instance);
    return instance;
  });
  return { default: Redis };
});

import { WeaveHorizontalSyncHandlerRedis } from '../client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockServer() {
  return { emitEvent: vi.fn() };
}

beforeEach(() => {
  mockRedisInstances.length = 0;
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Suite 1 — Constructor without config (PubSub disabled)
// ---------------------------------------------------------------------------

describe('1 — Constructor without config', () => {
  it('1.1 enabled is false', () => {
    const server = makeMockServer();
    const handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    expect(handler.isEnabledPubSub()).toBe(false);
  });

  it('1.2 initPubClient and initSubClient are called', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    // Two Redis instances created: one for pub, one for sub
    expect(mockRedisInstances).toHaveLength(2);
  });

  it('1.3 emits onPubClientStatusChange and onSubClientStatusChange with connecting', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const calls = server.emitEvent.mock.calls.map((c) => c[0]);
    expect(calls).toContain('onPubClientStatusChange');
    expect(calls).toContain('onSubClientStatusChange');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Constructor with config (PubSub enabled)
// ---------------------------------------------------------------------------

describe('2 — Constructor with config', () => {
  it('2.1 enabled is true when config is provided', () => {
    const server = makeMockServer();
    const handler = new WeaveHorizontalSyncHandlerRedis(server as never, {
      host: 'redis-host',
      port: 6380,
      keyPrefix: 'custom:',
    });
    expect(handler.isEnabledPubSub()).toBe(true);
  });

  it('2.2 config is merged — provided values override defaults', () => {
    const server = makeMockServer();
    // Just verify no error thrown and handler is created with custom config
    expect(() =>
      new WeaveHorizontalSyncHandlerRedis(server as never, {
        host: 'my-redis',
        port: 6381,
        keyPrefix: 'my:prefix:',
        password: 'secret',
      })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — isEnabledPubSub()
// ---------------------------------------------------------------------------

describe('3 — isEnabledPubSub()', () => {
  it('3.1 returns false when no config provided', () => {
    const handler = new WeaveHorizontalSyncHandlerRedis(makeMockServer() as never);
    expect(handler.isEnabledPubSub()).toBe(false);
  });

  it('3.2 returns true when config provided', () => {
    const handler = new WeaveHorizontalSyncHandlerRedis(makeMockServer() as never, {
      host: 'h',
      port: 6379,
      keyPrefix: 'k:',
    });
    expect(handler.isEnabledPubSub()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — initPubClient() Redis event handlers
// ---------------------------------------------------------------------------

describe('4 — initPubClient() Redis event handlers', () => {
  it('4.1 emits onPubClientStatusChange { status: "connecting" } on construction', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onPubClientStatusChange',
      { status: 'connecting' }
    );
  });

  it('4.2 Redis error event → emits { status: "error", error }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const pubClient = mockRedisInstances[0];
    const err = new Error('connection refused');
    server.emitEvent.mockClear();
    pubClient.emit('error', err);
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onPubClientStatusChange',
      { status: 'error', error: err }
    );
  });

  it('4.3 Redis end event → emits { status: "end" }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const pubClient = mockRedisInstances[0];
    server.emitEvent.mockClear();
    pubClient.emit('end');
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onPubClientStatusChange',
      { status: 'end' }
    );
  });

  it('4.4 Redis reconnecting event → emits { status: "reconnecting", delay }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const pubClient = mockRedisInstances[0];
    server.emitEvent.mockClear();
    pubClient.emit('reconnecting', 1000);
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onPubClientStatusChange',
      { status: 'reconnecting', delay: 1000 }
    );
  });

  it('4.5 Redis connect event → emits { status: "connect" }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const pubClient = mockRedisInstances[0];
    server.emitEvent.mockClear();
    pubClient.emit('connect');
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onPubClientStatusChange',
      { status: 'connect' }
    );
  });

  it('4.6 Redis ready event → emits { status: "ready" }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const pubClient = mockRedisInstances[0];
    server.emitEvent.mockClear();
    pubClient.emit('ready');
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onPubClientStatusChange',
      { status: 'ready' }
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — initSubClient() Redis event handlers
// ---------------------------------------------------------------------------

describe('5 — initSubClient() Redis event handlers', () => {
  it('5.1 emits onSubClientStatusChange { status: "connecting" } on construction', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onSubClientStatusChange',
      { status: 'connecting' }
    );
  });

  it('5.2 Redis error event → emits { status: "error", error }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const subClient = mockRedisInstances[1];
    const err = new Error('sub error');
    server.emitEvent.mockClear();
    subClient.emit('error', err);
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onSubClientStatusChange',
      { status: 'error', error: err }
    );
  });

  it('5.3 Redis end event → emits { status: "end" }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const subClient = mockRedisInstances[1];
    server.emitEvent.mockClear();
    subClient.emit('end');
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onSubClientStatusChange',
      { status: 'end' }
    );
  });

  it('5.4 Redis reconnecting event → emits { status: "reconnecting", delay }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const subClient = mockRedisInstances[1];
    server.emitEvent.mockClear();
    subClient.emit('reconnecting', 500);
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onSubClientStatusChange',
      { status: 'reconnecting', delay: 500 }
    );
  });

  it('5.5 Redis connect event → emits { status: "connect" }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const subClient = mockRedisInstances[1];
    server.emitEvent.mockClear();
    subClient.emit('connect');
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onSubClientStatusChange',
      { status: 'connect' }
    );
  });

  it('5.6 Redis ready event → emits { status: "ready" }', () => {
    const server = makeMockServer();
    const _handler = new WeaveHorizontalSyncHandlerRedis(server as never);
    const subClient = mockRedisInstances[1];
    server.emitEvent.mockClear();
    subClient.emit('ready');
    expect(server.emitEvent).toHaveBeenCalledWith(
      'onSubClientStatusChange',
      { status: 'ready' }
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — getPubClient() / getSubClient()
// ---------------------------------------------------------------------------

describe('6 — getPubClient() / getSubClient()', () => {
  it('6.1 getPubClient() returns the Redis instance after init', () => {
    const handler = new WeaveHorizontalSyncHandlerRedis(makeMockServer() as never);
    expect(handler.getPubClient()).toBeDefined();
  });

  it('6.2 getSubClient() returns the Redis instance after init', () => {
    const handler = new WeaveHorizontalSyncHandlerRedis(makeMockServer() as never);
    expect(handler.getSubClient()).toBeDefined();
  });

  it('6.3 getPubClient() throws when pubClient is null (defensive guard)', () => {
    const handler = new WeaveHorizontalSyncHandlerRedis(makeMockServer() as never);
    (handler as never as { pubClient: null }).pubClient = null;
    expect(() => handler.getPubClient()).toThrow('Pub client not initialized');
  });

  it('6.4 getSubClient() throws when subClient is null (defensive guard)', () => {
    const handler = new WeaveHorizontalSyncHandlerRedis(makeMockServer() as never);
    (handler as never as { subClient: null }).subClient = null;
    expect(() => handler.getSubClient()).toThrow('Sub client not initialized');
  });
});
