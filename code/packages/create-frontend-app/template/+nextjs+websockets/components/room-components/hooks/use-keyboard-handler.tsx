// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
import { useWeave } from "@inditextech/weave-react";
import { SidebarActive, useCollaborationRoom } from "@/store/store";
import { useKeyDown } from "../hooks/use-key-down";
import { SYSTEM_OS } from "@/lib/utils";
import { useGetOs } from "../hooks/use-get-os";
import {
  WeaveCopyPasteNodesPlugin,
  WeaveExportNodeActionParams,
  WeaveExportStageActionParams,
  WeaveNodesSelectionPlugin,
  WeaveUsersPointersPlugin,
} from "@inditextech/weave-sdk";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";

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
        const triggerSelection = actualAction === "selectionTool";
        instance.triggerAction(actionName, actionParams);
        if (triggerSelection) {
          instance.triggerAction("selectionTool", actionParams);
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
      triggerTool("selectionTool");
    },
    ["KeyS"],
    () => {
      return (
        !window.weaveTextEditing &&
        !window.weaveTextEditing &&
        !["textTool"].includes(actualAction ?? "")
      );
    }
  );

  useKeyDown(
    () => {
      triggerTool("frameTool");
    },
    ["KeyF"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      triggerTool("rectangleTool");
    },
    ["KeyR"],
    () => !window.weaveTextEditing && !["textTool"].includes(actualAction ?? "")
  );

  useKeyDown(
    () => {
      triggerTool("penTool");
    },
    ["KeyL"],
    () => !window.weaveTextEditing && !["textTool"].includes(actualAction ?? "")
  );

  useKeyDown(
    () => {
      triggerTool("brushTool");
    },
    ["KeyB"],
    () => !window.weaveTextEditing && !["textTool"].includes(actualAction ?? "")
  );

  useKeyDown(
    () => {
      triggerTool("textTool");
    },
    ["KeyT"],
    () => !window.weaveTextEditing && !["textTool"].includes(actualAction ?? "")
  );

  useKeyDown(
    () => {
      triggerTool("imageTool");
      setShowSelectFileImage(true);
    },
    ["KeyI"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      triggerTool("colorTokenTool");
    },
    ["KeyP"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => !(e.ctrlKey || e.metaKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const actualStore = instance.getStore();
        actualStore.undoStateStep();
      }
    },
    ["Comma"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
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
    ["Period"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts visibility */

  useKeyDown(
    () => {
      setShowUi(!showUI);
    },
    ["IntlBackslash"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const usersPointersPlugin =
          instance.getPlugin<WeaveUsersPointersPlugin>("usersPointers");
        if (usersPointersPlugin) {
          usersPointersPlugin.toggleRenderCursors();
        }
      }
    },
    ["KeyU"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts selection */

  useKeyDown(
    () => {
      if (instance) {
        const selectionPlugin =
          instance.getPlugin<WeaveNodesSelectionPlugin>("nodesSelection");
        if (selectionPlugin) {
          selectionPlugin.selectAll();
        }
      }
    },
    ["KeyA"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const selectionPlugin =
          instance.getPlugin<WeaveNodesSelectionPlugin>("nodesSelection");
        if (selectionPlugin) {
          selectionPlugin.selectNone();
        }
      }
    },
    ["Escape"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => e.shiftKey
  );

  /* Keyboard shortcuts editing */

  useKeyDown(
    async () => {
      if (instance && selectedNodes.length > 0) {
        const weaveCopyPasteNodesPlugin =
          instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
        if (weaveCopyPasteNodesPlugin) {
          await weaveCopyPasteNodesPlugin.copy();
        }
      }
    },
    ["KeyC"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        const weaveCopyPasteNodesPlugin =
          instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
        if (weaveCopyPasteNodesPlugin) {
          weaveCopyPasteNodesPlugin.paste();
        }
      }
    },
    ["KeyP"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    async () => {
      if (instance && selectedNodes.length === 1) {
        const weaveCopyPasteNodesPlugin =
          instance.getPlugin<WeaveCopyPasteNodesPlugin>("copyPasteNodes");
        if (weaveCopyPasteNodesPlugin) {
          await weaveCopyPasteNodesPlugin.copy();
          weaveCopyPasteNodesPlugin.paste();
        }
      }
    },
    ["KeyD"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.triggerAction<WeaveExportNodeActionParams>("exportNodeTool", {
          node: selectedNodes[0].instance,
          options: {
            padding: 20,
            pixelRatio: 2,
          },
        });
      }
    },
    ["KeyE"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance) {
        instance.triggerAction<WeaveExportStageActionParams>(
          "exportStageTool",
          {
            options: {
              padding: 20,
              pixelRatio: 2,
            },
          }
        );
      }
    },
    ["KeyV"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
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
    ["BracketRight"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => !([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.moveUp(selectedNodes[0].instance);
      }
    },
    ["BracketRight"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.moveDown(selectedNodes[0].instance);
      }
    },
    ["BracketLeft"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length === 1) {
        instance.sendToBack(selectedNodes[0].instance);
      }
    },
    ["BracketLeft"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => !([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (instance && selectedNodes.length > 1) {
        instance.group(selectedNodes.map((n) => n.node));
      }
    },
    ["KeyG"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      if (
        instance &&
        selectedNodes.length === 1 &&
        selectedNodes[0].node.type === "group"
      ) {
        instance.unGroup(selectedNodes[0].node);
      }
    },
    ["KeyU"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.shiftKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts sidebars */

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.images);
    },
    ["KeyI"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.colorTokens);
    },
    ["KeyO"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.frames);
    },
    ["KeyF"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      sidebarToggle(SIDEBAR_ELEMENTS.nodesTree);
    },
    ["KeyE"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  /* Keyboard shortcuts zoom */

  useKeyDown(
    () => {
      handleTriggerAction("zoomInTool", { previousAction: actualAction });
    },
    ["BracketRight"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      handleTriggerAction("zoomOutTool", { previousAction: actualAction });
    },
    ["Slash"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );

  useKeyDown(
    () => {
      handleTriggerAction("fitToScreenTool", { previousAction: actualAction });
    },
    ["Digit1"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => e.shiftKey
  );

  useKeyDown(
    () => {
      handleTriggerAction("fitToSelectionTool", {
        previousAction: actualAction,
      });
    },
    ["Digit2"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) => e.shiftKey
  );

  /* Keyboard shortcuts utility */

  useKeyDown(
    () => {
      handlePrintToConsoleState();
    },
    ["KeyC"],
    () =>
      !window.weaveTextEditing && !["textTool"].includes(actualAction ?? ""),
    (e) =>
      e.altKey &&
      ([SYSTEM_OS.MAC as string].includes(os) ? e.metaKey : e.ctrlKey)
  );
}
