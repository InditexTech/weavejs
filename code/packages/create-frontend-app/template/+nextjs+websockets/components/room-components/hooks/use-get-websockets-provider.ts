import { useCollaborationRoom } from '@/store/store';
import { useWeave } from '@inditextech/weave-react';
import { WeaveUser } from '@inditextech/weave-types';
import {
  WeaveStoreWebsockets,
  WeaveStoreWebsocketsConnectionStatus,
} from '@inditextech/weave-store-websockets/client';
import React from 'react';

function useGetWebsocketsProvider({
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
    (status: WeaveStoreWebsocketsConnectionStatus) => {
      setConnectionStatus(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const store = React.useMemo(() => {
    if (loadedParams && room && user) {
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
            serverUrl: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/sync/rooms`,
          },
          callbacks: {
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

  return store;
}

export default useGetWebsocketsProvider;
