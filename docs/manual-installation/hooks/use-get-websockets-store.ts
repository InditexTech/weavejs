import { useCollaborationRoom } from "@/store/store";
import { WeaveUser } from "@inditextech/weave-types";
import { WeaveStoreWebsockets } from "@inditextech/weave-store-websockets/client";
import React from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getRoom } from "@/api/get-room";

function useGetWebsocketsStore({
  loadedParams,
  getUser,
}: {
  loadedParams: boolean;
  getUser: () => WeaveUser;
}) {
  const [storeProvider, setStoreProvider] =
    React.useState<WeaveStoreWebsockets | null>(null);
  const room = useCollaborationRoom((state) => state.room);
  const user = useCollaborationRoom((state) => state.user);

  const { data: roomData, isFetched } = useQuery({
    queryKey: ["roomData", room ?? ""],
    queryFn: () => {
      return getRoom(room ?? "");
    },
    initialData: undefined,
    staleTime: 0,
    retry: false,
    enabled: typeof room !== "undefined" && typeof user !== "undefined",
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (loadedParams && isFetched && room && user && !storeProvider) {
      const store = new WeaveStoreWebsockets(
        roomData,
        {
          getUser,
          undoManagerOptions: {
            captureTimeout: 500,
          },
        },
        {
          roomId: room,
          wsOptions: {
            serverUrl: `/rooms/${room}/connect`,
          },
        }
      );

      setStoreProvider(store);
    }
  }, [
    getUser,
    isFetched,
    storeProvider,
    roomData,
    queryClient,
    loadedParams,
    room,
    user,
  ]);

  return storeProvider;
}

export default useGetWebsocketsStore;
