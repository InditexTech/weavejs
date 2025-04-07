import React from 'react';
import { WeaveStateElement } from '@inditextech/weavejs-types';
import { isEmpty } from 'lodash';

export class WeaveStateSerializer {
  serialize(element: React.ReactNode) {
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

  deserialize(data: unknown) {
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

    const { children, ...restProps } = props;

    let childrenNodes = [];
    if (children) {
      childrenNodes = this.deserializeElement(children);
    }

    return React.createElement(
      type.toLowerCase(),
      { ...restProps, key: key as string },
      childrenNodes
    );
  }
}
