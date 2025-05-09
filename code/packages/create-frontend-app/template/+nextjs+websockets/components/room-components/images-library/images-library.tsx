// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { ImagePlus, Trash, X } from "lucide-react";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { getImages } from "@/api/get-images";
import { postImage } from "@/api/post-image";
import { delImage } from "@/api/del-image";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";

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
      return await postImage(room ?? "", file);
    },
  });

  const mutationDelete = useMutation({
    mutationFn: async (imageId: string) => {
      return await delImage(room ?? "", imageId);
    },
  });

  const query = useInfiniteQuery({
    queryKey: ["getImages", room],
    queryFn: async ({ pageParam }) => {
      if (!room) {
        return [];
      }
      return await getImages(room ?? "", 20, pageParam);
    },
    initialPageParam: "",
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
    <div className="pointer-events-auto w-full h-full">
      <div className="w-full font-title-xs p-1 flex justify-between items-center">
        <div className="flex justify-between font-questrial font-light items-center text-md pl-2">
          Images
        </div>
        <div className="flex justify-end items-center gap-1">
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
          <button
            className="cursor-pointer bg-transparent hover:bg-accent p-2"
            onClick={() => {
              if (inputFileRef.current) {
                inputFileRef.current.click();
                // instance.triggerAction("imageTool");
              }
            }}
          >
            <ImagePlus size={16} />
          </button>
          <div className="w-[1px] h-[16px] bg-zinc-200" />
          <button
            className="cursor-pointer bg-transparent hover:bg-accent p-2"
            onClick={() => {
              setSidebarActive(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full h-[calc(100%-50px)] border-t border-zinc-200">
        <div
          className="grid grid-cols-2 gap-2 w-full weaveDraggable p-4"
          onDragStart={(e) => {
            if (e.target instanceof HTMLImageElement) {
              window.weaveDragImageURL = e.target.src;
            }
          }}
        >
          {linearData.length === 0 && (
            <div className="col-span-2 w-full flex flex-col justify-center items-center text-sm py-5 text-center">
              <b>No images uploaded</b>
              <span className="text-xs">Add an image to the whiteboard</span>
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
    </div>
  );
};
