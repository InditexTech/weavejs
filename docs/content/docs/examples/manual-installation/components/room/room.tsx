"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { WeaveUser, WEAVE_INSTANCE_STATUS } from "@inditextech/weave-types";
import { useCollaborationRoom } from "@/store/store";
import { useWeave, WeaveProvider } from "@inditextech/weave-react";
import { RoomLayout } from "./room.layout";
import { RoomLoader } from "./room.loader";
import useGetWebsocketsStore from "@/hooks/use-get-websockets-store";
import useHandleRouteParams from "@/hooks/use-handle-route-params";
import {
  FONTS,
  NODES,
  ACTIONS,
  CUSTOM_PLUGINS,
} from "@/components/utils/constants";

const statusMap = {
  ["idle"]: "Idle",
  ["starting"]: "Starting...",
  ["loadingFonts"]: "Fetching custom fonts...",
  ["running"]: "Running",
};

export const Room = () => {
  const router = useRouter();

  const status = useWeave((state) => state.status);

  const room = useCollaborationRoom((state) => state.room);
  const user = useCollaborationRoom((state) => state.user);

  const { loadedParams } = useHandleRouteParams();

  const getUser = React.useCallback(() => {
    return user as WeaveUser;
  }, [user]);

  const loadingDescription = React.useMemo(() => {
    if (!loadedParams) {
      return "Fetching room parameters...";
    }
    if (status !== WEAVE_INSTANCE_STATUS.RUNNING) {
      return statusMap[status];
    }
    if (status === WEAVE_INSTANCE_STATUS.RUNNING) {
      return "Fetching room content...";
    }

    return "";
  }, [loadedParams, status]);

  const websocketsStore = useGetWebsocketsStore({
    loadedParams,
    getUser,
  });

  if ((!room || !user) && loadedParams) {
    router.push("/error?errorCode=room-required-parameters");
    return null;
  }

  return (
    <>
      {(!loadedParams || status !== WEAVE_INSTANCE_STATUS.RUNNING) && (
        <RoomLoader
          roomId={room ? room : "-"}
          content="LOADING ROOM"
          description={loadingDescription}
        />
      )}
      {loadedParams && room && websocketsStore && (
        <WeaveProvider
          containerId="weave"
          getUser={getUser}
          store={websocketsStore}
          fonts={FONTS}
          nodes={NODES}
          actions={ACTIONS}
          customPlugins={CUSTOM_PLUGINS}
        >
          <RoomLayout />
        </WeaveProvider>
      )}
    </>
  );
};
