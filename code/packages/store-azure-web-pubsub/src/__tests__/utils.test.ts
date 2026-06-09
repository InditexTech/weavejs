// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleChunkedMessage,
  handleMessageBufferData,
  base64ToUint8Array,
  uint8ToBase64,
  sleep,
} from '../utils';
import type { MessageData } from '../types';

describe('handleChunkedMessage', () => {
  let map: Map<string, string[]>;

  beforeEach(() => {
    map = new Map();
  });

  it('returns undefined for non-chunk, non-end messages', () => {
    const data = { type: 'heartbeat' } as unknown as MessageData;
    const result = handleChunkedMessage(map, data);
    expect(result).toBeUndefined();
    expect(map.size).toBe(0);
  });

  it('stores chunk data in the map', () => {
    const data: Partial<MessageData> = {
      payloadId: 'abc',
      index: 0,
      totalChunks: 2,
      type: 'chunk',
      c: 'chunkdata0',
    };
    handleChunkedMessage(map, data as MessageData);
    expect(map.has('abc')).toBe(true);
    expect(map.get('abc')![0]).toBe('chunkdata0');
  });

  it('stores multiple chunks', () => {
    const data0: Partial<MessageData> = { payloadId: 'abc', index: 0, totalChunks: 2, type: 'chunk', c: 'part0' };
    const data1: Partial<MessageData> = { payloadId: 'abc', index: 1, totalChunks: 2, type: 'chunk', c: 'part1' };
    handleChunkedMessage(map, data0 as MessageData);
    handleChunkedMessage(map, data1 as MessageData);
    expect(map.get('abc')![0]).toBe('part0');
    expect(map.get('abc')![1]).toBe('part1');
  });

  it('does not store chunk if c is missing', () => {
    const data: Partial<MessageData> = { payloadId: 'abc', index: 0, totalChunks: 1, type: 'chunk' };
    handleChunkedMessage(map, data as MessageData);
    // map entry exists but slot is empty
    expect(map.has('abc')).toBe(true);
    expect(map.get('abc')![0]).toBeUndefined();
  });

  it('returns joined string and deletes from map on end message', () => {
    map.set('abc', ['part0', 'part1']);
    const data: Partial<MessageData> = { payloadId: 'abc', type: 'end' };
    const result = handleChunkedMessage(map, data as MessageData);
    expect(result).toBe('part0part1');
    expect(map.has('abc')).toBe(false);
  });

  it('returns undefined for end message if payloadId not in map', () => {
    const data: Partial<MessageData> = { payloadId: 'unknown', type: 'end' };
    const result = handleChunkedMessage(map, data as MessageData);
    expect(result).toBeUndefined();
  });

  it('returns undefined for end message without payloadId', () => {
    const data: Partial<MessageData> = { type: 'end' };
    const result = handleChunkedMessage(map, data as MessageData);
    expect(result).toBeUndefined();
  });
});

describe('handleMessageBufferData', () => {
  it('returns undefined when both payloads are undefined', () => {
    const result = handleMessageBufferData(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('decodes normal message payload', () => {
    const bytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
    const b64 = btoa('hello');
    const result = handleMessageBufferData(b64, undefined);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result!)).toEqual(Array.from(bytes));
  });

  it('decodes joined message payload', () => {
    const b64 = btoa('world');
    const result = handleMessageBufferData(undefined, b64);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result!)).toEqual(Array.from(new Uint8Array([119, 111, 114, 108, 100])));
  });

  it('joined payload takes precedence over normal payload when both defined', () => {
    const b64Normal = btoa('hello');
    const b64Joined = btoa('world');
    const result = handleMessageBufferData(b64Normal, b64Joined);
    // both are processed, but joinedMessagePayload overwrites
    expect(Array.from(result!)).toEqual(Array.from(new Uint8Array([119, 111, 114, 108, 100])));
  });
});

describe('base64ToUint8Array / uint8ToBase64', () => {
  it('round-trips small data', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const b64 = uint8ToBase64(original);
    const restored = base64ToUint8Array(b64);
    expect(Array.from(restored)).toEqual([1, 2, 3, 4, 5]);
  });

  it('round-trips empty array', () => {
    const original = new Uint8Array([]);
    const b64 = uint8ToBase64(original);
    expect(b64).toBe('');
    const restored = base64ToUint8Array(b64);
    expect(restored.length).toBe(0);
  });

  it('round-trips large data (> 32k chunk boundary)', () => {
    const size = 70000;
    const original = new Uint8Array(size).fill(42);
    const b64 = uint8ToBase64(original);
    const restored = base64ToUint8Array(b64);
    expect(restored.length).toBe(size);
    expect(restored.every((v) => v === 42)).toBe(true);
  });

  it('base64ToUint8Array decodes known value', () => {
    // "ABC" in base64 is QUJD
    const result = base64ToUint8Array('QUJD');
    expect(Array.from(result)).toEqual([65, 66, 67]);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the specified delay', async () => {
    let resolved = false;
    sleep(1000).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).toBe(true);
  });

  it('does not resolve before the delay', async () => {
    let resolved = false;
    sleep(500).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);
  });
});
