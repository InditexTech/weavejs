import { WeaveActionCallbacks } from '../types';
import { PEN_TOOL_STATE } from './constants';

export type WeavePenToolActionStateKeys = keyof typeof PEN_TOOL_STATE;
export type WeavePenToolActionState =
  (typeof PEN_TOOL_STATE)[WeavePenToolActionStateKeys];

export type WeavePenToolCallbacks = WeaveActionCallbacks;
