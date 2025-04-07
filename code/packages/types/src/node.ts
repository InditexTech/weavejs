import {
  WeaveElementAttributes,
  WeaveElementInstance,
  WeaveStateElement,
} from './types';

export interface WeaveNodeBase {
  createNode(id: string, props: WeaveElementAttributes): WeaveStateElement;

  createInstance(props: WeaveElementAttributes): WeaveElementInstance;

  updateInstance(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  removeInstance(instance: WeaveElementInstance): void;

  toNode(instance: WeaveElementInstance): WeaveStateElement;
}
