import type { WeaveNodeTransformerProperties } from '@inditextech/weave-types';

export type WeaveGroupProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveGroupNodeParams = {
  config: Partial<WeaveGroupProperties>;
};
