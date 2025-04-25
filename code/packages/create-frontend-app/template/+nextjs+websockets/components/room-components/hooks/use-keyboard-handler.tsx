'use client';

import React from 'react';
import { useWeave } from '@inditextech/weavejs-react';
import { useCollaborationRoom } from '@/store/store';
import { useKeyDown } from '../hooks/use-key-down';
import { SYSTEM_OS } from '@/lib/utils';
import { useGetOs } from '../hooks/use-get-os';
import {
  WeaveCopyPasteNodesPlugin,
  WeaveExportNodeActionParams,
  WeaveExportStageActionParams,
  WeaveNodesSelectionPlugin,
  WeaveUsersPointersPlugin,
} from '@inditextech/weavejs-sdk';

export function useKeyboardHandler() {
  const os = useGetOs();

  const instance = useWeave((state) => state.instance);
  const selectedNodes = useWeave((state) => state.selection.nodes);
  const actualAction = useWeave((state) => state.actions.actual);

  const showUI = useCollaborationRoom((state) => state.ui.show);
  const setShowUi = useCollaborationRoom((state) => state.setShowUi);
  const framesLibraryVisible = useCollaborationRoom(
    (state) => state.frames.library.visible
  );
  const setFramesLibraryVisible = useCollaborationRoom(
    (state) => state.setFramesLibraryVisible
  );
  const imagesLibraryVisible = useCollaborationRoom(
    (state) => state.images.library.visible
  );
  const setImagesLibraryVisible = useCollaborationRoom(
    (state) => state.setImagesLibraryVisible
  );
  const colorTokensLibraryVisible = useCollaborationRoom(
    (state) => state.colorToken.library.visible
  );
  const setColorTokensLibraryVisible = useCollaborationRoom(
    (state) => state.setColorTokensLibraryVisible
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

  const libraryToggle = React.useCallback(
    (library: string) => {
      switch (library) {
        case 'images':
          setColorTokensLibraryVisible(false);
          setFramesLibraryVisible(false);
          setImagesLibraryVisible(!imagesLibraryVisible);
          break;
        case 'colorTokens':
          setImagesLibraryVisible(false);
          setFramesLibraryVisible(false);
          setColorTokensLibraryVisible(!colorTokensLibraryVisible);
          break;
        case 'frames':
          setImagesLibraryVisible(false);
          setColorTokensLibraryVisible(false);
          setFramesLibraryVisible(!framesLibraryVisible);
          break;
        default:
          break;
      }
    },
    [
      colorTokensLibraryVisible,
      framesLibraryVisible,
      imagesLibraryVisible,
      setImagesLibraryVisible,
      setColorTokensLibraryVisible,
      setFramesLibraryVisible,
    ]
  );

  const handleTriggerAction = React.useCallback(
    (actionName: string) => {
      if (instance) {
        const triggerSelection = actualAction === 'selectionTool';
        instance.triggerAction(actionName);
        if (triggerSelection) {
          instance.triggerAction('selectionTool');
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

  useKeyDown(
    () => {
      triggerTool('selectionTool');
    },
    ['KeyS'],
    () => {
      return (
        !window.weaveTextEditing &&
        !window.weaveTextEditing &&
        !['textTool'].includes(actualAction ?? '')
      );
    }
  );

  useKeyDown(
    () => {
      triggerTool('frameTool');
    },
    ['KeyF'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      triggerTool('rectangleTool');
    },
    ['KeyR'],
    () => !window.weaveTextEditing && !['textTool'].includes(actualAction ?? '')
  );

  useKeyDown(
    () => {
      triggerTool('penTool');
    },
    ['KeyL'],
    () => !window.weaveTextEditing && !['textTool'].includes(actualAction ?? '')
  );

  useKeyDown(
    () => {
      triggerTool('brushTool');
    },
    ['KeyB'],
    () => !window.weaveTextEditing && !['textTool'].includes(actualAction ?? '')
  );

  useKeyDown(
    () => {
      triggerTool('textTool');
    },
    ['KeyT'],
    () => !window.weaveTextEditing && !['textTool'].includes(actualAction ?? '')
  );

  useKeyDown(
    () => {
      triggerTool('imageTool');
      setShowSelectFileImage(true);
    },
    ['KeyI'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      triggerTool('colorTokenTool');
    },
    ['KeyP'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const actualStore = instance.getStore();
        actualStore.undoStateStep();
      }
    },
    ['Comma'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const actualStore = instance.getStore();
        actualStore.redoStateStep();
      }
    },
    ['Period'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts visibility */

  useKeyDown(
    () => {
      setShowUi(!showUI);
    },
    ['IntlBackslash'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const usersPointersPlugin =
          instance.getPlugin<WeaveUsersPointersPlugin>('usersPointers');
        if (usersPointersPlugin) {
          usersPointersPlugin.toggleRenderCursors();
        }
      }
    },
    ['KeyU'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
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
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
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
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => e.shiftKey
  );

  /* Keyboard shortcuts editing */

  useKeyDown(
    async () => {
      if (instance && selectedNodes.length > 0) {
        const weaveCopyPasteNodesPlugin =
          instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');
        if (weaveCopyPasteNodesPlugin) {
          await weaveCopyPasteNodesPlugin.copy();
        }
      }
    },
    ['KeyC'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const weaveCopyPasteNodesPlugin =
          instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');
        if (weaveCopyPasteNodesPlugin) {
          weaveCopyPasteNodesPlugin.paste();
        }
      }
    },
    ['KeyP'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    async () => {
      if (instance && selectedNodes.length === 1) {
        const weaveCopyPasteNodesPlugin =
          instance.getPlugin<WeaveCopyPasteNodesPlugin>('copyPasteNodes');
        if (weaveCopyPasteNodesPlugin) {
          await weaveCopyPasteNodesPlugin.copy();
          weaveCopyPasteNodesPlugin.paste();
        }
      }
    },
    ['KeyD'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

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
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
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
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
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
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => !([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.moveUp(selectedNodes[0].instance);
      }
    },
    ['BracketRight'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.moveDown(selectedNodes[0].instance);
      }
    },
    ['BracketLeft'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.sendToBack(selectedNodes[0].instance);
      }
    },
    ['BracketLeft'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => !([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length > 1) {
        instance.group(selectedNodes.map((n) => n.node));
      }
    },
    ['KeyG'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
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
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts sidebars */

  useKeyDown(
    () => {
      libraryToggle('images');
    },
    ['KeyI'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      libraryToggle('colorTokens');
    },
    ['KeyP'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      libraryToggle('frames');
    },
    ['KeyF'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts zoom */

  useKeyDown(
    () => {
      handleTriggerAction('zoomInTool');
    },
    ['BracketRight'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      handleTriggerAction('zoomOutTool');
    },
    ['Slash'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      handleTriggerAction('fitToScreenTool');
    },
    ['Digit1'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => e.shiftKey
  );

  useKeyDown(
    () => {
      handleTriggerAction('fitToSelectionTool');
    },
    ['Digit2'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) => e.shiftKey
  );

  /* Keyboard shortcuts utility */

  useKeyDown(
    () => {
      handlePrintToConsoleState();
    },
    ['KeyC'],
    () =>
      !window.weaveTextEditing && !['textTool'].includes(actualAction ?? ''),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );
}
