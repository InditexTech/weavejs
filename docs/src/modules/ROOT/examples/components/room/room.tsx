"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { WeaveUser, WEAVE_INSTANCE_STATUS } from "@inditextech/weavejs-types";
import { useCollaborationRoom } from "@/store/store";
import { useWeave, WeaveProvider } from "@inditextech/weavejs-react";
import { RoomLayout } from "./room.layout";
import { RoomLoader } from "./room-loader";
import useGetWeaveJSProps from "@/hooks/use-get-weave-js-props";
import useGetWsProvider from "@/hooks/use-get-ws-provider";
import useHandleRouteParams from "@/hooks/use-handle-route-params";

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

  const { fonts, nodes, customPlugins, actions } = useGetWeaveJSProps();

  const wsStoreProvider = useGetWsProvider({
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
      {loadedParams && room && wsStoreProvider && (
        <WeaveProvider
          containerId="weave"
          getUser={getUser}
          store={wsStoreProvider}
          fonts={fonts}
          nodes={nodes}
          actions={actions}
          customPlugins={customPlugins}
        >
          <RoomLayout />
        </WeaveProvider>
      )}
    </>
  );
};
