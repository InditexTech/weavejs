// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

const errors = {
  "room-required-parameters": {
    description: "No room or username defined.",
    action: "Back to Home",
    href: "/",
  },
  "room-failed-connection": {
    description: "Failed to obtain the room connection endpoint.",
    action: "Back to Home",
    href: "/",
  },
};

type CommonErrors = {
  [key: string]: {
    description: string;
    action: string;
    href: string;
  };
};

const COMMON_ERRORS: CommonErrors = {
  "room-required-parameters": errors["room-required-parameters"],
  "room-failed-connection": errors["room-failed-connection"],
};

export const getError = (errorCode: string) => {
  return (
    COMMON_ERRORS[errorCode] || {
      description: "An unknown error occurred.",
      action: "Back to Home",
      href: "/",
    }
  );
};
