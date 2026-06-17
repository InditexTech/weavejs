// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { WEAVE_STORE_CONNECTION_STATUS } from '@inditextech/weave-types';
import { WEAVE_STORE_AZURE_WEB_PUBSUB } from '../constants';

type MockAwareness = {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  getStates: ReturnType<typeof vi.fn>;
  setLocalStateField: ReturnType<typeof vi.fn>;
  clientID: number;
};

type MockProvider = {
  awareness: MockAwareness;
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  getClientId: ReturnType<typeof vi.fn>;
  setFetchClient: ReturnType<typeof vi.fn>;
  simulateWebsocketError: ReturnType<typeof vi.fn>;
};

type MockInstance = {
  emitEvent: ReturnType<typeof vi.fn>;
  switchRoom: ReturnType<typeof vi.fn>;
};

type TestStore = {
  actualStatus: string;
  started: boolean;
  initialRoomData?: Uint8Array | ((doc: Y.Doc) => void);
  provider?: MockProvider;
  instance?: MockInstance;
  _loadDocumentData?: Uint8Array;
  _loadDefaultDocumentFn?: ((doc: Y.Doc) => void) | undefined;
  _setupCalls: number;
  loadRoomInitialData: () => void;
  indexedDbPersistence: { destroy: ReturnType<typeof vi.fn> } | null;
};

const mockState = vi.hoisted(() => {
  const providers: MockProvider[] = [];

  const createProvider = () => ({
    awareness: {
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      getStates: vi.fn().mockReturnValue(new Map()),
      setLocalStateField: vi.fn(),
      clientID: 0,
    },
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getClientId: vi.fn().mockReturnValue('client-uuid'),
    setFetchClient: vi.fn(),
    simulateWebsocketError: vi.fn(),
  });

  const WeaveStoreAzureWebPubSubSyncClient = vi
    .fn()
    .mockImplementation(() => {
      const provider = createProvider();
      providers.push(provider);
      return provider;
    });

  const mockIndexedDbPersistence = {
    destroy: vi.fn().mockResolvedValue(undefined),
  };

  const IndexeddbPersistence = vi
    .fn()
    .mockImplementation(() => mockIndexedDbPersistence);

  return {
    providers,
    WeaveStoreAzureWebPubSubSyncClient,
    IndexeddbPersistence,
    mockIndexedDbPersistence,
  };
});

vi.mock('../client', () => ({
  WeaveStoreAzureWebPubSubSyncClient:
    mockState.WeaveStoreAzureWebPubSubSyncClient,
}));

vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: mockState.IndexeddbPersistence,
}));

vi.mock('@inditextech/weave-sdk', async () => {
  return {
    WeaveStore: class {
      protected instance:
        | { emitEvent: (name: string, payload?: unknown) => void }
        | undefined;
      protected config: unknown;
      protected roomId!: string;
      private _document: Y.Doc;

      _loadDocumentData: Uint8Array | undefined;
      _loadDefaultDocumentFn: ((doc: Y.Doc) => void) | undefined;
      _setupCalls = 0;
      _restartDocumentCalls = 0;
      _connectionStatuses: string[] = [];

      constructor(options: unknown) {
        this.config = options;
        this._document = new Y.Doc();
        this._document.getMap('weave');
        this._document.getMap('weaveMetadata');
      }

      setup() {
        this._setupCalls += 1;
      }

      getName() {
        return (this as { name?: string }).name;
      }

      getRoomId() {
        return this.roomId;
      }

      loadDocument(data: Uint8Array) {
        this._loadDocumentData = data;
        Y.applyUpdate(this._document, data);
      }

      loadDefaultDocument(fn?: (doc: Y.Doc) => void) {
        this._loadDefaultDocumentFn = fn;

        if (fn) {
          fn(this._document);
          return;
        }

        this._document.getMap('weave').set('default', true);
      }

      restartDocument() {
        this._restartDocumentCalls += 1;
        this._document = new Y.Doc();
        this._document.getMap('weave');
        this._document.getMap('weaveMetadata');
      }

      getDocument() {
        return this._document;
      }

      handleConnectionStatusChange(status: string) {
        this._connectionStatuses.push(status);
        this.instance?.emitEvent('onStoreConnectionStatusChange', status);
      }
    },
    mergeExceptArrays: (
      a: Record<string, unknown>,
      b: Record<string, unknown>
    ) => ({ ...a, ...b }),
  };
});

