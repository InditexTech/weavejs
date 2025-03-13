import { WeaveActionCallbacks } from '../types';
import { BRUSH_TOOL_STATE } from './constants';

export type WeaveBrushToolActionStateKeys = keyof typeof BRUSH_TOOL_STATE;
export type WeaveBrushToolActionState =
  (typeof BRUSH_TOOL_STATE)[WeaveBrushToolActionStateKeys];

export type WeaveBrushToolCallbacks = WeaveActionCallbacks;
