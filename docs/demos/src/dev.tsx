// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createRoot } from 'react-dom/client'
import { loadWeaveFonts } from './looks/fonts'
import { demos } from './registry'
import type { DocsTheme } from './types'

// Dev harness: /?demo=<name>&theme=light|dark. Also the capture route for
// scripts/poster.mjs and Stageshow's film.mjs.
const params = new URLSearchParams(location.search)
const name = params.get('demo') ?? Object.keys(demos)[0]
const theme: DocsTheme = params.get('theme') === 'dark' ? 'dark' : 'light'
document.documentElement.style.colorScheme = theme
document.body.style.background = 'transparent'

const slot = document.getElementById('root')!
slot.style.cssText = 'width:960px;aspect-ratio:16/9;margin:24px'
slot.dataset.demo = name

await loadWeaveFonts('/fonts')
const { default: Demo } = await demos[name]()
createRoot(slot).render(<Demo theme={theme} />)
