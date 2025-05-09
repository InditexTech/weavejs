// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import Image from "next/image";
import Konva from "konva";
import { toImageAsync } from "./utils";

type FrameImageProps = {
  node: Konva.Group;
};

export const FramePresentationImage = ({ node }: Readonly<FrameImageProps>) => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [image, setImage] = React.useState<React.ReactElement | null>(null);

  React.useEffect(() => {
    async function loadPresentationImage() {
      const nodeAttrs = node.getAttrs();
      try {
        // const box = frameInternal.getClientRect({ relativeTo: stage });
        const frameBg = node.findOne(`#${nodeAttrs.id}-bg`) as Konva.Group;
        if (!frameBg) {
          return;
        }
        const boxBg = frameBg.getClientRect();
        setLoading(true);
        const img = await toImageAsync(node, {
          pixelRatio: 6,
          x: boxBg.x + 2,
          y: boxBg.y + 2,
          width: boxBg.width - 4,
          height: boxBg.height - 4,
        });
        setLoading(false);
        setImage(
          <Image
            src={img.src}
            width={500}
            height={600}
            alt="A frame image"
            className="object-contain w-full h-full"
          />
        );
      } catch (ex) {
        console.error(ex);
      }
    }
    loadPresentationImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="font-questrial text-2xl text-white">Loading...</div>
      </div>
    );
  }

  return image;
};
