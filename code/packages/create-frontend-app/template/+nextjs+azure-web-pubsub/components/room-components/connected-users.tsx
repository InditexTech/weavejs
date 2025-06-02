'use client';

import React from 'react';
import { Avatar as AvatarUI, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCollaborationRoom } from '@/store/store';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWeave } from '@inditextech/weave-react';
import { cn } from '@/lib/utils';
import { getUserShort, stringToColor } from '../utils/users';

export const ConnectedUsers = () => {
  const connectedUsers = useWeave((state) => state.users);

  const user = useCollaborationRoom((state) => state.user);

  const [menuOpen, setMenuOpen] = React.useState(false);

  const connectedUserKey = React.useMemo(() => {
    const filterOwnUser = Object.keys(connectedUsers).filter(
      (actUser) => actUser === user?.name
    );
    return filterOwnUser?.[0];
  }, [user, connectedUsers]);

  const { showUsers, restUsers } = React.useMemo(() => {
    const filterOwnUser = Object.keys(connectedUsers).filter(
      (actUser) => actUser !== user?.name
    );
    return {
      showUsers: filterOwnUser.slice(0, 4),
      restUsers: filterOwnUser.slice(4),
    };
  }, [user, connectedUsers]);

  if (Object.keys(connectedUsers).length === 0) {
    return null;
  }

  return (
    <div className="w-full min-h-[40px] flex gap-1 justify-between items-center">
      <TooltipProvider delayDuration={300}>
        <div className="flex justify-start items-center gap-1">
          <div className="w-full flex justify-start gap-2 items-center text-center font-inter font-light text-xs px-2 pl-0">
            <div>{Object.keys(connectedUsers).length}</div>
            <div className="text-left">USERS</div>
          </div>
        </div>
        <div className="w-full flex gap-1 justify-start items-center">
          {connectedUserKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="cursor-pointer rounded-none">
                  <AvatarUI className="w-[32px] h-[32px] bg-muted font-light text-[13] leading-[18px]">
                    <AvatarFallback className="bg-transparent uppercase">
                      {getUserShort(user?.name ?? '')}
                    </AvatarFallback>
                  </AvatarUI>
                </button>
              </TooltipTrigger>
              <TooltipContent
                sideOffset={8}
                side="bottom"
                className="rounded-none flex gap-2 justify-start items-center"
              >
                <div
                  className="w-[16px] h-[16px]"
                  style={{ background: stringToColor(user?.name ?? '') }}
                ></div>
                <p className="font-inter text-xs">{user?.name}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {showUsers.map((user) => {
            const userInfo = connectedUsers[user];
            return (
              <Tooltip key={user}>
                <TooltipTrigger asChild>
                  <button className="cursor-pointer">
                    <AvatarUI className="w-[32px] h-[32px] bg-muted font-light text-[13] leading-[18px]">
                      <AvatarFallback className="bg-transparent uppercase">
                        {getUserShort(userInfo?.name ?? '')}
                      </AvatarFallback>
                    </AvatarUI>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  sideOffset={8}
                  side="bottom"
                  className="rounded-none flex gap-2 justify-start items-center"
                >
                  <div
                    className="w-[16px] h-[16px]"
                    style={{ background: stringToColor(userInfo?.name ?? '') }}
                  ></div>
                  <p className="font-inter text-xs">{userInfo.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {restUsers.length > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu
                    onOpenChange={(open: boolean) => setMenuOpen(open)}
                  >
                    <DropdownMenuTrigger
                      className={cn(
                        'rounded-full cursor-pointer p-1 !bg-muted hover:bg-accent focus:outline-none',
                        {
                          ['bg-accent']: menuOpen,
                          ['bg-white']: !menuOpen,
                        }
                      )}
                    >
                      <ChevronDown
                        size={24}
                        strokeWidth={1}
                        className="rounded-none"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      side="bottom"
                      alignOffset={0}
                      sideOffset={4}
                      className="font-inter rounded-none"
                    >
                      {restUsers.map((user) => {
                        const userInfo = connectedUsers[user];
                        return (
                          <DropdownMenuItem
                            key={user}
                            className="text-foreground focus:bg-white hover:rounded-none"
                          >
                            <div
                              className="w-[16px] h-[16px]"
                              style={{
                                background: stringToColor(userInfo?.name ?? ''),
                              }}
                            ></div>
                            <AvatarUI className="w-[32px] h-[32px] bg-muted font-light text-[13] leading-[18px]">
                              <AvatarFallback className="bg-transparent uppercase">
                                {getUserShort(userInfo?.name ?? '')}
                              </AvatarFallback>
                            </AvatarUI>
                            {userInfo?.name}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-inter text-sm">More users</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};
