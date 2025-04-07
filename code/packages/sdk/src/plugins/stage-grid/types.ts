import { WEAVE_GRID_TYPES } from './constants';

export type WeaveStageGridPluginParams = {
  gridSize?: number;
};

export type WeaveStageGridTypeKeys = keyof typeof WEAVE_GRID_TYPES;
export type WeaveStageGridType =
  (typeof WEAVE_GRID_TYPES)[WeaveStageGridTypeKeys];
