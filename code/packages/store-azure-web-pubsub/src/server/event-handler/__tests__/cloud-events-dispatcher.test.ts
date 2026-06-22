// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toBase64JsonString } from '../utils';
import { MqttV311ConnectReturnCode } from '../enum/mqtt-error-codes/mqtt-v311-connect-return-code';
import { MqttV500ConnectReasonCode } from '../enum/mqtt-error-codes/mqtt-v500-connect-reason-code';

const loggerMocks = vi.hoisted(() => ({
  warning: vi.fn(),
  verbose: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: loggerMocks,
}));

import { CloudEventsDispatcher } from '../cloud-events-dispatcher';

type MockResponse = ServerResponse & {
  headers: Record<string, unknown>;
  end: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
};

function makeRequest(
  headers: Record<string, string>,
  body: string | Buffer = ''
): IncomingMessage {
  const payload = typeof body === 'string' ? Buffer.from(body) : body;
  let sent = false;
  const readable = new Readable({
    read() {
      if (!sent) {
        sent = true;
        if (payload.length > 0) {
          this.push(payload);
        }
      }
      this.push(null);
    },
  }) as unknown as IncomingMessage;
  readable.headers = headers;
  return readable;
}

function makeResponse(): MockResponse {
  const headers: Record<string, unknown> = {};
  return {
    statusCode: 200,
    headers,
    end: vi.fn(),
    setHeader: vi.fn((name: string, value: unknown) => {
      headers[name] = value;
    }),
  } as unknown as MockResponse;
}

function makeHeaders(
  overrides: Record<string, string> = {}
): Record<string, string> {
  return {
    'ce-awpsversion': '1.0',
    'webhook-request-origin': 'service.example.com',
    'ce-hub': 'myhub',
    'ce-type': 'azure.webpubsub.sys.connect',
    'ce-connectionid': 'conn123',
    'ce-eventname': 'connect',
    'ce-signature': 'sha256=abc',
    ...overrides,
  };
}

function makeConnectBody(
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    claims: { role: ['user'] },
    headers: { 'x-test': ['1'] },
    subprotocols: ['json'],
    clientCertificates: [{ thumbprint: 'thumb-1' }],
    ...overrides,
  });
}

