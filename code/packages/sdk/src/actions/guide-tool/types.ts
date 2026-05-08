// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { GUIDE_TOOL_STATE } from './constants';
import { type DeepPartial } from '@inditextech/weave-types';
import type {
  GuideDistanceToTargetInfoStyle,
  GuideOrientation,
} from '@/plugins/nodes-snapping/types';

export type GuideToolActionStateKeys = keyof typeof GUIDE_TOOL_STATE;
export type GuideToolActionState =
  (typeof GUIDE_TOOL_STATE)[GuideToolActionStateKeys];

export type GuideToolActionOnAddingEvent = undefined;
export type GuideToolActionOnAddedEvent = undefined;

export type GuideToolActionTriggerParams = {
  orientation: GuideOrientation;
};

export type GuideToolActionParams = {
  config?: DeepPartial<GuideToolActionConfig>;
};

export type GuideToolActionConfig = {
  style: GuideToolActionStyle;
};

export type GuideToolActionStyle = {
  guide: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dash?: number[];
  };
  targetDistance: GuideDistanceToTargetInfoStyle;
};
