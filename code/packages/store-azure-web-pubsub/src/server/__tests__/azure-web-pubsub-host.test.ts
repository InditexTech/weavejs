// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import * as decoding from 'lib0/decoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  type MessageData,
  MessageDataType,
  MessageType,
} from '../../types';
import { WeaveStoreAzureWebPubSubSyncHost } from '../azure-web-pubsub-host';

const { MockWebSocket } = vi.hoisted(() => {
  const mockWs = {
    addEventListener: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    emit: vi.fn(),
  };
  const MockWebSocket = vi.fn().mockImplementation(() => mockWs);
  (MockWebSocket as typeof MockWebSocket & { OPEN: number; CLOSED: number }).OPEN = 1;
  (MockWebSocket as typeof MockWebSocket & { OPEN: number; CLOSED: number }).CLOSED = 3;
  return { MockWebSocket };
});

vi.mock('ws', () => {
  return { WebSocket: MockWebSocket };
});

vi.mock('@azure/web-pubsub', () => ({
  WebPubSubServiceClient: vi.fn(),
}));

type ConnLike = {
  readyState?: number;
  send?: (...args: unknown[]) => unknown;
  close?: (...args: unknown[]) => unknown;
  emit?: (...args: unknown[]) => unknown;
  handlers?: Record<string, (event: unknown) => void>;
};

type WsInstance = {
  addEventListener: (...args: unknown[]) => unknown;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  readyState: number;
  handlers: Record<string, (event: unknown) => void>;
};

type InternalHost = {
  _conn: ConnLike | null;
  _forceClose: boolean;
  _reconnectAttempts: number;
  _awareness: awarenessProtocol.Awareness | undefined;
  _chunkedMessages: Map<string, string[]>;
  _heartbeatIntervalId: NodeJS.Timeout | null;
  _reconnectionTimeoutId: NodeJS.Timeout | null;
  _resyncIntervalId: NodeJS.Timeout | null;
  _updateHandler: (update: Uint8Array, origin: unknown) => void;
  _awarenessUpdateHandler: (
    args: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => void;
  onClientInit: (group: string, data: Pick<MessageData, 'f'>) => Promise<void>;
  onClientSync: (group: string, from: string, data: string) => void;
  onAwareness: (group: string, data: string) => void;
  broadcast: (group: string, from: string, u8: Uint8Array) => void;
  safeSend: (data: string) => boolean;
  chunkedSend: (group: string, to: string, u8: Uint8Array) => void;
  send: (group: string, to: string, u8: Uint8Array) => void;
};

function getInternalHost(host: WeaveStoreAzureWebPubSubSyncHost): InternalHost {
  return host as unknown as InternalHost;
}

function makeServer() {
  return {
    emitEvent: vi.fn(),
    fetchRoom: undefined,
    persistRoom: undefined,
  };
}

function makeSyncHandler() {
  return {
    isPersistingOnInterval: vi.fn().mockReturnValue(false),
    persistRoomTask: vi.fn().mockResolvedValue(undefined),
  };
}

function makeHost(
  syncHostOptions?: ConstructorParameters<typeof WeaveStoreAzureWebPubSubSyncHost>[5]
) {
  const server = makeServer();
  const syncHandler = makeSyncHandler();
  const client = {
    getClientAccessToken: vi.fn().mockResolvedValue({ url: 'ws://token-url' }),
  };
  const doc = new Y.Doc();
  const host = new WeaveStoreAzureWebPubSubSyncHost(
    server as never,
    syncHandler as never,
    client as never,
    'room-123',
    doc,
    syncHostOptions
  );
  return { host, server, syncHandler, client, doc };
}

function createWsInstance(readyState = 1): WsInstance {
  const handlers: Record<string, (event: unknown) => void> = {};
  return {
    addEventListener: vi.fn((event: string, handler: (event: unknown) => void) => {
      handlers[event] = handler;
    }) as WsInstance['addEventListener'],
    send: vi.fn(),
    close: vi.fn(),
    emit: vi.fn(),
    readyState,
    handlers,
  };
}

function getSentPayloads(ws: WsInstance) {
  return ws.send.mock.calls.map(([payload]) => JSON.parse(payload as string));
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitForSocketSetup(ws: WsInstance) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (typeof ws.handlers.open === 'function') {
      return;
    }
    await flushPromises();
  }
  throw new Error('WebSocket handlers were not registered');
}

