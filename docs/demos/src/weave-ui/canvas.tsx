// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties, ReactNode } from 'react'
import './canvas.css'

/** The showcase's canvas: flat ground with the SDK's faint reference grid. */
export function WeaveCanvas({ children, className, style, ...rest }: { children?: ReactNode; className?: string; style?: CSSProperties } & Record<`data-${string}`, unknown>) {
  return (
    <div {...rest} className={`wv-canvas${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  )
}