import { WeaveStoreAzureWebPubsub } from '../store-azure-web-pubsub';

function makeMockInstance() {
  return {
    emitEvent: vi.fn(),
    switchRoom: vi.fn().mockResolvedValue(undefined),
  } satisfies MockInstance;
}

type StoreConstructorOptions = ConstructorParameters<
  typeof WeaveStoreAzureWebPubsub
>[2];

function makeStore(
  initialRoomData?: Uint8Array | ((doc: Y.Doc) => void),
  optionOverrides: Partial<StoreConstructorOptions> = {}
) {
  const storeOptions = { getUser: vi.fn().mockReturnValue({ id: 'user-1' }) };
  const store = new WeaveStoreAzureWebPubsub(initialRoomData, storeOptions, {
    roomId: 'room-1',
    url: 'http://localhost/negotiate/[roomId]',
    ...optionOverrides,
  });
  const mockInstance = makeMockInstance();
  // @ts-expect-error testing protected access
  store.instance = mockInstance;
  return { store, mockInstance };
}

function asTestStore(store: WeaveStoreAzureWebPubsub) {
  return store as unknown as TestStore;
}

function getLatestProvider() {
  return mockState.providers.at(-1) as MockProvider;
}

function getProviderHandler(provider: MockProvider, eventName: string) {
  const handler = provider.on.mock.calls.find(
    (call) => call[0] === eventName
  )?.[1] as (...args: unknown[]) => void;
  if (!handler) throw new Error(`No handler registered for event '${eventName}'`);
  return handler;
}

