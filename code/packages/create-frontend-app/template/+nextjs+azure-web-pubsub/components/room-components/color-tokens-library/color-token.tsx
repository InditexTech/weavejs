'use client';

import React from 'react';
import { colorIsLight } from '@/lib/utils';

type ColorTokenProps = {
  color: string;
};

export const ColorToken = ({ color }: Readonly<ColorTokenProps>) => {
  let forefrontColor = '#ffffff';
  if (colorIsLight(color)) {
    forefrontColor = '#000000';
  }

  return (
    <div
      className="cursor-pointer w-full h-full p-3"
      draggable="true"
      data-colortoken={color}
      style={{ background: color }}
    >
      <div
        style={{ color: forefrontColor }}
        className="font-noto-sans-mono font-bold text-base"
      >
        {color}
      </div>
    </div>
  );
};
