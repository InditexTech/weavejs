// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { LookTokens } from '../../kit'
import type { DocsTheme } from '../types'

// Mapped from InditexTech/weavejs-frontend: shadcn "new-york" + zinc base
// (globals.css), Inter / Noto Sans Mono, the 10px radius scale and the
// selection blue the SDK draws on the canvas (nodes-selection constants).
const FONT = '"Weave Inter", ui-sans-serif, system-ui, sans-serif'
const MONO = '"Weave Noto Sans Mono", ui-monospace, monospace'

const shared: LookTokens = {
  '--ss-font': FONT,
  '--ss-mono': MONO,
  '--ss-accent': '#1a1aff',
  '--ss-accent-soft': 'rgba(26, 26, 255, 0.07)',
  '--ss-radius-sm': '6px',
  '--ss-radius-md': '8px',
  '--ss-radius-lg': '10px',
  '--ss-radius-window': '10px',
}

const light: LookTokens = {
  ...shared,
  '--ss-canvas': '#ffffff',
  '--ss-surface': '#ffffff',
  '--ss-chrome': '#ffffff',
  '--ss-well': '#f4f4f5',
  '--ss-line': '#e4e4e7',
  '--ss-line-faint': '#f4f4f5',
  '--ss-text-strong': '#09090b',
  '--ss-text': '#52525b',
  '--ss-text-faint': '#71717a',
  '--ss-icon': '#27272a',
  '--ss-icon-faint': '#a1a1aa',
  '--ss-danger': '#e7000b',
}

const dark: LookTokens = {
  ...shared,
  '--ss-canvas': '#09090b',
  '--ss-surface': '#18181b',
  '--ss-chrome': '#18181b',
  '--ss-well': '#27272a',
  '--ss-line': '#27272a',
  '--ss-line-faint': '#1f1f23',
  '--ss-text-strong': '#fafafa',
  '--ss-text': '#a1a1aa',
  '--ss-text-faint': '#71717a',
  '--ss-icon': '#fafafa',
  '--ss-icon-faint': '#52525b',
  '--ss-accent': '#6b6bff',
  '--ss-accent-soft': 'rgba(107, 107, 255, 0.16)',
  '--ss-danger': '#ff6467',
}

export const weaveTokens = (theme: DocsTheme): LookTokens => (theme === 'dark' ? dark : light)
