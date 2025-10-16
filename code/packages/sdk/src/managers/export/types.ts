import type { Weave } from '@/weave';

export type CanvasFontDefinition = {
  path: string;
  properties: {
    family: string;
    weight?: string;
    style?: string;
  };
};

export type CanvasFonts = CanvasFontDefinition[];

export type RenderWeaveRoom = {
  instance: Weave;
  destroy: () => void;
};