describe('CloudEventsDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('throws when event handler options are passed as an array', () => {
      expect(
        () =>
          new CloudEventsDispatcher(
            'myhub',
            [{ handleConnect: vi.fn() }] as unknown as never
          )
      ).toThrow('Unexpected WebPubSubEventHandlerOptions');
    });
  });

  describe('handlePreflight', () => {
    it('returns false for non-WebPubSub requests', () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest({});
      const res = makeResponse();

      expect(dispatcher.handlePreflight(req, res)).toBe(false);
      expect(res.end).not.toHaveBeenCalled();
    });

    it('returns 400 when webhook-request-origin is missing', () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest({
        'ce-awpsversion': '1.0',
      });
      const res = makeResponse();

      expect(dispatcher.handlePreflight(req, res)).toBe(true);
      expect(res.statusCode).toBe(400);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('allows any origin when allowedEndpoints are not configured', () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(makeHeaders());
      const res = makeResponse();

      expect(dispatcher.handlePreflight(req, res)).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('WebHook-Allowed-Origin', '*');
      expect(res.end).toHaveBeenCalledWith();
    });

    it('returns configured origins when allowedEndpoints are provided', () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        allowedEndpoints: [
          'https://API.Example.com/path',
          'https://SECOND.example.com/another',
        ],
      });
      const req = makeRequest(makeHeaders());
      const res = makeResponse();

      expect(dispatcher.handlePreflight(req, res)).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('WebHook-Allowed-Origin', [
        'api.example.com',
        'second.example.com',
      ]);
      expect(res.end).toHaveBeenCalledWith();
    });
  });

  describe('handleRequest guards', () => {
    it('returns false for non-WebPubSub requests', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest({});
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(false);
      expect(res.end).not.toHaveBeenCalled();
    });

    it('returns false when webhook-request-origin is missing', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        {
          'ce-awpsversion': '1.0',
          'ce-hub': 'myhub',
          'ce-type': 'azure.webpubsub.sys.connect',
        },
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(false);
      expect(res.end).not.toHaveBeenCalled();
    });

    it('returns false for unknown event types', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.sys.unknown',
        }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(false);
      expect(res.end).not.toHaveBeenCalled();
    });

    it('returns false when the hub does not match', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({
          'ce-hub': 'otherhub',
        }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(false);
      expect(res.end).not.toHaveBeenCalled();
    });
  });

  describe('connect events', () => {
    it('ends immediately for non-MQTT connect events without a handler', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(makeHeaders(), makeConnectBody());
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('returns 204 for MQTT connect events without a handler', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({
          'ce-subprotocol': 'mqtt',
          'ce-physicalconnectionid': 'phys123',
          'ce-sessionid': 'session-1',
        }),
        makeConnectBody({
          mqtt: { protocolVersion: 5 },
        })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(204);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('handles connect success without a response payload', async () => {
      const handleConnect = vi.fn((request, handler) => {
        expect(request.queries).toEqual({});
        expect(request.context.clientProtocol).toBe('default');
        expect(request.context.states).toEqual({ existing: 'state' });
        handler.success();
      });
      const dispatcher = new CloudEventsDispatcher('myhub', { handleConnect });
      const req = makeRequest(
        makeHeaders({
          'ce-connectionstate': toBase64JsonString({ existing: 'state' }),
        }),
        makeConnectBody({ queries: undefined })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(handleConnect).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(204);
      expect(res.end).toHaveBeenCalledWith();
      expect(res.headers['ce-connectionState']).toBeUndefined();
    });

    it('handles connect success with response payload and modified state', async () => {
      const handleConnect = vi.fn((request, handler) => {
        expect(request.context.states).toEqual({ persisted: 'yes' });
        handler.setState('role', 'admin');
        handler.success({
          groups: ['group-1'],
          roles: ['webpubsub.joinLeaveGroup'],
          userId: 'alice',
          subprotocol: 'json',
        });
      });
      const dispatcher = new CloudEventsDispatcher('myhub', { handleConnect });
      const req = makeRequest(
        makeHeaders({
          'ce-connectionstate': toBase64JsonString({ persisted: 'yes' }),
        }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe(
        'application/json; charset=utf-8'
      );
      expect(res.headers['ce-connectionState']).toBe(
        toBase64JsonString({ persisted: 'yes', role: 'admin' })
      );
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          groups: ['group-1'],
          roles: ['webpubsub.joinLeaveGroup'],
          userId: 'alice',
          subprotocol: 'json',
        })
      );
    });

    it('handles non-MQTT connect failures with fail()', async () => {
      const handleConnect = vi.fn((_request, handler) => {
        handler.fail(401, 'denied');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', { handleConnect });
      const req = makeRequest(makeHeaders(), makeConnectBody());
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(401);
      expect(res.headers['Content-Type']).toBeUndefined();
      expect(res.end).toHaveBeenCalledWith('denied');
    });

    it('handles non-MQTT connect failures with failWith()', async () => {
      const handleConnect = vi.fn((_request, handler) => {
        handler.failWith({ code: 400, detail: 'bad request' });
      });
      const dispatcher = new CloudEventsDispatcher('myhub', { handleConnect });
      const req = makeRequest(makeHeaders(), makeConnectBody());
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(400);
      expect(res.end).toHaveBeenCalledWith('bad request');
    });

    it.each([
      {
        protocolVersion: 4,
        code: 400 as const,
        expectedMqttCode: MqttV311ConnectReturnCode.BadUsernameOrPassword,
      },
      {
        protocolVersion: 4,
        code: 401 as const,
        expectedMqttCode: MqttV311ConnectReturnCode.NotAuthorized,
      },
      {
        protocolVersion: 4,
        code: 500 as const,
        expectedMqttCode: MqttV311ConnectReturnCode.ServerUnavailable,
      },
      {
        protocolVersion: 5,
        code: 400 as const,
        expectedMqttCode: MqttV500ConnectReasonCode.BadUserNameOrPassword,
      },
      {
        protocolVersion: 5,
        code: 401 as const,
        expectedMqttCode: MqttV500ConnectReasonCode.NotAuthorized,
      },
      {
        protocolVersion: 5,
        code: 500 as const,
        expectedMqttCode: MqttV500ConnectReasonCode.UnspecifiedError,
      },
      {
        protocolVersion: 6,
        code: 400 as const,
        expectedMqttCode:
          MqttV311ConnectReturnCode.UnacceptableProtocolVersion,
      },
    ])(
      'maps MQTT fail() for protocolVersion=$protocolVersion and code=$code',
      async ({ protocolVersion, code, expectedMqttCode }) => {
        const handleConnect = vi.fn((request, handler) => {
          expect(request.context.clientProtocol).toBe('mqtt');
          expect(request.context.mqtt).toEqual({
            physicalConnectionId: 'phys123',
            sessionId: 'session-1',
          });
          handler.fail(code, 'mqtt denied');
        });
        const dispatcher = new CloudEventsDispatcher('myhub', {
          handleConnect,
        });
        const req = makeRequest(
          makeHeaders({
            'ce-subprotocol': 'mqtt',
            'ce-physicalconnectionid': 'phys123',
            'ce-sessionid': 'session-1',
          }),
          makeConnectBody({
            mqtt: { protocolVersion },
          })
        );
        const res = makeResponse();

        await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
        expect(res.statusCode).toBe(code);
        expect(res.headers['Content-Type']).toBe(
          'application/json; charset=utf-8'
        );
        expect(res.end).toHaveBeenCalledWith(
          JSON.stringify({
            mqtt: { code: expectedMqttCode, reason: 'mqtt denied' },
          })
        );
      }
    );

    it.each([
      [
        MqttV311ConnectReturnCode.UnacceptableProtocolVersion,
        400,
      ],
      [MqttV311ConnectReturnCode.IdentifierRejected, 400],
      [MqttV311ConnectReturnCode.ServerUnavailable, 503],
      [MqttV311ConnectReturnCode.BadUsernameOrPassword, 401],
      [MqttV311ConnectReturnCode.NotAuthorized, 401],
      [0x7f, 500],
      [MqttV500ConnectReasonCode.UnspecifiedError, 500],
      [MqttV500ConnectReasonCode.MalformedPacket, 400],
      [MqttV500ConnectReasonCode.ProtocolError, 500],
      [MqttV500ConnectReasonCode.ImplementationSpecificError, 400],
      [MqttV500ConnectReasonCode.UnsupportedProtocolVersion, 400],
      [MqttV500ConnectReasonCode.ClientIdentifierNotValid, 400],
      [MqttV500ConnectReasonCode.BadUserNameOrPassword, 401],
      [MqttV500ConnectReasonCode.NotAuthorized, 401],
      [MqttV500ConnectReasonCode.ServerUnavailable, 500],
      [MqttV500ConnectReasonCode.ServerBusy, 500],
      [MqttV500ConnectReasonCode.Banned, 403],
      [MqttV500ConnectReasonCode.BadAuthenticationMethod, 400],
      [MqttV500ConnectReasonCode.TopicNameInvalid, 400],
      [MqttV500ConnectReasonCode.PacketTooLarge, 400],
      [MqttV500ConnectReasonCode.QuotaExceeded, 429],
      [MqttV500ConnectReasonCode.PayloadFormatInvalid, 400],
      [MqttV500ConnectReasonCode.RetainNotSupported, 400],
      [MqttV500ConnectReasonCode.QosNotSupported, 400],
      [MqttV500ConnectReasonCode.UseAnotherServer, 500],
      [MqttV500ConnectReasonCode.ServerMoved, 500],
      [MqttV500ConnectReasonCode.ConnectionRateExceeded, 429],
      [0xff, 500],
    ])(
      'maps failWith() MQTT code %s to HTTP %s',
      async (mqttCode, expectedStatus) => {
        const handleConnect = vi.fn((_request, handler) => {
          handler.failWith({
            mqtt: { code: mqttCode, reason: 'mqtt failed' },
          });
        });
        const dispatcher = new CloudEventsDispatcher('myhub', {
          handleConnect,
        });
        const req = makeRequest(makeHeaders(), makeConnectBody());
        const res = makeResponse();

        await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
        expect(res.statusCode).toBe(expectedStatus);
        expect(res.headers['Content-Type']).toBe(
          'application/json; charset=utf-8'
        );
        expect(res.end).toHaveBeenCalledWith(
          JSON.stringify({
            mqtt: { code: mqttCode, reason: 'mqtt failed' },
          })
        );
      }
    );
  });

  describe('connected events', () => {
    it('ends immediately when no connected handler is configured', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.sys.connected',
          'ce-eventname': 'connected',
        }),
        JSON.stringify({})
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('dispatches connected events to the configured handler', async () => {
      const onConnected = vi.fn((request) => {
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(request.context.origin).toBe('service.example.com');
        expect(request.context.connectionId).toBe('conn123');
        expect(request.context.eventName).toBe('connected');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', { onConnected });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.sys.connected',
          'ce-eventname': 'connected',
        }),
        JSON.stringify({})
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(onConnected).toHaveBeenCalledOnce();
      expect(res.end).toHaveBeenCalledWith();
    });
  });

  describe('disconnected events', () => {
    it('ends immediately when no disconnected handler is configured', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.sys.disconnected',
          'ce-eventname': 'disconnected',
        }),
        JSON.stringify({ reason: 'left' })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('dispatches disconnected events to the configured handler', async () => {
      const onDisconnected = vi.fn((request) => {
        expect(res.end).toHaveBeenCalledTimes(1);
        expect(request.reason).toBe('left');
        expect(request.context.clientProtocol).toBe('default');
        expect(request.context.eventName).toBe('disconnected');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', {
        onDisconnected,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.sys.disconnected',
          'ce-eventname': 'disconnected',
        }),
        JSON.stringify({ reason: 'left' })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(onDisconnected).toHaveBeenCalledOnce();
      expect(res.end).toHaveBeenCalledWith();
    });

    it('dispatches MQTT disconnected events via MqttDisconnectedRequest path', async () => {
      const onDisconnected = vi.fn((request) => {
        expect(request.context.clientProtocol).toBe('mqtt');
        expect(request.context.eventName).toBe('disconnected');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', { onDisconnected });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.sys.disconnected',
          'ce-eventname': 'disconnected',
          // MQTT-specific headers (Node.js lowercases all header names)
          'ce-subprotocol': 'mqtt',
          'ce-physicalconnectionid': 'phys-123',
        }),
        JSON.stringify({ reason: 'mqtt-left' })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(onDisconnected).toHaveBeenCalledOnce();
      expect(res.end).toHaveBeenCalledWith();
    });
  });

  describe('user events', () => {
    it('ends immediately when no user event handler is configured', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'text/plain',
        }),
        'hello'
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('parses JSON user events and returns JSON responses', async () => {
      const handleUserEvent = vi.fn((request, handler) => {
        expect(request.dataType).toBe('json');
        expect(request.data).toEqual({ message: 'hello' });
        expect(request.context.eventName).toBe('message');
        handler.success('{"ok":true}', 'json');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', {
        handleUserEvent,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'application/json; charset=utf-8',
        }),
        JSON.stringify({ message: 'hello' })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(handleUserEvent).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe(
        'application/json; charset=utf-8'
      );
      expect(res.end).toHaveBeenCalledWith('{"ok":true}');
    });

    it('parses text user events and returns text responses', async () => {
      const handleUserEvent = vi.fn((request, handler) => {
        expect(request.dataType).toBe('text');
        expect(request.data).toBe('hello');
        handler.success('pong', 'text');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', {
        handleUserEvent,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'text/plain',
        }),
        'hello'
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe('text/plain; charset=utf-8');
      expect(res.end).toHaveBeenCalledWith('pong');
    });

    it('parses binary user events and returns binary responses', async () => {
      const incoming = Buffer.from([1, 2, 3, 4]);
      const outgoing = Uint8Array.from([9, 8, 7]).buffer;
      const handleUserEvent = vi.fn((request, handler) => {
        expect(request.dataType).toBe('binary');
        expect(Buffer.from(request.data as ArrayBuffer)).toEqual(incoming);
        handler.success(outgoing, 'binary');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', {
        handleUserEvent,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'application/octet-stream',
        }),
        incoming
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe('application/octet-stream');
      expect(res.end).toHaveBeenCalledWith(outgoing);
    });

    it('returns default binary content type and connection state on success()', async () => {
      const handleUserEvent = vi.fn((request, handler) => {
        expect(request.context.states).toEqual({ visits: 1 });
        handler.setState('visits', 2);
        handler.success();
      });
      const dispatcher = new CloudEventsDispatcher('myhub', {
        handleUserEvent,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'text/plain',
          'ce-connectionstate': toBase64JsonString({ visits: 1 }),
        }),
        'hello'
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.headers['Content-Type']).toBe('application/octet-stream');
      expect(res.headers['ce-connectionState']).toBe(
        toBase64JsonString({ visits: 2 })
      );
      expect(res.end).toHaveBeenCalledWith('');
    });

    it('handles user event failures with fail()', async () => {
      const handleUserEvent = vi.fn((_request, handler) => {
        handler.fail(400, 'bad event');
      });
      const dispatcher = new CloudEventsDispatcher('myhub', {
        handleUserEvent,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'application/json',
        }),
        JSON.stringify({ message: 'hello' })
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(400);
      expect(res.end).toHaveBeenCalledWith('bad event');
    });

    it('returns false for unsupported user event content types', async () => {
      const handleUserEvent = vi.fn();
      const dispatcher = new CloudEventsDispatcher('myhub', {
        handleUserEvent,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-type': 'azure.webpubsub.user.message',
          'ce-eventname': 'message',
          'content-type': 'application/xml',
        }),
        '<msg>hello</msg>'
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(false);
      expect(handleUserEvent).not.toHaveBeenCalled();
      expect(loggerMocks.warning).toHaveBeenCalledWith(
        'Unsupported content type application/xml'
      );
    });
  });

  // ─── Issue [4] fixes ────────────────────────────────────────────────────────

  describe('handleRequest — origin validation', () => {
    it('accepts a POST from a matching allowed origin', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        allowedEndpoints: ['https://service.example.com'],
      });
      const req = makeRequest(
        makeHeaders({ 'webhook-request-origin': 'service.example.com' }),
        makeConnectBody()
      );
      const res = makeResponse();

      // No handleConnect configured → no-handler short-circuit returns true with 200
      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).not.toBe(403);
    });

    it('rejects with 403 when the request origin is not in allowedEndpoints', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        allowedEndpoints: ['https://service.example.com'],
      });
      const req = makeRequest(
        makeHeaders({ 'webhook-request-origin': 'evil.example.com' }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(403);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('does not check origin when allowedEndpoints is not configured', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      const req = makeRequest(
        makeHeaders({ 'webhook-request-origin': 'any-origin.example.com' }),
        makeConnectBody()
      );
      const res = makeResponse();

      // No allowedEndpoints → _allowAll true → origin not validated; proceeds normally
      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).not.toBe(403);
    });

    it('rejects with 400 when the origin header cannot be parsed as a hostname', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        allowedEndpoints: ['https://service.example.com'],
      });
      // A value that makes `new URL('https://<origin>')` throw
      const req = makeRequest(
        makeHeaders({ 'webhook-request-origin': 'not a valid://hostname here' }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(400);
      expect(res.end).toHaveBeenCalledWith();
    });
  });

  describe('handleRequest — signature verification', () => {
    const TEST_KEY_PRIMARY = 'testprimarykey123';
    const TEST_KEY_SECONDARY = 'testsecondarykey456';
    const TEST_CONNECTION_ID = 'conn123'; // matches makeHeaders() default

    /** Compute the expected ce-signature value for a given key and connection ID. */
    function computeSig(key: string, connectionId = TEST_CONNECTION_ID): string {
      return 'sha256=' + createHmac('sha256', key).update(connectionId).digest('hex');
    }

    it('accepts a request whose ce-signature matches the primary access key', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: TEST_KEY_PRIMARY,
      });
      const req = makeRequest(
        makeHeaders({ 'ce-signature': computeSig(TEST_KEY_PRIMARY) }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).not.toBe(401);
    });

    it('accepts a request when only the secondary key signature is present (key rotation)', async () => {
      // Both keys configured; request carries only the secondary signature
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: [TEST_KEY_PRIMARY, TEST_KEY_SECONDARY],
      });
      const req = makeRequest(
        makeHeaders({ 'ce-signature': computeSig(TEST_KEY_SECONDARY) }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).not.toBe(401);
    });

    it('accepts a request with comma-separated primary and secondary signatures (Azure format)', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: [TEST_KEY_PRIMARY, TEST_KEY_SECONDARY],
      });
      // Azure sends: sha256=<primary>,sha256=<secondary>
      const headerVal = `${computeSig(TEST_KEY_PRIMARY)},${computeSig(TEST_KEY_SECONDARY)}`;
      const req = makeRequest(
        makeHeaders({ 'ce-signature': headerVal }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).not.toBe(401);
    });

    it('rejects with 401 when the ce-signature HMAC value is wrong', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: TEST_KEY_PRIMARY,
      });
      const req = makeRequest(
        makeHeaders({
          'ce-signature':
            'sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(401);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('rejects with 401 when the ce-signature header is absent', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: TEST_KEY_PRIMARY,
      });
      const headers = makeHeaders();
      delete headers['ce-signature'];
      const req = makeRequest(headers, makeConnectBody());
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(401);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('rejects with 401 when the ce-connectionid header is absent', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: TEST_KEY_PRIMARY,
      });
      const headers = makeHeaders({ 'ce-signature': computeSig(TEST_KEY_PRIMARY) });
      delete headers['ce-connectionid'];
      const req = makeRequest(headers, makeConnectBody());
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(401);
      expect(res.end).toHaveBeenCalledWith();
    });

    it('rejects with 401 when the signature has a different length (padding attack)', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub', {
        accessKey: TEST_KEY_PRIMARY,
      });
      // Same correct prefix but extra character changes length — timingSafeEqual is length-gated
      const correctSig = computeSig(TEST_KEY_PRIMARY);
      const req = makeRequest(
        makeHeaders({ 'ce-signature': correctSig + 'x' }),
        makeConnectBody()
      );
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).toBe(401);
    });

    it('logs a warning and does not reject when no accessKey is configured', async () => {
      const dispatcher = new CloudEventsDispatcher('myhub');
      // Fake signature — accepted because no key is configured
      const req = makeRequest(makeHeaders({ 'ce-signature': 'sha256=abc' }), makeConnectBody());
      const res = makeResponse();

      await expect(dispatcher.handleRequest(req, res)).resolves.toBe(true);
      expect(res.statusCode).not.toBe(401);
      expect(loggerMocks.warning).toHaveBeenCalledWith(
        expect.stringContaining('no accessKey configured')
      );
    });
  });
});
