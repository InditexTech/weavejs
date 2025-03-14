import { WeaveActionCallbacks } from '@/index';
import { FRAME_TOOL_STATE } from './constants';

export type WeaveFrameToolActionStateKeys = keyof typeof FRAME_TOOL_STATE;
export type WeaveFrameToolActionState =
  (typeof FRAME_TOOL_STATE)[WeaveFrameToolActionStateKeys];

export type WeaveFrameToolCallbacks = WeaveActionCallbacks;

export type WeaveFrameToolActionTriggerParams = {
  fontFamily?: string;
};
