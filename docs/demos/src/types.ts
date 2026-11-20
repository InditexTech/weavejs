// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { ComponentType } from 'react'

export type DocsTheme = 'light' | 'dark'

export interface DemoProps {
  theme: DocsTheme
}

export type DemoModule = { default: ComponentType<DemoProps> }
