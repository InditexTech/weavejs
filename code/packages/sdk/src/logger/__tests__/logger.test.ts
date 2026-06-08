// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WEAVE_LOG_LEVEL } from '@inditextech/weave-types';

// ---------------------------------------------------------------------------
// Mock pino to capture browser.write options and expose a fake child() method
// ---------------------------------------------------------------------------

// Using object ref avoids temporal dead zone issues with vi.mock() hoisting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoCapture: { config: any } = { config: null };

vi.mock('pino', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: vi.fn().mockImplementation((config: any) => {
    pinoCapture.config = config;
    const fakeLogger = {
      level: config?.level ?? 'error',
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      trace: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      child: vi.fn().mockImplementation((_bindings: any, opts: any) => ({
        level: opts?.level ?? config?.level ?? 'error',
        warn: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
      })),
    };
    return fakeLogger;
  }),
}));

import { WeaveLogger } from '../logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInstance(loggerConfig: object = {}) {
  return {
    getConfiguration: vi.fn(() => ({ logger: loggerConfig })),
  };
}

function makeLogger(config: object = {}) {
  return new WeaveLogger(makeInstance() as never, config as never);
}

/** Returns a minimal pino log object like what browser.write handlers receive */
function makeLogObject(overrides: object = {}) {
  return {
    name: 'weave.js',
    msg: 'test message',
    time: Date.now(),
    level: 30,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite 1: Constructor + simple getters
// ---------------------------------------------------------------------------

describe('WeaveLogger — constructor + getters', () => {
  it('getDisabled() returns false when disabled is not set', () => {
    const logger = makeLogger({ level: 'debug' });
    expect(logger.getDisabled()).toBe(false);
  });

  it('getDisabled() returns true when config.disabled = true', () => {
    const logger = makeLogger({ disabled: true, level: 'debug' });
    expect(logger.getDisabled()).toBe(true);
  });

  it('getLevel() returns the configured level', () => {
    const logger = makeLogger({ level: 'warn' });
    expect(logger.getLevel()).toBe('warn');
  });

  it('getLevel() defaults to "error" when level is not set', () => {
    const logger = makeLogger({});
    expect(logger.getLevel()).toBe(WEAVE_LOG_LEVEL.ERROR);
  });

  it('getLogger() returns the pino Logger instance', () => {
    const logger = makeLogger({ level: 'debug' });
    const pino = logger.getLogger();
    expect(pino).toBeDefined();
    expect(typeof pino.warn).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Suite 2: browser write handlers (via captured pino config)
// ---------------------------------------------------------------------------
// The WeaveLogger passes browser.write handlers to pino.
// We capture them via the mocked pino() call and invoke them directly.

describe('WeaveLogger — browser write handlers', () => {
  beforeEach(() => {
    pinoCapture.config = null;
    // Clear call counts — console is already mocked by vitest.setup.ts
    vi.clearAllMocks();
  });

  it('warn handler calls console.warn', () => {
    makeLogger({ level: 'trace' });
    pinoCapture.config.browser.write.warn(makeLogObject());
    expect(console.warn).toHaveBeenCalled();
  });

  it('debug handler calls console.debug', () => {
    makeLogger({ level: 'trace' });
    pinoCapture.config.browser.write.debug(makeLogObject());
    expect(console.debug).toHaveBeenCalled();
  });

  it('info handler calls console.info', () => {
    makeLogger({ level: 'trace' });
    pinoCapture.config.browser.write.info(makeLogObject());
    expect(console.info).toHaveBeenCalled();
  });

  it('error handler calls console.error', () => {
    makeLogger({ level: 'trace' });
    pinoCapture.config.browser.write.error(makeLogObject());
    expect(console.error).toHaveBeenCalled();
  });

  it('trace handler calls console.trace', () => {
    makeLogger({ level: 'trace' });
    pinoCapture.config.browser.write.trace(makeLogObject());
    expect(console.trace).toHaveBeenCalled();
  });

  it('appends extra fields to params when extra has additional properties', () => {
    makeLogger({ level: 'trace' });
    pinoCapture.config.browser.write.warn(makeLogObject({ customField: 'extra-value' }));
    expect(console.warn).toHaveBeenCalled();
    const lastCall = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0];
    const lastArg = lastCall[lastCall.length - 1];
    // The extra object (with customField) should be appended
    expect(lastArg).toMatchObject({ customField: 'extra-value' });
  });

  it('does NOT append extra when only standard fields are present', () => {
    makeLogger({ level: 'trace' });
    // Log object with only name/msg/time/level — extra = {} → not pushed
    pinoCapture.config.browser.write.warn(makeLogObject());
    expect(console.warn).toHaveBeenCalled();
    const lastCall = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0];
    const lastArg = lastCall[lastCall.length - 1];
    // Last arg should be the message string (no extra object appended)
    expect(typeof lastArg).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: getChildLogger
// ---------------------------------------------------------------------------

describe('WeaveLogger — getChildLogger', () => {
  it('returns a child logger object', () => {
    const instance = makeInstance({});
    const logger = new WeaveLogger(instance as never, { level: 'debug' } as never);
    const child = logger.getChildLogger('myModule');
    expect(child).toBeDefined();
    expect(typeof child.warn).toBe('function');
  });

  it('uses global level when modules config is absent', () => {
    const instance = makeInstance({ level: 'info' });
    const logger = new WeaveLogger(instance as never, { level: 'info' } as never);
    const child = logger.getChildLogger('myModule');
    expect(child.level).toBe('info');
  });

  it('overrides level when module name matches an entry in modules', () => {
    const instance = makeInstance({
      level: 'error',
      modules: ['myModule:debug', 'otherModule:warn'],
    });
    const logger = new WeaveLogger(instance as never, { level: 'error' } as never);
    const child = logger.getChildLogger('myModule');
    expect(child.level).toBe('debug');
  });

  it('uses global level when modules list has no matching entry', () => {
    const instance = makeInstance({
      level: 'warn',
      modules: ['otherModule:debug'],
    });
    const logger = new WeaveLogger(instance as never, { level: 'warn' } as never);
    const child = logger.getChildLogger('myModule');
    expect(child.level).toBe('warn');
  });
});
