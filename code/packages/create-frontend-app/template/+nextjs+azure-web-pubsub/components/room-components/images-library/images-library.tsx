'use client';

import React from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash, X } from 'lucide-react';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { getImages } from '@/api/get-images';
import { postImage } from '@/api/post-image';
import { delImage } from '@/api/del-image';
import { SIDEBAR_ELEMENTS } from '@/lib/constants';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarSelector } from '../sidebar-selector';

export const ImagesLibrary = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputFileRef = React.useRef<any>(null);

  const instance = useWeave((state) => state.instance);

  const room = useCollaborationRoom((state) => state.room);
  const sidebarLeftActive = useCollaborationRoom(
    (state) => state.sidebar.left.active
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );

  const mutationUpload = useMutation({
    mutationFn: async (file: File) => {
      return await postImage(room ?? '', file);
    },
  });

  const mutationDelete = useMutation({
    mutationFn: async (imageId: string) => {
      return await delImage(room ?? '', imageId);
    },
  });

  const query = useInfiniteQuery({
    queryKey: ['getImages', room],
    queryFn: async ({ pageParam }) => {
      if (!room) {
        return [];
      }
      return await getImages(room ?? '', 20, pageParam);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.continuationToken,
  });

  const linearData = React.useMemo(() => {
    return query.data?.pages.flatMap((page) => page.images) ?? [];
  }, [query.data]);

  if (!instance) {
    return null;
  }

  if (sidebarLeftActive !== SIDEBAR_ELEMENTS.images) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <div className="w-full px-[24px] py-[27px] bg-white flex justify-between items-center border-b border-[#c9c9c9]">
        <div className="flex justify-between font-inter font-light items-center text-[24px] uppercase">
          <SidebarSelector title="Images" />
        </div>
        <div className="flex justify-end items-center gap-4">
          <input
            type="file"
            accept="image/png,image/gif,image/jpeg"
            name="image"
            ref={inputFileRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                mutationUpload.mutate(file, {
                  onSuccess: () => {
                    query.refetch();
                  },
                });
              }
            }}
          />
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="cursor-pointer flex justify-center items-center w-[20px] h-[40px] text-center bg-transparent hover:text-[#c9c9c9]"
                  onClick={() => {
                    if (inputFileRef.current) {
                      inputFileRef.current.click();
                      // instance.triggerAction("imageTool");
                    }
                  }}
                >
                  <Plus size={20} strokeWidth={1} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                className="rounded-none"
              >
                Add an image to the library
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            className="cursor-pointer flex justify-center items-center w-[20px] h-[40px] text-center bg-transparent hover:text-[#c9c9c9]"
            onClick={() => {
              setSidebarActive(null);
            }}
          >
            <X size={20} strokeWidth={1} />
          </button>
        </div>
      </div>
      <ScrollArea className="w-full h-[calc(100%-95px)] overflow-auto">
        <div className="flex flex-col gap-2 w-full">
          <div
            className="grid grid-cols-2 gap-2 w-full weaveDraggable p-[24px]"
            onDragStart={(e) => {
              if (e.target instanceof HTMLImageElement) {
                window.weaveDragImageURL = e.target.src;
              }
            }}
          >
            {linearData.length === 0 && (
              <div className="col-span-2 w-full mt-[24px] flex flex-col justify-center items-center text-sm text-center font-inter font-light">
                <b className="font-normal text-[18px]">No images uploaded</b>
                <span className="text-[14px]">
                  Upload an image to the library
                </span>
              </div>
            )}
            {linearData.length > 0 &&
              linearData.map((image) => {
                const imageUrl = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/${process.env.NEXT_PUBLIC_API_ENDPOINT_HUB_NAME}/rooms/${room}/images/${image}`;

                return (
                  <div
                    key={image}
                    className="group w-full h-[100px] bg-light-background-1 object-cover cursor-pointer border border-zinc-200 relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="w-full h-full object-cover"
                      draggable="true"
                      src={imageUrl}
                      alt="An image"
                    />
                    <button
                      className="absolute bottom-[8px] right-[8px] bg-white p-2 border border-zinc-200 rounded hidden group-hover:block cursor-pointer"
                      onClick={() => {
                        mutationDelete.mutate(image, {
                          onSuccess: () => {
                            query.refetch();
                          },
                        });
                      }}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
