// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { defaultInitialState } from '../default-initial-state';

const EXPECTED_LAYER_IDS = [
  'gridLayer',
  'mainLayer',
  'selectionLayer',
  'usersPointersLayer',
  'utilityLayer',
];

describe('1 — defaultInitialState', () => {
  let doc: Y.Doc;
  let weave: Y.Map<unknown>;

  beforeEach(() => {
    doc = new Y.Doc();
    defaultInitialState(doc);
    weave = doc.getMap('weave');
  });

  it('1.1 weave map key is "stage"', () => {
    expect(weave.get('key')).toBe('stage');
  });

  it('1.2 weave map type is "stage"', () => {
    expect(weave.get('type')).toBe('stage');
  });

  it('1.3 stage props id is "stage"', () => {
    const props = weave.get('props') as Y.Map<unknown>;
    expect(props.get('id')).toBe('stage');
  });

  it('1.4 stage children contains exactly 5 layers', () => {
    const props = weave.get('props') as Y.Map<unknown>;
    const children = props.get('children') as Y.Array<unknown>;
    expect(children.length).toBe(5);
  });

  it('1.5 layer ids are in the correct order', () => {
    const props = weave.get('props') as Y.Map<unknown>;
    const children = props.get('children') as Y.Array<Y.Map<unknown>>;
    const ids = children.toArray().map((layer) => layer.get('key'));
    expect(ids).toEqual(EXPECTED_LAYER_IDS);
  });

  it('1.6 each layer has the correct key and type === "layer"', () => {
    const props = weave.get('props') as Y.Map<unknown>;
    const children = props.get('children') as Y.Array<Y.Map<unknown>>;

    children.toArray().forEach((layer, i) => {
      expect(layer.get('key')).toBe(EXPECTED_LAYER_IDS[i]);
      expect(layer.get('type')).toBe('layer');
    });
  });

  it('1.7 each layer props has nodeType === "layer" and a Y.Array for children', () => {
    const props = weave.get('props') as Y.Map<unknown>;
    const children = props.get('children') as Y.Array<Y.Map<unknown>>;

    children.toArray().forEach((layer, i) => {
      const layerProps = layer.get('props') as Y.Map<unknown>;
      expect(layerProps.get('id')).toBe(EXPECTED_LAYER_IDS[i]);
      expect(layerProps.get('nodeType')).toBe('layer');
      expect(layerProps.get('children')).toBeInstanceOf(Y.Array);
      expect((layerProps.get('children') as Y.Array<unknown>).length).toBe(0);
    });
  });
});
