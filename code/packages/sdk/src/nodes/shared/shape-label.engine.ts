// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Weave } from '@/weave';
import { WeaveShapeLabelEditor } from './shape-label-editor';
import { WeaveShapeLabelNativeEditor } from './shape-label-native-editor';
import type {
  WeaveShapeLabelConfig,
  WeaveShapeLabelEngine,
} from './shape-label.types';

export const WEAVE_SHAPE_LABEL_DEFAULT_CONFIG: WeaveShapeLabelConfig = {
  engine: 'legacy',
};

/** Resolves the label engine; anything but `native` falls back to `legacy`. */
export function createShapeLabelEngine(
  instance: Weave,
  config?: Partial<WeaveShapeLabelConfig>
): WeaveShapeLabelEngine {
  return config?.engine === 'native'
    ? new WeaveShapeLabelNativeEditor(instance)
    : new WeaveShapeLabelEditor(instance);
}
