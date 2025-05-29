// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type WeaveStageZoomChanged = {
  scale: number;
  zoomSteps: number[];
  actualStep: number;
  onDefaultStep: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

export type WeaveStageZoomPluginOnZoomChangeEvent = WeaveStageZoomChanged;

export type WeaveStageZoomPluginConfig = {
  zoomSteps: number[];
  defaultZoom: number;
  fitToScreen: {
    padding: number;
  };
  fitToSelection: {
    padding: number;
  };
};

export type WeaveStageZoomPluginParams = {
  config?: WeaveStageZoomPluginConfig;
};
