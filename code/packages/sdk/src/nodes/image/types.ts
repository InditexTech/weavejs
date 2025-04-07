import { WeaveElementAttributes } from '@inditextech/weavejs-types';

export type ImageProps = WeaveElementAttributes & {
  id: string;
  width?: number;
  height?: number;
  imageURL?: string;
  imageInfo?: {
    width: number;
    height: number;
  };
};
