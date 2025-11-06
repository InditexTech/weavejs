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
): Buffer | undefined {
  let buf: Buffer | undefined = undefined;

  if (normalMessagePayload) {
    buf = Buffer.from(normalMessagePayload, 'base64');
  }
  if (joinedMessagePayload) {
    buf = Buffer.from(joinedMessagePayload, 'base64');
  }

  return buf;
}
