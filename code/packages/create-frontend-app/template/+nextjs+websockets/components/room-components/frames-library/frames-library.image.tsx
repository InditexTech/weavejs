import React from 'react';
import Image from 'next/image';
import Konva from 'konva';
import { toImageAsync } from './utils';

type FrameImageProps = {
  node: Konva.Group;
};

export const FrameImage = ({ node }: Readonly<FrameImageProps>) => {
  const [image, setImage] = React.useState<React.ReactElement | null>(null);

  React.useEffect(() => {
    setInterval(async () => {
      const nodeAttrs = node.getAttrs();
      try {
        // const box = frameInternal.getClientRect({ relativeTo: stage });
        const frameBg = node.findOne(`#${nodeAttrs.id}-bg`) as Konva.Group;
        if (!frameBg) {
          return;
        }
        const boxBg = frameBg.getClientRect();
        const img = await toImageAsync(node, {
          x: boxBg.x + 1,
          y: boxBg.y + 1,
          width: boxBg.width - 2,
          height: boxBg.height - 2,
        });
        setImage(
          <Image
            src={img.src}
            width={284}
            height={201}
            alt="A frame image"
            className="object-fit w-full h-full"
          />
        );
      } catch (ex) {
        console.error(ex);
      }
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full aspect-video border border-zinc-200">{image}</div>
  );
};
