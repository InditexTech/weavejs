// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Weave } from '@/weave';
import type { WeaveContextMenuPlugin } from '../context-menu/context-menu';
import { WEAVE_CONTEXT_MENU_PLUGIN_KEY } from '../context-menu/constants';
import type { WeaveStageGridPlugin } from '../stage-grid/stage-grid';
import { WEAVE_STAGE_GRID_PLUGIN_KEY } from '../stage-grid/constants';
import type { WeaveStagePanningPlugin } from '../stage-panning/stage-panning';
import { WEAVE_STAGE_PANNING_KEY } from '../stage-panning/constants';
import type { WeaveNodesMultiSelectionFeedbackPlugin } from '../nodes-multi-selection-feedback/nodes-multi-selection-feedback';
import { WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY } from '../nodes-multi-selection-feedback/constants';
import type { WeaveUsersPresencePlugin } from '../users-presence/users-presence';
import { WEAVE_USERS_PRESENCE_PLUGIN_KEY } from '../users-presence/constants';

export function getContextMenuPlugin(instance: Weave) {
  return instance.getPlugin<WeaveContextMenuPlugin>(WEAVE_CONTEXT_MENU_PLUGIN_KEY);
}

export function getStageGridPlugin(instance: Weave) {
  return instance.getPlugin<WeaveStageGridPlugin>(WEAVE_STAGE_GRID_PLUGIN_KEY);
}

export function getStagePanningPlugin(instance: Weave) {
  return instance.getPlugin<WeaveStagePanningPlugin>(WEAVE_STAGE_PANNING_KEY);
}

export function getNodesSelectionFeedbackPlugin(instance: Weave) {
  return instance.getPlugin<WeaveNodesMultiSelectionFeedbackPlugin>(
    WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY
  );
}

export function getUsersPresencePlugin(instance: Weave) {
  return instance.getPlugin<WeaveUsersPresencePlugin>(WEAVE_USERS_PRESENCE_PLUGIN_KEY);
}
