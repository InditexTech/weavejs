// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import http from 'http';
import * as number from 'lib0/number';
import { WSSharedDoc } from './websockets-utils';

const CALLBACK_URL = process.env.CALLBACK_URL
  ? new URL(process.env.CALLBACK_URL)
  : null;
const CALLBACK_TIMEOUT = number.parseInt(
  process.env.CALLBACK_TIMEOUT || '5000'
);
const CALLBACK_OBJECTS = process.env.CALLBACK_OBJECTS
  ? JSON.parse(process.env.CALLBACK_OBJECTS)
  : {};

export const isCallbackSet: boolean = !!CALLBACK_URL;

export const callbackHandler = (
  _update: Uint8Array,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _origin: any,
  doc: WSSharedDoc
): void => {
  const room = doc.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataToSend: { room: string; data: any } = {
    room,
    data: {},
  };
  const sharedObjectList = Object.keys(CALLBACK_OBJECTS);
  sharedObjectList.forEach((sharedObjectName) => {
    const sharedObjectType = CALLBACK_OBJECTS[sharedObjectName];
    dataToSend.data[sharedObjectName] = {
      type: sharedObjectType,
      content: getContent(sharedObjectName, sharedObjectType, doc).toJSON(),
    };
  });
  if (CALLBACK_URL) {
    callbackRequest(CALLBACK_URL, CALLBACK_TIMEOUT, dataToSend);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const callbackRequest = (url: URL, timeout: number, data: any): void => {
  data = JSON.stringify(data);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    timeout,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  const req = http.request(options);
  req.on('timeout', () => {
    console.warn('Callback request timed out.');
    req.abort();
  });
  req.on('error', (e) => {
    console.error('Callback request error.', e);
    req.abort();
  });
  req.write(data);
  req.end();
};

const getContent = (
  objName: string,
  objType: string,
  doc: WSSharedDoc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  switch (objType) {
    case 'Array':
      return doc.getArray(objName);
    case 'Map':
      return doc.getMap(objName);
    case 'Text':
      return doc.getText(objName);
    case 'XmlFragment':
      return doc.getXmlFragment(objName);
    case 'XmlElement':
      return doc.getXmlElement(objName);
    default:
      return {};
  }
};
