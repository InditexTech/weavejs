"use client";

import React from "react";
import { WEAVE_INSTANCE_STATUS } from "@inditextech/weave-types";
import { useWeave, useWeaveEvents } from "@inditextech/weave-react";
import { RoomInformationOverlay } from "@/components/overlays/room-information-overlay";
import { RoomUsersOverlay } from "@/components/overlays/room-users-overlay";
import { ToolsOverlay } from "@/components/overlays/tools-overlay";
import { ZoomHandlerOverlay } from "@/components/overlays/zoom-handler-overlay";

export const RoomLayout = () => {
  useWeaveEvents();

  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const status = useWeave((state) => state.status);

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
      <div className="w-full h-full overflow-hidden">
        <div id="weave" className="w-full h-full outline-transparent"></div>
        {status === WEAVE_INSTANCE_STATUS.RUNNING && (
          <>
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
