// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

const config: {
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    keyPrefix: string;
    password?: string;
  };
} = {
  redis: {
    enabled: (process.env.WEAVE_REDIS_ENABLED ?? 'false') === 'true',
    host: process.env.WEAVE_REDIS_HOST as string,
    port: Number(process.env.WEAVE_REDIS_PORT as string),
    keyPrefix: process.env.WEAVE_REDIS_PREFIX as string,
    ...(process.env.WEAVE_REDIS_PASSWORD &&
      process.env.WEAVE_REDIS_PASSWORD.length > 0 && {
        password: process.env.WEAVE_REDIS_PASSWORD,
      }),
  },
};

export default config;
