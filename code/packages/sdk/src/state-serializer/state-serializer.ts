// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { type WeaveStateElement } from '@inditextech/weave-types';
import { isEmpty } from 'lodash';

export class WeaveStateSerializer {
  serialize(element: React.ReactNode): string {
    const replacer = (
      key: string,
      value: string | number | boolean | WeaveStateElement[]
    ) => {
      switch (key) {
        case '_owner':
        case '_store':
        case 'ref':
          return;
        default:
          return value;
      }
    };

    return JSON.stringify(element, replacer);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deserialize(data: unknown): any {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    if (data instanceof Object) {
      const toDeserialize = data as WeaveStateElement;
      return this.deserializeElement(toDeserialize);
    }
    throw new Error('Deserialization error: incorrect data type');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deserializeElement(element: WeaveStateElement | WeaveStateElement[]): any {
    if (isEmpty(element)) {
      return element;
    }

    if (element instanceof Array) {
      return element.map((el: WeaveStateElement) => {
        return this.deserializeElement(el);
      });
    }

    const { key, type, props } = element as WeaveStateElement;

    if (typeof type !== 'string') {
      throw new Error(
        `Deserialization error: element type must be string received [${type}]`
      );
    }

    let restProps: Record<string, unknown> = {};
    let childrenNodes: React.ReactNode[] = [];

    if (props.children) {
      const { children, ...actRestProps } = props;

      restProps = actRestProps;

      if (children) {
        childrenNodes = this.deserializeElement(children);
      }
    } else {
      restProps = props;
    }

    return React.createElement(
      type.toLowerCase(),
      { ...restProps, key: key as string },
      childrenNodes
    );
  }
}
