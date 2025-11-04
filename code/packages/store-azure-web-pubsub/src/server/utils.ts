// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Y from './../yjs';
import crypto from 'node:crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getStateAsJson(actualState: Uint8Array<ArrayBufferLike>): any {
  const document = new Y.Doc();
  Y.applyUpdate(document, actualState);
  const actualStateString = JSON.stringify(document.getMap('weave').toJSON());
  const actualStateJson = JSON.parse(actualStateString);
  return actualStateJson;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hashJson(obj: any): string {
  const jsonString = JSON.stringify(obj);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}
