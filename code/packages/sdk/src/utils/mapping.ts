// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveState } from '@inditextech/weave-types';
import * as Y from 'yjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isArray = (val: any): boolean => {
  return Array.isArray(val);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isObject = (val: any): boolean => {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapJsonToYjsMap = (jsonData: any) => {
  const map = new Y.Map();
  const keys = Object.keys(jsonData);
  for (const key of keys) {
    const value = jsonData[key];
    if (isArray(value)) {
      map.set(key, mapJsonToYjsArray(value));
    } else if (isObject(value)) {
      map.set(key, mapJsonToYjsMap(value));
    } else {
      map.set(key, value);
    }
  }
  return map;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapJsonToYjsArray = (jsonData: any) => {
  const array = new Y.Array();
  for (const item of jsonData) {
    if (isArray(item)) {
      array.push([mapJsonToYjsArray(item)]);
    } else if (isObject(item)) {
      array.push([mapJsonToYjsMap(item)]);
    } else {
      array.push(item);
    }
  }
  return array;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapJsonToYjsElements = (jsonData: any) => {
  if (isArray(jsonData)) {
    return mapJsonToYjsArray(jsonData);
  } else if (isObject(jsonData)) {
    return mapJsonToYjsMap(jsonData);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const weavejsToYjsBinary = (weavejsData: WeaveState) => {
  const doc = new Y.Doc();

  doc.getMap('weave').set('key', weavejsData.weave.key);
  doc.getMap('weave').set('type', weavejsData.weave.type);
  doc
    .getMap('weave')
    .set('props', mapJsonToYjsElements(weavejsData.weave.props));

  const actualState = Y.encodeStateAsUpdate(doc);

  return actualState;
};

export function getJSONFromYjsBinary(actualState: Uint8Array<ArrayBufferLike>) {
  const document = new Y.Doc();
  Y.applyUpdate(document, actualState);
  const actualStateString = JSON.stringify(document.getMap('weave').toJSON());
  const actualStateJson = JSON.parse(actualStateString);
  return actualStateJson;
}
