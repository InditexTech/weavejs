import React from "react";
import Image from "next/image";
import { PresentationImage } from "./utils";

type FramePresentationImageProps = {
  presentationImage: PresentationImage;
};

export const FramePresentationImage = ({
  presentationImage,
}: Readonly<FramePresentationImageProps>) => {
  return (
    <Image
      src={presentationImage.img.src}
      width={1920}
      height={1080}
      alt="A frame image"
      className="object-contain w-auto h-full"
    />
  );
};
