// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Y from './../../yjs';
import WeaveAzureWebPubsubSyncHandler from '../azure-web-pubsub-sync-handler';
import { WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS } from './../../constants';
import { WeaveStoreAzureWebPubSubSyncHost } from '../azure-web-pubsub-host';
import { getStateAsJson, hashJson, sleep } from '../utils';

type InternalHandler = {
  setupRoomInstancePersistence: (roomId: string) => Promise<void>;
  _store_persistence: Map<string, unknown>;
};

function getInternalHandler(handler: WeaveAzureWebPubsubSyncHandler): InternalHandler {
  return handler as unknown as InternalHandler;
}

const mockedState = vi.hoisted(() => ({
  mockHostInstance: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    isReconnecting: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../azure-web-pubsub-host', () => {
  return {
    WeaveStoreAzureWebPubSubSyncHost: vi
      .fn()
      .mockImplementation(() => mockedState.mockHostInstance),
  };
});

vi.mock('../utils', () => ({
  getStateAsJson: vi.fn().mockReturnValue({}),
  hashJson: vi.fn().mockReturnValue('hash123'),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../event-handler', () => ({
  WebPubSubEventHandler: class {
    path = '/api/test/';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _handleConnect?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _onConnected?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _onDisconnected?: any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(_hub: string, options?: any) {
      if (options?.handleConnect) {
        this._handleConnect = options.handleConnect;
        this._onConnected = options.onConnected;
        this._onDisconnected = options.onDisconnected;
      }
    }

    getKoaMiddleware() {
      return vi.fn();
    }

    getExpressJsMiddleware() {
      return vi.fn();
    }
  },
}));

const mockClient = {
  getClientAccessToken: vi
    .fn()
    .mockResolvedValue({ url: 'ws://pubsub-url', token: 'token123' }),
};

function makeServer() {
  return {
    emitEvent: vi.fn(),
    fetchRoom: vi.fn().mockResolvedValue(null),
    persistRoom: vi.fn().mockResolvedValue(undefined),
  };
}

function makeSyncHandler(options = {}) {
  const server = makeServer();
  const initialState = vi.fn();
  const handler = new WeaveAzureWebPubsubSyncHandler(
    'myhub',
    server as never,
    mockClient as never,
    initialState,
    options
  );

  return { handler, server, initialState };
}

async function flushPromises() {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
}

describe('WeaveAzureWebPubsubSyncHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockedState.mockHostInstance.start.mockReset().mockResolvedValue(undefined);
    mockedState.mockHostInstance.stop.mockReset().mockResolvedValue(undefined);
    mockedState.mockHostInstance.isConnected.mockReset().mockReturnValue(true);
    mockedState.mockHostInstance.isReconnecting
      .mockReset()
      .mockReturnValue(false);

    mockClient.getClientAccessToken
      .mockReset()
      .mockResolvedValue({ url: 'ws://pubsub-url', token: 'token123' });

    vi.mocked(getStateAsJson).mockReset().mockReturnValue({});
    vi.mocked(hashJson).mockReset().mockReturnValue('hash123');
    vi.mocked(sleep).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('does not warn when persistIntervalMs is undefined', () => {
      makeSyncHandler();

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('warns when persistIntervalMs is defined', () => {
      makeSyncHandler({ persistIntervalMs: 1000 });

      expect(console.warn).toHaveBeenCalledWith(
        'Room persistence defined via interval, be aware that this can lead to data loss. Consider persisting on document updates instead.'
      );
    });
  });

  describe('isPersistingOnInterval', () => {
    it('returns false when persistIntervalMs is undefined', () => {
      const { handler } = makeSyncHandler();

      expect(handler.isPersistingOnInterval()).toBe(false);
    });

    it('returns true when persistIntervalMs is defined', () => {
      const { handler } = makeSyncHandler({ persistIntervalMs: 1000 });

      expect(handler.isPersistingOnInterval()).toBe(true);
    });
  });

  describe('room accessors', () => {
    it('getRoomsLoaded returns the loaded room ids', async () => {
      const { handler } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      await handler.getRoomDocument('room-2');

      expect(handler.getRoomsLoaded()).toEqual(['room-1', 'room-2']);
    });

    it('getRoomSyncHost returns the room host or undefined', async () => {
      const { handler } = makeSyncHandler();

      expect(handler.getRoomSyncHost('room-1')).toBeUndefined();

      await handler.getRoomDocument('room-1');

      expect(handler.getRoomSyncHost('room-1')).toBe(mockedState.mockHostInstance);
    });
  });

  describe('getRoomDocument/setupRoomInstance', () => {
    it('applies persisted room data when fetchRoom returns data', async () => {
      const { handler, server, initialState } = makeSyncHandler();
      const sourceDoc = new Y.Doc();
      sourceDoc.getMap('weave').set('color', 'blue');
      const update = Y.encodeStateAsUpdate(sourceDoc);

      server.fetchRoom.mockResolvedValue(update);

      const doc = await handler.getRoomDocument('room-1');

      expect(server.fetchRoom).toHaveBeenCalledWith('room-1');
      expect(doc.getMap('weave').get('color')).toBe('blue');
      expect(initialState).not.toHaveBeenCalled();
      expect(WeaveStoreAzureWebPubSubSyncHost).toHaveBeenCalled();
      expect(mockedState.mockHostInstance.start).toHaveBeenCalledTimes(1);
    });

    it('calls initialState when fetchRoom returns null', async () => {
      const { handler, server, initialState } = makeSyncHandler();

      server.fetchRoom.mockResolvedValue(null);

      const doc = await handler.getRoomDocument('room-1');

      expect(server.fetchRoom).toHaveBeenCalledWith('room-1');
      expect(initialState).toHaveBeenCalledWith(doc);
    });

    it('calls initialState when fetchRoom is not available', async () => {
      const server = {
        emitEvent: vi.fn(),
        persistRoom: vi.fn().mockResolvedValue(undefined),
      };
      const initialState = vi.fn();
      const handler = new WeaveAzureWebPubsubSyncHandler(
        'myhub',
        server as never,
        mockClient as never,
        initialState
      );

      const doc = await handler.getRoomDocument('room-1');

      expect(initialState).toHaveBeenCalledWith(doc);
    });

    it('creates a sync host and starts it', async () => {
      const { handler, server } = makeSyncHandler();

      const doc = await handler.getRoomDocument('room-1');

      expect(WeaveStoreAzureWebPubSubSyncHost).toHaveBeenCalledWith(
        server,
        handler,
        mockClient,
        'room-1',
        doc,
        undefined
      );
      expect(mockedState.mockHostInstance.start).toHaveBeenCalledTimes(1);
      expect(handler.getRoomSyncHost('room-1')).toBe(mockedState.mockHostInstance);
    });

    it('sets up persistence interval when persistIntervalMs is defined', async () => {
      vi.useFakeTimers();

      const { handler } = makeSyncHandler({ persistIntervalMs: 1000 });
      const persistRoomTaskSpy = vi
        .spyOn(handler, 'persistRoomTask')
        .mockResolvedValue(undefined);

      await handler.getRoomDocument('room-1');
      await vi.advanceTimersByTimeAsync(1000);

      expect(persistRoomTaskSpy).toHaveBeenCalledWith('room-1');
    });

    it('does not create duplicate persistence intervals for the same room', async () => {
      vi.useFakeTimers();

      const { handler } = makeSyncHandler({ persistIntervalMs: 1000 });
      const persistRoomTaskSpy = vi
        .spyOn(handler, 'persistRoomTask')
        .mockResolvedValue(undefined);

      await handler.getRoomDocument('room-1');
      // Manually call setupRoomInstancePersistence a second time for the same room
      await getInternalHandler(handler).setupRoomInstancePersistence('room-1');

      const persistenceMap: Map<string, unknown> = getInternalHandler(handler)._store_persistence;
      expect(persistenceMap.has('room-1')).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      // Only one interval should have fired (not two)
      expect(persistRoomTaskSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('persistRoomTask', () => {
    it('returns early when the room document does not exist', async () => {
      const { handler, server } = makeSyncHandler();

      await handler.persistRoomTask('missing-room');

      expect(server.persistRoom).not.toHaveBeenCalled();
    });

    it('persists the room on first persist when not persisting on interval', async () => {
      const { handler, server } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      server.persistRoom.mockClear();

      await handler.persistRoomTask('room-1');

      expect(server.persistRoom).toHaveBeenCalledTimes(1);
      expect(server.persistRoom).toHaveBeenCalledWith(
        'room-1',
        expect.any(Uint8Array)
      );
    });

    it('skips persisting when the document hash has not changed', async () => {
      const { handler, server } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      (handler as never as { roomsLastState: Map<string, Uint8Array> }).roomsLastState.set(
        'room-1',
        new Uint8Array([1])
      );
      vi.mocked(getStateAsJson).mockReturnValue({ shared: true });
      vi.mocked(hashJson).mockReturnValue('same-hash');

      await handler.persistRoomTask('room-1');

      expect(server.persistRoom).not.toHaveBeenCalled();
    });

    it('persists when the document hash changes', async () => {
      const { handler, server } = makeSyncHandler();
      const previousState = new Uint8Array([1]);

      await handler.getRoomDocument('room-1');
      (handler as never as { roomsLastState: Map<string, Uint8Array> }).roomsLastState.set(
        'room-1',
        previousState
      );
      vi.mocked(getStateAsJson)
        .mockReturnValueOnce({ version: 1 })
        .mockReturnValueOnce({ version: 2 });
      vi.mocked(hashJson)
        .mockReturnValueOnce('old-hash')
        .mockReturnValueOnce('new-hash');

      await handler.persistRoomTask('room-1');

      expect(server.persistRoom).toHaveBeenCalledWith(
        'room-1',
        expect.any(Uint8Array)
      );
      expect(
        (handler as never as { roomsLastState: Map<string, Uint8Array> }).roomsLastState.get(
          'room-1'
        )
      ).not.toBe(previousState);
    });

    it('always persists when persisting on interval', async () => {
      const { handler, server } = makeSyncHandler({ persistIntervalMs: 1000 });

      await handler.getRoomDocument('room-1');
      (handler as never as { roomsLastState: Map<string, Uint8Array> }).roomsLastState.set(
        'room-1',
        new Uint8Array([1])
      );
      vi.mocked(hashJson).mockReturnValue('same-hash');

      await handler.persistRoomTask('room-1');

      expect(server.persistRoom).toHaveBeenCalledWith(
        'room-1',
        expect.any(Uint8Array)
      );
    });

    it('does not fail when persistRoom is not available', async () => {
      const server = {
        emitEvent: vi.fn(),
        fetchRoom: vi.fn().mockResolvedValue(null),
      };
      const handler = new WeaveAzureWebPubsubSyncHandler(
        'myhub',
        server as never,
        mockClient as never,
        vi.fn()
      );

      await handler.getRoomDocument('room-1');

      await expect(handler.persistRoomTask('room-1')).resolves.toBeUndefined();
    });

    it('logs errors thrown while persisting', async () => {
      const { handler, server } = makeSyncHandler();
      const error = new Error('persist failed');

      await handler.getRoomDocument('room-1');
      server.persistRoom.mockRejectedValueOnce(error);

      await handler.persistRoomTask('room-1');

      expect(console.error).toHaveBeenCalledWith(error);
    });
  });

  describe('destroyRoomInstance', () => {
    it('returns NOT_FOUND when the room host does not exist', async () => {
      const { handler } = makeSyncHandler();

      await expect(handler.destroyRoomInstance('missing-room')).resolves.toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.NOT_FOUND
      );
    });

    it('returns NOT_CONNECTED when the room host is not connected', async () => {
      const { handler } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      mockedState.mockHostInstance.isConnected.mockReturnValue(false);

      await expect(handler.destroyRoomInstance('room-1')).resolves.toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.NOT_CONNECTED
      );
    });

    it('clears interval, persists, stops and removes the room when connected', async () => {
      vi.useFakeTimers();

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const { handler, server } = makeSyncHandler({ persistIntervalMs: 1000 });

      await handler.getRoomDocument('room-1');
      server.persistRoom.mockClear();
      mockedState.mockHostInstance.stop.mockClear();

      await expect(handler.destroyRoomInstance('room-1')).resolves.toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.DESTROYED
      );

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(server.persistRoom).toHaveBeenCalledWith(
        'room-1',
        expect.any(Uint8Array)
      );
      expect(mockedState.mockHostInstance.stop).toHaveBeenCalledTimes(1);
      expect(handler.getRoomSyncHost('room-1')).toBeUndefined();
      expect(handler.getRoomsLoaded()).toEqual([]);
      expect(
        (handler as never as { _store_persistence: Map<string, NodeJS.Timeout> })._store_persistence.has(
          'room-1'
        )
      ).toBe(false);
    });

    it('persists and removes the room without clearing interval when interval persistence is disabled', async () => {
      const { handler, server } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      server.persistRoom.mockClear();

      await expect(handler.destroyRoomInstance('room-1')).resolves.toBe(
        WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.DESTROYED
      );

      expect(server.persistRoom).toHaveBeenCalledWith(
        'room-1',
        expect.any(Uint8Array)
      );
      expect(handler.getRoomSyncHost('room-1')).toBeUndefined();
      expect(handler.getRoomsLoaded()).toEqual([]);
      expect(
        (handler as never as { _store_persistence: Map<string, NodeJS.Timeout> })._store_persistence.size
      ).toBe(0);
    });
  });

  describe('handleConnectionDisconnection via onDisconnected callback', () => {
    it('does nothing when there is no room associated with the connection', async () => {
      const options = {
        getConnectionRoom: vi.fn().mockResolvedValue(null),
        removeConnection: vi.fn().mockResolvedValue(undefined),
        getRoomConnections: vi.fn().mockResolvedValue([]),
      };
      const { handler, server } = makeSyncHandler(options);
      const destroyRoomInstanceSpy = vi
        .spyOn(handler, 'destroyRoomInstance')
        .mockResolvedValue(
          WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.DESTROYED
        );

      (handler as never as { _onDisconnected: (req: unknown) => void })._onDisconnected({
        context: { connectionId: 'conn-1' },
      });
      await flushPromises();

      expect(options.removeConnection).not.toHaveBeenCalled();
      expect(options.getRoomConnections).not.toHaveBeenCalled();
      expect(destroyRoomInstanceSpy).not.toHaveBeenCalled();
      expect(server.emitEvent).toHaveBeenCalledWith('onDisconnected', {
        context: { connectionId: 'conn-1' },
      });
    });

    it('destroys the room when the disconnected client was the last connection', async () => {
      const options = {
        getConnectionRoom: vi.fn().mockResolvedValue('room-1'),
        removeConnection: vi.fn().mockResolvedValue(undefined),
        getRoomConnections: vi.fn().mockResolvedValue([]),
      };
      const { handler } = makeSyncHandler(options);
      const destroyRoomInstanceSpy = vi
        .spyOn(handler, 'destroyRoomInstance')
        .mockResolvedValue(
          WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.DESTROYED
        );

      (handler as never as { _onDisconnected: (req: unknown) => void })._onDisconnected({
        context: { connectionId: 'conn-1' },
      });
      await flushPromises();

      expect(options.removeConnection).toHaveBeenCalledWith('conn-1');
      expect(options.getRoomConnections).toHaveBeenCalledWith('room-1');
      expect(destroyRoomInstanceSpy).toHaveBeenCalledWith('room-1');
    });

    it('does not destroy the room when there are remaining connections', async () => {
      const options = {
        getConnectionRoom: vi.fn().mockResolvedValue('room-1'),
        removeConnection: vi.fn().mockResolvedValue(undefined),
        getRoomConnections: vi.fn().mockResolvedValue(['conn-2']),
      };
      const { handler } = makeSyncHandler(options);
      const destroyRoomInstanceSpy = vi
        .spyOn(handler, 'destroyRoomInstance')
        .mockResolvedValue(
          WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.DESTROYED
        );

      (handler as never as { _onDisconnected: (req: unknown) => void })._onDisconnected({
        context: { connectionId: 'conn-1' },
      });
      await flushPromises();

      expect(options.removeConnection).toHaveBeenCalledWith('conn-1');
      expect(options.getRoomConnections).toHaveBeenCalledWith('room-1');
      expect(destroyRoomInstanceSpy).not.toHaveBeenCalled();
    });
  });

  describe('client connection controls', () => {
    it('clientConnect gets the host connection and returns the client url with group', async () => {
      const { handler } = makeSyncHandler();

      await expect(
        handler.clientConnect('room-1', { expirationTimeInMinutes: 15 })
      ).resolves.toBe('ws://pubsub-url&group=room-1');

      expect(mockedState.mockHostInstance.start).toHaveBeenCalledTimes(1);
      expect(mockClient.getClientAccessToken).toHaveBeenCalledWith({
        groups: ['room-1'],
        roles: [
          'webpubsub.joinLeaveGroup.room-1',
          'webpubsub.sendToGroup.room-1.host',
        ],
        expirationTimeInMinutes: 15,
      });
    });

    it('restarts the host when room is loaded but disconnected and not reconnecting', async () => {
      const { handler } = makeSyncHandler();

      // Load the room first
      await handler.getRoomDocument('room-1');
      mockedState.mockHostInstance.start.mockClear();

      // Simulate disconnected + not reconnecting
      mockedState.mockHostInstance.isConnected.mockReturnValue(false);
      mockedState.mockHostInstance.isReconnecting.mockReturnValue(false);

      // getHostConnection should call start() on the existing host
      await handler.getRoomDocument('room-1');

      expect(mockedState.mockHostInstance.start).toHaveBeenCalledTimes(1);
    });

    it('clientDisconnect destroys the room instance when the host exists', async () => {
      const { handler } = makeSyncHandler();
      const destroyRoomInstanceSpy = vi
        .spyOn(handler, 'destroyRoomInstance')
        .mockResolvedValue(
          WEAVE_STORE_AZURE_WEB_PUBSUB_DESTROY_ROOM_STATUS.DESTROYED
        );

      await handler.getRoomDocument('room-1');
      await handler.clientDisconnect('room-1');

      expect(destroyRoomInstanceSpy).toHaveBeenCalledWith('room-1');
    });

    it('clientTransportConnect starts the room sync host', async () => {
      const { handler } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      mockedState.mockHostInstance.start.mockClear();

      await handler.clientTransportConnect('room-1');

      expect(mockedState.mockHostInstance.start).toHaveBeenCalledTimes(1);
    });

    it('clientTransportDisconnect stops the room sync host', async () => {
      const { handler } = makeSyncHandler();

      await handler.getRoomDocument('room-1');
      mockedState.mockHostInstance.stop.mockClear();

      handler.clientTransportDisconnect('room-1');

      expect(mockedState.mockHostInstance.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handler callbacks', () => {
    it('handleConnect calls success, onConnect and emits the event', () => {
      const options = {
        onConnect: vi.fn().mockResolvedValue(undefined),
      };
      const { handler, server } = makeSyncHandler(options);
      const res = { success: vi.fn() };

      (
        handler as never as {
          _handleConnect: (req: unknown, res: { success: () => void }) => void;
        }
      )._handleConnect(
        {
          context: { connectionId: 'conn-1' },
          queries: { room: ['room-1'] },
        },
        res
      );

      expect(res.success).toHaveBeenCalledTimes(1);
      expect(options.onConnect).toHaveBeenCalledWith('conn-1', {
        room: ['room-1'],
      });
      expect(server.emitEvent).toHaveBeenCalledWith('onConnect', {
        context: { connectionId: 'conn-1' },
        queries: { room: ['room-1'] },
      });
    });

    it('onConnected calls the hook and emits the event', () => {
      const options = {
        onConnected: vi.fn().mockResolvedValue(undefined),
      };
      const { handler, server } = makeSyncHandler(options);

      (handler as never as { _onConnected: (req: unknown) => void })._onConnected({
        context: { connectionId: 'conn-1' },
      });

      expect(options.onConnected).toHaveBeenCalledWith('conn-1');
      expect(server.emitEvent).toHaveBeenCalledWith('onConnected', {
        context: { connectionId: 'conn-1' },
      });
    });

    it('onDisconnected calls handleConnectionDisconnection and emits the event', () => {
      const { handler, server } = makeSyncHandler();
      const handleConnectionDisconnectionSpy = vi
        .spyOn(
          handler as never as {
            handleConnectionDisconnection: (connectionId: string) => Promise<void>;
          },
          'handleConnectionDisconnection'
        )
        .mockResolvedValue(undefined);

      (handler as never as { _onDisconnected: (req: unknown) => void })._onDisconnected({
        context: { connectionId: 'conn-1' },
      });

      expect(handleConnectionDisconnectionSpy).toHaveBeenCalledWith('conn-1');
      expect(server.emitEvent).toHaveBeenCalledWith('onDisconnected', {
        context: { connectionId: 'conn-1' },
      });
    });
  });
});
