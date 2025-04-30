// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* v8 ignore start */
import { assertType, test } from 'vitest';
import {
  WEAVE_INSTANCE_STATUS,
  WEAVE_NODE_POSITION,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FORMATS,
  WEAVE_EXPORT_FILE_FORMAT,
  STATE_ACTIONS,
  type WeaveStatus,
  type WeavePosition,
  type WeaveExportFormat,
  type WeaveExportFileFormat,
  type StateAction,
} from './index';

test('WEAVE_INSTANCE_STATUS', () => {
  assertType<WeaveStatus>(WEAVE_INSTANCE_STATUS.IDLE);
  assertType<WeaveStatus>(WEAVE_INSTANCE_STATUS.LOADING_FONTS);
  assertType<WeaveStatus>(WEAVE_INSTANCE_STATUS.RUNNING);
  assertType<WeaveStatus>(WEAVE_INSTANCE_STATUS.STARTING);

  // @ts-expect-error wrong types
  assertType<WeaveStatus>('invalid');
});

test('WEAVE_NODE_POSITION', () => {
  assertType<WeavePosition>(WEAVE_NODE_POSITION.UP);
  assertType<WeavePosition>(WEAVE_NODE_POSITION.DOWN);
  assertType<WeavePosition>(WEAVE_NODE_POSITION.FRONT);
  assertType<WeavePosition>(WEAVE_NODE_POSITION.BACK);

  // @ts-expect-error wrong types
  assertType<WeavePosition>('invalid');
});

test('WEAVE_EXPORT_BACKGROUND_COLOR', () => {
  assertType<string>(WEAVE_EXPORT_BACKGROUND_COLOR);

  // @ts-expect-error wrong types
  assertType<string>(2);
});

test('WEAVE_EXPORT_FORMATS', () => {
  assertType<WeaveExportFormat>(WEAVE_EXPORT_FORMATS.JPEG);
  assertType<WeaveExportFormat>(WEAVE_EXPORT_FORMATS.PNG);

  // @ts-expect-error wrong types
  assertType<WeaveExportFormat>('image/svg');
});

test('WEAVE_EXPORT_FILE_FORMAT', () => {
  assertType<WeaveExportFileFormat>(WEAVE_EXPORT_FILE_FORMAT['image/jpeg']);
  assertType<WeaveExportFileFormat>(WEAVE_EXPORT_FILE_FORMAT['image/png']);

  // @ts-expect-error wrong types
  assertType<WeaveExportFileFormat>('image/svg');
});

test('STATE_ACTIONS', () => {
  assertType<StateAction>(STATE_ACTIONS.CREATE);
  assertType<StateAction>(STATE_ACTIONS.UPDATE);
  assertType<StateAction>(STATE_ACTIONS.DELETE);

  // @ts-expect-error wrong types
  assertType<StateAction>('invalid');
});
/* v8 ignore stop */
