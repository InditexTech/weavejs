// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebPubSubEventHandler } from '../web-pubsub-event-handler';

vi.mock('../cloud-events-dispatcher', () => ({
  CloudEventsDispatcher: vi.fn().mockImplementation(() => ({
    handlePreflight: vi.fn().mockReturnValue(true),
    handleRequest: vi.fn().mockResolvedValue(true),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeKoaCtx(method: string, path: string): any {
  const res = {
    statusCode: 200,
    end: vi.fn(),
    setHeader: vi.fn(),
  };
  return {
    request: { method, path },
    response: res,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeExpressReq(method: string, baseUrl: string, path: string): any {
  return { method, baseUrl, path, headers: {} };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeExpressRes(): any {
  return {
    statusCode: 200,
    end: vi.fn(),
    setHeader: vi.fn(),
  };
}

describe('WebPubSubEventHandler', () => {
  describe('constructor', () => {
    it('uses default path when no path option given', () => {
      const handler = new WebPubSubEventHandler('myhub');
      expect(handler.path).toBe('/api/webpubsub/hubs/myhub/');
    });

    it('uses custom path from options', () => {
      const handler = new WebPubSubEventHandler('myhub', { path: '/custom/path' });
      expect(handler.path).toBe('/custom/path/');
    });

    it('does not add extra trailing slash if path already ends with /', () => {
      const handler = new WebPubSubEventHandler('myhub', { path: '/custom/path/' });
      expect(handler.path).toBe('/custom/path/');
    });

    it('lowercases the path', () => {
      const handler = new WebPubSubEventHandler('MyHub');
      expect(handler.path).toBe('/api/webpubsub/hubs/myhub/');
    });
  });

  describe('getKoaMiddleware', () => {
    let handler: WebPubSubEventHandler;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let middleware: (ctx: any, next: any) => Promise<void>;

    beforeEach(() => {
      handler = new WebPubSubEventHandler('myhub');
      middleware = handler.getKoaMiddleware();
    });

    it('calls next when path does not match', async () => {
      const ctx = makeKoaCtx('GET', '/other/path');
      const next = vi.fn().mockResolvedValue(undefined);
      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('handles OPTIONS request (preflight) for matching path', async () => {
      const ctx = makeKoaCtx('OPTIONS', '/api/webpubsub/hubs/myhub/');
      const next = vi.fn();
      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if preflight returns false', async () => {
      const { CloudEventsDispatcher } = await import('../cloud-events-dispatcher');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CloudEventsDispatcher as any).mockImplementationOnce(() => ({
        handlePreflight: vi.fn().mockReturnValue(false),
        handleRequest: vi.fn().mockResolvedValue(true),
      }));
      const h = new WebPubSubEventHandler('myhub');
      const m = h.getKoaMiddleware();
      const ctx = makeKoaCtx('OPTIONS', '/api/webpubsub/hubs/myhub/');
      const next = vi.fn().mockResolvedValue(undefined);
      await m(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('handles POST request for matching path', async () => {
      const ctx = makeKoaCtx('POST', '/api/webpubsub/hubs/myhub/');
      const next = vi.fn();
      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if POST handleRequest returns false', async () => {
      const { CloudEventsDispatcher } = await import('../cloud-events-dispatcher');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CloudEventsDispatcher as any).mockImplementationOnce(() => ({
        handlePreflight: vi.fn().mockReturnValue(true),
        handleRequest: vi.fn().mockResolvedValue(false),
      }));
      const h = new WebPubSubEventHandler('myhub');
      const m = h.getKoaMiddleware();
      const ctx = makeKoaCtx('POST', '/api/webpubsub/hubs/myhub/');
      const next = vi.fn().mockResolvedValue(undefined);
      await m(ctx, next);
      expect(next).toHaveBeenCalled();
    });

    it('matches path without trailing slash', async () => {
      const ctx = makeKoaCtx('POST', '/api/webpubsub/hubs/myhub');
      const next = vi.fn();
      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next for GET method on matching path', async () => {
      const ctx = makeKoaCtx('GET', '/api/webpubsub/hubs/myhub/');
      const next = vi.fn().mockResolvedValue(undefined);
      await middleware(ctx, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getExpressJsMiddleware', () => {
    let handler: WebPubSubEventHandler;
    let middleware: ReturnType<WebPubSubEventHandler['getExpressJsMiddleware']>;

    beforeEach(() => {
      handler = new WebPubSubEventHandler('myhub');
      middleware = handler.getExpressJsMiddleware();
    });

    it('calls next when path does not match', async () => {
      const req = makeExpressReq('GET', '/other', '/path');
      const res = makeExpressRes();
      const next = vi.fn();
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('handles OPTIONS request for matching path', async () => {
      const req = makeExpressReq('OPTIONS', '/api/webpubsub/hubs', '/myhub/');
      const res = makeExpressRes();
      const next = vi.fn();
      await middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if preflight returns false for Express', async () => {
      const { CloudEventsDispatcher } = await import('../cloud-events-dispatcher');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CloudEventsDispatcher as any).mockImplementationOnce(() => ({
        handlePreflight: vi.fn().mockReturnValue(false),
        handleRequest: vi.fn().mockResolvedValue(true),
      }));
      const h = new WebPubSubEventHandler('myhub');
      const m = h.getExpressJsMiddleware();
      const req = makeExpressReq('OPTIONS', '/api/webpubsub/hubs', '/myhub/');
      const res = makeExpressRes();
      const next = vi.fn();
      await m(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('handles POST request for matching path', async () => {
      const req = makeExpressReq('POST', '/api/webpubsub/hubs', '/myhub/');
      const res = makeExpressRes();
      const next = vi.fn();
      await middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if POST handleRequest returns false', async () => {
      const { CloudEventsDispatcher } = await import('../cloud-events-dispatcher');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CloudEventsDispatcher as any).mockImplementationOnce(() => ({
        handlePreflight: vi.fn().mockReturnValue(true),
        handleRequest: vi.fn().mockResolvedValue(false),
      }));
      const h = new WebPubSubEventHandler('myhub');
      const m = h.getExpressJsMiddleware();
      const req = makeExpressReq('POST', '/api/webpubsub/hubs', '/myhub/');
      const res = makeExpressRes();
      const next = vi.fn();
      await m(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('calls next(err) when POST handleRequest throws', async () => {
      const { CloudEventsDispatcher } = await import('../cloud-events-dispatcher');
      const error = new Error('boom');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CloudEventsDispatcher as any).mockImplementationOnce(() => ({
        handlePreflight: vi.fn().mockReturnValue(true),
        handleRequest: vi.fn().mockRejectedValue(error),
      }));
      const h = new WebPubSubEventHandler('myhub');
      const m = h.getExpressJsMiddleware();
      const req = makeExpressReq('POST', '/api/webpubsub/hubs', '/myhub/');
      const res = makeExpressRes();
      const next = vi.fn();
      await m(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('calls next for GET method on matching path', async () => {
      const req = makeExpressReq('GET', '/api/webpubsub/hubs', '/myhub/');
      const res = makeExpressRes();
      const next = vi.fn();
      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
