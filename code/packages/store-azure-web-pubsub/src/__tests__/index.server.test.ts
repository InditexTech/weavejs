// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';

// Mock Azure dependencies needed by index.server barrel
vi.mock('@azure/web-pubsub', () => ({
  WebPubSubServiceClient: vi.fn(),
  AzureKeyCredential: vi.fn(),
}));
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(),
}));
vi.mock('../server/azure-web-pubsub-sync-handler', () => ({
  default: vi.fn().mockImplementation(() => ({
    getKoaMiddleware: vi.fn(),
    getExpressJsMiddleware: vi.fn(),
    getRoomDocument: vi.fn(),
    clientConnect: vi.fn(),
    clientDisconnect: vi.fn(),
    clientTransportConnect: vi.fn(),
    clientTransportDisconnect: vi.fn(),
  })),
}));
vi.mock('@inditextech/weave-sdk/server', () => ({
  defaultInitialState: vi.fn(),
}));

describe('index.server barrel exports', () => {
  it('exports WeaveAzureWebPubsubServer', async () => {
    const mod = await import('../index.server');
    expect(mod.WeaveAzureWebPubsubServer).toBeDefined();
  });

  it('exports WeaveStoreAzureWebPubSubSyncHost', async () => {
    const mod = await import('../index.server');
    expect(mod.WeaveStoreAzureWebPubSubSyncHost).toBeDefined();
  });

  it('exports WebPubSubEventHandler', async () => {
    const mod = await import('../index.server');
    expect(mod.WebPubSubEventHandler).toBeDefined();
  });

  it('exports MqttDisconnectReasonCode enum', async () => {
    const mod = await import('../index.server');
    expect(mod.MqttDisconnectReasonCode).toBeDefined();
    expect(mod.MqttDisconnectReasonCode.NormalDisconnection).toBe(0x00);
  });

  it('exports MqttV311ConnectReturnCode enum', async () => {
    const mod = await import('../index.server');
    expect(mod.MqttV311ConnectReturnCode).toBeDefined();
  });

  it('exports MqttV500ConnectReasonCode enum', async () => {
    const mod = await import('../index.server');
    expect(mod.MqttV500ConnectReasonCode).toBeDefined();
  });

  it('exports constants', async () => {
    const mod = await import('../index.server');
    expect(mod.WEAVE_STORE_AZURE_WEB_PUBSUB).toBe('store-azure-web-pubsub');
  });
});
