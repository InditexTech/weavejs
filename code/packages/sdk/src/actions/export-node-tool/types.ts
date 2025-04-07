import {
  WeaveElementInstance,
  WeaveExportNodeOptions,
} from '@inditextech/weavejs-types';

export type WeaveExportNodeActionParams = {
  node: WeaveElementInstance;
  options?: WeaveExportNodeOptions;
};
