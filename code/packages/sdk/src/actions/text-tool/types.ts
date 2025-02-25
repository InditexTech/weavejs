import { TEXT_TOOL_STATE } from "./constants";

export type WeaveTextToolActionStateKeys = keyof typeof TEXT_TOOL_STATE;
export type WeaveTextToolActionState = (typeof TEXT_TOOL_STATE)[WeaveTextToolActionStateKeys];
