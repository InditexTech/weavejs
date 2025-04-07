// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { SELECTION_TOOL_STATE } from "./constants";

export type WeaveSelectionToolActionStateKeys = keyof typeof SELECTION_TOOL_STATE;
export type WeaveSelectionToolActionState = (typeof SELECTION_TOOL_STATE)[WeaveSelectionToolActionStateKeys];
