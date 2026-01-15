// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEqual } from 'lodash';
import pino, { type Logger } from 'pino';
import {
  WEAVE_LOG_LEVEL,
  type WeaveLoggerConfig,
  type WeaveLogLevel,
} from '@inditextech/weave-types';
import type { Weave } from '@/weave';

export class WeaveLogger {
  private readonly instance: Weave;
  private config: WeaveLoggerConfig;
  private disabled: boolean;
  private logger: Logger;

  constructor(instance: Weave, config: WeaveLoggerConfig) {
    this.instance = instance;
    this.config = config;
    this.disabled = this.config.disabled ?? false;
    this.logger = pino({
      name: 'weave.js',
      level: this.config.level ?? WEAVE_LOG_LEVEL.ERROR,
      browser: {
        write: {
          warn: (o) => {
            // eslint-disable-next-line no-console
            this.log(console.warn, 'WARN', o, {
              textColor: 'white',
              bgColor: 'yellow',
            });
          },
          debug: (o) => {
            // eslint-disable-next-line no-console
            this.log(console.debug, 'DEBUG', o, {
              textColor: 'white',
              bgColor: 'pink',
            });
          },
          info: (o) => {
            // eslint-disable-next-line no-console
            this.log(console.info, 'INFO', o, {
              textColor: 'white',
              bgColor: 'blue',
            });
          },
          error: (o) => {
            // eslint-disable-next-line no-console
            this.log(console.error, 'ERROR', o, {
              textColor: 'white',
              bgColor: 'red',
            });
          },
          trace: (o) => {
            // eslint-disable-next-line no-console
            this.log(console.trace, 'TRACE', o, {
              textColor: 'white',
              bgColor: 'green',
            });
          },
        },
        disabled: this.disabled,
      },
    });
  }

  private log(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    method: any,
    level: string,
    o: object,
    { textColor, bgColor }: { textColor: string; bgColor: string }
  ) {
    const { name, msg, time, ...rest } = o as {
      name: string;
      msg: string;
      time: number;
      level?: number;
    };
    const extra = { ...rest };
    delete extra.level;
    const date = new Date(time);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = [
      `%cWEAVE.JS%c %c[${level}]%c %c[${name}]%c %c${date.toISOString()}%c\n%s`,
      `color: black; font-weight: bold; padding: 2px`,
      'color: black;',
      `color: ${textColor}; background: ${bgColor}; padding: 2px`,
      'color: black;',
      'color: white; background: black; padding: 2px',
      'color: black;',
      'color: white; background: black; padding: 2px',
      'color: black; margin-top: 2px',
      msg,
    ];

    if (!isEqual(extra, {})) {
      params.push(extra);
    }

    method(...params);
  }

  getDisabled(): boolean {
    return this.disabled;
  }

  getLevel(): pino.LevelWithSilentOrString {
    return this.logger.level;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getChildLogger(name: string): pino.Logger<never, boolean> {
    const configuration = this.instance.getConfiguration();
    const modulesLogging = configuration.logger?.modules ?? [];

    let childLoggerLevel = configuration.logger?.level ?? WEAVE_LOG_LEVEL.ERROR;
    for (const moduleLevel of modulesLogging) {
      const [moduleName, level] = moduleLevel.split(':');
      if (name === moduleName) {
        childLoggerLevel = level as WeaveLogLevel;
      }
    }

    return this.logger.child(
      {
        name,
      },
      {
        level: childLoggerLevel,
      }
    );
  }
}
