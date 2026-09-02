"use client";

import React from "react";
import { Square, MousePointer, Hand } from "lucide-react";
import { useWeave } from "@inditextech/weave-react";
import { ToolbarButton } from "./toolbar-button";
import { Toolbar } from "./toolbar";
import { useCollaborationRoom } from "@/store/store";

export function ToolsOverlay() {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);

  const showUI = useCollaborationRoom((state) => state.ui.show);

  const triggerTool = React.useCallback(
    (toolName: string) => {
      if (instance && actualAction !== toolName) {
        instance.triggerAction(toolName);
        return;
      }
      if (instance && actualAction === toolName) {
        instance.cancelAction(toolName);
      }
    },
    [instance, actualAction]
  );

  if (!showUI) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-[calc(50px+16px)] left-2 bottom-2 flex flex-col gap-2 justify-center items-center">
      <Toolbar>
        <ToolbarButton
          icon={<Hand />}
          active={actualAction === "moveTool"}
          onClick={() => triggerTool("moveTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Move</p>
            </div>
          }
        />
        <ToolbarButton
          icon={<MousePointer />}
          active={actualAction === "selectionTool"}
          onClick={() => triggerTool("selectionTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Selection</p>
            </div>
          }
        />
        <ToolbarButton
          icon={<Square />}
          active={actualAction === "rectangleTool"}
          onClick={() => triggerTool("rectangleTool")}
          label={
            <div className="flex gap-3 justify-start items-center">
              <p>Add a rectangle</p>
            </div>
          }
        />
      </Toolbar>
    </div>
  );
}
