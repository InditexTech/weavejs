// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveShapeLabelProps } from './shape-label.types';

export const WEAVE_STAGE_SHAPE_LABEL_EDITION_MODE = 'shape-label-edition';

export const WEAVE_SHAPE_LABEL_DEFAULTS: Required<WeaveShapeLabelProps> = {
  labelText: '',
  labelFontFamily: 'Arial, sans-serif',
  labelFontSize: 14,
  labelFontStyle: 'normal',
  labelFontVariant: 'normal',
  labelTextDecoration: '',
  labelFill: '#000000',
  labelAlign: 'center',
  labelVerticalAlign: 'middle',
  labelLetterSpacing: 0,
  labelLineHeight: 1,
  labelPaddingX: 8,
  labelPaddingY: 8,
};

export const labelId = (id: string): string => `${id}-label`;
