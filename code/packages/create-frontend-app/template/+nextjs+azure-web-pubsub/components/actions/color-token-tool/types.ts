import { Vector2d } from 'konva/lib/types';
import { COLOR_TOKEN_TOOL_STATE } from './constants';

export type ColorTokenToolActionStateKeys = keyof typeof COLOR_TOKEN_TOOL_STATE;
export type ColorTokenToolActionState =
  (typeof COLOR_TOKEN_TOOL_STATE)[ColorTokenToolActionStateKeys];

export type ColorTokenToolActionTriggerParams = {
  color?: string;
  position?: Vector2d;
};
