import { SELECTION_TOOL_STATE } from "./constants";

export type WeaveSelectionToolActionStateKeys = keyof typeof SELECTION_TOOL_STATE;
export type WeaveSelectionToolActionState = (typeof SELECTION_TOOL_STATE)[WeaveSelectionToolActionStateKeys];
