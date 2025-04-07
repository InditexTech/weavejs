import Konva from 'konva';
import { NodeSerializable } from '@inditextech/weavejs-types';

export type TextSerializable = Konva.TextConfig &
  NodeSerializable & {
    type: 'text';
    id: string;
  };
