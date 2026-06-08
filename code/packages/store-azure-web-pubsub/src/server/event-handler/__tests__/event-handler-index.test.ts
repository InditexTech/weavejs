// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

describe('event-handler index barrel exports', () => {
  it('exports WebPubSubEventHandler', async () => {
    const mod = await import('../index');
    expect(mod.WebPubSubEventHandler).toBeDefined();
  });

  it('exports MqttDisconnectReasonCode with correct values', async () => {
    const mod = await import('../index');
    expect(mod.MqttDisconnectReasonCode).toBeDefined();
    expect(mod.MqttDisconnectReasonCode.NormalDisconnection).toBe(0x00);
    expect(mod.MqttDisconnectReasonCode.DisconnectWithWillMessage).toBe(0x04);
    expect(mod.MqttDisconnectReasonCode.UnspecifiedError).toBe(0x80);
  });

  it('exports MqttV311ConnectReturnCode', async () => {
    const mod = await import('../index');
    expect(mod.MqttV311ConnectReturnCode).toBeDefined();
  });

  it('exports MqttV500ConnectReasonCode', async () => {
    const mod = await import('../index');
    expect(mod.MqttV500ConnectReasonCode).toBeDefined();
  });
});

describe('logger', () => {
  it('exports a logger instance', async () => {
    const mod = await import('../logger');
    expect(mod.logger).toBeDefined();
  });
});
