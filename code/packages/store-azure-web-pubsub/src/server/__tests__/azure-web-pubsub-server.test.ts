// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0
// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WeaveStoreAzureWebPubsubConfig } from '../../types';

const {
  mockSyncHandler,
  mockWebPubSubServiceClient,
  mockAzureKeyCredential,
  mockDefaultAzureCredential,
  mockDefaultInitialState,
} = vi.hoisted(() => ({
  mockSyncHandler: {
    getKoaMiddleware: vi.fn().mockReturnValue(vi.fn()),
    getExpressJsMiddleware: vi.fn().mockReturnValue(vi.fn()),
    getRoomDocument: vi.fn().mockResolvedValue({}),
    clientConnect: vi.fn().mockResolvedValue('ws://url'),
    clientDisconnect: vi.fn().mockResolvedValue(undefined),
    clientTransportConnect: vi.fn().mockResolvedValue(undefined),
    clientTransportDisconnect: vi.fn(),
  },
  mockWebPubSubServiceClient: vi.fn().mockImplementation((endpoint, credential, hubName) => ({
    endpoint,
    credential,
    hubName,
  })),
  mockAzureKeyCredential: vi.fn().mockImplementation((key: string) => ({ key })),
  mockDefaultAzureCredential: vi.fn().mockImplementation(() => ({ type: 'default-credential' })),
  mockDefaultInitialState: vi.fn(),
}));

vi.mock('@azure/web-pubsub', () => ({
  WebPubSubServiceClient: mockWebPubSubServiceClient,
  AzureKeyCredential: mockAzureKeyCredential,
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: mockDefaultAzureCredential,
}));

vi.mock('../azure-web-pubsub-sync-handler', () => ({
  default: vi.fn().mockImplementation(() => mockSyncHandler),
}));

vi.mock('@inditextech/weave-sdk/server', () => ({
  defaultInitialState: mockDefaultInitialState,
}));

import { WeaveAzureWebPubsubServer } from '../azure-web-pubsub-server';
import WeaveAzureWebPubsubSyncHandler from '../azure-web-pubsub-sync-handler';

type ServerParams = Omit<ConstructorParameters<typeof WeaveAzureWebPubsubServer>[0], 'pubSubConfig'> & {
  pubSubConfig?: Partial<WeaveStoreAzureWebPubsubConfig>;
};

const createServer = (params: ServerParams = {}) => {
  const { pubSubConfig, ...rest } = params;

  return new WeaveAzureWebPubsubServer({
    pubSubConfig: {
      endpoint: 'https://example.webpubsub.azure.com',
      hubName: 'room-hub',
      ...pubSubConfig,
    } satisfies WeaveStoreAzureWebPubsubConfig,
    ...rest,
  });
};

describe('WeaveAzureWebPubsubServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncHandler.getKoaMiddleware.mockReturnValue(vi.fn());
    mockSyncHandler.getExpressJsMiddleware.mockReturnValue(vi.fn());
    mockSyncHandler.getRoomDocument.mockResolvedValue({});
    mockSyncHandler.clientConnect.mockResolvedValue('ws://url');
    mockSyncHandler.clientDisconnect.mockResolvedValue(undefined);
    mockSyncHandler.clientTransportConnect.mockResolvedValue(undefined);
    mockSyncHandler.clientTransportDisconnect.mockImplementation(() => undefined);
  });

  it('uses a custom credential directly when auth.custom is provided', () => {
    const customCredential = { getToken: vi.fn() } as never;

    createServer({
      pubSubConfig: {
        auth: {
          custom: customCredential,
        },
      },
    });

    expect(mockAzureKeyCredential).not.toHaveBeenCalled();
    expect(mockDefaultAzureCredential).not.toHaveBeenCalled();
    expect(mockWebPubSubServiceClient).toHaveBeenCalledWith(
      'https://example.webpubsub.azure.com',
      customCredential,
      'room-hub'
    );
  });

  it('creates an AzureKeyCredential and logs a warning when auth.key is provided', () => {
    createServer({
      pubSubConfig: {
        auth: {
          key: 'test-key',
        },
      },
    });

    expect(vi.mocked(console.warn)).toHaveBeenCalledWith(
      'Using key-based authentication is deprecated. Consider using DefaultAzureCredential for better security.'
    );
    expect(mockAzureKeyCredential).toHaveBeenCalledWith('test-key');
    expect(mockDefaultAzureCredential).not.toHaveBeenCalled();
    expect(mockWebPubSubServiceClient).toHaveBeenCalledWith(
      'https://example.webpubsub.azure.com',
      { key: 'test-key' },
      'room-hub'
    );
  });

  it('uses DefaultAzureCredential when no auth configuration is provided', () => {
    createServer();

    expect(mockAzureKeyCredential).not.toHaveBeenCalled();
    expect(mockDefaultAzureCredential).toHaveBeenCalledTimes(1);
    expect(mockWebPubSubServiceClient).toHaveBeenCalledWith(
      'https://example.webpubsub.azure.com',
      { type: 'default-credential' },
      'room-hub'
    );
  });

  it('passes persistIntervalMs to the sync handler options when defined', () => {
    createServer({
      pubSubConfig: {
        persistIntervalMs: 2500,
      },
    });

    expect(vi.mocked(WeaveAzureWebPubsubSyncHandler)).toHaveBeenCalledWith(
      'room-hub',
      expect.any(WeaveAzureWebPubsubServer),
      expect.objectContaining({
        endpoint: 'https://example.webpubsub.azure.com',
        hubName: 'room-hub',
      }),
      mockDefaultInitialState,
      { persistIntervalMs: 2500 },
      undefined,
      undefined
    );
  });

  it('passes connectionHandlers to the sync handler options', () => {
    const onConnect = vi.fn();
    const getRoomConnections = vi.fn();

    createServer({
      pubSubConfig: {
        connectionHandlers: {
          onConnect,
          getRoomConnections,
        },
      },
    });

    expect(vi.mocked(WeaveAzureWebPubsubSyncHandler)).toHaveBeenCalledWith(
      'room-hub',
      expect.any(WeaveAzureWebPubsubServer),
      expect.any(Object),
      mockDefaultInitialState,
      {
        onConnect,
        getRoomConnections,
      },
      undefined,
      undefined
    );
  });

  it('delegates getKoaMiddleware to the sync handler', () => {
    const koaMiddleware = vi.fn();
    mockSyncHandler.getKoaMiddleware.mockReturnValue(koaMiddleware);
    const server = createServer();

    const result = server.getKoaMiddleware();

    expect(mockSyncHandler.getKoaMiddleware).toHaveBeenCalledTimes(1);
    expect(result).toBe(koaMiddleware);
  });

  it('delegates getExpressJsMiddleware to the sync handler', () => {
    const expressMiddleware = vi.fn();
    mockSyncHandler.getExpressJsMiddleware.mockReturnValue(expressMiddleware);
    const server = createServer();

    const result = server.getExpressJsMiddleware();

    expect(mockSyncHandler.getExpressJsMiddleware).toHaveBeenCalledTimes(1);
    expect(result).toBe(expressMiddleware);
  });

  it('returns the sync handler instance', () => {
    const server = createServer();

    expect(server.getSyncHandler()).toBe(mockSyncHandler);
  });

  it('emits events through Emittery', async () => {
    const server = createServer();
    const listener = vi.fn();
    const payload = { roomId: 'room-1' };

    server.addEventListener('updated', listener);
    server.emitEvent('updated', payload);
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('adds and removes Emittery listeners', async () => {
    const server = createServer();
    const listener = vi.fn();

    server.addEventListener('updated', listener);
    server.removeEventListener('updated', listener);
    server.emitEvent('updated', { roomId: 'room-1' });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('delegates getRoomDocument to the sync handler', async () => {
    const roomDocument = { room: 'room-1' };
    mockSyncHandler.getRoomDocument.mockResolvedValue(roomDocument);
    const server = createServer();

    const result = await server.getRoomDocument('room-1');

    expect(mockSyncHandler.getRoomDocument).toHaveBeenCalledWith('room-1');
    expect(result).toBe(roomDocument);
  });

  it('delegates clientConnect to the sync handler', async () => {
    mockSyncHandler.clientConnect.mockResolvedValue('ws://custom-url');
    const server = createServer();
    const options = { expirationTimeInMinutes: 30 };

    const result = await server.clientConnect('room-1', options);

    expect(mockSyncHandler.clientConnect).toHaveBeenCalledWith('room-1', options);
    expect(result).toBe('ws://custom-url');
  });

  it('delegates clientDisconnect to the sync handler', async () => {
    const server = createServer();

    await server.clientDisconnect('room-1');

    expect(mockSyncHandler.clientDisconnect).toHaveBeenCalledWith('room-1');
  });

  it('delegates clientTransportConnect to the sync handler', async () => {
    const server = createServer();

    await server.clientTransportConnect('room-1');

    expect(mockSyncHandler.clientTransportConnect).toHaveBeenCalledWith('room-1');
  });

  it('delegates clientTransportDisconnect to the sync handler', () => {
    const server = createServer();

    server.clientTransportDisconnect('room-1');

    expect(mockSyncHandler.clientTransportDisconnect).toHaveBeenCalledWith('room-1');
  });
});
