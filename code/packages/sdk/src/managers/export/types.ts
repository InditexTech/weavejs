// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

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
