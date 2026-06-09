// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';

describe('index.client barrel exports', () => {
  it('exports WeaveStoreAzureWebPubsub', async () => {
    const mod = await import('../index.client');
    expect(mod.WeaveStoreAzureWebPubsub).toBeDefined();
  });

  it('exports constants', async () => {
    const mod = await import('../index.client');
    expect(mod.WEAVE_STORE_AZURE_WEB_PUBSUB).toBe('store-azure-web-pubsub');
  });

  it('exports types (MessageType enum)', async () => {
    const mod = await import('../index.client');
    expect(mod.MessageType).toBeDefined();
  });
});
