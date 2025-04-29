"use client";

import React from "react";
import { Cloud, CloudCog, CloudAlert } from "lucide-react";
import { WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS } from "@inditextech/weave-store-websockets/client";
import { cn } from "@/lib/utils";

type ConnectionStatusProps = {
  weaveConnectionStatus: string;
};

export const ConnectionStatus = ({
  weaveConnectionStatus,
}: Readonly<ConnectionStatusProps>) => {
  return (
    <div className="flex">
      <div
        className={cn(
          "bg-light-background-1 p-2 flex justify-center items-center rounded-full",
          {
            ["bg-emerald-200 text-black"]:
              weaveConnectionStatus ===
              WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.CONNECTED,
            ["bg-sky-300 text-white"]:
              weaveConnectionStatus ===
              WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.CONNECTING,
            ["bg-rose-300 text-white"]:
              weaveConnectionStatus ===
              WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.DISCONNECTED,
          }
        )}
      >
        {weaveConnectionStatus ===
          WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.CONNECTED && (
          <Cloud size={20} />
        )}
        {weaveConnectionStatus ===
          WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.CONNECTING && (
          <CloudCog size={20} />
        )}
        {weaveConnectionStatus ===
          WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.DISCONNECTED && (
          <CloudAlert size={20} />
        )}
      </div>
    </div>
  );
};
