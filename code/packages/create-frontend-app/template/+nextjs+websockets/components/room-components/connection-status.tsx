// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
import {
  Cloud,
  //CloudCog,
  CloudAlert,
} from "lucide-react";
import { WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from "@inditextech/weave-store-azure-web-pubsub/client";
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
              WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTED,
            // ["bg-sky-300 text-white"]:
            //   weaveConnectionStatus ===
            //   WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING,
            ["bg-rose-300 text-white"]:
              weaveConnectionStatus ===
              WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED,
          }
        )}
      >
        {weaveConnectionStatus ===
          WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTED && (
          <>
            <span className="mr-2 text-xs">connected</span>
            <Cloud size={20} />
          </>
        )}
        {/* {weaveConnectionStatus ===
          WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTING && (
          <CloudCog size={20} />
        )} */}
        {weaveConnectionStatus ===
          WEAVE_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED && (
          <>
            <span className="mr-2 text-xs">disconnected</span>
            <CloudAlert size={20} />
          </>
        )}
      </div>
    </div>
  );
};
