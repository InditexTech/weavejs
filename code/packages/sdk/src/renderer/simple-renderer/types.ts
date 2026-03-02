import type {
  WeaveElementAttributes,
  WeaveStateElement,
} from '@inditextech/weave-types';

export type RendererInstruction =
  | {
      kind: 'CREATE_SUBTREE';
      element: WeaveStateElement;
      parentKey: string;
      index: number;
    }
  | {
      kind: 'REMOVE';
      parentKey: string;
      key: string;
    }
  | {
      kind: 'UPDATE_PROPS';
      key: string;
      type: string;
      prevProps: WeaveElementAttributes;
      nextProps: WeaveElementAttributes;
    };
