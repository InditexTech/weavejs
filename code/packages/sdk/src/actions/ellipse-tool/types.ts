// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ELLIPSE_TOOL_STATE } from './constants';

export type WeaveEllipseToolActionStateKeys = keyof typeof ELLIPSE_TOOL_STATE;
export type WeaveEllipseToolActionState =
  (typeof ELLIPSE_TOOL_STATE)[WeaveEllipseToolActionStateKeys];
