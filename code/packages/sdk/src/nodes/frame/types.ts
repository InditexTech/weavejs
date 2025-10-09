// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  WeaveElementAttributes,
  WeaveNodeTransformerProperties,
} from '@inditextech/weave-types';

export type WeaveFrameProperties = {
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  fontColor: string;
  titleMargin: number;
  borderWidth: number;
  borderColor: string;
  onTargetEnter: {
    borderColor: string;
    fill: string;
  };
  transform: WeaveNodeTransformerProperties;
};

export type WeaveFrameAttributes = WeaveElementAttributes & {
  title: string;
  frameWidth: number;
  frameHeight: number;
  frameBackground: string;
};

export type WeaveFrameNodeParams = {
  config: Partial<WeaveFrameProperties>;
};
