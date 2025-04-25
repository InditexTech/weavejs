"use client";

import React from "react";
import { ToolbarButton } from "./toolbar-button";
import {
  Fullscreen,
  Maximize,
  ZoomIn,
  ZoomOut,
  Braces,
  Undo,
  Redo,
} from "lucide-react";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";

export function ZoomHandlerOverlay() {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const selectedNodes = useWeave((state) => state.selection.nodes);
  const canUndo = useWeave((state) => state.undoRedo.canUndo);
  const canRedo = useWeave((state) => state.undoRedo.canRedo);

  const zoomValue = useWeave((state) => state.zoom.value);
  const canZoomIn = useWeave((state) => state.zoom.canZoomIn);
  const canZoomOut = useWeave((state) => state.zoom.canZoomOut);

  const showUI = useCollaborationRoom((state) => state.ui.show);

  const handleTriggerActionWithParams = React.useCallback(
    (actionName: string, params: unknown) => {
      if (instance) {
        const triggerSelection = actualAction === "selectionTool";
        instance.triggerAction(actionName, params);
        if (triggerSelection) {
          instance.triggerAction("selectionTool");
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

  if (!showUI) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex gap- justify-between items-center">
      <div className="flex gap-2 justify-start items-center">
        <div className="bg-white border border-zinc-200 shadow-lg p-1 flex justify-between items-center">
          <div className="w-full grid grid-cols-[auto_1fr]">
            <div className="flex justify-start items-center gap-1">
              <ToolbarButton
                icon={<Undo />}
                disabled={!canUndo}
                onClick={() => {
                  if (instance) {
                    const actualStore = instance.getStore();
                    actualStore.undoStateStep();
                  }
                }}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    <p>Undo latest changes</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="start"
              />
              <ToolbarButton
                icon={<Redo />}
                disabled={!canRedo}
                onClick={() => {
                  if (instance) {
                    const actualStore = instance.getStore();
                    actualStore.redoStateStep();
                  }
                }}
                label={
                  <div className="flex gap-3 justify-start items-center">
                    <p>Redo latest changes</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="start"
              />
            </div>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 shadow-lg p-1 flex justify-between items-center">
          <div className="w-full grid grid-cols-[auto_1fr]">
            <div className="flex justify-start items-center gap-1">
              <ToolbarButton
                icon={<Braces />}
                onClick={handlePrintToConsoleState}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    <p>Print model state to browser console</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="start"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 items-center">
        <div className="min-w-[320px] w-[320px] gap-1 p-1 bg-white border border-zinc-200 shadow-lg flex justify-end items-center">
          <div className="w-full grid grid-cols-[auto_1fr]">
            <div className="flex justify-start items-center gap-1">
              <ToolbarButton
                icon={<ZoomIn />}
                disabled={!canZoomIn}
                onClick={() => {
                  handleTriggerActionWithParams("zoomInTool", {
                    previousAction: actualAction,
                  });
                }}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    {" "}
                    <p>Zoom in</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="end"
              />
              <ToolbarButton
                icon={<ZoomOut />}
                disabled={!canZoomOut}
                onClick={() => {
                  handleTriggerActionWithParams("zoomOutTool", {
                    previousAction: actualAction,
                  });
                }}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    <p>Zoom out</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="end"
              />
              <ToolbarButton
                icon={<Maximize />}
                onClick={() => {
                  handleTriggerActionWithParams("fitToScreenTool", {
                    previousAction: actualAction,
                  });
                }}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    <p>Fit to screen</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="end"
              />
              <ToolbarButton
                icon={<Fullscreen />}
                disabled={selectedNodes.length === 0}
                onClick={() => {
                  handleTriggerActionWithParams("fitToSelectionTool", {
                    previousAction: actualAction,
                  });
                }}
                label={
                  <div className="flex flex-col gap-2 justify-start items-end">
                    <p>Fit to selection</p>
                  </div>
                }
                tooltipSide="top"
                tooltipAlign="end"
              />
            </div>
            <div className="w-full px-4 font-noto-sans-mono flex justify-end items-center text-muted-foreground">
              {parseFloat(`${zoomValue * 100}`).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
