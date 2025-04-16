import { useCollaborationRoom } from "@/store/store";
import { useParams, useSearchParams } from "next/navigation";
import React from "react";

function useHandleRouteParams() {
  const [loadedParams, setLoadedParams] = React.useState(false);
  const setRoom = useCollaborationRoom((state) => state.setRoom);
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const setUser = useCollaborationRoom((state) => state.setUser);

  React.useEffect(() => {
    const roomId = params.roomId;
    const userName = searchParams.get("userName");
    if (roomId && userName) {
      setRoom(roomId);
      setUser({
        name: userName,
        email: `${userName}@weave.js`,
      });
    }
    setLoadedParams(true);
  }, [params.roomId, searchParams, setRoom, setUser]);

  return {
    loadedParams,
  }
}

export default useHandleRouteParams;