// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { MessageData } from './types';

export function handleChunkedMessage(
  chunkedMessagesMap: Map<string, string[]>,
  messageData: MessageData
): string | undefined {
  if (
    messageData.payloadId &&
    messageData.index !== undefined &&
    messageData.totalChunks &&
    messageData.type === 'chunk'
  ) {
    if (!chunkedMessagesMap.has(messageData.payloadId)) {
      chunkedMessagesMap.set(
        messageData.payloadId,
        new Array(messageData.totalChunks)
      );
    }
    if (messageData.c) {
      chunkedMessagesMap.get(messageData.payloadId)![messageData.index] =
        messageData.c;
    }
  }

  let joined: string | undefined = undefined;
  if (messageData.payloadId && messageData.type === 'end') {
    if (chunkedMessagesMap.has(messageData.payloadId)) {
      joined = chunkedMessagesMap.get(messageData.payloadId)!.join('');
      chunkedMessagesMap.delete(messageData.payloadId);
    }
  }

  return joined;
}

export function handleMessageBufferData(
  normalMessagePayload: string | undefined,
  joinedMessagePayload: string | undefined
): Uint8Array<ArrayBufferLike> | undefined {
  let buf: Uint8Array<ArrayBufferLike> | undefined = undefined;

  if (normalMessagePayload) {
    buf = base64ToUint8Array(normalMessagePayload);
  }
  if (joinedMessagePayload) {
    buf = base64ToUint8Array(joinedMessagePayload);
  }

  return buf;
}

export function base64ToUint8Array(
  base64: string
): Uint8Array<ArrayBufferLike> {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.codePointAt(i)!;
  }
  return bytes;
}

export function uint8ToBase64(u8: Uint8Array<ArrayBufferLike>): string {
  let binary = '';
  const CHUNK = 0x8000; // 32k chunks

  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCodePoint(...u8.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}
