import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveLineProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveLineNodeParams = {
  config: Partial<WeaveLineProperties>;
};