describe('WeaveStoreAzureWebPubsub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    mockState.providers.length = 0;
    mockState.WeaveStoreAzureWebPubSubSyncClient.mockClear();
    mockState.IndexeddbPersistence.mockClear();
    mockState.mockIndexedDbPersistence.destroy.mockClear();
  });

  describe('constructor', () => {
    it('replaces the roomId placeholder, creates the provider, sets initial state, and registers listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      const { store } = makeStore();
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === 'beforeunload'
      )?.[1] as EventListener;

      expect(store.getName()).toBe(WEAVE_STORE_AZURE_WEB_PUBSUB);
      expect(mockState.WeaveStoreAzureWebPubSubSyncClient).toHaveBeenCalledWith(
        store,
        'http://localhost/negotiate/room-1',
        'room-1',
        expect.any(Y.Doc),
        undefined
      );
      expect(testStore.actualStatus).toBe(
        WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
      );
      expect(testStore.started).toBe(false);
      expect(provider.awareness.on).toHaveBeenCalledWith(
        'update',
        expect.any(Function)
      );
      expect(provider.awareness.on).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      expect(provider.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(provider.on).toHaveBeenCalledWith('status', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );

      beforeUnloadHandler(new Event('beforeunload'));

      expect(provider.awareness.destroy).toHaveBeenCalled();
    });
  });

  describe('loadRoomInitialData', () => {
    it('loads Uint8Array room data on first connected status', () => {
      const sourceDoc = new Y.Doc();
      sourceDoc.getMap('weave').set('key', 'value');
      const initialRoomData = Y.encodeStateAsUpdate(sourceDoc);
      const { store } = makeStore(initialRoomData);
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const onStatusHandler = getProviderHandler(provider, 'status');

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(testStore._loadDocumentData).toBe(initialRoomData);
      expect(store.getDocument().getMap('weave').get('key')).toBe('value');
      expect(testStore.initialRoomData).toBeUndefined();
      expect(testStore.started).toBe(true);
    });

    it('loads function room data on first connected status', () => {
      const initialRoomData = vi.fn((doc: Y.Doc) => {
        doc.getMap('weave').set('from-fn', true);
      });
      const { store } = makeStore(initialRoomData);
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const onStatusHandler = getProviderHandler(provider, 'status');

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(testStore._loadDefaultDocumentFn).toBe(initialRoomData);
      expect(initialRoomData).toHaveBeenCalledWith(store.getDocument());
      expect(store.getDocument().getMap('weave').get('from-fn')).toBe(true);
      expect(testStore.initialRoomData).toBeUndefined();
      expect(testStore.started).toBe(true);
    });

    it('loads the default document when initial room data is undefined', () => {
      const { store } = makeStore(undefined);
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const onStatusHandler = getProviderHandler(provider, 'status');

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(testStore._loadDefaultDocumentFn).toBeUndefined();
      expect(store.getDocument().getMap('weave').get('default')).toBe(true);
      expect(testStore.initialRoomData).toBeUndefined();
      expect(testStore.started).toBe(true);
    });
  });

  describe('provider event handlers', () => {
    it('handles provider error events as disconnected', () => {
      const { store, mockInstance } = makeStore();
      const provider = getLatestProvider();
      const handleConnectionStatusChangeSpy = vi.spyOn(
        store,
        'handleConnectionStatusChange'
      );
      const onErrorHandler = getProviderHandler(provider, 'error');

      onErrorHandler();

      expect(handleConnectionStatusChangeSpy).toHaveBeenCalledWith(
        WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
      );
      expect(mockInstance.emitEvent).toHaveBeenCalledWith(
        'onStoreConnectionStatusChange',
        WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED
      );
    });

    it('handles connected status when not switching rooms', () => {
      const { store } = makeStore();
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const handleConnectionStatusChangeSpy = vi.spyOn(
        store,
        'handleConnectionStatusChange'
      );
      const loadRoomInitialDataSpy = vi.spyOn(testStore, 'loadRoomInitialData');
      const onStatusHandler = getProviderHandler(provider, 'status');

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(handleConnectionStatusChangeSpy).toHaveBeenCalledWith(
        WEAVE_STORE_CONNECTION_STATUS.CONNECTED
      );
      expect(loadRoomInitialDataSpy).toHaveBeenCalledTimes(1);
      expect(testStore.actualStatus).toBe(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);
      expect(testStore.started).toBe(true);
    });

    it('does not load initial room data again after the first connected status', () => {
      const { store } = makeStore();
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const loadRoomInitialDataSpy = vi.spyOn(testStore, 'loadRoomInitialData');
      const onStatusHandler = getProviderHandler(provider, 'status');

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);
      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(loadRoomInitialDataSpy).toHaveBeenCalledTimes(1);
    });

    it('ignores non-connected statuses while switching rooms', () => {
      const { store } = makeStore();
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const handleConnectionStatusChangeSpy = vi.spyOn(
        store,
        'handleConnectionStatusChange'
      );
      const onStatusHandler = getProviderHandler(provider, 'status');

      testStore.actualStatus = WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM;

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.DISCONNECTED);

      expect(handleConnectionStatusChangeSpy).not.toHaveBeenCalled();
      expect(testStore.actualStatus).toBe(
        WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM
      );
    });

    it('ends room switching when connected status arrives during switching', () => {
      const { store, mockInstance } = makeStore();
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const handleConnectionStatusChangeSpy = vi.spyOn(
        store,
        'handleConnectionStatusChange'
      );
      const onStatusHandler = getProviderHandler(provider, 'status');

      testStore.actualStatus = WEAVE_STORE_CONNECTION_STATUS.SWITCHING_ROOM;

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(handleConnectionStatusChangeSpy).toHaveBeenCalledWith(
        WEAVE_STORE_CONNECTION_STATUS.CONNECTED
      );
      expect(mockInstance.emitEvent).toHaveBeenCalledWith(
        'onRoomSwitchingEnd',
        { room: 'room-1' }
      );
      expect(testStore.actualStatus).toBe(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);
    });
  });

  describe('public methods', () => {
    it('emitEvent delegates to the framework instance', () => {
      const { store, mockInstance } = makeStore();

      store.emitEvent('custom-event', { ok: true });

      expect(mockInstance.emitEvent).toHaveBeenCalledWith('custom-event', {
        ok: true,
      });
    });

    it('getClientId returns the provider client id', () => {
      const { store } = makeStore();

      expect(store.getClientId()).toBe('client-uuid');
    });

    it('getClientId returns null when no provider exists', () => {
      const { store } = makeStore();
      const testStore = asTestStore(store);

      testStore.provider = undefined;

      expect(store.getClientId()).toBeNull();
    });

    it('setup calls the base setup implementation', () => {
      const { store } = makeStore();
      const testStore = asTestStore(store);

      store.setup();

      expect(testStore._setupCalls).toBe(1);
    });

    it('connect uses window.fetch by default, emits the room change event, and connects with params', async () => {
      const { store, mockInstance } = makeStore();
      const provider = getLatestProvider();
      const extraParams = { token: 'abc' };

      await store.connect(extraParams);

      expect(provider.setFetchClient).toHaveBeenCalledWith(window.fetch);
      expect(mockInstance.emitEvent).toHaveBeenCalledWith('onStoreRoomChanged', {
        room: 'room-1',
      });
      expect(provider.connect).toHaveBeenCalledWith(extraParams);
    });

    it('connect uses the custom fetch client when provided', async () => {
      const customFetchClient = vi.fn();
      const { store } = makeStore(undefined, {
        fetchClient: customFetchClient,
      });
      const provider = getLatestProvider();

      await store.connect();

      expect(provider.setFetchClient).toHaveBeenCalledWith(customFetchClient);
    });

    it('disconnect delegates to the provider', async () => {
      const { store } = makeStore();
      const provider = getLatestProvider();

      await store.disconnect();

      expect(provider.disconnect).toHaveBeenCalled();
    });

    it('simulateWebsocketError delegates to the provider', () => {
      const { store } = makeStore();
      const provider = getLatestProvider();

      store.simulateWebsocketError();

      expect(provider.simulateWebsocketError).toHaveBeenCalled();
    });

    it('destroy is a no-op', () => {
      const { store } = makeStore();

      expect(() => store.destroy()).not.toThrow();
    });

    it('handleAwarenessChange returns early when no instance exists', () => {
      const { store } = makeStore();
      const provider = getLatestProvider();

      provider.awareness.getStates.mockReturnValue(new Map([[0, { user: 'a' }]]));
      // @ts-expect-error testing protected access
      store.instance = undefined;

      expect(() => store.handleAwarenessChange()).not.toThrow();
    });

    it('handleAwarenessChange emits remote awareness values without the local client entry', () => {
      const { store, mockInstance } = makeStore();
      const provider = getLatestProvider();

      provider.awareness.getStates.mockReturnValue(
        new Map([
          [0, { user: 'local' }],
          [1, { user: 'remote-a' }],
          [2, { user: 'remote-b' }],
        ])
      );
      provider.awareness.clientID = 1;

      store.handleAwarenessChange(true);

      expect(mockInstance.emitEvent).toHaveBeenCalledWith('onAwarenessChange', [
        { user: 'local' },
        { user: 'remote-b' },
      ]);
    });

    it('handleAwarenessChange does not emit when emit is false', () => {
      const { store, mockInstance } = makeStore();
      const provider = getLatestProvider();

      provider.awareness.getStates.mockReturnValue(new Map([[0, { user: 'a' }]]));

      store.handleAwarenessChange(false);

      expect(mockInstance.emitEvent).not.toHaveBeenCalledWith(
        'onAwarenessChange',
        expect.anything()
      );
    });

    it('setAwarenessInfo updates the local awareness state', () => {
      const { store } = makeStore();
      const provider = getLatestProvider();

      store.setAwarenessInfo('cursor', { x: 10, y: 20 });

      expect(provider.awareness.setLocalStateField).toHaveBeenCalledWith(
        'cursor',
        { x: 10, y: 20 }
      );
    });
  });

  describe('switchToRoom', () => {
    it('switches room state, re-initialises the provider, and reconnects', async () => {
      const roomData = vi.fn();
      const { store, mockInstance } = makeStore();
      const testStore = asTestStore(store);
      const firstProvider = getLatestProvider();
      const disconnectSpy = vi.spyOn(store, 'disconnect');
      const restartDocumentSpy = vi.spyOn(store, 'restartDocument');
      const setupSpy = vi.spyOn(store, 'setup');
      const connectSpy = vi.spyOn(store, 'connect');

      await store.switchToRoom('room-2', roomData);

      const secondProvider = getLatestProvider();

      expect(mockInstance.emitEvent).toHaveBeenCalledWith(
        'onRoomSwitchingStart',
        { room: 'room-2' }
      );
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(firstProvider.disconnect).toHaveBeenCalledTimes(1);
      expect(restartDocumentSpy).toHaveBeenCalledTimes(1);
      expect(mockInstance.switchRoom).toHaveBeenCalledTimes(1);
      expect(store.getRoomId()).toBe('room-2');
      expect(testStore.initialRoomData).toBe(roomData);
      expect(testStore.started).toBe(false);
      expect(mockState.WeaveStoreAzureWebPubSubSyncClient).toHaveBeenCalledTimes(2);
      expect(secondProvider).not.toBe(firstProvider);
      expect(secondProvider.awareness.on).toHaveBeenCalledWith(
        'update',
        expect.any(Function)
      );
      expect(secondProvider.awareness.on).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      expect(secondProvider.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(secondProvider.on).toHaveBeenCalledWith(
        'status',
        expect.any(Function)
      );
      expect(setupSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('indexedDb persistence', () => {
    it('does not create IndexeddbPersistence when indexedDb option is absent', () => {
      const { store } = makeStore();
      const testStore = asTestStore(store);

      expect(mockState.IndexeddbPersistence).not.toHaveBeenCalled();
      expect(testStore.indexedDbPersistence).toBeNull();
    });

    it('does not create IndexeddbPersistence when indexedDb.enabled is false', () => {
      const { store } = makeStore(undefined, {
        indexedDb: { enabled: false },
      });
      const testStore = asTestStore(store);

      expect(mockState.IndexeddbPersistence).not.toHaveBeenCalled();
      expect(testStore.indexedDbPersistence).toBeNull();
    });

    it('creates IndexeddbPersistence with the roomId as db name when indexedDb.enabled is true', () => {
      const { store } = makeStore(undefined, {
        indexedDb: { enabled: true },
      });
      const testStore = asTestStore(store);

      expect(mockState.IndexeddbPersistence).toHaveBeenCalledWith(
        'room-1',
        store.getDocument()
      );
      expect(testStore.indexedDbPersistence).not.toBeNull();
    });

    it('creates IndexeddbPersistence with the custom dbName when provided', () => {
      makeStore(undefined, {
        indexedDb: { enabled: true, dbName: 'custom-db' },
      });

      expect(mockState.IndexeddbPersistence).toHaveBeenCalledWith(
        'custom-db',
        expect.anything()
      );
    });

    it('skips loadRoomInitialData when IndexedDB is active and doc already has content', () => {
      const { store } = makeStore(undefined, {
        indexedDb: { enabled: true },
      });
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const onStatusHandler = getProviderHandler(provider, 'status');

      // Simulate IndexedDB having pre-loaded content into the doc
      store.getDocument().getMap('weave').set('cached-key', 'cached-value');

      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      // loadDefaultDocument and loadDocument should NOT have been called
      expect(testStore._loadDocumentData).toBeUndefined();
      expect(testStore._loadDefaultDocumentFn).toBeUndefined();
      expect(store.getDocument().getMap('weave').get('default')).toBeUndefined();
      expect(testStore.initialRoomData).toBeUndefined();
      expect(testStore.started).toBe(true);
    });

    it('runs loadRoomInitialData normally when IndexedDB is active but doc is empty (first visit)', () => {
      const { store } = makeStore(undefined, {
        indexedDb: { enabled: true },
      });
      const testStore = asTestStore(store);
      const provider = getLatestProvider();
      const onStatusHandler = getProviderHandler(provider, 'status');

      // Doc is empty — IndexedDB had nothing for this room
      onStatusHandler(WEAVE_STORE_CONNECTION_STATUS.CONNECTED);

      expect(store.getDocument().getMap('weave').get('default')).toBe(true);
      expect(testStore.started).toBe(true);
    });

    it('destroys the IndexedDB provider and creates a new one on switchToRoom', async () => {
      const { store } = makeStore(undefined, {
        indexedDb: { enabled: true },
      });
      const testStore = asTestStore(store);

      expect(mockState.IndexeddbPersistence).toHaveBeenCalledTimes(1);
      expect(testStore.indexedDbPersistence).not.toBeNull();

      await store.switchToRoom('room-2', undefined);

      expect(mockState.mockIndexedDbPersistence.destroy).toHaveBeenCalledTimes(1);
      // A new IndexeddbPersistence should be created for room-2
      expect(mockState.IndexeddbPersistence).toHaveBeenCalledTimes(2);
      expect(mockState.IndexeddbPersistence).toHaveBeenLastCalledWith(
        'room-2',
        store.getDocument()
      );
    });

    it('destroy cleans up the IndexedDB provider', async () => {
      const { store } = makeStore(undefined, {
        indexedDb: { enabled: true },
      });

      store.destroy();

      // Allow the async destroy to execute
      await vi.runAllTimersAsync?.().catch(() => undefined);
      await Promise.resolve();

      expect(mockState.mockIndexedDbPersistence.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
