import { useCollaborationRoom } from '@/store/store';
import { WeaveUser } from '@inditextech/weave-types';
import { WeaveStoreAzureWebPubsub } from '@inditextech/weave-store-azure-web-pubsub/client';
import React from 'react';

function useGetAzureWebPubsubProvider({
  loadedParams,
  getUser,
}: {
  loadedParams: boolean;
  getUser: () => WeaveUser;
}) {
  const room = useCollaborationRoom((state) => state.room);
  const user = useCollaborationRoom((state) => state.user);

  const wsProvider = React.useMemo(() => {
    if (loadedParams && room && user) {
      const store = new WeaveStoreAzureWebPubsub(
        {
          getUser,
          undoManagerOptions: {
            captureTimeout: 500,
          },
        },
        {
          roomId: room,
          url: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/${process.env.NEXT_PUBLIC_API_ENDPOINT_HUB_NAME}/rooms/${room}/connect`,
        }
      );

      return store;
    }

    return null;
  }, [getUser, loadedParams, room, user]);

  return wsProvider;
}

export default useGetAzureWebPubsubProvider;
