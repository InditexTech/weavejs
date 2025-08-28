import type { DeepPartial } from '@inditextech/weave-types';
import Konva from 'konva';

export type WeaveStageMinimapPluginStyle = {
  viewportReference: Konva.RectConfig;
};

export type WeaveStageMinimapPluginConfig = {
  getContainer: () => HTMLElement;
  id: string;
  width: number;
  fitToContentPadding: number;
  style: WeaveStageMinimapPluginStyle;
};

export type WeaveStageMinimapPluginParams = {
  config: Pick<
    WeaveStageMinimapPluginConfig,
    'getContainer' | 'id' | 'width' | 'fitToContentPadding'
  > &
    DeepPartial<Pick<WeaveStageMinimapPluginConfig, 'style'>>;
};
