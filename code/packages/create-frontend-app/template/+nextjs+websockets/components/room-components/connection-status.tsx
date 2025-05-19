'use client';

import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS } from '@inditextech/weave-store-websockets/client';
import { cn } from '@/lib/utils';

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
          'bg-light-background-1 h-[20px] px-1 flex justify-center items-center',
          {
            ['bg-[#C2F0E8] text-black']:
              weaveConnectionStatus ===
              WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.CONNECTED,
            ['bg-[#FDB4BB] text-white']:
              weaveConnectionStatus ===
              WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.DISCONNECTED,
          }
        )}
      >
        {weaveConnectionStatus ===
          WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.CONNECTED && (
          <>
            <Cloud size={18} strokeWidth={1} />
            <span className="ml-1 font-inter text-xs uppercase">connected</span>
          </>
        )}
        {weaveConnectionStatus ===
          WEAVE_STORE_WEBSOCKETS_CONNECTION_STATUS.DISCONNECTED && (
          <>
            <CloudOff size={18} strokeWidth={1} />
            <span className="ml-1 font-inter text-xs uppercase">
              disconnected
            </span>
          </>
        )}
      </div>
    </div>
  );
};
