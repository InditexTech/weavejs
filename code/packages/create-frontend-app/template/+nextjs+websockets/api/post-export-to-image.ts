// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveExportNodesOptions } from "@inditextech/weave-types";

export const postExportToImage = async (
  roomData: string,
  nodes: string[],
  options: WeaveExportNodesOptions,
  responseType: "base64" | "blob" | "zip" = "zip",
) => {
  const endpoint = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/export`;

  const exportPayload = {
    roomData,
    nodes,
    options: {
      format: options.format,
      pixelRatio: options.pixelRatio,
      padding: options.padding,
      backgroundColor: options.backgroundColor,
      ...(options.format === "image/jpeg" && { quality: options.quality }),
    },
    responseType,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(exportPayload),
  });

  if (!response.ok) {
    throw new Error("Failed to export room to image");
  }

  if (responseType === "zip") {
    const blob = await response.blob();

    return blob;
  }

  if (responseType === "blob") {
    const blob = await response.blob();

    return blob;
  }

  if (responseType === "base64") {
    const data = await response.json();
    return data;
  }
};
