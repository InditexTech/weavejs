// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { loadWeaveFonts } from './looks/fonts'
import { initDemos } from './loader-core'
import { demos } from './registry'
import './loader.css'

// Served as <ui root>/js/demos/chunks/boot-*.js, so the UI root is three levels up.
const uiRoot = new URL('../../../', import.meta.url).href.replace(/\/$/, '')

initDemos({ registry: demos, prepare: () => loadWeaveFonts(`${uiRoot}/fonts`) })
