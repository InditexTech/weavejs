import { WeaveActionCallbacks } from '../types';
import { RECTANGLE_TOOL_STATE } from './constants';

export type WeaveRectangleToolActionStateKeys =
  keyof typeof RECTANGLE_TOOL_STATE;
export type WeaveRectangleToolActionState =
  (typeof RECTANGLE_TOOL_STATE)[WeaveRectangleToolActionStateKeys];

export type WeaveRectangleToolCallbacks = WeaveActionCallbacks;
