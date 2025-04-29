"use client";

import React from "react";
import { WEAVE_INSTANCE_STATUS } from "@inditextech/weave-types";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { ContextMenuRender } from "@/components/context-menu/context-menu";
import { RoomInformationOverlay } from "@/components/overlays/room-information-overlay";
import { RoomUsersOverlay } from "@/components/overlays/room-users-overlay";
import { ToolsOverlay } from "@/components/overlays/tools-overlay";
import { ZoomHandlerOverlay } from "@/components/overlays/zoom-handler-overlay";

export const RoomLayout = () => {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const status = useWeave((state) => state.status);

  const contextMenuShow = useCollaborationRoom(
    (state) => state.contextMenu.show
  );
  const contextMenuPosition = useCollaborationRoom(
    (state) => state.contextMenu.position
  );
  const contextMenuOptions = useCollaborationRoom(
    (state) => state.contextMenu.options
  );
  const setContextMenuShow = useCollaborationRoom(
    (state) => state.setContextMenuShow
  );

  React.useEffect(() => {
    if (
      instance &&
      status === WEAVE_INSTANCE_STATUS.RUNNING &&
      actualAction !== "selectionTool"
    ) {
      instance.triggerAction("selectionTool");
    }
  }, [instance, status]);

  return (
    <div className="w-full h-full relative flex outline-transparent">
      <div className="w-full h-full">
        <div id="weave" className="w-full h-full outline-transparent"></div>
        {status === WEAVE_INSTANCE_STATUS.RUNNING && (
          <>
            <ContextMenuRender
              show={contextMenuShow}
              onChanged={(show: boolean) => {
                setContextMenuShow(show);
              }}
              position={contextMenuPosition}
              options={contextMenuOptions}
            />
            <RoomInformationOverlay />
            <RoomUsersOverlay />
            <ToolsOverlay />
            <ZoomHandlerOverlay />
          </>
        )}
      </div>
    </div>
  );
};
