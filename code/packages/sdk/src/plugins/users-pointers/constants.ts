// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_USERS_POINTERS_KEY = 'usersPointers';
export const WEAVE_USER_POINTER_KEY = 'userPointer';

export const WEAVE_DEFAULT_USER_INFO_FUNCTION = () => ({
  name: 'Unknown',
  email: 'unknown@domain.com',
});

export const WEAVE_USERS_POINTERS_CONFIG_DEFAULT_PROPS = {
  awarenessThrottleMs: 100,
  ui: {
    separation: 8,
    pointer: {
      circleRadius: 4,
      circleStrokeWidth: 0,
    },
    name: {
      fontFamily: 'Arial',
      fontSize: 10,
      backgroundCornerRadius: 0,
      backgroundPaddingX: 8,
      backgroundPaddingY: 4,
    },
  },
};
