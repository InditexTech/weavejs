// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/** Whether a setting is applied while capturing a stroke or while drawing it. */
export type WeaveBrushTunableKind = 'capture' | 'draw';

/** Pipeline stage a setting belongs to. */
export type WeaveBrushTunableStage =
  | 'capture'
  | 'pressure'
  | 'stabilizer'
  | 'finalize'
  | 'touch'
  | 'outline'
  | 'curve'
  | 'width'
  | 'ends'
  | 'detail';

/**
 * Plain-data description of one tunable setting, enough for any user interface
 * to build a control and validate a value without knowing the setting.
 */
export type WeaveBrushTunable = {
  /** Unique key: the dotted path of the setting inside its scope. */
  key: string;
  /** `profile` settings live in an input profile, `look` ones in a look. */
  scope: 'profile' | 'look';
  /** Path of the setting inside the profile or look object. */
  path: string[];
  stage: WeaveBrushTunableStage;
  /** Heading a control is shown under. */
  group: string;
  kind: WeaveBrushTunableKind;
  type: 'number' | 'boolean' | 'enum';
  /** Value of the legacy preset. `null` means "use the tool-level value". */
  default: number | boolean | string | null;
  /** Numeric range. */
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** Allowed values of an `enum`. */
  options?: string[];
  /** A `null` value is allowed. */
  nullable?: boolean;
  unit?: 'px' | 'ms' | 'Hz' | 'fraction' | 'canvas units' | 'count';
  help: string;
  /** Shown only in an "advanced" section. */
  advanced?: boolean;
};
