// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { postExportToImage } from "@/api/post-export-to-image";
import {
  WeaveExportFormats,
  WeaveExportNodesOptions,
} from "@inditextech/weave-types";
import { useWeave } from "@inditextech/weave-react";

export const useExportToImageServerSide = () => {
  const instance = useWeave((state) => state.instance);

  const [exporting, setExporting] = React.useState<boolean>(false);

  const mutateExport = useMutation({
    mutationFn: async ({
      roomData,
      nodes,
      options,
    }: {
      roomData: string;
      nodes: string[];
      options: WeaveExportNodesOptions;
    }) => {
      return await postExportToImage(roomData, nodes, options);
    },
    onMutate: ({ nodes }) => {
      const toastId = toast.loading(
        nodes.length === 0
          ? "Exporting room to image..."
          : "Exporting selected nodes to image...",
      );
      return { toastId };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSettled: (_, __, ___, context: any) => {
      setExporting(false);
      if (context?.toastId) {
        toast.dismiss(context.toastId);
      }
    },
    onSuccess: (blob, { nodes }) => {
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "export.zip"; // <-- suggested filename
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        nodes.length === 0
          ? "Exported room image downloaded."
          : "Exported selected nodes image downloaded.",
      );
    },
    onError(error, { nodes }) {
      console.error(error);
      toast.error(
        nodes.length === 0
          ? "Error exporting room to image."
          : "Error exporting selected nodes to image.",
      );
    },
  });

  const handlePrintStateSnapshotToClipboard = React.useCallback(async () => {
    if (instance) {
      const snapshot: Uint8Array<ArrayBufferLike> = instance
        .getStore()
        .getStateSnapshot();
      await navigator.clipboard.writeText(
        Buffer.from(snapshot).toString("base64"),
      );
      console.log("State snapshot copied to clipboard");
    }
  }, [instance]);

  const handleExportToImageServerSide = React.useCallback(
    async ({
      nodes,
      format,
      padding,
      backgroundColor,
      pixelRatio,
      quality,
    }: {
      nodes: string[];
      format: WeaveExportFormats;
      padding: number;
      backgroundColor: string;
      pixelRatio: number;
      quality?: number;
    }) => {
      if (!instance) return;

      setExporting(true);

      const snapshot: Uint8Array<ArrayBufferLike> = instance
        .getStore()
        .getStateSnapshot();

      mutateExport.mutate({
        roomData: Buffer.from(snapshot).toString("base64"),
        nodes,
        options: {
          format,
          pixelRatio,
          padding,
          backgroundColor,
          ...(format === "image/jpeg" && { quality }),
        },
      });
    },
    [instance, mutateExport],
  );

  const isExporting = React.useCallback(() => exporting, [exporting]);

  return {
    handlePrintStateSnapshotToClipboard,
    handleExportToImageServerSide,
    isExporting,
  };
};
