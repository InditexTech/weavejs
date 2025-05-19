import { useCollaborationRoom } from '@/store/store';
import { useWeave } from '@inditextech/weave-react';
import { WeaveUser } from '@inditextech/weave-types';
import {
  WeaveStoreAzureWebPubsub,
  WeaveStoreAzureWebPubsubConnectionStatus,
} from '@inditextech/weave-store-azure-web-pubsub/client';
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

  const setFetchConnectionUrlLoading = useCollaborationRoom(
    (state) => state.setFetchConnectionUrlLoading
  );

  const setFetchConnectionUrlError = useCollaborationRoom(
    (state) => state.setFetchConnectionUrlError
  );

  const setConnectionStatus = useWeave((state) => state.setConnectionStatus);

  const onFetchConnectionUrlHandler = React.useCallback(
    ({ loading, error }: { loading: boolean; error: Error | null }) => {
      setFetchConnectionUrlLoading(loading);
      setFetchConnectionUrlError(error);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onConnectionStatusChangeHandler = React.useCallback(
    (status: WeaveStoreAzureWebPubsubConnectionStatus) => {
      setConnectionStatus(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const wsProvider = React.useMemo(() => {
    if (loadedParams && room && user) {
      return new WeaveStoreAzureWebPubsub(
        {
          getUser,
          undoManagerOptions: {
            captureTimeout: 500,
          },
        },
        {
          roomId: room,
          url: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${room}/connect`,
          callbacks: {
            onFetchConnectionUrl: onFetchConnectionUrlHandler,
            onConnectionStatusChange: onConnectionStatusChangeHandler,
          },
        }
      );
    }

    return null;
  }, [
    getUser,
    loadedParams,
    onConnectionStatusChangeHandler,
    onFetchConnectionUrlHandler,
    room,
    user,
  ]);

  return wsProvider;
}

export default useGetAzureWebPubsubProvider;
