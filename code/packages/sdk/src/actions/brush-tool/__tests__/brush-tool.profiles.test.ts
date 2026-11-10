// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import {
  automaticBrushProfileKey,
  detectBrushPlatform,
  resolveBrushInputProfileKey,
} from '../profiles';
import { type Gesture, runGesture } from './shared/brush-golden.helpers';

const stroke = (pointerType: string, moveType = pointerType): Gesture => ({
  name: `${pointerType}-stroke`,
  steps: [
    { type: 'down', t: 0, x: 10, y: 10, pressure: 0.4, pointerType },
    { type: 'move', t: 16, x: 20, y: 12, pressure: 0.4, pointerType: moveType },
    { type: 'move', t: 32, x: 30, y: 16, pressure: 0.4, pointerType: moveType },
    { type: 'up', t: 48 },
  ],
});

const stubNavigator = (nav: Record<string, unknown>) =>
  vi.stubGlobal('navigator', nav);

describe('detectBrushPlatform', () => {
  it('detects an iPad from its user agent', () => {
    expect(detectBrushPlatform({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' })).toBe('ipad');
  });

  it('detects an iPad that reports a Mac user agent through multi-touch', () => {
    expect(
      detectBrushPlatform({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      })
    ).toBe('ipad');
  });

  it('detects desktop platforms', () => {
    expect(detectBrushPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' })).toBe('windows');
    expect(
      detectBrushPlatform({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      })
    ).toBe('mac');
    expect(detectBrushPlatform({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64' })).toBe('linux');
  });

  it('returns unknown without a navigator', () => {
    expect(detectBrushPlatform(null)).toBe('unknown');
  });
});

describe('profile resolution', () => {
  it('maps each pointer type and platform', () => {
    expect(automaticBrushProfileKey({ pointerType: 'mouse', platform: 'windows' })).toBe('mouse');
    expect(automaticBrushProfileKey({ pointerType: 'touch', platform: 'ipad' })).toBe('touch');
    expect(automaticBrushProfileKey({ pointerType: 'pen', platform: 'ipad' })).toBe('pen.applePencil');
    expect(automaticBrushProfileKey({ pointerType: 'pen', platform: 'windows' })).toBe('pen.desktop');
    expect(automaticBrushProfileKey({ pointerType: 'pen', platform: 'mac' })).toBe('pen.desktop');
  });

  it('treats an unknown or empty pointer type as a mouse', () => {
    expect(automaticBrushProfileKey({ pointerType: '', platform: 'mac' })).toBe('mouse');
    expect(automaticBrushProfileKey({ pointerType: 'gamepad', platform: 'mac' })).toBe('mouse');
  });

  it('lets the application resolver replace the automatic choice', () => {
    const resolveProfile = vi.fn().mockReturnValue('pen.desktop');
    const info = { pointerType: 'mouse', platform: 'windows' };
    expect(resolveBrushInputProfileKey(info, { resolveProfile })).toBe('pen.desktop');
    expect(resolveProfile).toHaveBeenCalledWith(info);
  });

  it('forces a profile over the resolver', () => {
    const resolveProfile = vi.fn().mockReturnValue('touch');
    expect(
      resolveBrushInputProfileKey(
        { pointerType: 'pen', platform: 'ipad' },
        { resolveProfile, forceProfile: 'mouse' }
      )
    ).toBe('mouse');
    expect(resolveProfile).not.toHaveBeenCalled();
  });

  it('ignores a resolver that throws or returns an unknown profile', () => {
    const info = { pointerType: 'pen', platform: 'ipad' };
    expect(
      resolveBrushInputProfileKey(info, {
        resolveProfile: () => {
          throw new Error('boom');
        },
      })
    ).toBe('pen.applePencil');
    expect(
      resolveBrushInputProfileKey(info, {
        resolveProfile: () => 'nope' as never,
      })
    ).toBe('pen.applePencil');
  });
});

describe('the brush tool resolves a profile once per stroke', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses pen.applePencil for a pen on an iPad', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)', maxTouchPoints: 5 });
    expect(runGesture(stroke('pen')).profileKey).toBe('pen.applePencil');
  });

  it('uses pen.desktop for a pen on a desktop', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' });
    expect(runGesture(stroke('pen')).profileKey).toBe('pen.desktop');
  });

  it('uses touch and mouse for those pointer types', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' });
    expect(runGesture(stroke('touch')).profileKey).toBe('touch');
    expect(runGesture(stroke('mouse')).profileKey).toBe('mouse');
  });

  it('uses mouse for an unknown pointer type', () => {
    stubNavigator({ userAgent: 'x' });
    expect(runGesture(stroke('')).profileKey).toBe('mouse');
  });

  it('applies the application override and the forced profile', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' });
    expect(
      runGesture(stroke('mouse'), {
        config: { input: { resolveProfile: () => 'touch' } },
      }).profileKey
    ).toBe('touch');
    expect(
      runGesture(stroke('pen'), {
        config: { input: { forceProfile: 'mouse' } },
      }).profileKey
    ).toBe('mouse');
  });

  it('keeps the profile chosen at stroke start when other pointer types report events', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' });
    expect(runGesture(stroke('pen', 'touch')).profileKey).toBe('pen.desktop');
  });

  it('passes the pointer information to the resolver', () => {
    stubNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32' });
    const resolveProfile = vi.fn().mockReturnValue('pen.desktop');
    runGesture(stroke('pen'), { config: { input: { resolveProfile } } });
    expect(resolveProfile).toHaveBeenCalledTimes(1);
    expect(resolveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ pointerType: 'pen', platform: 'windows' })
    );
  });
});
