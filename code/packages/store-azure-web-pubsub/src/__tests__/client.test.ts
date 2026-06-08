// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as encoding from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';

import { WeaveStoreAzureWebPubSubSyncClient } from '../client';
import { WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from '../constants';
import { MessageDataType, MessageType } from '../types';
import { uint8ToBase64 } from '../utils';

type MockWS = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  retryCount: number;
  binaryType: string;
  addEventListener: ReturnType<typeof vi.fn>;
  onmessage: ((e: { data: string | null }) => void | Promise<void>) | null;
  onclose: ((e: { code: number }) => void) | null;
  onopen: (() => void | Promise<void>) | null;
  onerror?: ((e: unknown) => void) | null;
  _ws: { close: ReturnType<typeof vi.fn> };
};

let mockWsInstance: MockWS;
let capturedUrlFactory: (() => Promise<string>) | null = null;

vi.mock('reconnecting-websocket', () => {
  return {
    default: vi.fn().mockImplementation((urlFactory: () => Promise<string>) => {
      capturedUrlFactory = urlFactory;
      mockWsInstance = {
        send: vi.fn(),
        close: vi.fn(),
        retryCount: 0,
        binaryType: 'blob',
        addEventListener: vi.fn(),
        onmessage: null,
        onclose: null,
        onopen: null,
        onerror: null,
        _ws: { close: vi.fn() },
      };

      return mockWsInstance;
    }),
  };
});

vi.mock('@inditextech/weave-sdk', () => ({
  mergeExceptArrays: vi.fn((base, override) => ({ ...base, ...override })),
}));

function makeInstance() {
  return {
    emitEvent: vi.fn(),
    handleConnectionStatusChange: vi.fn(),
  };
}

function makeClient(
  topic = 'room-1',
  url = 'http://localhost/negotiate',
  options?: Record<string, unknown>
) {
  const instance = makeInstance();
  const doc = new Y.Doc();
  const client = new WeaveStoreAzureWebPubSubSyncClient(
    instance as never,
    url,
    topic,
    doc,
    options as never
  );

  return { client, instance, doc };
}

type InternalClient = {
  _awareness: awarenessProtocol.Awareness;
  _checkHeartbeatId: ReturnType<typeof setInterval> | null;
  _chunkedMessages: Map<string, string[]>;
  _initialized: boolean;
  _lastHeartbeatTime: number;
  _lastReceivedSyncResponse: number | null;
  _status: string;
  _synced: boolean;
  _updateHandler: (update: Uint8Array, origin: unknown) => void;
  _ws: MockWS | null;
  _wsConnected: boolean;
};

function getInternalClient(client: WeaveStoreAzureWebPubSubSyncClient) {
  return client as unknown as InternalClient;
}

function createSyncStep1Message(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

function createAwarenessMessage(clientId: number) {
  const doc = new Y.Doc();
  doc.clientID = clientId;
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState({ user: { name: `remote-${clientId}` } });

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 1);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, [doc.clientID])
  );

  return {
    clientId: doc.clientID,
    payload: encoding.toUint8Array(encoder),
  };
}

function createJsonMessage(
  client: WeaveStoreAzureWebPubSubSyncClient,
  overrides?: Record<string, unknown>
) {
  return {
    type: MessageType.SendToGroup,
    fromUserId: 'remote-user',
    from: 'remote',
    group: client.topic,
    data: {
      group: client.topic,
      t: client.id,
      f: 'remote-client',
      c: '',
      ...overrides,
    },
  };
}

