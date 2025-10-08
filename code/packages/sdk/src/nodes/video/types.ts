// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type ImageCrossOrigin,
  type URLTransformerFunction,
  type WeaveElementAttributes,
  type WeaveNodeTransformerProperties,
} from '@inditextech/weave-types';

export type VideoProps = WeaveElementAttributes & {
  id: string;
  width: number;
  height: number;
  videoURL: string;
  videoPlaceholderURL: string;
  videoInfo?: {
    width: number;
    height: number;
  };
};

export type WeaveVideoState = {
  placeholderLoaded: boolean;
  loaded: boolean;
  playing: boolean;
  paused: boolean;
};

export type VideoBackgroundStyle = {
  color: string;
  strokeWidth: number;
  strokeColor: string;
};

export type VideoIconBackgroundStyle = {
  color: string;
  strokeWidth: number;
  strokeColor: string;
};

export type VideoTrackStyle = {
  resetOnEnd: boolean;
  onlyOnHover: boolean;
  color: string;
  height: number;
};

export type VideoIconStyle = {
  internal: {
    paddingX: number;
    paddingY: number;
  };
  external: {
    paddingX: number;
    paddingY: number;
  };
  width: number;
  height: number;
  color: string;
  dataURL: string;
};

export type VideoStyle = {
  playPauseOnDblClick: boolean;
  track: VideoTrackStyle;
  background: VideoBackgroundStyle;
  iconBackground: VideoIconBackgroundStyle;
  icon: VideoIconStyle;
};

export type WeaveVideoProperties = {
  crossOrigin: ImageCrossOrigin;
  transform?: WeaveNodeTransformerProperties;
  urlTransformer?: URLTransformerFunction;
  style: VideoStyle;
};

export type WeaveVideoNodeParams = {
  config: Partial<WeaveVideoProperties>;
};

export type WeaveVideoOnVideoPlayEvent = {
  nodeId: string;
};

export type WeaveVideoOnVideoPauseEvent = {
  nodeId: string;
};

export type WeaveVideoOnVideoStopEvent = {
  nodeId: string;
};
