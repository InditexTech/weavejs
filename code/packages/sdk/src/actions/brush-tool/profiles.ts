// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { BRUSH_INPUT_PROFILE_KEYS } from './constants';
import type {
  WeaveBrushInputConfig,
  WeaveBrushInputProfileKey,
  WeaveBrushPointerInfo,
} from './types';

type NavigatorLike = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

/**
 * Coarse platform of the running browser: `ipad`, `ios`, `mac`, `windows`,
 * `android`, `linux` or `unknown`. iPadOS reports a desktop Mac user agent, so
 * a Mac with multi-touch is an iPad.
 */
export function detectBrushPlatform(nav?: NavigatorLike | null): string {
  const source =
    nav === undefined
      ? typeof navigator === 'undefined'
        ? null
        : (navigator as NavigatorLike)
      : nav;
  if (!source) return 'unknown';
  const ua = source.userAgent ?? '';
  const platform = source.platform ?? '';

  if (/iPad/i.test(ua)) return 'ipad';
  if (/iPhone|iPod/i.test(ua)) return 'ios';
  if (/Mac/i.test(platform) && (source.maxTouchPoints ?? 0) > 1) return 'ipad';
  if (/Android/i.test(ua)) return 'android';
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'mac';
  if (/Linux|X11/i.test(platform) || /Linux|X11/i.test(ua)) return 'linux';
  return 'unknown';
}

const isProfileKey = (key: unknown): key is WeaveBrushInputProfileKey =>
  (BRUSH_INPUT_PROFILE_KEYS as readonly unknown[]).includes(key);

/**
 * Profile chosen from the pointer type and platform. A pen on an iPad is an
 * Apple Pencil; any other pen is a desktop pen. Unknown pointer types behave
 * like a mouse.
 */
export function automaticBrushProfileKey(
  info: WeaveBrushPointerInfo
): WeaveBrushInputProfileKey {
  switch (info.pointerType) {
    case 'pen':
      return info.platform === 'ipad' ? 'pen.applePencil' : 'pen.desktop';
    case 'touch':
      return 'touch';
    default:
      return 'mouse';
  }
}

/**
 * Resolves the input profile for a stroke. A forced profile wins, then the
 * application's resolver, then the automatic choice. A resolver that throws or
 * returns an unknown key is ignored.
 */
export function resolveBrushInputProfileKey(
  info: WeaveBrushPointerInfo,
  cfg: Pick<WeaveBrushInputConfig, 'resolveProfile' | 'forceProfile'>
): WeaveBrushInputProfileKey {
  if (isProfileKey(cfg.forceProfile)) {
    return cfg.forceProfile;
  }

  if (cfg.resolveProfile) {
    try {
      const key = cfg.resolveProfile(info);
      if (isProfileKey(key)) return key;
    } catch {
      // fall through to the automatic choice
    }
  }

  return automaticBrushProfileKey(info);
}
