// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { CONNECTOR_TOOL_STATE } from './constants';

export type WeaveConnectorToolActionStateKeys =
  keyof typeof CONNECTOR_TOOL_STATE;
export type WeaveConnectorToolActionState =
  (typeof CONNECTOR_TOOL_STATE)[WeaveConnectorToolActionStateKeys];

export type WeaveConnectorToolActionOnAddingEvent = undefined;
export type WeaveConnectorToolActionOnAddedEvent = undefined;
