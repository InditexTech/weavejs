// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import {
  toBase64JsonString,
  fromBase64JsonString,
  getHttpHeader,
  readRequestBody,
} from '../utils';

describe('toBase64JsonString', () => {
  it('encodes a simple object', () => {
    const result = toBase64JsonString({ key: 'value' });
    const decoded = Buffer.from(result, 'base64').toString();
    expect(JSON.parse(decoded)).toEqual({ key: 'value' });
  });

  it('round-trips with fromBase64JsonString', () => {
    const obj = { a: 1, b: 'hello', c: true };
    const encoded = toBase64JsonString(obj);
    expect(fromBase64JsonString(encoded)).toEqual(obj);
  });
});

describe('fromBase64JsonString', () => {
  it('returns empty object for undefined input', () => {
    expect(fromBase64JsonString(undefined)).toEqual({});
  });

  it('returns empty object for invalid base64', () => {
    expect(fromBase64JsonString('!!!invalid!!!')).toEqual({});
  });

  it('returns empty object for non-object JSON (array)', () => {
    const encoded = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64');
    expect(fromBase64JsonString(encoded)).toEqual({});
  });

  it('returns empty object for non-object JSON (string)', () => {
    const encoded = Buffer.from(JSON.stringify('hello')).toString('base64');
    expect(fromBase64JsonString(encoded)).toEqual({});
  });

  it('returns empty object for invalid JSON in buffer', () => {
    const encoded = Buffer.from('not-json').toString('base64');
    expect(fromBase64JsonString(encoded)).toEqual({});
  });

  it('decodes a nested object', () => {
    const obj = { nested: { x: 1 } };
    const encoded = toBase64JsonString(obj);
    expect(fromBase64JsonString(encoded)).toEqual(obj);
  });
});

describe('getHttpHeader', () => {
  function makeRequest(headers: Record<string, string | string[]>): IncomingMessage {
    const req = new Readable() as unknown as IncomingMessage;
    req.headers = headers;
    return req;
  }

  it('returns undefined for empty key', () => {
    const req = makeRequest({ 'ce-hub': 'test' });
    expect(getHttpHeader(req, '')).toBeUndefined();
  });

  it('returns undefined for missing header', () => {
    const req = makeRequest({});
    expect(getHttpHeader(req, 'ce-hub')).toBeUndefined();
  });

  it('returns string value for simple header', () => {
    const req = makeRequest({ 'ce-hub': 'myhub' });
    expect(getHttpHeader(req, 'ce-hub')).toBe('myhub');
  });

  it('returns first element for array header', () => {
    const req = makeRequest({ 'accept': ['text/html', 'application/json'] });
    expect(getHttpHeader(req, 'accept')).toBe('text/html');
  });

  it('is case-insensitive (lowercase keys)', () => {
    const req = makeRequest({ 'ce-userid': 'alice' });
    expect(getHttpHeader(req, 'CE-UserId')).toBe('alice');
  });
});

describe('readRequestBody', () => {
  function makeReadableStream(chunks: Buffer[]): IncomingMessage {
    const readable = new Readable({
      read() {
        for (const chunk of chunks) {
          this.push(chunk);
        }
        this.push(null);
      },
    }) as unknown as IncomingMessage;
    return readable;
  }

  it('resolves with the full body buffer', async () => {
    const req = makeReadableStream([Buffer.from('hello'), Buffer.from(' world')]);
    const buffer = await readRequestBody(req);
    expect(buffer.toString()).toBe('hello world');
  });

  it('resolves with empty buffer for empty stream', async () => {
    const req = makeReadableStream([]);
    const buffer = await readRequestBody(req);
    expect(buffer.length).toBe(0);
  });

  it('rejects on stream error', async () => {
    const readable = new Readable({
      read() {
        this.emit('error', new Error('stream error'));
      },
    }) as unknown as IncomingMessage;
    await expect(readRequestBody(readable)).rejects.toThrow('stream error');
  });
});
