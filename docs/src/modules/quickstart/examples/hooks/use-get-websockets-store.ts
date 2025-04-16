import { useCollaborationRoom } from "@/store/store";
import { useWeave } from "@inditextech/weavejs-react";
import { WeaveUser } from "@inditextech/weavejs-types";
import {
  WeaveStoreWebsockets,
  WeaveStoreWebsocketsConnectionStatus,
} from "@inditextech/weavejs-store-websockets/client";
import React from "react";

function useGetWebsocketsStore({
  loadedParams,
  getUser,
}: {
  loadedParams: boolean;
  getUser: () => WeaveUser;
}) {
  const room = useCollaborationRoom((state) => state.room);
  const setConnectionStatus = useWeave((state) => state.setConnectionStatus);

  const onConnectionStatusChangeHandler = React.useCallback(
    (status: WeaveStoreWebsocketsConnectionStatus) => {
      setConnectionStatus(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const websocketStore = React.useMemo(() => {
    if (loadedParams && room) {
      return new WeaveStoreWebsockets(
        {
          getUser,
          undoManagerOptions: {
            captureTimeout: 500,
          },
        },
        {
          roomId: room,
          wsOptions: {
            serverUrl: `http://localhost:3000/sync/rooms`,
          },
          callbacks: {
            onConnectionStatusChange: onConnectionStatusChangeHandler,
          },
        }
      );
    }

    return null;
  }, [getUser, loadedParams, onConnectionStatusChangeHandler, room]);

  return websocketStore;
}

export default useGetWebsocketsStore;