describe('WeaveStoreAzureWebPubSubSyncClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('creates with correct topic, doc, uuid and initial state', () => {
      const docOnSpy = vi.spyOn(Y.Doc.prototype as Y.Doc, 'on');
      const awarenessOnSpy = vi.spyOn(
        awarenessProtocol.Awareness.prototype,
        'on'
      );
      const instance = makeInstance();
      const doc = new Y.Doc();

      const client = new WeaveStoreAzureWebPubSubSyncClient(
        instance as never,
        'http://localhost/negotiate',
        'room-1',
        doc
      );

      expect(client.topic).toBe('room-1');
      expect(client.doc).toBe(doc);
      expect(client.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(getInternalClient(client)._synced).toBe(false);
      expect(getInternalClient(client)._wsConnected).toBe(false);
      expect(getInternalClient(client)._status).toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED
      );
      expect(docOnSpy).toHaveBeenCalledWith('update', expect.any(Function));
      expect(awarenessOnSpy).toHaveBeenCalledWith('update', expect.any(Function));
    });
  });

  describe('getters', () => {
    it('returns awareness object', () => {
      const { client } = makeClient();

      expect(client.awareness).toBe(getInternalClient(client)._awareness);
    });

    it('returns false for synced initially', () => {
      const { client } = makeClient();

      expect(client.synced).toBe(false);
    });

    it('updates synced only when the value changes', () => {
      const { client } = makeClient();

      client.synced = true;
      expect(getInternalClient(client)._synced).toBe(true);

      client.synced = true;
      expect(getInternalClient(client)._synced).toBe(true);
    });

    it('returns null for ws when not connected', () => {
      const { client } = makeClient();

      expect(client.ws).toBeNull();
    });

    it('returns ws when connected', async () => {
      const { client } = makeClient();

      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;

      expect(client.ws).toBe(mockWsInstance as never);
    });

    it('id and getClientId return the same uuid', () => {
      const { client } = makeClient();

      expect(client.getClientId()).toBe(client.id);
      expect(client.getClientId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('simple methods', () => {
    it('saveLastSyncResponse sets timestamp and emits onSyncResponse', () => {
      const { client, instance } = makeClient();

      client.saveLastSyncResponse();

      expect(getInternalClient(client)._lastReceivedSyncResponse).toEqual(
        expect.any(Number)
      );
      expect(instance.emitEvent).toHaveBeenCalledWith(
        'onSyncResponse',
        getInternalClient(client)._lastReceivedSyncResponse
      );
    });

    it('simulateWebsocketError closes the underlying websocket when present', async () => {
      const { client } = makeClient();

      await client.createWebSocket();
      client.simulateWebsocketError();

      expect(mockWsInstance._ws.close).toHaveBeenCalledWith(
        4000,
        expect.any(Error)
      );
    });

    it('simulateWebsocketError does nothing when no websocket exists', () => {
      const { client } = makeClient();

      expect(() => client.simulateWebsocketError()).not.toThrow();
    });

    it('setFetchClient replaces the fetch client', async () => {
      const { client } = makeClient();
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'ws://custom' }),
      });

      client.setFetchClient(customFetch as never);

      await expect(client.fetchConnectionUrl()).resolves.toBe('ws://custom');
      expect(customFetch).toHaveBeenCalledWith(
        'http://localhost/negotiate',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  describe('disconnect', () => {
    it('when ws is null just marks the client as disconnected', async () => {
      const { client } = makeClient();
      getInternalClient(client)._wsConnected = true;

      await client.disconnect();

      expect(getInternalClient(client)._wsConnected).toBe(false);
      expect(getInternalClient(client)._ws).toBeNull();
    });

    it('when ws exists sends awareness, removes awareness states and closes ws', async () => {
      const { client } = makeClient();
      const remote = createAwarenessMessage(9999);

      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      awarenessProtocol.applyAwarenessUpdate(
        client.awareness,
        remote.payload.subarray(2),
        'remote'
      );
      mockWsInstance.send.mockClear();

      await client.disconnect();

      const sentPayloads = mockWsInstance.send.mock.calls.map(([payload]) =>
        JSON.parse(payload)
      );

      expect(sentPayloads.some((payload) => payload.data.t === MessageDataType.Awareness)).toBe(true);
      expect(client.awareness.getStates().has(remote.clientId)).toBe(false);
      expect(getInternalClient(client)._initialized).toBe(false);
      expect(mockWsInstance.close).toHaveBeenCalled();
      expect(getInternalClient(client)._wsConnected).toBe(false);
      expect(getInternalClient(client)._ws).toBeNull();
    });
  });

  describe('fetchConnectionUrl', () => {
    it('fetches an absolute url without extra params', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'ws://test' }),
      });
      const { client } = makeClient();

      await expect(client.fetchConnectionUrl()).resolves.toBe('ws://test');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost/negotiate',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('appends extra params to an absolute url', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'ws://test' }),
      });
      const { client } = makeClient();

      await client.fetchConnectionUrl({ foo: 'bar', baz: '1' });

      const calledUrl = new URL(fetchMock.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('foo')).toBe('bar');
      expect(calledUrl.searchParams.get('baz')).toBe('1');
    });

    it('replaces existing extra params', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'ws://test' }),
      });
      const { client } = makeClient(
        'room-1',
        'http://localhost/negotiate?foo=old&keep=yes'
      );

      await client.fetchConnectionUrl({ foo: 'new', bar: '2' });

      const calledUrl = new URL(fetchMock.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('foo')).toBe('new');
      expect(calledUrl.searchParams.get('bar')).toBe('2');
      expect(calledUrl.searchParams.get('keep')).toBe('yes');
      expect(calledUrl.searchParams.getAll('foo')).toEqual(['new']);
    });

    it('prepends window.location.origin for relative urls', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'ws://test' }),
      });
      const { client } = makeClient('room-1', '/negotiate');

      await client.fetchConnectionUrl();

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/negotiate`,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const { client } = makeClient();

      await expect(client.fetchConnectionUrl()).rejects.toThrow(
        'Failed to fetch connection url from: http://localhost/negotiate'
      );
    });

    it('throws when fetch fails', async () => {
      fetchMock.mockRejectedValue(new Error('network')); 
      const { client } = makeClient();

      await expect(client.fetchConnectionUrl()).rejects.toThrow(
        'Failed to fetch connection url from: http://localhost/negotiate'
      );
    });
  });

  describe('connect', () => {
    it('returns early when already connected', async () => {
      const { client } = makeClient();
      const createWebSocketSpy = vi.spyOn(client, 'createWebSocket');
      getInternalClient(client)._wsConnected = true;

      await client.connect();

      expect(createWebSocketSpy).not.toHaveBeenCalled();
    });

    it('returns early when a websocket already exists', async () => {
      const { client } = makeClient();
      const createWebSocketSpy = vi.spyOn(client, 'createWebSocket');
      getInternalClient(client)._ws = {} as MockWS;

      await client.connect();

      expect(createWebSocketSpy).not.toHaveBeenCalled();
    });

    it('creates a websocket when disconnected', async () => {
      const { client } = makeClient();
      const createWebSocketSpy = vi.spyOn(client, 'createWebSocket');

      await client.connect({ token: 'abc' });

      expect(createWebSocketSpy).toHaveBeenCalledWith({ token: 'abc' });
    });
  });

  describe('createWebSocket', () => {
    it('creates the websocket and wires handlers', async () => {
      const { client } = makeClient();
      const emitSpy = vi.spyOn(client, 'emit');

      const websocket = await client.createWebSocket();

      expect(websocket).toBe(mockWsInstance as never);
      expect(getInternalClient(client)._ws).toBe(mockWsInstance as never);
      expect(mockWsInstance.binaryType).toBe('arraybuffer');
      expect(mockWsInstance.onopen).toEqual(expect.any(Function));
      expect(mockWsInstance.onclose).toEqual(expect.any(Function));
      expect(mockWsInstance.onmessage).toEqual(expect.any(Function));
      expect(mockWsInstance.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(emitSpy).toHaveBeenCalledWith(
        'status',
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING
      );
    });

    it('onerror with retryCount=0 sets error status', async () => {
      const { client } = makeClient();
      const emitSpy = vi.spyOn(client, 'emit');

      await client.createWebSocket();
      const errorHandler = mockWsInstance.addEventListener.mock.calls.find(
        ([eventName]) => eventName === 'error'
      )?.[1] as (e: Error) => void;

      mockWsInstance.retryCount = 0;
      errorHandler(new Error('connection error'));

      expect(getInternalClient(client)._status).toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.ERROR
      );
      expect(emitSpy).toHaveBeenLastCalledWith(
        'status',
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.ERROR
      );
    });

    it('onerror when initialized and retrying sets connecting status', async () => {
      const { client } = makeClient();
      const emitSpy = vi.spyOn(client, 'emit');

      await client.createWebSocket();
      const errorHandler = mockWsInstance.addEventListener.mock.calls.find(
        ([eventName]) => eventName === 'error'
      )?.[1] as (e: Error) => void;

      getInternalClient(client)._initialized = true;
      mockWsInstance.retryCount = 2;
      errorHandler(new Error('retrying'));

      expect(getInternalClient(client)._status).toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING
      );
      expect(emitSpy).toHaveBeenLastCalledWith(
        'status',
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING
      );
    });

    it('onclose with retryCount=0 sets disconnected status', async () => {
      const { client } = makeClient();
      const emitSpy = vi.spyOn(client, 'emit');

      await client.createWebSocket();
      mockWsInstance.retryCount = 0;
      mockWsInstance.onclose!({ code: 1000 });

      expect(getInternalClient(client)._status).toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED
      );
      expect(emitSpy).toHaveBeenLastCalledWith(
        'status',
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED
      );
    });

    it('onclose with retryCount>0 sets connecting status', async () => {
      const { client } = makeClient();
      const emitSpy = vi.spyOn(client, 'emit');

      await client.createWebSocket();
      mockWsInstance.retryCount = 1;
      mockWsInstance.onclose!({ code: 1006 });

      expect(getInternalClient(client)._status).toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING
      );
      expect(emitSpy).toHaveBeenLastCalledWith(
        'status',
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING
      );
    });

    it('onclose removes awareness states when previously connected', async () => {
      const { client } = makeClient();
      const remote = createAwarenessMessage(7777);

      await client.createWebSocket();
      awarenessProtocol.applyAwarenessUpdate(
        client.awareness,
        remote.payload.subarray(2),
        'remote'
      );
      getInternalClient(client)._wsConnected = true;
      client.synced = true;

      mockWsInstance.onclose!({ code: 1000 });

      expect(getInternalClient(client)._wsConnected).toBe(false);
      expect(client.synced).toBe(false);
      expect(client.awareness.getStates().has(remote.clientId)).toBe(false);
    });

    it('onclose clears heartbeat interval when it was set via onopen', async () => {
      vi.useFakeTimers();
      const { client } = makeClient();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await client.createWebSocket();
      await mockWsInstance.onopen!();
      // _checkHeartbeatId should be set now
      expect(getInternalClient(client)._checkHeartbeatId).toBeTruthy();

      clearIntervalSpy.mockClear();
      mockWsInstance.retryCount = 0;
      mockWsInstance.onclose!({ code: 1000 });

      expect(clearIntervalSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('onerror clears heartbeat interval when it was set via onopen', async () => {
      vi.useFakeTimers();
      const { client } = makeClient();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await client.createWebSocket();
      await mockWsInstance.onopen!();
      expect(getInternalClient(client)._checkHeartbeatId).toBeTruthy();

      clearIntervalSpy.mockClear();
      const errorHandler = mockWsInstance.addEventListener.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1] as (e: Error) => void;
      mockWsInstance.retryCount = 0;
      errorHandler(new Error('error with heartbeat running'));

      expect(clearIntervalSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('URL factory: happy path emits loading events and returns url', async () => {
      const { client, instance } = makeClient();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'wss://room.azure.com/ws' }),
      });
      client.setFetchClient(mockFetch as never);

      await client.createWebSocket();
      const url = await capturedUrlFactory!();

      expect(url).toBe('wss://room.azure.com/ws');
      expect(instance.emitEvent).toHaveBeenCalledWith(
        'onStoreFetchConnectionUrl',
        { loading: true, error: null }
      );
      expect(instance.emitEvent).toHaveBeenLastCalledWith(
        'onStoreFetchConnectionUrl',
        { loading: false, error: null }
      );
    });

    it('URL factory: error path sets ERROR status and returns fallback url', async () => {
      const { client, instance } = makeClient();
      const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
      client.setFetchClient(mockFetch as never);

      await client.createWebSocket();
      const url = await capturedUrlFactory!();

      expect(url).toBe('https://error');
      expect(instance.handleConnectionStatusChange).toHaveBeenCalledWith(
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.ERROR
      );
      expect(instance.emitEvent).toHaveBeenLastCalledWith(
        'onStoreFetchConnectionUrl',
        { loading: false, error: expect.any(Error) }
      );
    });

    it('onmessage skips null data', async () => {
      const { client } = makeClient();

      await client.createWebSocket();
      await mockWsInstance.onmessage!({ data: null });

      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });

    it('onmessage skips system messages', async () => {
      const { client } = makeClient();

      await client.createWebSocket();
      await mockWsInstance.onmessage!({
        data: JSON.stringify({ type: MessageType.System }),
      });

      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });

    it('onmessage heartbeat updates lastHeartbeatTime', async () => {
      const { client } = makeClient();

      await client.createWebSocket();
      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            type: 'heartbeat',
          })
        ),
      });

      expect(getInternalClient(client)._lastHeartbeatTime).toBeGreaterThan(0);
    });

    it('onmessage resync sends sync to the control group', async () => {
      const { client } = makeClient();

      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      mockWsInstance.send.mockClear();

      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            type: 'resync',
          })
        ),
      });

      const payloads = mockWsInstance.send.mock.calls.map(([payload]) =>
        JSON.parse(payload)
      );

      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toMatchObject({
        type: MessageType.SendToGroup,
        group: 'room-1.host',
        data: { t: MessageDataType.Sync, f: client.id },
      });
    });

    it('onmessage skips messages for another client', async () => {
      const { client, instance } = makeClient();

      await client.createWebSocket();
      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            t: 'another-client',
            c: uint8ToBase64(createSyncStep1Message(new Y.Doc())),
          })
        ),
      });

      expect(mockWsInstance.send).not.toHaveBeenCalled();
      expect(instance.emitEvent).not.toHaveBeenCalledWith(
        'onSyncResponse',
        expect.any(Number)
      );
    });

    it('onmessage skips messages with no content (empty c and no joined payload)', async () => {
      const { client, instance } = makeClient();

      await client.createWebSocket();
      // createJsonMessage defaults to c: '' which is falsy → handleMessageBufferData returns undefined
      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, { c: undefined })
        ),
      });

      expect(instance.emitEvent).not.toHaveBeenCalledWith(
        'onSyncResponse',
        expect.any(Number)
      );
      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });

    it('onmessage accumulates chunk messages and skips processing until the end', async () => {
      const { client } = makeClient();
      const encoded = uint8ToBase64(createSyncStep1Message(new Y.Doc()));

      await client.createWebSocket();
      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            payloadId: 'payload-1',
            type: 'chunk',
            totalChunks: 2,
            index: 0,
            c: encoded.slice(0, Math.ceil(encoded.length / 2)),
          })
        ),
      });

      expect(getInternalClient(client)._chunkedMessages.get('payload-1')).toHaveLength(2);
      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });

    it('onmessage handles sync messages and emits onSyncResponse', async () => {
      const { client, instance } = makeClient();

      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      mockWsInstance.send.mockClear();

      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            c: uint8ToBase64(createSyncStep1Message(new Y.Doc())),
          })
        ),
      });

      expect(instance.emitEvent).toHaveBeenCalledWith(
        'onSyncResponse',
        expect.any(Number)
      );
      expect(mockWsInstance.send).toHaveBeenCalled();
    });

    it('onmessage handles awareness updates', async () => {
      const { client } = makeClient();
      const remote = createAwarenessMessage(4321);

      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      mockWsInstance.send.mockClear();

      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            c: uint8ToBase64(remote.payload),
          })
        ),
      });

      expect(client.awareness.getStates().has(remote.clientId)).toBe(true);
      expect(mockWsInstance.send).toHaveBeenCalled();
    });

    it('onmessage with unknown Yjs message type rejects (readMessage throws)', async () => {
      const { client } = makeClient();
      await client.createWebSocket();

      // Build a message with an unknown type byte (99)
      const unknownTypeBuf = new Uint8Array([99]);
      const msgPromise = mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            c: uint8ToBase64(unknownTypeBuf),
          })
        ),
      });

      await expect(msgPromise).rejects.toThrow('unable to handle message with type: 99');
    });

    it('onmessage handles queryAwareness (type 3) and sends awareness update', async () => {
      const { client } = makeClient();
      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      mockWsInstance.send.mockClear();

      // Type 3 = messageQueryAwareness
      const queryAwarenessMsg = new Uint8Array([3]);
      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            c: uint8ToBase64(queryAwarenessMsg),
          })
        ),
      });

      // Response should be sent with awareness data (type 1)
      expect(mockWsInstance.send).toHaveBeenCalled();
    });

    it('onmessage with sync step2 message sets client.synced to true', async () => {
      const { client } = makeClient();
      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      expect(client.synced).toBe(false);

      // Build a sync step 2 message: [messageSync(0)] + writeSyncStep2
      const msgEncoder = encoding.createEncoder();
      encoding.writeVarUint(msgEncoder, 0); // messageSync
      syncProtocol.writeSyncStep2(msgEncoder, new Y.Doc(), Y.encodeStateVector(client.doc));
      const bytes = encoding.toUint8Array(msgEncoder);

      await mockWsInstance.onmessage!({
        data: JSON.stringify(
          createJsonMessage(client, {
            c: uint8ToBase64(bytes),
          })
        ),
      });

      expect(client.synced).toBe(true);
    });

    it('onopen connects, joins group and sends sync messages', async () => {
      const { client } = makeClient();
      const emitSpy = vi.spyOn(client, 'emit');

      await client.createWebSocket();
      await mockWsInstance.onopen!();

      const sendCalls = mockWsInstance.send.mock.calls.map(([payload]) =>
        JSON.parse(payload)
      );

      expect(getInternalClient(client)._wsConnected).toBe(true);
      expect(getInternalClient(client)._initialized).toBe(true);
      expect(client.synced).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith(
        'status',
        WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTED
      );
      expect(sendCalls.some((message) => message.type === MessageType.JoinGroup)).toBe(true);
      expect(
        sendCalls.filter((message) => message.group === 'room-1.host').length
      ).toBeGreaterThanOrEqual(3);
    });

    it('doc update handler chunks oversized payloads', async () => {
      const { client } = makeClient();
      const largeUpdate = new Uint8Array(600 * 1024).fill(1);

      await client.createWebSocket();
      getInternalClient(client)._wsConnected = true;
      mockWsInstance.send.mockClear();

      getInternalClient(client)._updateHandler(largeUpdate, null);

      const payloads = mockWsInstance.send.mock.calls.map(([payload]) =>
        JSON.parse(payload)
      );

      expect(payloads.length).toBeGreaterThan(1);
      expect(payloads[0].data.type).toBe('chunk');
      expect(payloads.at(-1)?.data.type).toBe('end');
      expect(payloads.every((payload) => payload.group === 'room-1.host')).toBe(true);
    });

    it('heartbeat reconnects when no heartbeat is received', async () => {
      vi.useFakeTimers();
      const { client } = makeClient();
      const reconnectSpy = vi
        .spyOn(client, 'createWebSocket')
        .mockResolvedValue(mockWsInstance as never);

      await WeaveStoreAzureWebPubSubSyncClient.prototype.createWebSocket.call(
        client
      );
      await mockWsInstance.onopen!();
      mockWsInstance.close.mockClear();
      reconnectSpy.mockClear();

      await vi.advanceTimersByTimeAsync(60000 + 15001);

      expect(mockWsInstance.close).toHaveBeenCalled();
      expect(reconnectSpy).toHaveBeenCalled();
    });
  });
});
