// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveFont, WeaveLoggerConfig } from '@inditextech/weave-types';
import type { WeaveAction } from './actions/action';
import type { WeaveNode } from './nodes/node';
import type { WeavePlugin } from './plugins/plugin';
import type { WeaveRenderer } from './renderer/renderer';
import type { WeaveStore } from './stores/store';

// DOM utils types

export type DOMElement = HTMLElement | Element | null;

export type WeaveFontsPreloadFunction = () => Promise<WeaveFont[]>;

export type WeaveUpscaleConfig = {
  enabled?: boolean;
  multiplier?: number;
  baseWidth?: number;
  baseHeight?: number;
};

export type WeavePerformanceConfig = {
  upscale?: Partial<WeaveUpscaleConfig>;
};

export type WeaveConfig = {
  store: WeaveStore;
  renderer: WeaveRenderer;
  nodes?: WeaveNode[];
  actions?: WeaveAction[];
  plugins?: WeavePlugin[];
  fonts?: WeaveFont[] | WeaveFontsPreloadFunction;
  logger?: WeaveLoggerConfig;
  performance?: WeavePerformanceConfig;
  behaviors: {
    axisLockThreshold: number;
  };
};