async function connectHost(host: WeaveStoreAzureWebPubSubSyncHost, ws: WsInstance) {
  MockWebSocket.mockImplementationOnce(() => ws as never);
  const createPromise = host.createWebSocket();
  await waitForSocketSetup(ws);
  ws.handlers.open({ type: 'open' });
  await createPromise;
}

describe('WeaveStoreAzureWebPubSubSyncHost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    MockWebSocket.mockReset();
    (MockWebSocket as unknown as { OPEN: number }).OPEN = 1;
    (MockWebSocket as unknown as { CLOSED: number }).CLOSED = 3;
    MockWebSocket.mockImplementation(() => createWsInstance() as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes constructor state and awareness handlers', () => {
    const { host, doc } = makeHost();
    const awareness = host.awareness;
    const internals = getInternalHost(host);

    expect(host.doc).toBe(doc);
    expect(host.topic).toBe('room-123');
    expect(host.topicAwarenessChannel).toBe('room-123-awareness');
    expect(awareness).toBeDefined();
    expect(internals._chunkedMessages).toBeInstanceOf(Map);
    expect(internals._heartbeatIntervalId).toBeNull();
    expect(internals._reconnectionTimeoutId).toBeNull();
    expect(internals._resyncIntervalId).toBeNull();
    expect(internals._updateHandler).toBeTypeOf('function');
    expect(internals._awarenessUpdateHandler).toBeTypeOf('function');
  });

  it('returns the awareness instance from the getter', () => {
    const { host } = makeHost();

    expect(host.awareness).toBe(getInternalHost(host)._awareness);
  });

  it('sendInitAwarenessInfo encodes and broadcasts awareness state', () => {
    const { host, doc } = makeHost();
    const ws = createWsInstance();
    getInternalHost(host)._conn = ws;

    host.awareness?.setLocalStateField('name', 'alice');
    ws.send.mockClear();
    host.sendInitAwarenessInfo('origin-1');

    const [payload] = getSentPayloads(ws);
    expect(payload).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      noEcho: true,
      data: {
        f: 'origin-1',
      },
    });

    const decoder = decoding.createDecoder(Buffer.from(payload.data.c, 'base64'));
    expect(decoding.readVarUint(decoder)).toBe(1);
    const update = decoding.readVarUint8Array(decoder);

    const receivingDoc = new Y.Doc();
    const receivingAwareness = new awarenessProtocol.Awareness(receivingDoc);
    awarenessProtocol.applyAwarenessUpdate(receivingAwareness, update, undefined);

    expect(receivingAwareness.getStates().get(doc.clientID)).toMatchObject({
      name: 'alice',
    });
  });

  it('createWebSocket negotiates, opens the socket and starts heartbeat and resync', async () => {
    vi.useFakeTimers();
    const { host, client, server } = makeHost({
      heartbeat: { sendIntervalMs: 50 },
      resync: { checkIntervalMs: 100, attemptsLimit: 3 },
    });
    const ws = createWsInstance();

    MockWebSocket.mockImplementationOnce(() => ws as never);
    const createPromise = host.createWebSocket();
    await waitForSocketSetup(ws);

    expect(client.getClientAccessToken).toHaveBeenCalledWith({
      expirationTimeInMinutes: 60,
      userId: 'host',
      roles: [
        'webpubsub.sendToGroup.room-123',
        'webpubsub.joinLeaveGroup.room-123',
        'webpubsub.joinLeaveGroup.room-123.host',
      ],
    });
    expect(MockWebSocket).toHaveBeenCalledWith(
      'ws://token-url',
      'json.webpubsub.azure.v1'
    );

    ws.handlers.open({ type: 'open' });
    await createPromise;

    expect(getInternalHost(host)._conn).toBe(ws);
    expect(server.emitEvent).toHaveBeenCalledWith('onWsOpen', {
      group: 'room-123.host',
      event: { type: 'open' },
      connectionAttempt: 0,
    });
    expect(server.emitEvent).toHaveBeenCalledWith('onWsJoinGroup', {
      group: 'room-123.host',
      connectionAttempt: 0,
    });

    const initialPayloads = getSentPayloads(ws);
    expect(initialPayloads[0]).toEqual({
      type: MessageType.JoinGroup,
      group: 'room-123.host',
    });
    expect(initialPayloads[1]).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      data: { type: 'resync' },
    });

    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(100);

    const laterPayloads = getSentPayloads(ws);
    expect(
      laterPayloads.some(
        (payload) =>
          payload.type === MessageType.SendToGroup &&
          payload.data?.type === 'heartbeat'
      )
    ).toBe(true);
    expect(
      laterPayloads.filter(
        (payload) =>
          payload.type === MessageType.SendToGroup &&
          payload.data?.type === 'resync'
      )
    ).toHaveLength(2);
  });

  it('stops resync attempts after reaching the limit', async () => {
    vi.useFakeTimers();
    const { host } = makeHost({
      resync: { checkIntervalMs: 20, attemptsLimit: 2 },
      heartbeat: { sendIntervalMs: 5000 },
    });
    const ws = createWsInstance();

    await connectHost(host, ws);
    expect(
      getSentPayloads(ws).filter((payload) => payload.data?.type === 'resync')
    ).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(20);
    expect(
      getSentPayloads(ws).filter((payload) => payload.data?.type === 'resync')
    ).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(40);
    expect(
      getSentPayloads(ws).filter((payload) => payload.data?.type === 'resync')
    ).toHaveLength(2);
  });

  it('routes websocket messages by message data type and ignores unsupported ones', async () => {
    const { host, server } = makeHost();
    const ws = createWsInstance();

    await connectHost(host, ws);

    const onClientInit = vi
      .spyOn(getInternalHost(host), 'onClientInit')
      .mockResolvedValue(undefined);
    const onClientSync = vi
      .spyOn(getInternalHost(host), 'onClientSync')
      .mockImplementation(() => undefined);
    const onAwareness = vi
      .spyOn(getInternalHost(host), 'onAwareness')
      .mockImplementation(() => undefined);
    const sendInitAwarenessInfo = vi
      .spyOn(host, 'sendInitAwarenessInfo')
      .mockImplementation(() => undefined);

    ws.handlers.message({
      data: JSON.stringify({
        type: 'message',
        from: 'group',
        group: 'room-123',
        fromUserId: 'client',
        data: { t: MessageDataType.Init, f: 'client-1', c: 'init-payload' },
      }),
    });

    expect(onClientInit).toHaveBeenCalledWith('room-123', {
      t: MessageDataType.Init,
      f: 'client-1',
      c: 'init-payload',
    });
    expect(onClientSync).toHaveBeenCalledWith(
      'room-123',
      'client-1',
      'init-payload'
    );
    expect(sendInitAwarenessInfo).toHaveBeenCalledWith('client-1');

    ws.handlers.message({
      data: JSON.stringify({
        type: 'message',
        from: 'group',
        group: 'room-123',
        fromUserId: 'client',
        data: { t: MessageDataType.Sync, f: 'client-2', c: 'sync-payload' },
      }),
    });
    expect(onClientSync).toHaveBeenLastCalledWith(
      'room-123',
      'client-2',
      'sync-payload'
    );

    ws.handlers.message({
      data: JSON.stringify({
        type: 'message',
        from: 'group',
        group: 'room-123',
        fromUserId: 'client',
        data: { t: MessageDataType.Awareness, f: 'client-3', c: 'aware-payload' },
      }),
    });
    expect(onAwareness).toHaveBeenCalledWith('room-123', 'aware-payload');

    ws.handlers.message({
      data: JSON.stringify({
        type: 'message',
        from: 'group',
        group: 'room-123',
        fromUserId: 'client',
        data: {
          payloadId: 'chunk-1',
          type: 'chunk',
          index: 0,
          totalChunks: 1,
          t: MessageDataType.Sync,
          f: 'client-4',
          c: 'chunk',
        },
      }),
    });
    expect(onClientSync).toHaveBeenCalledTimes(2);

    ws.handlers.message({
      data: JSON.stringify({
        type: 'system',
        from: 'group',
        group: 'room-123',
        fromUserId: 'client',
        data: { t: MessageDataType.Sync, f: 'client-5', c: 'ignored' },
      }),
    });
    ws.handlers.message({
      data: JSON.stringify({
        type: 'message',
        from: 'server',
        group: 'room-123',
        fromUserId: 'client',
        data: { t: MessageDataType.Sync, f: 'client-6', c: 'ignored' },
      }),
    });
    expect(onClientSync).toHaveBeenCalledTimes(2);
    expect(server.emitEvent).toHaveBeenCalledWith('onWsMessage', {
      group: 'room-123.host',
      event: expect.any(Object),
    });
  });

  it('clears intervals and reconnects with exponential backoff on close unless force closed', async () => {
    vi.useFakeTimers();
    const { host, server } = makeHost({
      heartbeat: { sendIntervalMs: 20 },
      resync: { checkIntervalMs: 20, attemptsLimit: 10 },
    });
    const ws = createWsInstance();

    await connectHost(host, ws);

    const reconnectSpy = vi
      .spyOn(host, 'createWebSocket')
      .mockResolvedValue(undefined);

    ws.handlers.close({ code: 1006 });

    expect(server.emitEvent).toHaveBeenCalledWith('onWsClose', {
      group: 'room-123.host',
      event: { code: 1006 },
      connectionAttempt: 0,
    });
    expect(server.emitEvent).toHaveBeenCalledWith('onWsReconnect', {
      group: 'room-123.host',
      connectionAttempt: 1,
      timeoutMs: 1000,
    });
    expect(host.isReconnecting()).toBe(true);

    const callsAfterClose = ws.send.mock.calls.length;
    await vi.advanceTimersByTimeAsync(40);
    expect(ws.send).toHaveBeenCalledTimes(callsAfterClose);

    await vi.advanceTimersByTimeAsync(1000);
    expect(reconnectSpy).toHaveBeenCalledTimes(1);

    getInternalHost(host)._forceClose = true;
    ws.handlers.close({ code: 1000 });
    expect(
      server.emitEvent.mock.calls.filter(([eventName]) => eventName === 'onWsReconnect')
    ).toHaveLength(1);
  });

  it('clears intervals, emits an error event and closes the socket on websocket error', async () => {
    vi.useFakeTimers();
    const { host, server } = makeHost({
      heartbeat: { sendIntervalMs: 20 },
      resync: { checkIntervalMs: 20, attemptsLimit: 10 },
    });
    const ws = createWsInstance();

    await connectHost(host, ws);

    ws.handlers.error({ message: 'boom' });

    expect(server.emitEvent).toHaveBeenCalledWith('onWsError', {
      group: 'room-123.host',
      error: { message: 'boom' },
      connectionAttempt: 0,
    });
    expect(ws.close).toHaveBeenCalledTimes(1);

    const callsAfterError = ws.send.mock.calls.length;
    await vi.advanceTimersByTimeAsync(40);
    expect(ws.send).toHaveBeenCalledTimes(callsAfterError);
  });

  it('start resets force close and reconnect attempts before creating the websocket', async () => {
    const { host } = makeHost();
    const createWebSocketSpy = vi
      .spyOn(host, 'createWebSocket')
      .mockResolvedValue(undefined);

    getInternalHost(host)._forceClose = true;
    getInternalHost(host)._reconnectAttempts = 3;

    await host.start();

    expect(getInternalHost(host)._forceClose).toBe(false);
    expect(getInternalHost(host)._reconnectAttempts).toBe(0);
    expect(createWebSocketSpy).toHaveBeenCalledTimes(1);
  });

  it('start clears any pending reconnection timeout before creating the websocket', async () => {
    const { host } = makeHost();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const createWebSocketSpy = vi
      .spyOn(host, 'createWebSocket')
      .mockResolvedValue(undefined);
    const tid = setTimeout(() => undefined, 10_000);
    getInternalHost(host)._reconnectionTimeoutId = tid;

    await host.start();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(tid);
    expect(createWebSocketSpy).toHaveBeenCalledTimes(1);
  });

  it('reports connection and reconnection state from internal websocket timers', () => {
    const { host } = makeHost();

    expect(host.isConnected()).toBeFalsy();
    expect(host.isReconnecting()).toBe(false);

    getInternalHost(host)._conn = { readyState: 1 };
    getInternalHost(host)._reconnectionTimeoutId = setTimeout(() => undefined, 1000);

    expect(host.isConnected()).toBe(true);
    expect(host.isReconnecting()).toBe(true);

    clearTimeout(getInternalHost(host)._reconnectionTimeoutId ?? undefined);
  });

  it('stop clears timers, destroys doc and awareness, force closes and closes the socket', async () => {
    vi.useFakeTimers();
    const { host, doc } = makeHost();
    const awareness = host.awareness;
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const docDestroySpy = vi.spyOn(doc, 'destroy');
    const awarenessDestroySpy = vi.spyOn(awareness!, 'destroy');
    const ws = createWsInstance();

    getInternalHost(host)._conn = ws;
    getInternalHost(host)._heartbeatIntervalId = setInterval(() => undefined, 1000);
    getInternalHost(host)._reconnectionTimeoutId = setTimeout(() => undefined, 1000);
    getInternalHost(host)._resyncIntervalId = setInterval(() => undefined, 1000);

    await host.stop();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(docDestroySpy).toHaveBeenCalledTimes(1);
    expect(awarenessDestroySpy).toHaveBeenCalled();
    expect(getInternalHost(host)._forceClose).toBe(true);
    expect(getInternalHost(host)._conn).toBeNull();
    expect(host.doc).toBeUndefined();
    expect(host.awareness).toBeUndefined();
    expect(ws.close).toHaveBeenCalledTimes(1);
  });

  it('simulateWebsocketError emits an error on the active connection', () => {
    const { host } = makeHost();
    const emit = vi.fn();

    getInternalHost(host)._conn = { emit };
    host.simulateWebsocketError();

    expect(emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ message: 'Simulated connection failure' })
    );
  });

  it('sends heartbeat messages on the configured interval', async () => {
    vi.useFakeTimers();
    const { host } = makeHost({
      heartbeat: { sendIntervalMs: 25 },
      resync: { checkIntervalMs: 1000, attemptsLimit: 3 },
    });
    const ws = createWsInstance();

    await connectHost(host, ws);
    await vi.advanceTimersByTimeAsync(25);

    expect(
      getSentPayloads(ws).some(
        (payload) =>
          payload.type === MessageType.SendToGroup &&
          payload.group === 'room-123' &&
          payload.data?.type === 'heartbeat'
      )
    ).toBe(true);
  });

  it('broadcasts document updates directly and chunks large updates', async () => {
    const { host, syncHandler } = makeHost();
    const ws = createWsInstance();
    getInternalHost(host)._conn = ws;

    host.doc?.getMap('weave').set('status', 'ok');

    expect(syncHandler.persistRoomTask).toHaveBeenCalledWith('room-123');
    const [smallPayload] = ws.send.mock.calls.slice(-1).map(([payload]) => JSON.parse(payload));
    expect(smallPayload).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      noEcho: true,
      data: {
        c: expect.any(String),
      },
    });

    ws.send.mockClear();

    host.doc?.transact(() => {
      host.doc?.getText('big').insert(0, 'x'.repeat(450_000));
    }, 'remote-client');

    const largePayloads = getSentPayloads(ws);
    expect(largePayloads.length).toBeGreaterThan(1);
    expect(largePayloads[0]).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      data: {
        payloadId: expect.any(String),
        type: 'chunk',
        f: 'remote-client',
      },
    });
    expect(largePayloads.at(-1)).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      data: {
        payloadId: expect.any(String),
        type: 'end',
        f: 'remote-client',
      },
    });
  });

  it('send uses direct payloads for small sync step responses and chunks large responses', async () => {
    const { host } = makeHost();
    const ws = createWsInstance();
    getInternalHost(host)._conn = ws;

    await getInternalHost(host).onClientInit('room-123', { f: 'client-small' });

    const [smallPayload] = getSentPayloads(ws);
    expect(smallPayload).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      noEcho: true,
      data: {
        t: 'client-small',
        c: expect.any(String),
      },
    });

    ws.send.mockClear();
    const safeSendSpy = vi
      .spyOn(getInternalHost(host), 'safeSend')
      .mockReturnValue(false);
    const chunkedSendSpy = vi.spyOn(getInternalHost(host), 'chunkedSend');

    await getInternalHost(host).onClientInit('room-123', { f: 'client-large' });

    const largePayloads = getSentPayloads(ws);
    expect(safeSendSpy).toHaveBeenCalled();
    expect(chunkedSendSpy).toHaveBeenCalledWith(
      'room-123',
      'client-large',
      expect.any(Uint8Array)
    );
    expect(largePayloads.length).toBeGreaterThan(1);
    expect(largePayloads[0]).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      data: {
        payloadId: expect.any(String),
        type: 'chunk',
        t: 'client-large',
      },
    });
    expect(largePayloads.at(-1)).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      data: {
        payloadId: expect.any(String),
        type: 'end',
        t: 'client-large',
      },
    });
  });

  it('broadcasts encoded document updates when the doc changes', () => {
    const { host } = makeHost();
    const ws = createWsInstance();
    getInternalHost(host)._conn = ws;

    const sourceDoc = new Y.Doc();
    sourceDoc.getMap('weave').set('count', 2);
    const update = Y.encodeStateAsUpdate(sourceDoc);

    getInternalHost(host)._updateHandler(update, 'client-update');

    const [payload] = getSentPayloads(ws);
    expect(payload).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      noEcho: true,
      data: {
        f: 'client-update',
      },
    });

    const decoder = decoding.createDecoder(Buffer.from(payload.data.c, 'base64'));
    expect(decoding.readVarUint(decoder)).toBe(0);
  });

  it('broadcast catches errors thrown by _conn.send and does not rethrow', () => {
    const { host } = makeHost();
    const ws = createWsInstance();
    ws.send.mockImplementation(() => { throw new Error('broadcast send failed'); });
    getInternalHost(host)._conn = ws;

    const u8 = new Uint8Array([0, 1, 2]);
    // Should not throw
    getInternalHost(host).broadcast('room-123', 'client-src', u8);
  });

  it('broadcasts encoded awareness updates when awareness changes', () => {
    const { host, doc } = makeHost();
    const ws = createWsInstance();
    getInternalHost(host)._conn = ws;

    host.awareness?.setLocalStateField('cursor', 5);
    ws.send.mockClear();
    getInternalHost(host)._awarenessUpdateHandler(
      { added: [doc.clientID], updated: [], removed: [] },
      'client-awareness'
    );

    const [payload] = getSentPayloads(ws);
    expect(payload).toMatchObject({
      type: MessageType.SendToGroup,
      group: 'room-123',
      noEcho: true,
      data: {
        f: 'client-awareness',
      },
    });

    const decoder = decoding.createDecoder(Buffer.from(payload.data.c, 'base64'));
    expect(decoding.readVarUint(decoder)).toBe(1);
  });

  it('_awarenessUpdateHandler catches broadcast errors gracefully', () => {
    const { host } = makeHost();
    // Spy on broadcast to throw
    vi.spyOn(getInternalHost(host), 'broadcast').mockImplementation(() => {
      throw new Error('awareness broadcast error');
    });

    // Should not throw; error is caught inside the handler
    expect(() =>
      getInternalHost(host)._awarenessUpdateHandler(
        { added: [1], updated: [], removed: [] },
        'client-awareness'
      )
    ).not.toThrow();
  });

  it('_updateHandler catches broadcast errors gracefully', () => {
    const { host } = makeHost();
    vi.spyOn(getInternalHost(host), 'broadcast').mockImplementation(() => {
      throw new Error('update broadcast error');
    });

    const update = new Uint8Array([1, 2, 3]);
    // Should not throw; error is caught inside the handler
    expect(() => getInternalHost(host)._updateHandler(update, 'client-src')).not.toThrow();
  });

  it('onClientSync processes sync step 1 and sends state to the client', async () => {
    // Import encoding/sync for building the test message
    const encoding = await import('lib0/encoding');
    const syncProtocol = await import('y-protocols/sync');

    const { host } = makeHost();
    const ws = createWsInstance();
    getInternalHost(host)._conn = ws;

    // Build a sync step 1 message from another doc
    const remoteDoc = new Y.Doc();
    remoteDoc.getMap('weave').set('hello', 'world');
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
    syncProtocol.writeSyncStep1(encoder, remoteDoc);
    const bytes = encoding.toUint8Array(encoder);
    const base64 = Buffer.from(bytes).toString('base64');

    getInternalHost(host).onClientSync('room-123', 'client-sync', base64);

    // The host should send a sync step response
    const payloads = getSentPayloads(ws);
    expect(payloads.length).toBeGreaterThan(0);
    expect(payloads[0]).toMatchObject({
      type: MessageType.SendToGroup,
      data: { t: 'client-sync' },
    });
  });

  it('onClientSync handles errors gracefully (empty buffer triggers decode error)', () => {
    const { host, doc } = makeHost();
    const errorSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).on('error', errorSpy);

    // Empty base64 produces empty buffer; readVarUint throws "reading past end"
    getInternalHost(host).onClientSync('room-123', 'client-sync', '');

    expect(errorSpy).toHaveBeenCalled();
  });

  it('send catches errors thrown by _conn.send and does not rethrow', async () => {
    const { host } = makeHost();
    const ws = createWsInstance();
    ws.send.mockImplementation(() => { throw new Error('send failed'); });
    getInternalHost(host)._conn = ws;

    const u8 = new Uint8Array([0, 1, 2]);
    // Should not throw
    getInternalHost(host).send('room-123', 'client-id', u8);
  });

  it('onAwareness applies awareness update from base64-encoded data', async () => {
    const encoding = await import('lib0/encoding');

    const { host, doc } = makeHost();

    // Build an awareness message
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, 1); // messageAwareness type
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
      host.awareness!,
      [doc.clientID]
    );
    encoding.writeVarUint8Array(enc, awarenessUpdate);
    const bytes = encoding.toUint8Array(enc);
    const base64 = Buffer.from(bytes).toString('base64');

    // Should not throw
    getInternalHost(host).onAwareness('room-123', base64);
  });

  it('onAwareness handles errors gracefully (empty buffer triggers decode error)', () => {
    const { host, doc } = makeHost();
    const errorSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).on('error', errorSpy);

    // Empty base64 produces empty buffer; readVarUint throws "reading past end"
    getInternalHost(host).onAwareness('room-123', '');

    expect(errorSpy).toHaveBeenCalled();
  });
});
