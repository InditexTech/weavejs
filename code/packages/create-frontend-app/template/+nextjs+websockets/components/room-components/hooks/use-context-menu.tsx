'use client';

import React from 'react';
import { useWeave } from '@inditextech/weave-react';
import { SidebarActive, useCollaborationRoom } from '@/store/store';
import { useKeyDown } from '../hooks/use-key-down';
import { SYSTEM_OS } from '@/lib/utils';
import { useGetOs } from '../hooks/use-get-os';
import {
  WeaveExportNodeActionParams,
  WeaveExportStageActionParams,
  WeaveNodesSelectionPlugin,
  WeaveUsersPointersPlugin,
} from '@inditextech/weave-sdk';
import { SIDEBAR_ELEMENTS } from '@/lib/constants';

export function useKeyboardHandler() {
  const os = useGetOs();

  const instance = useWeave((state) => state.instance);
  const selectedNodes = useWeave((state) => state.selection.nodes);
  const actualAction = useWeave((state) => state.actions.actual);

  const showUI = useCollaborationRoom((state) => state.ui.show);
  const setShowUi = useCollaborationRoom((state) => state.setShowUi);
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );
  const setShowSelectFileImage = useCollaborationRoom(
    (state) => state.setShowSelectFileImage
  );

  const triggerTool = React.useCallback(
    (toolName: string) => {
      if (instance && actualAction !== toolName) {
        instance.triggerAction(toolName);
      }
      if (instance && actualAction === toolName) {
        instance.cancelAction(toolName);
      }
    },
    [instance, actualAction]
  );

  const sidebarToggle = React.useCallback(
    (element: SidebarActive) => {
      setSidebarActive(element);
    },
    [setSidebarActive]
  );

  const handleTriggerAction = React.useCallback(
    (actionName: string, actionParams: unknown) => {
      if (instance) {
        const triggerSelection = actualAction === 'selectionTool';
        instance.triggerAction(actionName, actionParams);
        if (triggerSelection) {
          instance.triggerAction('selectionTool', actionParams);
        }
      }
    },
    [instance, actualAction]
  );

  const handlePrintToConsoleState = React.useCallback(() => {
    if (instance) {
      // eslint-disable-next-line no-console
      console.log({
        appState: JSON.parse(JSON.stringify(instance.getStore().getState())),
      });
    }
  }, [instance]);

  /* Keyboard shortcuts toolbar */
  useKeyDown(() => {
    triggerTool('moveTool');
  }, ['KeyM']);

  useKeyDown(() => {
    triggerTool('selectionTool');
  }, ['KeyS']);

  useKeyDown(() => {
    triggerTool('eraserTool');
  }, ['KeyD']);

  useKeyDown(
    () => {
      triggerTool('frameTool');
    },
    ['KeyF'],
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(() => {
    triggerTool('rectangleTool');
  }, ['KeyR']);

  useKeyDown(() => {
    triggerTool('ellipseTool');
  }, ['KeyE']);

  useKeyDown(() => {
    triggerTool('regularPolygonTool');
  }, ['KeyP']);

  useKeyDown(() => {
    triggerTool('penTool');
  }, ['KeyL']);

  useKeyDown(() => {
    triggerTool('brushTool');
  }, ['KeyB']);

  useKeyDown(() => {
    triggerTool('textTool');
  }, ['KeyT']);

  useKeyDown(
    () => {
      triggerTool('imageTool');
      setShowSelectFileImage(true);
    },
    ['KeyI'],
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(() => {
    triggerTool('starTool');
  }, ['KeyJ']);

  useKeyDown(() => {
    triggerTool('arrowTool');
  }, ['KeyA']);

  useKeyDown(
    () => {
      triggerTool('colorTokenTool');
    },
    ['KeyP'],
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const actualStore = instance.getStore();
        actualStore.undoStateStep();
      }
    },
    ['KeyZ'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const actualStore = instance.getStore();
        actualStore.redoStateStep();
      }
    },
    ['KeyY'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts visibility */

  useKeyDown(
    () => {
      setShowUi(!showUI);
    },
    ['IntlBackslash'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const usersPointersPlugin =
          instance.getPlugin<WeaveUsersPointersPlugin>('usersPointers');
        if (usersPointersPlugin && usersPointersPlugin.isEnabled()) {
          usersPointersPlugin.disable();
        } else {
          usersPointersPlugin.enable();
        }
      }
    },
    ['KeyU'],
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts selection */

  useKeyDown(
    () => {
      if (instance) {
        const selectionPlugin =
          instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
        if (selectionPlugin) {
          selectionPlugin.selectAll();
        }
      }
    },
    ['KeyA'],
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const selectionPlugin =
          instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
        if (selectionPlugin) {
          selectionPlugin.selectNone();
        }
      }
    },
    ['Escape'],
    (e) => e.shiftKey
  );

  /* Keyboard shortcuts editing */

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.triggerAction<WeaveExportNodeActionParams>('exportNodeTool', {
          node: selectedNodes[0].instance,
          options: {
            padding: 20,
            pixelRatio: 2,
          },
        });
      }
    },
    ['KeyE'],
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        instance.triggerAction<WeaveExportStageActionParams>(
          'exportStageTool',
          {
            options: {
              padding: 20,
              pixelRatio: 2,
            },
          }
        );
      }
    },
    ['KeyV'],
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts arrange */

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.bringToFront(selectedNodes[0].instance);
      }
    },
    ['BracketRight'],
    (e) => !([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.moveUp(selectedNodes[0].instance);
      }
    },
    ['BracketRight'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.moveDown(selectedNodes[0].instance);
      }
    },
    ['BracketLeft'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.sendToBack(selectedNodes[0].instance);
      }
    },
    ['BracketLeft'],
    (e) => !([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length > 1) {
        instance.group(selectedNodes.map((n) => n.node));
      }
    },
    ['KeyG'],
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (
        instance &&
        selectedNodes.length === 1 &&
        selectedNodes[0].node.type === 'group'
      ) {
        instance.unGroup(selectedNodes[0].node);
      }
    },
    ['KeyU'],
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts sidebars */

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.images);
    },
    ['KeyI'],
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.colorTokens);
    },
    ['KeyO'],
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.frames);
    },
    ['KeyF'],
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.nodesTree);
    },
    ['KeyE'],
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts zoom */

  useKeyDown(
    () => {
      handleTriggerAction('zoomInTool', { previousAction: actualAction });
    },
    ['BracketRight'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      handleTriggerAction('zoomOutTool', { previousAction: actualAction });
    },
    ['Slash'],
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      handleTriggerAction('fitToScreenTool', { previousAction: actualAction });
    },
    ['Digit1'],
    (e) => e.shiftKey
  );

  useKeyDown(
    () => {
      handleTriggerAction('fitToSelectionTool', {
        previousAction: actualAction,
      });
    },
    ['Digit2'],
    (e) => e.shiftKey
  );

  /* Keyboard shortcuts utility */

  useKeyDown(
    () => {
      handlePrintToConsoleState();
    },
    ['KeyC'],
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );
}
