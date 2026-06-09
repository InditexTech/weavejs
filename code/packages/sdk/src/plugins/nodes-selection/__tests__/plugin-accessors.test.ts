// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import {
  getContextMenuPlugin,
  getStageGridPlugin,
  getStagePanningPlugin,
  getNodesSelectionFeedbackPlugin,
  getUsersPresencePlugin,
} from '../plugin-accessors';
import { WEAVE_CONTEXT_MENU_PLUGIN_KEY } from '../../context-menu/constants';
import { WEAVE_STAGE_GRID_PLUGIN_KEY } from '../../stage-grid/constants';
import { WEAVE_STAGE_PANNING_KEY } from '../../stage-panning/constants';
import { WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY } from '../../nodes-multi-selection-feedback/constants';
import { WEAVE_USERS_PRESENCE_PLUGIN_KEY } from '../../users-presence/constants';

function makeInstance(plugin: unknown = { dummy: true }) {
  return {
    getPlugin: vi.fn().mockReturnValue(plugin),
  };
}

describe('plugin-accessors', () => {
  it('getContextMenuPlugin delegates to instance.getPlugin with correct key', () => {
    const instance = makeInstance();
    getContextMenuPlugin(instance as never);
    expect(instance.getPlugin).toHaveBeenCalledWith(WEAVE_CONTEXT_MENU_PLUGIN_KEY);
  });

  it('getStageGridPlugin delegates to instance.getPlugin with correct key', () => {
    const instance = makeInstance();
    getStageGridPlugin(instance as never);
    expect(instance.getPlugin).toHaveBeenCalledWith(WEAVE_STAGE_GRID_PLUGIN_KEY);
  });

  it('getStagePanningPlugin delegates to instance.getPlugin with correct key', () => {
    const instance = makeInstance();
    getStagePanningPlugin(instance as never);
    expect(instance.getPlugin).toHaveBeenCalledWith(WEAVE_STAGE_PANNING_KEY);
  });

  it('getNodesSelectionFeedbackPlugin delegates to instance.getPlugin with correct key', () => {
    const instance = makeInstance();
    getNodesSelectionFeedbackPlugin(instance as never);
    expect(instance.getPlugin).toHaveBeenCalledWith(WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY);
  });

  it('getUsersPresencePlugin delegates to instance.getPlugin with correct key', () => {
    const instance = makeInstance();
    getUsersPresencePlugin(instance as never);
    expect(instance.getPlugin).toHaveBeenCalledWith(WEAVE_USERS_PRESENCE_PLUGIN_KEY);
  });

  it('returns undefined when the plugin is not registered', () => {
    const instance = { getPlugin: vi.fn().mockReturnValue(undefined) };
    const result = getContextMenuPlugin(instance as never);
    expect(result).toBeUndefined();
  });
});
