// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Suite 1 — Default values (no env vars set)
// ---------------------------------------------------------------------------

describe('1 — Default values', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('WEAVE_REDIS_ENABLED', undefined); // ensure absent regardless of real process env
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('1.1 WEAVE_REDIS_ENABLED not set → enabled === false', async () => {
    const mod = await import('../config');
    expect(mod.default.redis.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Custom env vars
// ---------------------------------------------------------------------------

describe('2 — Custom env vars', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('2.1 WEAVE_REDIS_ENABLED=true → enabled === true', async () => {
    vi.stubEnv('WEAVE_REDIS_ENABLED', 'true');
    const mod = await import('../config');
    expect(mod.default.redis.enabled).toBe(true);
  });

  it('2.2 WEAVE_REDIS_HOST, PORT, PREFIX set correctly', async () => {
    vi.stubEnv('WEAVE_REDIS_HOST', 'my-redis-host');
    vi.stubEnv('WEAVE_REDIS_PORT', '6380');
    vi.stubEnv('WEAVE_REDIS_PREFIX', 'my:prefix:');
    const mod = await import('../config');
    expect(mod.default.redis.host).toBe('my-redis-host');
    expect(mod.default.redis.port).toBe(6380);
    expect(mod.default.redis.keyPrefix).toBe('my:prefix:');
  });

  it('2.3 WEAVE_REDIS_PASSWORD set with non-empty value → password key present', async () => {
    vi.stubEnv('WEAVE_REDIS_PASSWORD', 'mysecret');
    const mod = await import('../config');
    expect(mod.default.redis.password).toBe('mysecret');
  });

  it('2.4 WEAVE_REDIS_PASSWORD set to empty string → password key NOT present', async () => {
    vi.stubEnv('WEAVE_REDIS_PASSWORD', '');
    const mod = await import('../config');
    expect(mod.default.redis).not.toHaveProperty('password');
  });
});
