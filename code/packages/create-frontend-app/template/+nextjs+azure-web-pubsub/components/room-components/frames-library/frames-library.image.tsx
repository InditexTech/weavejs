import _ from "lodash";
import React from "react";
import Image from "next/image";
import Konva from "konva";
import { toImageAsync } from "./utils";
import { useWeave } from "@inditextech/weave-react";

type FrameImageProps = {
  node: Konva.Group;
};

export const FrameImage = ({ node }: Readonly<FrameImageProps>) => {
  const [image, setImage] = React.useState<React.ReactElement | null>(null);

  const instance = useWeave((state) => state.instance);

  React.useEffect(() => {
    const loadImage = async () => {
      if (!instance) return;

      const stage = instance.getStage();
      const nodeAttrs = node.getAttrs();
      try {
        // const box = frameInternal.getClientRect({ relativeTo: stage });
        const frameBg = stage.findOne(`#${nodeAttrs.id}-bg`) as Konva.Group;
        if (!frameBg) {
          return;
        }
        const boxBg = frameBg.getClientRect();
        const img = await toImageAsync(node, {
          x: boxBg.x + 4,
          y: boxBg.y + 4,
          pixelRatio: 2,
          width: boxBg.width - 8,
          height: boxBg.height - 8,
        });
        setImage(
          <Image
            src={img.src}
            width={1920}
            height={1080}
            alt="A frame image"
            className="w-auto h-full"
          />,
        );
      } catch (ex) {
        console.error(ex);
      }
    };

    loadImage();
    const debouncedLoadImage = _.debounce(loadImage, 250);

    const eventHandler = () => {
      debouncedLoadImage();
    };

    instance?.addEventListener("onStateChange", eventHandler);

    return () => {
      instance?.removeEventListener("onStateChange", eventHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance]);

  return (
    <div className="w-full aspect-video border border-[#c9c9c9]">{image}</div>
  );
};
